//! Ashfall Excavation simulation core (Rust -> wasm32-unknown-unknown).
//!
//! Replaces the per-frame locomotion and collision maths of the zombie horde; all game rules (targets,
//! attacks, windows, rising, bosses, co-op authority) stay in JavaScript. Three parts:
//!
//! * **Collision world** — the same axis-aligned boxes `collide()` uses (`colliders` in the game), uploaded as
//!   `[minX,maxX,minZ,maxZ,on]` f64 rows and bucketed into a uniform grid. Circle resolution walks the
//!   candidate boxes in their original order, so a single query gives exactly what the JS loop gives.
//! * **Navigation** — up to [`NR`] nav grids (the trench network and the Hollow). Cells are blocked when their
//!   centre is inside an inflated box (doors are boxes, so a closed door blocks until its box turns off).
//!   Each grid keeps [`NS`] flow fields (slot 0: every live player, so co-op zombies head for the nearest one
//!   by path; slots 1..: active lures). A field is rebuilt only when its seed cells change or the world changes.
//! * **Crowd step** — one call moves every agent: flow-field / line-of-sight direction, arrival, separation,
//!   look-ahead avoidance, overlap relaxation (no stacking), wall collision and player push-out. Agents live in
//!   a struct-of-arrays f32 block that JS reads and writes in place.
//!
//! **Levels**: colliders carry vertical extents (y0..y1) and every query takes the body's height; each nav grid
//! is one floor (with a walkable-floor mask uploaded from JS), and portals (stairs, hatches) link cells of two
//! grids, so one Dijkstra per slot spans every floor and zombies follow players up and down stairs.
//!
//! No allocator and no imports: all state is one static struct in linear memory.
#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

// ---------------------------------------------------------------- limits and layout (mirrored in 05b-wasm-sim.js)
pub const MAXC: usize = 1024; // colliders
pub const COLW: usize = 7; // f64 per collider row: minX maxX minZ maxZ on y0 y1
pub const CG_MAX: usize = 8192; // collision grid cells
pub const CG_ITEMS: usize = 32768; // collision grid entries
pub const MAXA: usize = 512; // agents
pub const NR: usize = 4; // nav regions (floors): trenches, Hollow, Underworks, château upper floor
pub const NS: usize = 4; // flow-field slots per region
pub const NAVMAX: usize = 16384; // cells per nav region
pub const MAXT: usize = 16; // seed targets per frame
pub const MAXP: usize = 8; // player discs
pub const MAXPORT: usize = 16; // portals between nav regions
pub const MAXL: usize = 4096; // portal cell links
const GN: usize = NR * NAVMAX; // global nav node count
const AH: usize = 1024; // agent hash buckets
const AGENT_CELL: f32 = 2.0;
const INFL: f64 = 0.45; // nav inflation around boxes
const INF: f32 = 1.0e30;

// agent fields: data[F * MAXA + i]
pub const F_X: usize = 0;
pub const F_Z: usize = 1;
pub const F_VX: usize = 2;
pub const F_VZ: usize = 3;
pub const F_SPD: usize = 4; // desired speed (m/s), freeze already applied
pub const F_RAD: usize = 5; // wall collision radius
pub const F_TX: usize = 6; // steering target
pub const F_TZ: usize = 7;
pub const F_STOP: usize = 8; // arrival distance
pub const F_FLAGS: usize = 9; // bit0 active, bit1 moving, bit2 boss
pub const F_SLOT: usize = 10; // flow slot (>= NS: steer straight at the target)
pub const F_DX: usize = 11; // out: desired direction
pub const F_DZ: usize = 12;
pub const F_ST: usize = 13; // stuck timer
pub const F_LX: usize = 14; // stuck reference point
pub const F_LZ: usize = 15;
pub const F_NUDGE: usize = 16; // side-step timer
pub const F_NSIDE: usize = 17;
pub const F_Y: usize = 18; // floor height of the agent (levels)
pub const F_TY: usize = 19; // height of the steering target
pub const NF: usize = 20;

pub const FL_ACTIVE: u32 = 1;
pub const FL_MOVING: u32 = 2;
pub const FL_BOSS: u32 = 4;

// Square roots: on wasm32 the libm symbols are lowered by LLVM to the f64.sqrt / f32.sqrt instructions
// (correctly rounded, so results match JS Math.sqrt bit for bit); natively they come from the C library.
#[cfg(target_arch = "wasm32")]
extern "C" {
    fn sqrt(x: f64) -> f64;
    fn sqrtf(x: f32) -> f32;
}
#[inline]
fn sqrt64(x: f64) -> f64 {
    #[cfg(target_arch = "wasm32")]
    {
        unsafe { sqrt(x) }
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        x.sqrt()
    }
}
#[inline]
fn sqrt32(x: f32) -> f32 {
    #[cfg(target_arch = "wasm32")]
    {
        unsafe { sqrtf(x) }
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        x.sqrt()
    }
}
#[inline]
fn floor64(x: f64) -> f64 {
    // world coordinates stay far inside the i64 range
    let t = x as i64 as f64;
    if t > x {
        t - 1.0
    } else {
        t
    }
}
#[inline]
fn clamp64(v: f64, a: f64, b: f64) -> f64 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}
#[inline]
fn clamp32(v: f32, a: f32, b: f32) -> f32 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}

// ---------------------------------------------------------------- state
pub struct Region {
    on: bool,
    x0: f64,
    z0: f64,
    w: usize,
    h: usize,
    cs: f64,
    ccx: f64,
    ccz: f64,
    cr: f64,
    fy: f64,  // nominal floor height: colliders block this grid if they overlap fy+.35..fy+1.7
    ylo: f64, // agents with ylo <= y < yhi (inside the rectangle) belong to this grid
    yhi: f64,
    dirty: bool,
    floor: [f32; NAVMAX], // walkable floor height per cell from JS (< -1e8: no floor on this level)
    lk: [u8; NAVMAX],    // cell has a portal link
    blocked: [u8; NAVMAX],
    cost: [f32; NAVMAX],
    dist: [[f32; NAVMAX]; NS],
    dirx: [[f32; NAVMAX]; NS],
    dirz: [[f32; NAVMAX]; NS],
    has: [bool; NS],
}

pub struct State {
    col: [f64; MAXC * COLW],
    ncol: usize,
    cg_x0: f64,
    cg_z0: f64,
    cg_cs: f64,
    cg_w: usize,
    cg_h: usize,
    cg_start: [u32; CG_MAX + 1],
    cg_items: [u16; CG_ITEMS],
    cg_fill: [u32; CG_MAX],
    cab_x: f64,
    hol_x: f64,
    hol_z: f64,
    hol_r: f64,
    agents: [f32; NF * MAXA],
    head: [i32; AH],
    next: [i32; MAXA],
    tgt: [[f32; 4]; MAXT],
    ntgt: usize,
    ply: [[f32; 3]; MAXP],
    nply: usize,
    regions: [Region; NR],
    sig: [[u32; MAXT]; NS],
    sig_n: [usize; NS],
    portals: [[f64; 6]; MAXPORT],
    nport: usize,
    links: [[u32; 2]; MAXL],
    nlinks: usize,
    heap: [u32; GN],
    hpos: [i32; GN],
    hn: usize,
    out: [f64; 4],
    rng: u32,
    rebuilt: u32,
}

const fn region0() -> Region {
    Region {
        on: false,
        x0: 0.0,
        z0: 0.0,
        w: 0,
        h: 0,
        cs: 0.0,
        ccx: 0.0,
        ccz: 0.0,
        cr: 0.0,
        fy: 0.0,
        ylo: 0.0,
        yhi: 0.0,
        dirty: false,
        floor: [0.0; NAVMAX],
        lk: [0; NAVMAX],
        blocked: [0; NAVMAX],
        cost: [0.0; NAVMAX],
        dist: [[0.0; NAVMAX]; NS],
        dirx: [[0.0; NAVMAX]; NS],
        dirz: [[0.0; NAVMAX]; NS],
        has: [false; NS],
    }
}

// all-zero initialiser keeps the state in .bss (not stored in the .wasm file)
static mut STATE: State = State {
    col: [0.0; MAXC * COLW],
    ncol: 0,
    cg_x0: 0.0,
    cg_z0: 0.0,
    cg_cs: 0.0,
    cg_w: 0,
    cg_h: 0,
    cg_start: [0; CG_MAX + 1],
    cg_items: [0; CG_ITEMS],
    cg_fill: [0; CG_MAX],
    cab_x: 0.0,
    hol_x: 0.0,
    hol_z: 0.0,
    hol_r: 0.0,
    agents: [0.0; NF * MAXA],
    head: [0; AH],
    next: [0; MAXA],
    tgt: [[0.0; 4]; MAXT],
    ntgt: 0,
    ply: [[0.0; 3]; MAXP],
    nply: 0,
    regions: [region0(), region0(), region0(), region0()],
    sig: [[0; MAXT]; NS],
    sig_n: [0; NS],
    portals: [[0.0; 6]; MAXPORT],
    nport: 0,
    links: [[0; 2]; MAXL],
    nlinks: 0,
    heap: [0; GN],
    hpos: [0; GN],
    hn: 0,
    out: [0.0; 4],
    rng: 0,
    rebuilt: 0,
};

#[inline]
fn st() -> &'static mut State {
    // single-threaded wasm; every export takes this one reference for its duration
    unsafe { &mut *core::ptr::addr_of_mut!(STATE) }
}

// ---------------------------------------------------------------- collision world
impl State {
    fn build_collision_grid(&mut self) {
        let n = self.ncol;
        let (mut x0, mut z0, mut x1, mut z1) = (f64::MAX, f64::MAX, f64::MIN, f64::MIN);
        let mut any = false;
        for i in 0..n {
            let c = &self.col[i * COLW..i * COLW + COLW];
            if c[4] == 0.0 {
                continue;
            }
            any = true;
            if c[0] < x0 {
                x0 = c[0];
            }
            if c[1] > x1 {
                x1 = c[1];
            }
            if c[2] < z0 {
                z0 = c[2];
            }
            if c[3] > z1 {
                z1 = c[3];
            }
        }
        if !any {
            self.cg_w = 0;
            self.cg_h = 0;
            return;
        }
        let mut cs = 4.0f64;
        loop {
            let w = (floor64((x1 - x0) / cs) as usize) + 1;
            let h = (floor64((z1 - z0) / cs) as usize) + 1;
            if w * h <= CG_MAX {
                self.cg_w = w;
                self.cg_h = h;
                break;
            }
            cs *= 2.0;
        }
        self.cg_x0 = x0;
        self.cg_z0 = z0;
        self.cg_cs = cs;
        let cells = self.cg_w * self.cg_h;
        for c in 0..=cells {
            self.cg_start[c] = 0;
        }
        // pass 1: count, pass 2: fill (index order is preserved inside every cell)
        for pass in 0..2 {
            for i in 0..n {
                let b = i * COLW;
                if self.col[b + 4] == 0.0 {
                    continue;
                }
                let (ax, bx) = self.cg_range_x(self.col[b], self.col[b + 1]);
                let (az, bz) = self.cg_range_z(self.col[b + 2], self.col[b + 3]);
                for cz in az..=bz {
                    for cx in ax..=bx {
                        let cell = cz * self.cg_w + cx;
                        if pass == 0 {
                            self.cg_start[cell + 1] += 1;
                        } else {
                            let k = self.cg_fill[cell] as usize;
                            if k < CG_ITEMS {
                                self.cg_items[k] = i as u16;
                            }
                            self.cg_fill[cell] += 1;
                        }
                    }
                }
            }
            if pass == 0 {
                for c in 0..cells {
                    self.cg_start[c + 1] += self.cg_start[c];
                }
                if self.cg_start[cells] as usize > CG_ITEMS {
                    // pathological input: one big cell, every collider in it
                    self.cg_w = 1;
                    self.cg_h = 1;
                    self.cg_cs = 1.0e9;
                    let mut k = 0;
                    for i in 0..n {
                        if self.col[i * COLW + 4] != 0.0 && k < CG_ITEMS {
                            self.cg_items[k] = i as u16;
                            k += 1;
                        }
                    }
                    self.cg_start[0] = 0;
                    self.cg_start[1] = k as u32;
                    return;
                }
                for c in 0..cells {
                    self.cg_fill[c] = self.cg_start[c];
                }
            }
        }
    }
    #[inline]
    fn cg_range_x(&self, a: f64, b: f64) -> (usize, usize) {
        let w = self.cg_w as f64 - 1.0;
        let ia = clamp64(floor64((a - self.cg_x0) / self.cg_cs), 0.0, w) as usize;
        let ib = clamp64(floor64((b - self.cg_x0) / self.cg_cs), 0.0, w) as usize;
        (ia, ib)
    }
    #[inline]
    fn cg_range_z(&self, a: f64, b: f64) -> (usize, usize) {
        let h = self.cg_h as f64 - 1.0;
        let ia = clamp64(floor64((a - self.cg_z0) / self.cg_cs), 0.0, h) as usize;
        let ib = clamp64(floor64((b - self.cg_z0) / self.cg_cs), 0.0, h) as usize;
        (ia, ib)
    }

    /// Candidate collider indices whose box may touch [x0,x1]x[z0,z1], sorted ascending, no repeats.
    fn candidates(&self, x0: f64, x1: f64, z0: f64, z1: f64, buf: &mut [u16; 128]) -> usize {
        if self.cg_w == 0 {
            return 0;
        }
        // outside the grid entirely: nothing to hit
        let gx1 = self.cg_x0 + self.cg_cs * self.cg_w as f64;
        let gz1 = self.cg_z0 + self.cg_cs * self.cg_h as f64;
        if x1 < self.cg_x0 || z1 < self.cg_z0 || x0 > gx1 || z0 > gz1 {
            return 0;
        }
        let (ax, bx) = self.cg_range_x(x0, x1);
        let (az, bz) = self.cg_range_z(z0, z1);
        let mut n = 0usize;
        for cz in az..=bz {
            for cx in ax..=bx {
                let cell = cz * self.cg_w + cx;
                let (s, e) = (self.cg_start[cell] as usize, self.cg_start[cell + 1] as usize);
                for k in s..e {
                    let id = self.cg_items[k];
                    // insertion into the sorted buffer, skipping duplicates
                    let mut j = n;
                    let mut dup = false;
                    while j > 0 {
                        if buf[j - 1] == id {
                            dup = true;
                            break;
                        }
                        if buf[j - 1] < id {
                            break;
                        }
                        j -= 1;
                    }
                    if dup || n >= buf.len() {
                        continue;
                    }
                    let mut m = n;
                    while m > j {
                        buf[m] = buf[m - 1];
                        m -= 1;
                    }
                    buf[j] = id;
                    n += 1;
                }
            }
        }
        n
    }

    /// A body standing at y occupies y+.35..y+1.7; a box blocks it only if their heights overlap (JS colHits).
    #[inline]
    fn hits(&self, b: usize, y: f64) -> bool {
        y + 0.35 < self.col[b + 6] && y + 1.7 > self.col[b + 5]
    }
    /// Exactly the JS `collide(p,r)`: boxes on the body's level in index order, then the cabin and Hollow bounds.
    fn collide(&self, mut x: f64, mut z: f64, r: f64, y: f64) -> (f64, f64) {
        let mut buf = [0u16; 128];
        // a box can push at most r, so 2r of margin covers every box the sequential walk can reach
        let n = self.candidates(x - 2.0 * r, x + 2.0 * r, z - 2.0 * r, z + 2.0 * r, &mut buf);
        for k in 0..n {
            let b = buf[k] as usize * COLW;
            if !self.hits(b, y) {
                continue;
            }
            let (mnx, mxx, mnz, mxz) = (self.col[b], self.col[b + 1], self.col[b + 2], self.col[b + 3]);
            if x < mnx - r || x > mxx + r || z < mnz - r || z > mxz + r {
                continue;
            }
            let cx = clamp64(x, mnx, mxx);
            let cz = clamp64(z, mnz, mxz);
            let dx = x - cx;
            let dz = z - cz;
            let d2 = dx * dx + dz * dz;
            if d2 >= r * r {
                continue;
            }
            if d2 > 1e-8 {
                let d = sqrt64(d2);
                x += dx / d * (r - d);
                z += dz / d * (r - d);
            } else {
                let l = x - mnx;
                let rr = mxx - x;
                let t = z - mnz;
                let bb = mxz - z;
                let m = l.min(rr).min(t).min(bb);
                if m == l {
                    x = mnx - r;
                } else if m == rr {
                    x = mxx + r;
                } else if m == t {
                    z = mnz - r;
                } else {
                    z = mxz + r;
                }
            }
        }
        if x < -150.0 {
            x = clamp64(x, self.cab_x - 4.4, self.cab_x + 4.4);
            z = clamp64(z, -4.4, 4.4);
        }
        if x > 150.0 && self.hol_r > 0.0 {
            let dx = x - self.hol_x;
            let dz = z - self.hol_z;
            let d = sqrt64(dx * dx + dz * dz);
            if d > self.hol_r {
                x = self.hol_x + dx / d * self.hol_r;
                z = self.hol_z + dz / d * self.hol_r;
            }
        }
        (x, z)
    }

    fn point_blocked(&self, x: f64, z: f64, infl: f64, fy: f64) -> bool {
        let mut buf = [0u16; 128];
        let n = self.candidates(x - infl, x + infl, z - infl, z + infl, &mut buf);
        for k in 0..n {
            let b = buf[k] as usize * COLW;
            if !self.hits(b, fy) {
                continue;
            }
            if x > self.col[b] - infl && x < self.col[b + 1] + infl && z > self.col[b + 2] - infl && z < self.col[b + 3] + infl {
                return true;
            }
        }
        false
    }
}

// ---------------------------------------------------------------- navigation (one grid per floor, portal links)
impl State {
    /// The nav grid an agent at (x, y, z) stands on: first region whose rectangle holds x,z and ylo <= y < yhi.
    fn region_of(&self, x: f64, y: f64, z: f64) -> Option<usize> {
        for (i, r) in self.regions.iter().enumerate() {
            if !r.on || y < r.ylo || y >= r.yhi {
                continue;
            }
            if x >= r.x0 && z >= r.z0 && x < r.x0 + r.cs * r.w as f64 && z < r.z0 + r.cs * r.h as f64 {
                return Some(i);
            }
        }
        None
    }
    #[inline]
    fn cell_at(&self, ri: usize, x: f64, z: f64) -> Option<usize> {
        let r = &self.regions[ri];
        let i = floor64((x - r.x0) / r.cs);
        let j = floor64((z - r.z0) / r.cs);
        if i < 0.0 || j < 0.0 || i >= r.w as f64 || j >= r.h as f64 {
            return None;
        }
        Some(j as usize * r.w + i as usize)
    }

    fn rebuild_region(&mut self, ri: usize) {
        let (w, h, x0, z0, cs, ccx, ccz, cr, fy) = {
            let r = &self.regions[ri];
            (r.w, r.h, r.x0, r.z0, r.cs, r.ccx, r.ccz, r.cr, r.fy)
        };
        for j in 0..h {
            for i in 0..w {
                let x = x0 + (i as f64 + 0.5) * cs;
                let z = z0 + (j as f64 + 0.5) * cs;
                let idx = j * w + i;
                let fh = self.regions[ri].floor[idx];
                let mut b = fh < -1.0e8 || self.point_blocked(x, z, INFL, if fh.is_nan() { fy } else { fh as f64 });
                if !b && cr > 0.0 {
                    let dx = x - ccx;
                    let dz = z - ccz;
                    b = dx * dx + dz * dz > (cr - INFL) * (cr - INFL);
                }
                self.regions[ri].blocked[idx] = b as u8;
            }
        }
        // wall proximity cost keeps paths off corners and centred in doorways
        let r = &mut self.regions[ri];
        for j in 0..h {
            for i in 0..w {
                let idx = j * w + i;
                if r.blocked[idx] != 0 {
                    r.cost[idx] = INF;
                    continue;
                }
                let mut near = 3;
                for dj in -2i32..=2 {
                    for di in -2i32..=2 {
                        let (ni, nj) = (i as i32 + di, j as i32 + dj);
                        let blocked = ni < 0 || nj < 0 || ni >= w as i32 || nj >= h as i32 || r.blocked[nj as usize * w + ni as usize] != 0;
                        if blocked {
                            let ring = if di.abs() <= 1 && dj.abs() <= 1 { 1 } else { 2 };
                            if ring < near {
                                near = ring;
                            }
                        }
                    }
                }
                r.cost[idx] = match near {
                    1 => 2.2,
                    2 => 1.35,
                    _ => 1.0,
                };
            }
        }
        r.dirty = false;
    }

    /// Portal links: every cell inside a portal rectangle that is free on both floors joins the two grids.
    fn rebuild_links(&mut self) {
        self.nlinks = 0;
        for r in self.regions.iter_mut() {
            for v in r.lk.iter_mut() {
                *v = 0;
            }
        }
        for p in 0..self.nport {
            let [ra, rb, x0, x1, z0, z1] = self.portals[p];
            let (ra, rb) = (ra as usize, rb as usize);
            if ra >= NR || rb >= NR || !self.regions[ra].on || !self.regions[rb].on {
                continue;
            }
            let (cs, rx0, rz0) = (self.regions[ra].cs, self.regions[ra].x0, self.regions[ra].z0);
            let mut z = rz0 + (floor64((z0 - rz0) / cs) + 0.5) * cs;
            while z < z1 {
                let mut x = rx0 + (floor64((x0 - rx0) / cs) + 0.5) * cs;
                while x < x1 {
                    if x >= x0 && z >= z0 {
                        if let (Some(ca), Some(cb)) = (self.cell_at(ra, x, z), self.cell_at(rb, x, z)) {
                            if self.regions[ra].blocked[ca] == 0 && self.regions[rb].blocked[cb] == 0 && self.nlinks < MAXL {
                                self.links[self.nlinks] = [(ra * NAVMAX + ca) as u32, (rb * NAVMAX + cb) as u32];
                                self.nlinks += 1;
                                self.regions[ra].lk[ca] = 1;
                                self.regions[rb].lk[cb] = 1;
                            }
                        }
                    }
                    x += cs;
                }
                z += cs;
            }
        }
    }

    #[inline]
    fn gdist(&self, s: usize, g: u32) -> f32 {
        let g = g as usize;
        self.regions[g / NAVMAX].dist[s][g % NAVMAX]
    }
    fn heap_push_or_decrease(&mut self, s: usize, g: u32) {
        let mut i = if self.hpos[g as usize] >= 0 {
            self.hpos[g as usize] as usize
        } else {
            let i = self.hn;
            self.hn += 1;
            self.heap[i] = g;
            self.hpos[g as usize] = i as i32;
            i
        };
        while i > 0 {
            let p = (i - 1) / 2;
            if self.gdist(s, self.heap[p]) <= self.gdist(s, self.heap[i]) {
                break;
            }
            self.heap.swap(p, i);
            self.hpos[self.heap[p] as usize] = p as i32;
            self.hpos[self.heap[i] as usize] = i as i32;
            i = p;
        }
    }
    fn heap_pop(&mut self, s: usize) -> u32 {
        let top = self.heap[0];
        self.hn -= 1;
        self.hpos[top as usize] = -2; // settled
        if self.hn > 0 {
            self.heap[0] = self.heap[self.hn];
            self.hpos[self.heap[0] as usize] = 0;
            let mut i = 0;
            loop {
                let (l, r) = (2 * i + 1, 2 * i + 2);
                let mut m = i;
                if l < self.hn && self.gdist(s, self.heap[l]) < self.gdist(s, self.heap[m]) {
                    m = l;
                }
                if r < self.hn && self.gdist(s, self.heap[r]) < self.gdist(s, self.heap[m]) {
                    m = r;
                }
                if m == i {
                    break;
                }
                self.heap.swap(m, i);
                self.hpos[self.heap[m] as usize] = m as i32;
                self.hpos[self.heap[i] as usize] = i as i32;
                i = m;
            }
        }
        top
    }
    fn relax(&mut self, s: usize, g: u32, nd: f32) {
        let gu = g as usize;
        let (ri, c) = (gu / NAVMAX, gu % NAVMAX);
        if self.hpos[gu] == -2 || nd >= self.regions[ri].dist[s][c] {
            return;
        }
        self.regions[ri].dist[s][c] = nd;
        self.heap_push_or_decrease(s, g);
    }

    /// One Dijkstra over every floor from the seed targets of `slot` (portal links cost nothing), then a
    /// steepest-descent direction per cell.
    fn build_field(&mut self, s: usize) {
        for ri in 0..NR {
            let cells = self.regions[ri].w * self.regions[ri].h;
            for c in 0..cells {
                self.regions[ri].dist[s][c] = INF;
                self.regions[ri].dirx[s][c] = 0.0;
                self.regions[ri].dirz[s][c] = 0.0;
                self.hpos[ri * NAVMAX + c] = -1;
            }
            self.regions[ri].has[s] = false;
        }
        self.hn = 0;
        let mut seeded = false;
        for t in 0..self.ntgt {
            let [tx, ty, tz, ts] = self.tgt[t];
            if ts as usize != s {
                continue;
            }
            let (tx, ty, tz) = (tx as f64, ty as f64, tz as f64);
            let Some(ri) = self.region_of(tx, ty, tz) else { continue };
            let (w, h, x0, z0, cs) = {
                let r = &self.regions[ri];
                (r.w, r.h, r.x0, r.z0, r.cs)
            };
            let ci = floor64((tx - x0) / cs) as i32;
            let cj = floor64((tz - z0) / cs) as i32;
            // the target's cell, or (if a wall inflation covers it) the free cells around it
            for rad in 0..3i32 {
                let mut any = false;
                for dj in -rad..=rad {
                    for di in -rad..=rad {
                        if di.abs().max(dj.abs()) != rad {
                            continue;
                        }
                        let (ni, nj) = (ci + di, cj + dj);
                        if ni < 0 || nj < 0 || ni >= w as i32 || nj >= h as i32 {
                            continue;
                        }
                        let idx = nj as usize * w + ni as usize;
                        if self.regions[ri].blocked[idx] != 0 {
                            continue;
                        }
                        let cx = x0 + (ni as f64 + 0.5) * cs;
                        let cz = z0 + (nj as f64 + 0.5) * cs;
                        let d0 = sqrt64((cx - tx) * (cx - tx) + (cz - tz) * (cz - tz)) as f32;
                        self.relax(s, (ri * NAVMAX + idx) as u32, d0);
                        any = true;
                    }
                }
                if any {
                    seeded = true;
                    break;
                }
            }
        }
        self.rebuilt += 1;
        if !seeded {
            return;
        }
        for ri in 0..NR {
            self.regions[ri].has[s] = self.regions[ri].on;
        }
        const N8: [(i32, i32, f32); 8] = [
            (1, 0, 1.0),
            (-1, 0, 1.0),
            (0, 1, 1.0),
            (0, -1, 1.0),
            (1, 1, core::f32::consts::SQRT_2),
            (-1, 1, core::f32::consts::SQRT_2),
            (1, -1, core::f32::consts::SQRT_2),
            (-1, -1, core::f32::consts::SQRT_2),
        ];
        while self.hn > 0 {
            let g = self.heap_pop(s);
            let gu = g as usize;
            let (ri, c) = (gu / NAVMAX, gu % NAVMAX);
            let (w, h, csf) = (self.regions[ri].w, self.regions[ri].h, self.regions[ri].cs as f32);
            let (ci, cj) = ((c % w) as i32, (c / w) as i32);
            let dc = self.regions[ri].dist[s][c];
            let cc = self.regions[ri].cost[c];
            for &(di, dj, len) in N8.iter() {
                let (ni, nj) = (ci + di, cj + dj);
                if ni < 0 || nj < 0 || ni >= w as i32 || nj >= h as i32 {
                    continue;
                }
                let n = nj as usize * w + ni as usize;
                let r = &self.regions[ri];
                if r.blocked[n] != 0 {
                    continue;
                }
                if di != 0 && dj != 0 {
                    // no corner cutting
                    if r.blocked[cj as usize * w + ni as usize] != 0 || r.blocked[nj as usize * w + ci as usize] != 0 {
                        continue;
                    }
                }
                let nd = dc + len * csf * 0.5 * (cc + r.cost[n]);
                self.relax(s, (ri * NAVMAX + n) as u32, nd);
            }
            // stairs and hatches: the same spot on the linked floor
            if self.regions[ri].lk[c] != 0 {
                for l in 0..self.nlinks {
                    let [a, b] = self.links[l];
                    if a == g {
                        self.relax(s, b, dc);
                    } else if b == g {
                        self.relax(s, a, dc);
                    }
                }
            }
        }
        // direction: towards the lowest neighbour on the same floor
        for ri in 0..NR {
            let r = &mut self.regions[ri];
            if !r.on {
                continue;
            }
            let (w, h) = (r.w, r.h);
            for j in 0..h as i32 {
                for i in 0..w as i32 {
                    let c = j as usize * w + i as usize;
                    let dc = r.dist[s][c];
                    if dc >= INF {
                        continue;
                    }
                    let (mut best, mut bx, mut bz) = (dc, 0.0f32, 0.0f32);
                    for &(di, dj, len) in N8.iter() {
                        let (ni, nj) = (i + di, j + dj);
                        if ni < 0 || nj < 0 || ni >= w as i32 || nj >= h as i32 {
                            continue;
                        }
                        let n = nj as usize * w + ni as usize;
                        if di != 0 && dj != 0 && (r.blocked[j as usize * w + ni as usize] != 0 || r.blocked[nj as usize * w + i as usize] != 0) {
                            continue;
                        }
                        let dn = r.dist[s][n];
                        if dn < best {
                            best = dn;
                            bx = di as f32 / len;
                            bz = dj as f32 / len;
                        }
                    }
                    r.dirx[s][c] = bx;
                    r.dirz[s][c] = bz;
                }
            }
        }
    }

    fn update_fields(&mut self) -> u32 {
        let before = self.rebuilt;
        let mut any_dirty = false;
        for ri in 0..NR {
            if self.regions[ri].on && self.regions[ri].dirty {
                self.rebuild_region(ri);
                any_dirty = true;
            }
        }
        if any_dirty {
            self.rebuild_links();
            for s in 0..NS {
                self.sig_n[s] = usize::MAX; // force every field to rebuild
            }
        }
        for s in 0..NS {
            // signature: sorted seed nodes (floor and cell) of this slot
            let mut sig = [0u32; MAXT];
            let mut n = 0usize;
            for t in 0..self.ntgt {
                let [tx, ty, tz, ts] = self.tgt[t];
                if ts as usize != s {
                    continue;
                }
                let Some(ri) = self.region_of(tx as f64, ty as f64, tz as f64) else { continue };
                let Some(c) = self.cell_at(ri, tx as f64, tz as f64) else { continue };
                let key = (ri * NAVMAX + c) as u32;
                let mut j = n;
                while j > 0 && sig[j - 1] > key {
                    sig[j] = sig[j - 1];
                    j -= 1;
                }
                sig[j] = key;
                n += 1;
            }
            if self.sig_n[s] == n && self.sig[s][..n] == sig[..n] {
                continue;
            }
            self.sig[s] = sig;
            self.sig_n[s] = n;
            if n == 0 {
                for ri in 0..NR {
                    self.regions[ri].has[s] = false;
                }
                continue;
            }
            self.build_field(s);
        }
        self.rebuilt - before
    }

    /// Bilinear blend of the four nearest cell directions; None when no usable cell is near.
    fn sample_flow(&self, ri: usize, s: usize, x: f64, z: f64) -> Option<(f32, f32)> {
        let r = &self.regions[ri];
        if !r.has[s] {
            return None;
        }
        let fx = (x - r.x0) / r.cs - 0.5;
        let fz = (z - r.z0) / r.cs - 0.5;
        let i0 = floor64(fx) as i32;
        let j0 = floor64(fz) as i32;
        let tx = (fx - i0 as f64) as f32;
        let tz = (fz - j0 as f64) as f32;
        let (mut sx, mut sz, mut wsum) = (0.0f32, 0.0f32, 0.0f32);
        for (di, dj, wgt) in [(0, 0, (1.0 - tx) * (1.0 - tz)), (1, 0, tx * (1.0 - tz)), (0, 1, (1.0 - tx) * tz), (1, 1, tx * tz)] {
            let (i, j) = (i0 + di, j0 + dj);
            if i < 0 || j < 0 || i >= r.w as i32 || j >= r.h as i32 {
                continue;
            }
            let c = j as usize * r.w + i as usize;
            if r.dist[s][c] >= INF {
                continue;
            }
            let (dx, dz) = (r.dirx[s][c], r.dirz[s][c]);
            if dx == 0.0 && dz == 0.0 {
                continue;
            }
            sx += dx * wgt;
            sz += dz * wgt;
            wsum += wgt;
        }
        if wsum > 1e-4 {
            let l = sqrt32(sx * sx + sz * sz);
            if l > 1e-4 {
                return Some((sx / l, sz / l));
            }
        }
        // inside a wall's inflation (or at a portal cell): head for the best free cell close by
        let ci = floor64((x - r.x0) / r.cs) as i32;
        let cj = floor64((z - r.z0) / r.cs) as i32;
        let (mut best, mut bi, mut bj) = (INF, 0i32, 0i32);
        for dj in -2i32..=2 {
            for di in -2i32..=2 {
                let (i, j) = (ci + di, cj + dj);
                if i < 0 || j < 0 || i >= r.w as i32 || j >= r.h as i32 {
                    continue;
                }
                let d = r.dist[s][j as usize * r.w + i as usize];
                if d < best {
                    best = d;
                    bi = i;
                    bj = j;
                }
            }
        }
        if best >= INF {
            return None;
        }
        let cx = r.x0 + (bi as f64 + 0.5) * r.cs - x;
        let cz = r.z0 + (bj as f64 + 0.5) * r.cs - z;
        let l = sqrt64(cx * cx + cz * cz);
        if l < 1e-4 {
            return None;
        }
        Some(((cx / l) as f32, (cz / l) as f32))
    }

    /// Grid line of sight on one floor (every cell the segment touches is free).
    fn los(&self, ri: usize, ax: f64, az: f64, bx: f64, bz: f64) -> bool {
        let r = &self.regions[ri];
        let (fx0, fz0) = ((ax - r.x0) / r.cs, (az - r.z0) / r.cs);
        let (fx1, fz1) = ((bx - r.x0) / r.cs, (bz - r.z0) / r.cs);
        let (mut i, mut j) = (floor64(fx0) as i32, floor64(fz0) as i32);
        let (i1, j1) = (floor64(fx1) as i32, floor64(fz1) as i32);
        let (dx, dz) = (fx1 - fx0, fz1 - fz0);
        let si = if dx > 0.0 { 1 } else { -1 };
        let sj = if dz > 0.0 { 1 } else { -1 };
        let tdx = if dx != 0.0 { (1.0 / dx).abs() } else { f64::MAX };
        let tdz = if dz != 0.0 { (1.0 / dz).abs() } else { f64::MAX };
        let mut tmx = if dx > 0.0 { (i as f64 + 1.0 - fx0) * tdx } else if dx < 0.0 { (fx0 - i as f64) * tdx } else { f64::MAX };
        let mut tmz = if dz > 0.0 { (j as f64 + 1.0 - fz0) * tdz } else if dz < 0.0 { (fz0 - j as f64) * tdz } else { f64::MAX };
        for _ in 0..256 {
            if i < 0 || j < 0 || i >= r.w as i32 || j >= r.h as i32 {
                return false;
            }
            if r.blocked[j as usize * r.w + i as usize] != 0 {
                return false;
            }
            if i == i1 && j == j1 {
                return true;
            }
            if tmx < tmz {
                tmx += tdx;
                i += si;
            } else {
                tmz += tdz;
                j += sj;
            }
        }
        false
    }
}

// ---------------------------------------------------------------- crowd step
impl State {
    #[inline]
    fn a(&self, f: usize, i: usize) -> f32 {
        self.agents[f * MAXA + i]
    }
    #[inline]
    fn set(&mut self, f: usize, i: usize, v: f32) {
        self.agents[f * MAXA + i] = v;
    }
    #[inline]
    fn flags(&self, i: usize) -> u32 {
        self.a(F_FLAGS, i) as u32
    }
    #[inline]
    fn bucket(x: f32, z: f32) -> usize {
        let cx = (x / AGENT_CELL) as i32 - if x < 0.0 { 1 } else { 0 };
        let cz = (z / AGENT_CELL) as i32 - if z < 0.0 { 1 } else { 0 };
        Self::bucket_of(cx, cz)
    }
    #[inline]
    fn bucket_of(cx: i32, cz: i32) -> usize {
        ((cx.wrapping_mul(73856093) ^ cz.wrapping_mul(19349663)) as u32 as usize) & (AH - 1)
    }
    fn rand(&mut self) -> f32 {
        self.rng = self.rng.wrapping_mul(1664525).wrapping_add(1013904223);
        (self.rng >> 8) as f32 / 16777216.0
    }

    fn build_hash(&mut self, n: usize) {
        for b in 0..AH {
            self.head[b] = -1;
        }
        for i in 0..n {
            if self.flags(i) & FL_ACTIVE == 0 {
                continue;
            }
            let b = Self::bucket(self.a(F_X, i), self.a(F_Z, i));
            self.next[i] = self.head[b];
            self.head[b] = i as i32;
        }
    }
    /// The distinct buckets of the 3x3 cells around a point.
    fn near_buckets(x: f32, z: f32, out: &mut [usize; 9]) -> usize {
        let cx = (x / AGENT_CELL) as i32 - if x < 0.0 { 1 } else { 0 };
        let cz = (z / AGENT_CELL) as i32 - if z < 0.0 { 1 } else { 0 };
        let mut n = 0;
        for dz in -1..=1 {
            for dx in -1..=1 {
                let b = Self::bucket_of(cx + dx, cz + dz);
                if !out[..n].contains(&b) {
                    out[n] = b;
                    n += 1;
                }
            }
        }
        n
    }

    fn step(&mut self, n: usize, dt: f32) {
        let n = n.min(MAXA);
        self.build_hash(n);
        let mut bk = [0usize; 9];
        // 1. steering and integration (moving agents)
        for i in 0..n {
            let fl = self.flags(i);
            if fl & FL_ACTIVE == 0 {
                continue;
            }
            let (x, z, y) = (self.a(F_X, i), self.a(F_Z, i), self.a(F_Y, i) as f64);
            let (tx, tz) = (self.a(F_TX, i), self.a(F_TZ, i));
            let (ddx, ddz) = (tx - x, tz - z);
            let dt_ = sqrt32(ddx * ddx + ddz * ddz);
            // desired direction
            let mut dir: Option<(f32, f32)> = None;
            let slot = self.a(F_SLOT, i) as usize;
            if slot < NS {
                if let Some(ri) = self.region_of(x as f64, y, z as f64) {
                    let ty = self.a(F_TY, i) as f64;
                    if dt_ < 14.0 && self.region_of(tx as f64, ty, tz as f64) == Some(ri) && self.los(ri, x as f64, z as f64, tx as f64, tz as f64) {
                        dir = None; // straight line below
                    } else {
                        dir = self.sample_flow(ri, slot, x as f64, z as f64);
                    }
                }
            }
            let (dx, dz) = match dir {
                Some(d) => d,
                None => {
                    if dt_ > 1e-4 {
                        (ddx / dt_, ddz / dt_)
                    } else {
                        (self.a(F_DX, i), self.a(F_DZ, i))
                    }
                }
            };
            self.set(F_DX, i, dx);
            self.set(F_DZ, i, dz);
            if fl & FL_MOVING == 0 {
                self.set(F_VX, i, 0.0);
                self.set(F_VZ, i, 0.0);
                continue;
            }
            let spd = self.a(F_SPD, i);
            let boss = fl & FL_BOSS != 0;
            let ri_ = self.a(F_RAD, i);
            // separation (same weights as the JS loop) and look-ahead avoidance
            let (mut sx, mut sz, mut ax, mut az) = (0.0f32, 0.0f32, 0.0f32, 0.0f32);
            let nb = Self::near_buckets(x, z, &mut bk);
            for b in 0..nb {
                let mut o = self.head[bk[b]];
                while o >= 0 {
                    let ou = o as usize;
                    o = self.next[ou];
                    if ou == i || (self.a(F_Y, ou) - y as f32).abs() > 1.5 {
                        continue;
                    }
                    let (oxp, ozp) = (self.a(F_X, ou), self.a(F_Z, ou));
                    let (ox, oz) = (x - oxp, z - ozp);
                    let od = ox * ox + oz * oz;
                    let oboss = self.flags(ou) & FL_BOSS != 0;
                    let rr = if boss || oboss { 1.6 } else { 0.7 };
                    if od < rr * rr && od > 1e-4 {
                        let k = (rr - sqrt32(od)) / rr;
                        sx += ox * k * 2.0;
                        sz += oz * k * 2.0;
                    }
                    // avoidance: a slower body ahead in our lane -> step around it
                    let along = -(ox * dx + oz * dz);
                    if along > 0.0 && along < 1.8 {
                        let lat = -(ox * -dz + oz * dx);
                        let lane = ri_ + self.a(F_RAD, ou) + 0.15;
                        if lat.abs() < lane {
                            let ov = self.a(F_VX, ou) * dx + self.a(F_VZ, ou) * dz;
                            if ov < spd * 0.7 {
                                let side = if lat > 0.02 { -1.0 } else if lat < -0.02 { 1.0 } else if i & 1 == 0 { 1.0 } else { -1.0 };
                                let wgt = (1.0 - along / 1.8) * 0.8 * spd * (1.0 - lat.abs() / lane);
                                ax += -dz * side * wgt;
                                az += dx * side * wgt;
                            }
                        }
                    }
                }
            }
            // stuck side-step (same rule as the JS loop)
            let mut nudge = self.a(F_NUDGE, i);
            if nudge > 0.0 {
                nudge -= dt;
                let side = self.a(F_NSIDE, i);
                sx += -dz * side * 1.2;
                sz += dx * side * 1.2;
                self.set(F_NUDGE, i, nudge);
            }
            // arrival: ease in over the last metre
            let stop = self.a(F_STOP, i);
            let f = clamp32((dt_ - stop) / 1.2 + 0.45, 0.45, 1.0);
            let (dvx, dvz) = (dx * spd * f + ax + sx, dz * spd * f + az + sz);
            let k = clamp32(dt * 14.0, 0.0, 1.0);
            let vx = self.a(F_VX, i) + (dvx - self.a(F_VX, i)) * k;
            let vz = self.a(F_VZ, i) + (dvz - self.a(F_VZ, i)) * k;
            self.set(F_VX, i, vx);
            self.set(F_VZ, i, vz);
            self.set(F_X, i, x + vx * dt);
            self.set(F_Z, i, z + vz * dt);
        }
        // 2. overlap relaxation: nobody stands inside anybody (stationary and heavy bodies yield less)
        for i in 0..n {
            let fi = self.flags(i);
            if fi & FL_ACTIVE == 0 {
                continue;
            }
            let wi = (if fi & FL_MOVING != 0 { 1.0 } else { 0.35 }) * (if fi & FL_BOSS != 0 { 0.2 } else { 1.0 });
            let (x, z) = (self.a(F_X, i), self.a(F_Z, i));
            let nb = Self::near_buckets(x, z, &mut bk);
            for b in 0..nb {
                let mut o = self.head[bk[b]];
                while o >= 0 {
                    let j = o as usize;
                    o = self.next[j];
                    if j <= i || (self.a(F_Y, j) - self.a(F_Y, i)).abs() > 1.5 {
                        continue;
                    }
                    let fj = self.flags(j);
                    let min = (self.a(F_RAD, i) + self.a(F_RAD, j)) * 0.85;
                    let (ox, oz) = (self.a(F_X, i) - self.a(F_X, j), self.a(F_Z, i) - self.a(F_Z, j));
                    let d2 = ox * ox + oz * oz;
                    if d2 >= min * min {
                        continue;
                    }
                    let d = sqrt32(d2);
                    let (ux, uz) = if d > 1e-4 { (ox / d, oz / d) } else if i & 1 == 0 { (1.0, 0.0) } else { (0.0, 1.0) };
                    let wj = (if fj & FL_MOVING != 0 { 1.0 } else { 0.35 }) * (if fj & FL_BOSS != 0 { 0.2 } else { 1.0 });
                    let push = (min - d) * 0.5;
                    let (ki, kj) = (2.0 * wi / (wi + wj), 2.0 * wj / (wi + wj));
                    self.set(F_X, i, self.a(F_X, i) + ux * push * ki);
                    self.set(F_Z, i, self.a(F_Z, i) + uz * push * ki);
                    self.set(F_X, j, self.a(F_X, j) - ux * push * kj);
                    self.set(F_Z, j, self.a(F_Z, j) - uz * push * kj);
                }
            }
        }
        // 3. walls, players, stuck detection
        for i in 0..n {
            let fl = self.flags(i);
            if fl & FL_ACTIVE == 0 {
                continue;
            }
            let ay = self.a(F_Y, i);
            let (cx, cz) = self.collide(self.a(F_X, i) as f64, self.a(F_Z, i) as f64, self.a(F_RAD, i) as f64, ay as f64);
            let (mut x, mut z) = (cx as f32, cz as f32);
            if fl & FL_MOVING != 0 {
                let min_d = if fl & FL_BOSS != 0 { 1.2 } else { 0.72 };
                for p in 0..self.nply {
                    let [px, py, pz] = self.ply[p];
                    let (vx, vz) = (px - x, pz - z);
                    let pd = sqrt32(vx * vx + vz * vz);
                    if pd < min_d && pd > 1e-3 && (py - ay).abs() < 1.5 {
                        x -= vx / pd * (min_d - pd);
                        z -= vz / pd * (min_d - pd);
                    }
                }
                let spd = self.a(F_SPD, i);
                let t = self.a(F_ST, i) + dt;
                if t > 0.8 {
                    let (lx, lz) = (self.a(F_LX, i), self.a(F_LZ, i));
                    let moved = sqrt32((x - lx) * (x - lx) + (z - lz) * (z - lz));
                    if moved < spd * 0.8 * 0.25 {
                        self.set(F_NUDGE, i, 0.9);
                        let side = if self.rand() < 0.5 { -1.0 } else { 1.0 };
                        self.set(F_NSIDE, i, side);
                    }
                    self.set(F_ST, i, 0.0);
                    self.set(F_LX, i, x);
                    self.set(F_LZ, i, z);
                } else {
                    self.set(F_ST, i, t);
                }
            }
            self.set(F_X, i, x);
            self.set(F_Z, i, z);
        }
    }
}

// ---------------------------------------------------------------- exports
#[no_mangle]
pub extern "C" fn sim_init(seed: u32) {
    let s = st();
    s.ncol = 0;
    s.cg_w = 0;
    s.cg_h = 0;
    s.ntgt = 0;
    s.nply = 0;
    s.nport = 0;
    s.nlinks = 0;
    s.rng = seed | 1;
    for r in s.regions.iter_mut() {
        r.on = false;
    }
    for v in s.agents.iter_mut() {
        *v = 0.0;
    }
}
#[no_mangle]
pub extern "C" fn sim_version() -> u32 {
    2
}
#[no_mangle]
pub extern "C" fn sim_limits(which: u32) -> u32 {
    match which {
        0 => MAXC as u32,
        1 => MAXA as u32,
        2 => NF as u32,
        3 => NS as u32,
        4 => MAXT as u32,
        5 => MAXP as u32,
        6 => NR as u32,
        7 => COLW as u32,
        8 => MAXPORT as u32,
        _ => 0,
    }
}
#[no_mangle]
pub extern "C" fn sim_col_ptr() -> *mut f64 {
    st().col.as_mut_ptr()
}
#[no_mangle]
pub extern "C" fn sim_agents_ptr() -> *mut f32 {
    st().agents.as_mut_ptr()
}
#[no_mangle]
pub extern "C" fn sim_out_ptr() -> *mut f64 {
    st().out.as_mut_ptr()
}
/// Per-cell floor heights of nav grid `i` (w*h f32; below -1e8 means no floor on that level). Colliders are tested
/// against a body standing at that height, so a stair over a room counts as the stair. Call sim_nav_dirty after writing.
#[no_mangle]
pub extern "C" fn sim_nav_floor_ptr(i: u32) -> *mut f32 {
    st().regions[(i as usize).min(NR - 1)].floor.as_mut_ptr()
}
#[no_mangle]
pub extern "C" fn sim_nav_dirty() {
    for r in st().regions.iter_mut() {
        r.dirty = true;
    }
}
/// Collider rows 0..n were written: rebuild the broadphase and mark every nav grid for a rebuild.
#[no_mangle]
pub extern "C" fn sim_world_commit(n: u32) {
    let s = st();
    s.ncol = (n as usize).min(MAXC);
    s.build_collision_grid();
    for r in s.regions.iter_mut() {
        r.dirty = true;
    }
}
#[no_mangle]
pub extern "C" fn sim_bounds(cab_x: f64, hol_x: f64, hol_z: f64, hol_r: f64) {
    let s = st();
    s.cab_x = cab_x;
    s.hol_x = hol_x;
    s.hol_z = hol_z;
    s.hol_r = hol_r;
}
/// Nav grid `i` (one floor): origin, size in cells, cell size, optional walkable circle (cr > 0), nominal floor
/// height fy (selects which colliders block it) and the height band [ylo, yhi) of agents standing on it.
#[no_mangle]
pub extern "C" fn sim_nav_region(i: u32, x0: f64, z0: f64, w: u32, h: u32, cs: f64, ccx: f64, ccz: f64, cr: f64, fy: f64, ylo: f64, yhi: f64) -> u32 {
    let i = i as usize;
    if i >= NR || (w as usize) * (h as usize) > NAVMAX || cs <= 0.0 {
        return 0;
    }
    let r = &mut st().regions[i];
    r.on = true;
    r.x0 = x0;
    r.z0 = z0;
    r.w = w as usize;
    r.h = h as usize;
    r.cs = cs;
    r.ccx = ccx;
    r.ccz = ccz;
    r.cr = cr;
    r.fy = fy;
    r.ylo = ylo;
    r.yhi = yhi;
    r.dirty = true;
    for v in r.floor.iter_mut() {
        *v = fy as f32;
    }
    for s in 0..NS {
        r.has[s] = false;
    }
    st().sig_n = [usize::MAX; NS];
    1
}
/// Portal `i` joins grids ra and rb over the rectangle x0..x1, z0..z1 (cells free on both floors link up).
#[no_mangle]
pub extern "C" fn sim_portal(i: u32, ra: u32, rb: u32, x0: f64, x1: f64, z0: f64, z1: f64) {
    let s = st();
    let i = i as usize;
    if i >= MAXPORT {
        return;
    }
    s.portals[i] = [ra as f64, rb as f64, x0, x1, z0, z1];
    if i >= s.nport {
        s.nport = i + 1;
    }
    for r in s.regions.iter_mut() {
        r.dirty = true;
    }
}
#[no_mangle]
pub extern "C" fn sim_targets_clear() {
    st().ntgt = 0;
}
#[no_mangle]
pub extern "C" fn sim_target_add(slot: u32, x: f32, y: f32, z: f32) {
    let s = st();
    if s.ntgt < MAXT && (slot as usize) < NS {
        s.tgt[s.ntgt] = [x, y, z, slot as f32];
        s.ntgt += 1;
    }
}
#[no_mangle]
pub extern "C" fn sim_players_clear() {
    st().nply = 0;
}
#[no_mangle]
pub extern "C" fn sim_player_add(x: f32, y: f32, z: f32) {
    let s = st();
    if s.nply < MAXP {
        s.ply[s.nply] = [x, y, z];
        s.nply += 1;
    }
}
/// Rebuilds dirty nav grids and links and every flow field whose seed cells changed. Returns how many were built.
#[no_mangle]
pub extern "C" fn sim_fields_update() -> u32 {
    st().update_fields()
}
/// Moves agents 0..n (inactive rows are skipped).
#[no_mangle]
pub extern "C" fn sim_step(n: u32, dt: f32) {
    st().step(n as usize, dt);
}
/// Single circle against the world on the level of a body standing at y; result in out[0], out[1].
#[no_mangle]
pub extern "C" fn sim_collide(x: f64, z: f64, r: f64, y: f64) {
    let s = st();
    let (a, b) = s.collide(x, z, r, y);
    s.out[0] = a;
    s.out[1] = b;
}
/// Flow direction at a point (standing at y) for a slot; out[0..2] = dir, out[2] = path distance (or -1),
/// out[3] = nav grid index (or -1). Returns 1 if a direction exists.
#[no_mangle]
pub extern "C" fn sim_flow_sample(slot: u32, x: f64, y: f64, z: f64) -> u32 {
    let s = st();
    let slot = slot as usize;
    s.out[2] = -1.0;
    s.out[3] = -1.0;
    let Some(ri) = s.region_of(x, y, z) else { return 0 };
    s.out[3] = ri as f64;
    if slot >= NS {
        return 0;
    }
    if let Some(c) = s.cell_at(ri, x, z) {
        let d = s.regions[ri].dist[slot][c];
        if s.regions[ri].has[slot] && d < INF {
            s.out[2] = d as f64;
        }
    }
    match s.sample_flow(ri, slot, x, z) {
        Some((dx, dz)) => {
            s.out[0] = dx as f64;
            s.out[1] = dz as f64;
            1
        }
        None => 0,
    }
}
/// 1 if the nav cell under a point (standing at y) is blocked, 0 if free, 2 if outside every nav grid.
#[no_mangle]
pub extern "C" fn sim_nav_blocked(x: f64, y: f64, z: f64) -> u32 {
    let s = st();
    match s.region_of(x, y, z) {
        None => 2,
        Some(ri) => match s.cell_at(ri, x, z) {
            Some(c) => s.regions[ri].blocked[c] as u32,
            None => 2,
        },
    }
}
/// Number of portal cell links (debug / tests).
#[no_mangle]
pub extern "C" fn sim_link_count() -> u32 {
    st().nlinks as u32
}

// ---------------------------------------------------------------- native unit tests (cargo test)
#[cfg(test)]
mod tests {
    use super::*;

    fn put_col(i: usize, x0: f64, x1: f64, z0: f64, z1: f64, y0: f64, y1: f64) {
        let s = st();
        s.col[i * COLW..i * COLW + COLW].copy_from_slice(&[x0, x1, z0, z1, 1.0, y0, y1]);
    }
    fn agent(i: usize, x: f32, y: f32, z: f32, tx: f32, ty: f32, tz: f32, moving: bool) {
        let s = st();
        for f in 0..NF {
            s.agents[f * MAXA + i] = 0.0;
        }
        s.set(F_X, i, x);
        s.set(F_Y, i, y);
        s.set(F_Z, i, z);
        s.set(F_TX, i, tx);
        s.set(F_TY, i, ty);
        s.set(F_TZ, i, tz);
        s.set(F_SPD, i, 2.0);
        s.set(F_RAD, i, 0.33);
        s.set(F_STOP, i, 1.0);
        s.set(F_SLOT, i, 0.0);
        s.set(F_FLAGS, i, (FL_ACTIVE | if moving { FL_MOVING } else { 0 }) as f32);
    }

    // ground: a 20x20 room split by a wall at z=10 with a 4 m gap at x in [14,18];
    // basement (y -7): same footprint, linked to the ground by a stair over x 2..4, z 2..8; a basement-only wall
    // at x 6..7 (z 0..15) leaves a way round its north end
    fn world() {
        sim_init(7);
        put_col(0, 0.0, 14.0, 9.5, 10.5, -2.0, 4.0);
        put_col(1, 18.0, 20.0, 9.5, 10.5, -2.0, 4.0);
        put_col(2, -1.0, 0.0, 0.0, 20.0, -11.0, 4.0);
        put_col(3, 20.0, 21.0, 0.0, 20.0, -11.0, 4.0);
        put_col(4, 0.0, 20.0, -1.0, 0.0, -11.0, 4.0);
        put_col(5, 0.0, 20.0, 20.0, 21.0, -11.0, 4.0);
        put_col(6, 6.0, 7.0, 0.0, 15.0, -11.0, -3.0); // basement-only wall: must not block the ground floor
        sim_world_commit(7);
        sim_nav_region(0, -2.0, -2.0, 24, 24, 1.0, 0.0, 0.0, 0.0, 0.0, -3.0, 3.0);
        sim_nav_region(2, -2.0, -2.0, 24, 24, 1.0, 0.0, 0.0, 0.0, -7.0, -20.0, -3.0);
        sim_portal(0, 0, 2, 2.0, 4.0, 2.0, 8.0);
    }

    #[test]
    fn everything_in_one_test() {
        world();
        // collision matches the JS rule, and filters by height
        sim_collide(5.0, 9.3, 0.33, 0.0);
        assert!((st().out[1] - (9.5 - 0.33)).abs() < 1e-9);
        sim_collide(6.2, 5.0, 0.33, 0.0);
        assert!((st().out[0] - 6.2).abs() < 1e-9, "basement wall blocked the ground floor");
        sim_collide(6.2, 5.0, 0.33, -7.0);
        assert!((st().out[0] - 6.2).abs() > 0.1, "basement wall did not block the basement");
        // flow on the ground goes through the gap
        sim_targets_clear();
        sim_target_add(0, 5.0, 0.0, 15.0);
        assert!(sim_fields_update() >= 1);
        assert_eq!(sim_fields_update(), 0, "unchanged seeds must not rebuild");
        assert!(sim_link_count() > 0);
        assert_eq!(sim_flow_sample(0, 5.0, 0.0, 5.0), 1);
        assert!(st().out[0] > 0.3, "should head east toward the gap, got {:?}", st().out);
        assert_eq!(sim_nav_blocked(5.0, 0.0, 10.0), 1);
        // a basement agent east of the basement wall goes round its north end towards the stair (the only way up)
        assert_eq!(sim_flow_sample(0, 12.0, -7.0, 5.0), 1);
        assert!(st().out[1] > 0.3, "basement flow should lead north round the wall, got {:?}", st().out);
        assert!(st().out[2] > 0.0 && st().out[3] == 2.0);
        // agents reach the target through the gap and never cross the wall
        for i in 0..12 {
            agent(i, 8.0 + (i % 6) as f32 * 1.5, 0.0, 3.0 + (i / 6) as f32 * 1.5, 5.0, 0.0, 15.0, true);
        }
        let mut crossed_wall = false;
        for _ in 0..1200 {
            sim_step(12, 0.05);
            for i in 0..12 {
                let (x, z) = (st().a(F_X, i), st().a(F_Z, i));
                if z > 9.6 && z < 10.4 && (x < 13.8 || x > 18.2) {
                    crossed_wall = true;
                }
            }
        }
        assert!(!crossed_wall);
        let s = st();
        let mut near = 0;
        for i in 0..12 {
            let (x, z) = (s.a(F_X, i), s.a(F_Z, i));
            if z > 10.5 && ((x - 5.0).powi(2) + (z - 15.0).powi(2)).sqrt() < 4.0 {
                near += 1;
            }
        }
        assert!(near >= 10, "only {near} of 12 arrived");
        for i in 0..12 {
            for j in i + 1..12 {
                let d = ((s.a(F_X, i) - s.a(F_X, j)).powi(2) + (s.a(F_Z, i) - s.a(F_Z, j)).powi(2)).sqrt();
                assert!(d > 0.4, "agents {i} and {j} stacked ({d})");
            }
        }
        // two targets: each half of the room flows to its own nearest target
        sim_targets_clear();
        sim_target_add(0, 3.0, 0.0, 3.0);
        sim_target_add(0, 17.0, 0.0, 17.0);
        sim_fields_update();
        sim_flow_sample(0, 4.0, 0.0, 5.0);
        let d1 = st().out[2];
        sim_flow_sample(0, 16.0, 0.0, 15.0);
        let d2 = st().out[2];
        assert!(d1 < 4.0 && d2 < 4.0, "{d1} {d2}");
    }
}
