# Ashfall Excavation: map, levels and anchors

The world is laid out on the x/z plane (metres; −z is "north" on the old trench map, the camera's yaw 0 looks toward −z) with **floors**:

| Level | Height (floor y) | Where |
|---|---|---|
| Ground | 0 | the original map (zones A–G), the Château ground floor (K), the Hollow (H, x > 150) |
| Upper | 4.2 | Château upper floor and balcony (L) |
| Underground | −7 | the Underworks (U1–U4), flooded gallery water bed −7.4 |
| Deep | −10 | the deep vault (U5) |

`levelOf(y)` gives −1 below y −2.5, 1 above y 2.5, else 0. Code: `src/world/05c-levels.js` (engine), `src/world/07b-levels-build.js` (the graybox, doors, windows, spawns, markers).

## Engine API (05c-levels.js)

| Call | Meaning |
|---|---|
| `floorAt(x, y, z)` | walkable height under a point: the highest surface at or below `y + LV.STEP` (0.55). Ground (0) counts unless a hole is cut there. Returns `LV.VOID` (−60) if nothing. |
| `ceilAt(x, y, z)` | lowest ceiling above `y` (slab undersides, `addCeil` rectangles, the underside of the ground over underground space); `Infinity` if open sky |
| `levelFloorIn(x, z, lo, hi)` / `levelHasFloor(x, z, lo, hi)` | highest walkable height in [lo, hi] (or −1e9) / whether there is one |
| `addSlab(x0,x1,z0,z1,y,{thick,ceil})` | flat floor at `y`; its underside (`y − thick`, default 0.3) is a ceiling unless `ceil:false` |
| `addRamp(x0,x1,z0,z1,axis,yA,yB)` | stair or ramp, height `yA` at the low end of `axis` ('x' or 'z') to `yB` at the high end |
| `addHole(x0,x1,z0,z1)` | removes the ground inside a rectangle (stairwells). The ground mesh is rebuilt with real holes at the end of 07b. |
| `addCeil(x0,x1,z0,z1,y)` | a ceiling underside at `y` |
| `addColY(x0,x1,z0,z1,y0,y1)` | collider with vertical extents. A body standing at `y` occupies `y+0.35 … y+1.7` and is blocked only by boxes overlapping that (`colHits(c,y)`). Boxes made with `addCol` or object literals without `y0/y1` span −2 … 12 (the ground level), so every old box works as before. Trench walls made by `wall()` now top out at H + 0.7 (4.1). |
| `collide(p, r)` | unchanged signature; uses `p.y` (missing y = ground) to pick the boxes on that level |
| `addPortal({id,a,b,ax,ay,az,bx,by,bz,x0,x1,z0,z1,door})` | a stair/hatch between zones `a` and `b` on different floors. `a…` / `b…` are the two ends; the rectangle is the stair footprint. With `door`, the portal is open only while that door is, and `route()` uses the portal instead of the door. |
| `addLevelZone(id,x0,x1,z0,z1,ylo,yhi)` | rectangle of a zone on a level; `zoneOf(x, z, y)` checks these first (y omitted = ground) |
| `addMarker(name, {x,y,z,ry,kind,zone,note})` | named anchor for other lanes; read `MARKERS[name]` |
| `levelGroup(name,{under})` | a scene group; `under` groups draw only when the camera is below ground or near an entrance (`LVIS.near`) |
| `routeLinks()`, `portalSteer(d,zf,p)`, `zFloorY(z,dt)` | used by `route()` / `updateZombies` (zone routing through portals, zombie floor following) |
| `makeDoor(x,z,alongX,cost,a,b,label,sign,o)` | (06-map) now returns the door; `o = {y, w, debris, locked, lockedText, verb, id}`. Underground doors pass `y`. `LVL.doors[id]` lists the new ones. A locked door shows `lockedText` and opens only through `openDoor(d)` (or set `d.locked=false`). |
| `dropPup(x, z, type, y)` | power-up drops take the floor height |

Interactables (`addInter`) take an optional `y` (floor height): a prompt shows only within 2.2 m of that height. Zombie targets (`zTarget`) carry `y`; a floor between hunter and prey counts as distance, so zombies never hit through floors.

The WASM sim (`05b-wasm-sim.js`, `sim/`) keeps one nav grid per floor: trenches + Château ground floor (x −68…106, z −36…56), the Hollow, the Underworks (x −68…48, z −86…−4) and the Château upper floor (x −60…−24, z −28…4). It builds them from `levelFloorIn` and `PORTALS`, so new slabs, ramps and portals need no sim changes as long as they lie inside those rectangles. (Add a rectangle to `WNAV` for a new area outside them.) The JS fallback routes through the same zones and portals.

## Zones

| Id | Name | Level | Opened by |
|---|---|---|---|
| A–G, H | original zones (spawn bunker, trenches, dig, generator yard, chapel, No Man's Land, Hollow) | 0 | as before |
| K | The château (ground floor) | 0 | door `chateau` (C↔K, 1000) |
| L | Château upper floor (incl. balcony) | 1 | opens with K (open stair `chateauStair`) |
| U1 | The pump room (and the shaft stair below y −2.5) | −1 | debris `shaft` (C↔U1, 1250) |
| U2 | The rail tunnel (tunnels, corridor, cellar, cellar stair below y −2.5) | −1 | door `pumpTunnel` (U1↔U2, 1000) or hatch `cellar` (K↔U2, 750) |
| U3 | The ossuary | −1 | door `ossuary` (U2↔U3, 1250) |
| U4 | The flooded gallery | −1 | door `gallery` (U1↔U4, 1000) |
| U5 | The deep vault | −1 (floor −10) | door `vault` (U3↔U5) **locked**: the quest lane opens it |

## The Château (command post), west of the dig

Ruined two-storey stone building, interior x −57.6…−30.6, z −25.6…1.6; outer walls 0.8 m thick, 8.4 m high; its east side is the dig's west trench wall (x −30), where the purchasable barricade `chateau` sits at (−30, −11) in a gap z −13.6…−8.4.

| Room | Level | Rectangle (x, z) | Notes |
|---|---|---|---|
| Hall | 0 | −42…−30.6, −13…1.6 | entrance from the dig; main stair along the north wall |
| Map room | 0 | −42…−30.6, −25.6…−13 | map table at (−36.25, −19.75); doorway to the hall x −38…−35.5 |
| Radio room | 0 | −57.6…−42, −25.6…−13 | radio desk at x −57…−55, z −24…−19; zombie window (−58, −19) |
| Kitchen | 0 | −57.6…−42, −13…1.6 | range (−55.8, 0); zombie window (−50, 2); cellar stair along the south wall; doorway from the hall z −9…−6.5 |
| Main stair | 0→1 | x −41…−33, z −1.2…1.6 | ramp: y 0 at x −33, 4.2 at x −41 (portal `chateauStair` K↔L); blocked underneath |
| Cellar stair | 0→−1 | x −56.5…−44.5, z −12.6…−9.6 | ramp: y 0 at x −44.5, −7 at x −56.5; hatch door `cellar` (−44.2, −11.1); portal `cellarStair` K↔U2 |
| Upper hall | 1 | −42…−30.6, −13…−1.2 (+ landing −42…−41, −1.2…1.6) | stair arrives at x −41 |
| Bell room | 1 | −42…−30.6, −25.6…−13 | bell frame, bell mesh `LVL.bell` at (−35, 6.7, −19); door to the balcony z −21…−19 |
| Balcony | 1 | −30.6…−27, −24…−16 | over the dig's west wall, railed |
| North quarters | 1 | −57.6…−42, −13…1.6 | cots; **drop hole** x −50…−47.5, z −6…−3.5 (one-way into the kitchen) |
| South quarters | 1 | −57.6…−42, −25.6…−13 | cots |

Zombie windows (ground floor): radio room (−58, −19) facing −x, kitchen (−50, 2) facing +z, map room (−36, −26) facing −z (indices 14–16 in `WINDOWS`, also `LVL.windows`).

## The Underworks (y −7)

| Area | Zone | Rectangle (x, z) | Ceiling | Notes |
|---|---|---|---|---|
| Collapsed shaft stair | U1 / C | x −6…8, z −24…−20.4 | open | ramp y 0 at x −6 to −7 at x 8; debris pile `shaft` at its top (−6.6, −22.2); portal `shaftStair` C↔U1 |
| Pump room | U1 | 8…24, −30…−14 | −2.8 | boiler x 16…21, z −17.5…−15; pipes on the north wall |
| Tunnel A | U2 | 12…16, −42…−30 | −3 | door `pumpTunnel` (14, −30.2) |
| Rail tunnel | U2 | −64…12, −42…−38 | −3 | rails and sleepers; rail cart x −30…−27.6 |
| Corridor | U2 | −64…−60, −38…−16 | −3 | |
| Wine cellar | U2 | −66…−56.5, −16…−6 | −3 | under/west of the Château; cellar stair arrives at x −56.5 |
| Passage | U3 | −26…−22, −46…−42 | −3 | door `ossuary` (−24, −42.2) |
| Ossuary | U3 | −34…−14, −60…−46 | −2.2 | altar x −26…−22, z −55…−53; bone niches along both long walls |
| Vault ramp | U5 | −26…−22, −66…−60 | −2.2 | y −7 at z −60 down to −10 at z −66; sealed door `vault` (−24, −60.2) |
| Deep vault | U5 | −40…−16, −84…−66 (floor −10) | −1 | raised dais x −31…−25, z −78…−72 (top −9.6); four pillars |
| Flooded gallery | U4 | 24…46, −32…−12 (water bed −7.4) | −2.6 | walkways at −7: x 24…46 z −23…−21, x 33…35 z −32…−12, x 24…46 z −14…−12; door `gallery` (24.2, −22) |

Spawn grates (`LEVEL_SPAWNS`, merged into `SPAWNS`; entries are `[x, z, y]`):
U1 (20, −17), (22, −28) · U2 (−20, −40), (−50, −40), (−62, −24), (−62, −10), (14, −36) · U3 (−31, −57), (−17, −49) · U4 (44, −14), (44, −30) · U5 (−37, −81, −10), (−19, −69, −10).

## Markers (`MARKERS[name]`)

Empty anchors for the quest, perk and wall-buy lanes. `ry` faces into the room where it matters.

| Name | Kind | Zone | Position (x, y, z) | Note |
|---|---|---|---|---|
| chateau.wallbuy.hall | wallbuy | K | −31.2, 0, −4 | hall, inside the east wall north of the entrance |
| chateau.wallbuy.upper | wallbuy | L | −41.4, 4.2, −20 | bell room, west wall |
| chateau.perk.kitchen | perk | K | −52, 0, 1 | kitchen, against the north wall |
| chateau.perk.quarters | perk | L | −56.8, 4.2, −15 | south quarters, west wall |
| chateau.radio | puzzle | K | −55.8, 0, −21.5 | radio desk (switch / receiver puzzle) |
| chateau.maptable | puzzle | K | −36.2, 0.9, −19.7 | map table top |
| chateau.safe | puzzle | L | −56.5, 4.2, −0.5 | north quarters |
| chateau.bell | puzzle | L | −35, 6.7, −19 | the bell (`LVL.bell`), shootable anchor |
| chateau.balcony | puzzle | L | −28.8, 4.2, −20 | balcony over the dig |
| chateau.drophole | drop | L | −48.75, 4.2, −4.75 | broken floor into the kitchen |
| under.pump.valve | switch | U1 | 12, −7, −14.6 | pipe valve, north wall |
| under.pump.perk | perk | U1 | 23.4, −7, −16 | east wall, north end |
| under.pump.wallbuy | wallbuy | U1 | 8.6, −7, −27 | west wall, south of the stair |
| under.rail.cart | puzzle | U2 | −28.8, −5.5, −40 | rail cart |
| under.rail.wallbuy | wallbuy | U2 | −40, −7, −37.6 | rail tunnel, north wall |
| under.cellar.shelf | puzzle | U2 | −65.4, −7, −11 | wine cellar, west wall |
| under.ossuary.altar | puzzle | U3 | −24, −5.9, −54 | altar top |
| under.ossuary.niches | puzzle | U3 | −33.7, −6, −52 | bone niches, west wall (9 slots) |
| under.ossuary.perk | perk | U3 | −14.6, −7, −47 | east wall, north end |
| under.gallery.sluice | switch | U4 | 45.4, −7, −22 | sluice wheel at the end of the walkway |
| under.gallery.wallbuy | wallbuy | U4 | 34, −7, −12.6 | north walkway wall |
| under.vault.dais | boss | U5 | −28, −9.6, −75 | centre of the dais: finale arena |
| under.vault.bossSpawn | boss | U5 | −28, −10, −81 | boss entry point |
| under.vault.seal | door | U3 | −24, −7, −60.2 | `LVL.doors.vault` (locked) |

To put something on a marker: `const m=MARKERS['under.pump.perk']; tonicMachine('newPerk', m.x, m.z, m.ry)` and pass `m.y` wherever the function supports it. Interactables need `y:m.y` so they prompt only on that floor. Underground props belong in the `UNDER` group so they hide with it.

## Doors added (indices continue the original `DOORS` list)

| Id | Index | Between | Cost | Position | Notes |
|---|---|---|---|---|---|
| chateau | 7 | C ↔ K | 1000 | (−30, −11), along z | barricade in the dig's west wall |
| cellar | 8 | K ↔ U2 | 750 | (−44.2, −11.1), along z, w 3.4 | hatch at the top of the cellar stair |
| shaft | 9 | C ↔ U1 | 1250 | (−6.6, −22.2), along z, w 4 | rubble pile (debris) at the top of the shaft stair |
| pumpTunnel | 10 | U1 ↔ U2 | 1000 | (14, −30.2), y −7 | |
| ossuary | 11 | U2 ↔ U3 | 1250 | (−24, −42.2), y −7 | |
| gallery | 12 | U1 ↔ U4 | 1000 | (24.2, −22), y −7 | |
| vault | 13 | U3 ↔ U5 | locked | (−24, −60.2), y −7 | quest-controlled |

## Known limits

- Ladders are not implemented. The drop hole is the one-way vertical link, and stairs and ramps are the two-way ones.
- Window zombies climb at ground level only (all windows are on y 0).
- The Colossus, the wraith and the original quest anchors are ground-level systems that check distance in 2D.
