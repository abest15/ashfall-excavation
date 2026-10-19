/* ================= levels engine · lane 7 =================
   The world has floors. Ground is y=0 everywhere (except holes cut for stairwells); extra walkable surfaces are
   slabs (flat) and ramps (stairs), registered with addSlab / addRamp. Colliders may carry vertical extents
   (y0..y1); a box without them spans the ground level (-2..12), so every pre-levels box keeps working.
     floorAt(x,y,z)        walkable height under a point: the highest surface at or below y+LV.STEP (else LV.VOID)
     ceilAt(x,y,z)         lowest ceiling above y (slab undersides, addCeil rectangles), Infinity if open
     levelHasFloor(x,z,lo,hi)  any walkable surface with height in [lo,hi] (nav masks)
     levelOf(y)            -1 underground, 0 ground, 1 upper floor
     addSlab(x0,x1,z0,z1,y,o)  flat floor (o.thick for its ceiling underside, default .3)
     addRamp(x0,x1,z0,z1,axis,yA,yB)  stair/ramp: height runs yA at the low end of axis ('x'|'z') to yB at the high end
     addHole(x0,x1,z0,z1)  removes the ground (y=0) inside a rectangle (stairwell openings)
     addCeil(x0,x1,z0,z1,y)  a ceiling underside at y
     addColY(x0,x1,z0,z1,y0,y1)  collider with vertical extents (returned, like addCol)
     addPortal(o)          stair/hatch link between two zones: {id,a,b,ax,ay,az,bx,by,bz,x0,x1,z0,z1}
     addLevelZone(id,x0,x1,z0,z1,ylo,yhi)  rectangle of a zone on a level (zoneOf(x,z,y) checks these first)
     addMarker(name,o)     named anchor for other lanes: {x,y,z,ry,kind,zone,note}; MARKERS[name]
   See docs/MAP.md for every area, portal, zone and marker. */
const LV={STEP:.55,VOID:-60,GROUND_Y0:-2,GROUND_Y1:12,UNDER:-7,UPPER:4.2};
const SLABS=[], RAMPS=[], HOLES=[], CEILS=[], PORTALS=[], LZONES=[], MARKERS={};
function addSlab(x0,x1,z0,z1,y,o={}){ const s={x0,x1,z0,z1,y,thick:o.thick===undefined?.3:o.thick,ceil:o.ceil!==false}; SLABS.push(s); return s; }
function addRamp(x0,x1,z0,z1,axis,yA,yB){ const r={x0,x1,z0,z1,axis,yA,yB}; RAMPS.push(r); return r; }
function addHole(x0,x1,z0,z1){ const h={x0,x1,z0,z1}; HOLES.push(h); return h; }
function addCeil(x0,x1,z0,z1,y){ const c={x0,x1,z0,z1,y}; CEILS.push(c); return c; }
function addColY(x0,x1,z0,z1,y0,y1){ const c={minX:x0,maxX:x1,minZ:z0,maxZ:z1,y0,y1,on:true}; colliders.push(c); return c; }
// o.door: a door that guards the portal (the portal is open only while that door is; route() uses the portal, not the door)
function addPortal(o){ o.portal=true; Object.defineProperty(o,'open',{get(){ return !o.door||o.door.open; },enumerable:true}); if(o.door) o.door.route=false; o.x=(o.ax+o.bx)/2; o.z=(o.az+o.bz)/2; PORTALS.push(o); return o; }
function addLevelZone(id,x0,x1,z0,z1,ylo,yhi){ LZONES.push({id,x0,x1,z0,z1,ylo,yhi}); }
function addMarker(name,o){ MARKERS[name]=Object.assign({name,y:0,ry:0},o); return MARKERS[name]; }
const inRect=(r,x,z)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
function rampH(r,x,z){ const a=r.axis==='x'?x:z, a0=r.axis==='x'?r.x0:r.z0, a1=r.axis==='x'?r.x1:r.z1; const k=Math.min(1,Math.max(0,(a-a0)/(a1-a0))); return r.yA+(r.yB-r.yA)*k; }
function groundAt(x,z){ for(let i=0;i<HOLES.length;i++) if(inRect(HOLES[i],x,z)) return false; return true; }
function floorAt(x,y,z){ const lim=(y===undefined?0:y)+LV.STEP; let best=LV.VOID;
  if(lim>=0&&groundAt(x,z)) best=0;
  for(let i=0;i<SLABS.length;i++){ const s=SLABS[i]; if(s.y<=lim&&s.y>best&&inRect(s,x,z)) best=s.y; }
  for(let i=0;i<RAMPS.length;i++){ const r=RAMPS[i]; if(!inRect(r,x,z)) continue; const h=rampH(r,x,z); if(h<=lim&&h>best) best=h; }
  return best; }
function ceilAt(x,y,z){ let c=Infinity; const y0=y+.2;
  for(let i=0;i<SLABS.length;i++){ const s=SLABS[i]; if(!s.ceil) continue; const b=s.y-s.thick; if(b>y0&&b<c&&inRect(s,x,z)) c=b; }
  for(let i=0;i<CEILS.length;i++){ const q=CEILS[i]; if(q.y>y0&&q.y<c&&inRect(q,x,z)) c=q.y; }
  if(y<-.5&&groundAt(x,z)&&-.3>y0&&-.3<c) c=-.3; // the underside of the ground over any underground space
  return c; }
// highest walkable height in [lo,hi] at x,z, or -1e9 if none (per-cell floor heights for the WASM nav grids)
function levelFloorIn(x,z,lo,hi){ let b=-1e9; if(lo<=0&&hi>=0&&groundAt(x,z)) b=0;
  for(const s of SLABS) if(s.y>=lo&&s.y<=hi&&s.y>b&&inRect(s,x,z)) b=s.y;
  for(const r of RAMPS) if(inRect(r,x,z)){ const h=rampH(r,x,z); if(h>=lo&&h<=hi&&h>b) b=h; }
  return b; }
function levelHasFloor(x,z,lo,hi){ if(lo<=0&&hi>=0&&groundAt(x,z)) return true;
  for(const s of SLABS) if(s.y>=lo&&s.y<=hi&&inRect(s,x,z)) return true;
  for(const r of RAMPS) if(inRect(r,x,z)){ const h=rampH(r,x,z); if(h>=lo&&h<=hi) return true; }
  return false; }
function levelOf(y){ return y<-2.5?-1:y>2.5?1:0; }
// zone rectangles on levels; undefined means "use the original flat zoneOf"
function levelZoneOf(x,y,z){ const yy=y===undefined?0:y; for(let i=0;i<LZONES.length;i++){ const r=LZONES[i]; if(yy>=r.ylo&&yy<r.yhi&&inRect(r,x,z)) return r.id; }
  return yy<-2.5||yy>2.5?null:undefined; }
// vertical extents of a collider (boxes made before levels span the ground level)
const colY0=c=>c.y0===undefined?LV.GROUND_Y0:c.y0, colY1=c=>c.y1===undefined?LV.GROUND_Y1:c.y1;
// a body standing at y occupies y+.35 .. y+1.7 (things lower than a step never block)
const colHits=(c,y)=>y+.35<colY1(c)&&y+1.7>colY0(c);
// zones joined by a portal open together (called from openDoor)
function levelZonesSync(){ let ch=true; while(ch){ ch=false; for(const p of PORTALS){ if(!p.open) continue; const A=ZONES[p.a], B=ZONES[p.b]; if(A&&B&&A.open!==B.open&&(A.open||B.open)){ A.open=B.open=true; ch=true; } } } }
// JS route step through a portal: walk to the near end, then along the stair to the far end
function portalSteer(d,zf,p){ const fromA=d.a===zf, ex=fromA?d.ax:d.bx, ez=fromA?d.az:d.bz, fx=fromA?d.bx:d.ax, fz=fromA?d.bz:d.az;
  const onStair=p.x>=d.x0-.3&&p.x<=d.x1+.3&&p.z>=d.z0-.3&&p.z<=d.z1+.3;
  if(onStair||Math.hypot(p.x-ex,p.z-ez)<1.4){ const vx=fx-ex, vz=fz-ez, l=Math.hypot(vx,vz)||1; return {x:fx+vx/l*2.5,z:fz+vz/l*2.5}; }
  return {x:ex,z:ez}; }
// Visibility groups by level: underground meshes draw only when the camera is below ground or near an entrance.
const LVIS={groups:[],near:[]};
function levelGroup(name,o={}){ const g=new THREE.Group(); g.name=name; scene.add(g); LVIS.groups.push({g,under:!!o.under}); return g; }
function levelVisUpdate(){ const c=camera.position; let near=c.y<-1.2; if(!near) for(const e of LVIS.near){ if(Math.hypot(c.x-e.x,c.z-e.z)<e.r){ near=true; break; } }
  const vis=near&&mode==='main'; for(const q of LVIS.groups) if(q.under) q.g.visible=vis;
  if(mode==='main'&&!P.inCabin&&typeof rain!=='undefined') rain.visible=c.y>-1.5&&ceilAt(c.x,c.y-1.5,c.z)===Infinity; } // no rain indoors or underground
// doors and portals for route() (both arrays are complete once the world is built)
function routeLinks(){ return LV.links||(LV.links=DOORS.filter(d=>d.route!==false).concat(PORTALS)); }
// zombie floor height: follows floorAt, falls (rather than teleports) off ledges higher than a step
function zFloorY(z,dt){ const p=z.g.position, cur=p.y, f=floorAt(p.x,cur,p.z); let y=cur;
  if(f<=LV.VOID) y=cur; else if(f>=cur-.6) y=f; else y=Math.max(f,cur-dt*9); z.fy=y; return y; }
