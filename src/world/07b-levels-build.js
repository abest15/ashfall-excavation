/* ================= levels graybox · lane 7: the Château (2 storeys) and the Underworks =================
   Functional graybox: simple textured boxes with baked vertex lighting (no extra scene lights, unlit materials),
   merged into a few meshes per area. Another lane dresses them later; docs/MAP.md lists every coordinate.
   Heights: ground 0 · château upper floor 4.2 · Underworks -7 · deep vault -10. */
const LVL={doors:{},windows:[],lamps:[]};
// ---- builder: boxes -> one merged mesh, world-space UVs, baked lamp light in the vertex colours
function lvBuilder(){ const b=GB(); let n=0;
  return { box(x0,x1,y0,y1,z0,z1,col,seg=3){ const w=x1-x0, h=y1-y0, d=z1-z0; if(w<=.001||h<=.001||d<=.001) return this;
      b.add(new THREE.BoxGeometry(w,h,d,Math.max(1,Math.ceil(w/seg)),Math.max(1,Math.ceil(h/seg)),Math.max(1,Math.ceil(d/seg))),col,{p:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2]}); n++; return this; },
    add(geo,col,o){ b.add(geo,col,o); n++; return this; },
    get count(){ return n; },
    done(lights,amb,uvS=2.4,sun,skyY){ const g=b.done(); lvBake(g,lights,amb,sun,skyY); lvWorldUV(g,uvS); return g; } }; }
function lvWorldUV(g,S){ const p=g.attributes.position, nr=g.attributes.normal, uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){ const ax=Math.abs(nr.getX(i)), ay=Math.abs(nr.getY(i)); if(ay>.5) uv.setXY(i,p.getX(i)/S,p.getZ(i)/S); else if(ax>.5) uv.setXY(i,p.getZ(i)/S,p.getY(i)/S); else uv.setXY(i,p.getX(i)/S,p.getY(i)/S); } }
// lights: [x,y,z,radius,intensity,hex]; amb: ambient level; sun: optional {dir:[x,y,z],k} for open-air faces;
// skyY: vertices above it get sky light (stairwells cut up to the surface)
function lvBake(g,lights,amb,sun,skyY){ const p=g.attributes.position, nr=g.attributes.normal, c=g.attributes.color, lc=lights.map(l=>new THREE.Color(l[5]));
  const sd=sun?new V3(...sun.dir).normalize():null;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), nx=nr.getX(i), ny=nr.getY(i), nz=nr.getZ(i);
    let r=amb*(.8+.2*ny), gg=r, bb=r*1.08; if(skyY!==undefined&&y>skyY){ const k=Math.min(1,(y-skyY)/3.2)*.45; r+=k; gg+=k; bb+=k*1.1; }
    if(sd){ const k=Math.max(0,nx*sd.x+ny*sd.y+nz*sd.z)*sun.k; r+=k*.75; gg+=k*.8; bb+=k*1; }
    for(let j=0;j<lights.length;j++){ const L_=lights[j], dx=L_[0]-x, dy=L_[1]-y, dz=L_[2]-z, d=Math.hypot(dx,dy,dz); if(d>=L_[3]) continue;
      const lam=Math.max(0,(nx*dx+ny*dy+nz*dz)/(d||1))*.75+.25, f=Math.pow(1-d/L_[3],1.6)*L_[4]*lam; r+=lc[j].r*f; gg+=lc[j].g*f; bb+=lc[j].b*f; }
    c.setXYZ(i,c.getX(i)*Math.min(1.6,r),c.getY(i)*Math.min(1.6,gg),c.getZ(i)*Math.min(1.6,bb)); } }
function lvMat(tex,col){ const t=tex.clone(); t.needsUpdate=true; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,1); return new THREE.MeshBasicMaterial({map:t,color:col||0xffffff,vertexColors:true}); }
function lvAdd(geo,mat,parent,solid){ const m=new THREE.Mesh(geo,mat); (parent||scene).add(m); if(solid) addSolid(m); return m; }
// lamp glows (one additive mesh per group)
function lvGlows(list,parent){ const b=GB(); for(const l of list){ b.add(new THREE.SphereGeometry(.11,6,4),0xffffff,{p:[l[0],l[1],l[2]]}); b.add(new THREE.BoxGeometry(.05,.5,.05),0x553311,{p:[l[0],l[1]+.35,l[2]]}); }
  const m=new THREE.Mesh(b.done(),new THREE.MeshBasicMaterial({color:0xffc070,vertexColors:true})); (parent||scene).add(m); return m; }
// a wall along x or z with doorway gaps (gaps: [a0,a1,top]); colliders per solid piece with vertical extents
function lvWall(B,axis,fixed,thick,a0,a1,y0,y1,gaps,col,cy0,cy1,mesh=true){ const segs=[]; let cur=a0; const gs=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);
  for(const g of gs){ if(g[0]>cur) segs.push([cur,g[0],y0,y1]); if(g[2]<y1) segs.push([g[0],g[1],g[2],y1]); if(g[3]!==undefined&&g[3]>y0) segs.push([g[0],g[1],y0,g[3]]); cur=g[1]; }
  if(cur<a1) segs.push([cur,a1,y0,y1]);
  const f0=fixed-thick/2, f1=fixed+thick/2;
  for(const [s0,s1,h0,h1] of segs){ if(mesh){ if(axis==='x') B.box(s0,s1,h0,h1,f0,f1,col); else B.box(f0,f1,h0,h1,s0,s1,col); }
    const solidPiece=h0<=y0+.01; if(solidPiece){ if(axis==='x') addColY(s0,s1,f0,f1,cy0,cy1); else addColY(f0,f1,s0,s1,cy0,cy1); }
    else if(h0>y0+.01&&(cy1>h0)){ /* lintel/upper piece: collider only above the opening */ if(axis==='x') addColY(s0,s1,f0,f1,h0,cy1); else addColY(f0,f1,s0,s1,h0,cy1); } }
  // window holes keep the collider whole (gaps with a sill, g[3]): close the hole for collision
  for(const g of gs) if(g[3]!==undefined){ if(axis==='x') addColY(g[0],g[1],f0,f1,cy0,cy1); else addColY(f0,f1,g[0],g[1],cy0,cy1); } }
// a rubble heap for debris doors (replaces the planks)
function debrisPile(g,w){ g.children.forEach(m=>{ if(!m.isSprite) m.visible=false; }); const b=GB();
  for(let i=0;i<46;i++){ const t=i/46, s=rand(.25,.7); b.add(new THREE.DodecahedronGeometry(s),new THREE.Color().setHSL(.08,rand(.05,.15),rand(.25,.45)).getHex(),{p:[rand(-w/2,w/2),s*.6+rand(0,1.6)*(1-Math.abs(t-.5)*1.6),rand(-.5,.5)],r:[rand(0,3),rand(0,3),0]}); }
  for(let i=0;i<5;i++) b.add(new THREE.BoxGeometry(rand(1.5,3),.18,.18),0x4a3420,{p:[rand(-w/2,w/2)*.6,rand(.4,2),rand(-.4,.4)],r:[rand(-.3,.3),rand(0,3),rand(-.6,.6)]});
  const m=new THREE.Mesh(b.done(),L({map:stoneTex,vertexColors:true})); m.userData.debris=true; g.add(m); }
function lvDoor(id,x,z,alongX,cost,a,b,label,sign,o){ const d=makeDoor(x,z,alongX,cost,a,b,label,sign,o); d.id=id; LVL.doors[id]=d; return d; }
// spawn grates (rendered as dark iron grilles) and the zone table entries for the new areas
const LEVEL_SPAWNS={U1:[[20,-17,-7],[22,-28,-7]],U2:[[-20,-40,-7],[-50,-40,-7],[-62,-24,-7],[-62,-10,-7],[14,-36,-7]],U3:[[-31,-57,-7],[-17,-49,-7]],U4:[[44,-14,-7],[44,-30,-7]],U5:[[-37,-81,-10],[-19,-69,-10]]};
Object.assign(ZONES,{
  K:{name:'The château',c:{x:-44,z:-12},open:false,level:0}, L:{name:'Château upper floor',c:{x:-36,z:-12},open:false,level:1},
  U1:{name:'The pump room',c:{x:16,z:-22},open:false,level:-1}, U2:{name:'The rail tunnel',c:{x:-30,z:-40},open:false,level:-1},
  U3:{name:'The ossuary',c:{x:-24,z:-53},open:false,level:-1}, U4:{name:'The flooded gallery',c:{x:35,z:-22},open:false,level:-1},
  U5:{name:'The deep vault',c:{x:-28,z:-75},open:false,level:-1}});
const UNDER=levelGroup('underworks',{under:true}); UNDER.visible=false;
const CHATEAU=levelGroup('chateau');

/* ---------------------------------------------------------------- THE CHÂTEAU (command post)
   Interior x -57.6..-30.6, z -25.6..1.6. Ground floor y 0 (hall, map room, radio room, kitchen), upper floor y 4.2
   (upper hall, bell room + balcony over the dig, officers' quarters N/S). East side shares the dig's west wall. */
{ const B=lvBuilder(), F=lvBuilder(), stone=0xb8b0a2, dark=0x8a8276, wood=0xa08060;
  const CY0=-2, GF1=3.9, UF0=4.2, TOP=8.4;
  // outer walls (window holes: [a0,a1,top,sill])
  lvWall(B,'z',-58,.8,-26.4,2.4,-.1,TOP,[[-20.1,-17.9,2.5,.9],[-9,-7,6.9,5.2],[-21,-19,6.9,5.2]],stone,CY0,TOP);   // west
  lvWall(B,'x',2,.8,-58.4,-30.6,-.1,TOP,[[-51.1,-48.9,2.5,.9],[-38,-36,6.9,5.2],[-52,-50,6.9,5.2]],stone,CY0,TOP);  // north
  lvWall(B,'x',-26,.8,-58.4,-30.6,-.1,TOP,[[-37.1,-34.9,2.5,.9],[-50,-48,6.9,5.2]],stone,CY0,TOP);                  // south
  lvWall(B,'z',-30.6,.8,-25.6,1.6,GF1,TOP,[[-21,-19,6.6]],stone,GF1,TOP);                                             // east, upper storey (balcony door)
  // interior walls: ground floor (doorways 2.5 m wide, 2.6 high) and upper floor
  lvWall(B,'z',-42,.6,-25.6,1.6,-.1,GF1,[[-21,-18.5,2.6],[-9,-6.5,2.6]],dark,CY0,GF1);
  lvWall(B,'x',-13,.6,-57.6,-30.6,-.1,GF1,[[-51,-48.5,2.6],[-38,-35.5,2.6]],dark,CY0,GF1);
  lvWall(B,'z',-42,.6,-25.6,-1.2,UF0,TOP-.3,[[-9,-6.5,6.8]],dark,UF0,TOP);
  lvWall(B,'x',-13,.6,-57.6,-30.6,UF0,TOP-.3,[[-51,-48.5,6.8],[-38,-35.5,6.8]],dark,UF0,TOP);
  // upper floor slabs (stair opening x -41..-33 z -1.2..1.6, drop hole x -50..-47.5 z -6..-3.5) and the balcony
  const slabs=[[-57.6,-30.6,-25.6,-6],[-57.6,-50,-6,-3.5],[-47.5,-30.6,-6,-3.5],[-57.6,-30.6,-3.5,-1.2],[-57.6,-41,-1.2,1.6],[-33,-30.6,-1.2,1.6],[-30.6,-27,-24,-16]];
  for(const [x0,x1,z0,z1] of slabs){ addSlab(x0,x1,z0,z1,UF0); F.box(x0,x1,UF0-.3,UF0,z0,z1,wood,3); }
  // ground floor flagstones and broken roof over the quarters (the hall and bell room are open to the sky)
  for(const [x0,x1,z0,z1] of [[-57.6,-30.6,-25.6,-12.6],[-57.6,-30.6,-9.6,1.6],[-57.6,-56.5,-12.6,-9.6],[-44.5,-30.6,-12.6,-9.6]]) F.box(x0,x1,-.05,.02,z0,z1,0xb0a898,4); // flagstones (cellar stair cut out)
  for(const [x0,x1,z0,z1] of [[-57.6,-42,-25.6,-13],[-57.6,-42,-13,1.6]]){ addCeil(x0,x1,z0,z1,8.2); B.box(x0,x1,8.2,8.5,z0,z1,dark,4); }
  // rails: stair opening, balcony
  const rail=(x0,x1,z0,z1,y)=>{ F.box(x0,x1,y,y+1.05,z0,z1,wood,2); addColY(x0,x1,z0,z1,y,y+1.1); };
  rail(-41,-33,-1.6,-1.2,UF0); rail(-33,-32.6,-1.6,1.6,UF0); rail(-27.4,-27,-24,-16,UF0); rail(-30.6,-27,-24.4,-24,UF0); rail(-30.6,-27,-16,-15.6,UF0);
  // the main stair: x -33 (ground) up to x -41 (upper floor), z -1.2..1.6 against the north wall
  addRamp(-41,-33,-1.2,1.6,'x',UF0,0);
  for(let i=0;i<14;i++){ const x1=-33-i*8/14, x0=x1-8/14, h=UF0*(i+1)/14; F.box(x0,x1,0,h,-1.2,1.6,wood,3); }
  addPortal({id:'chateauStair',a:'K',b:'L',ax:-31.6,ay:0,az:.2,bx:-41.6,by:UF0,bz:.2,x0:-41,x1:-33,z0:-1.2,z1:1.6});
  addColY(-41,-37.2,-1.2,1.6,-2,2.0); addColY(-37.2,-35.4,-1.2,1.6,-2,.9); // nobody walks underneath the stair
  for(let xa=-41;xa<-34.1;xa+=.8){ const xb=Math.min(-34.1,xa+.8), top=UF0*(-33-xb)/8-.1; addColY(xa,xb,-1.5,-1.2,-2,top); F.box(xa,xb,0,top,-1.5,-1.2,wood,2); } // stringer: closes the side under the stair
  // the cellar stair: kitchen floor at x -44.5 down to the cellar at x -56.5 (y -7), z -12.6..-9.6
  addHole(-56.5,-44.5,-12.6,-9.6); addRamp(-56.5,-44.5,-12.6,-9.6,'x',LV.UNDER,0);
  addColY(-56.5,-46,-9.6,-9.2,-11,1.1); // north side: underground wall + ground-floor parapet in one box
  addColY(-56.5,-44.5,-13.0,-12.6,-11,-.1);
  { const U=lvBuilder(); for(let i=0;i<22;i++){ const x1=-44.5-i*12/22, x0=x1-12/22, h=-7*(i+1)/22; U.box(x0,x1,h-.3,h+7/22,-12.6,-9.6,0x7a7068,3); }
    U.box(-56.5,-44.5,-11,-.05,-13.0,-12.6,0x6a6058); U.box(-56.5,-46,-7.3,1.1,-9.6,-9.2,0x6a6058);
    lvAdd(U.done([[-50,-3,-11,10,1.4,0xffa860],[-45,1.5,-11,6,.8,0xffa860]],.26,2.4,null,-2.2),lvMat(stoneTex,0xffffff),UNDER,true); }
  LVIS.near.push({x:-44.5,z:-11,r:28});
  addLevelZone('K',-58.4,-30.6,-26.4,2.4,-2.5,2.5);
  addLevelZone('L',-58.4,-30.6,-26.4,2.4,2.5,40); addLevelZone('L',-30.6,-27,-24.4,-15.6,2.5,40);
  // props (graybox): map table, radio desk, kitchen range, beds, bell frame
  F.box(-38,-34.5,0,.9,-21,-18.5,wood); addColY(-38,-34.5,-21,-18.5,-2,.95);           // map table
  F.box(-56.8,-55,0,1,-24,-19,wood); F.box(-56.8,-56.2,1,1.8,-23.6,-20,0x4a4a44); addColY(-57,-55,-24,-19,-2,1.8); // radio desk + set
  F.box(-56.8,-54.8,0,1.1,-1,1,0x3a3632); addColY(-56.8,-54.8,-1,1,-2,1.2);             // kitchen range
  for(const z0 of [-24.5,-20.5,-10.5,-6.5]){ F.box(-57.2,-55.2,UF0,UF0+.6,z0,z0+1,wood); addColY(-57.2,-55.2,z0,z0+1,UF0,UF0+.65); } // cots
  for(const [x,z] of [[-37,-22],[-33,-16]]) F.box(x-.15,x+.15,UF0,UF0+3.2,z-.15,z+.15,wood);   // bell frame posts
  F.box(-37.15,-32.85,UF0+3.2,UF0+3.45,-22.15,-15.85,wood);
  const BELL=new THREE.Mesh(new THREE.CylinderGeometry(.3,.6,.9,10,1,true),L({color:0x8a6a30,side:THREE.DoubleSide})); BELL.position.set(-35,UF0+2.5,-19); CHATEAU.add(BELL); LVL.bell=BELL;
  const lights=[[-36,2.9,-7,12,1.0,0xffb060],[-36,2.9,-20,12,.9,0xffb060],[-50,2.9,-20,12,.9,0xffa850],[-50,2.9,-5,11,.9,0xffa850],[-36,7.2,-7,12,.8,0xffc080],[-50,7.2,-19,12,.8,0xffc080],[-50,7.2,-5,10,.7,0xffc080]];
  const sun={dir:[.4,.8,.35],k:.28};
  lvAdd(B.done(lights,.36,2.6,sun),lvMat(stoneTex,0xffffff),CHATEAU,true);
  lvAdd(F.done(lights,.34,1.6,sun),lvMat(plankTex,0xffffff),CHATEAU,true);
  lvGlows(lights.map(l=>[l[0],l[1],l[2]]),CHATEAU);
  // zombie windows: radio room (west), kitchen (north), map room (south)
  LVL.windows.push(makeWindow(-58,-19,-1,0),makeWindow(-50,2,0,1),makeWindow(-36,-26,0,-1));
  lvDoor('chateau',-30,-11,false,1000,'C','K','the château','THE CHÂTEAU');
  const cellarDoor=lvDoor('cellar',-44.2,-11.1,false,750,'K','U2','the cellar','CELLAR',{y:0,w:3.4,verb:'Pry open the hatch to'});
  addPortal({id:'cellarStair',a:'K',b:'U2',door:cellarDoor,ax:-43.2,ay:0,az:-11.1,bx:-58,by:LV.UNDER,bz:-11.1,x0:-56.5,x1:-44.5,z0:-12.6,z1:-9.6});
  addMarker('chateau.wallbuy.hall',{x:-31.2,y:0,z:-4,ry:-Math.PI/2,kind:'wallbuy',zone:'K',note:'hall, inside the east wall north of the entrance'});
  addMarker('chateau.wallbuy.upper',{x:-41.4,y:UF0,z:-20,ry:Math.PI/2,kind:'wallbuy',zone:'L',note:'bell room, west wall'});
  addMarker('chateau.perk.kitchen',{x:-52,y:0,z:1,ry:Math.PI,kind:'perk',zone:'K',note:'kitchen, against the north wall'});
  addMarker('chateau.perk.quarters',{x:-56.8,y:UF0,z:-15,ry:Math.PI/2,kind:'perk',zone:'L',note:'south quarters, west wall'});
  addMarker('chateau.radio',{x:-55.8,y:0,z:-21.5,kind:'puzzle',zone:'K',note:'radio desk (switch / receiver puzzle)'});
  addMarker('chateau.maptable',{x:-36.2,y:.9,z:-19.7,kind:'puzzle',zone:'K',note:'map table top'});
  addMarker('chateau.safe',{x:-56.5,y:UF0,z:-.5,kind:'puzzle',zone:'L',note:'north quarters, officers\' safe spot'});
  addMarker('chateau.bell',{x:-35,y:UF0+2.5,z:-19,kind:'puzzle',zone:'L',note:'bell (LVL.bell mesh), shootable anchor'});
  addMarker('chateau.balcony',{x:-28.8,y:UF0,z:-20,kind:'puzzle',zone:'L',note:'balcony over the dig'});
  addMarker('chateau.drophole',{x:-48.75,y:UF0,z:-4.75,kind:'drop',zone:'L',note:'broken floor: one-way drop into the kitchen'});
}

/* ---------------------------------------------------------------- THE UNDERWORKS (y -7; vault y -10) */
// room: floor slab, ceiling, perimeter walls 0.6 thick outside the rectangle with gaps per side
function lvRoom(B,x0,x1,z0,z1,fy,cy,gaps,col,o={}){ const t=.6, wy0=-11, wy1=o.wy1||-2.6;
  if(!o.noFloor){ addSlab(x0,x1,z0,z1,fy,{ceil:false}); B.box(x0,x1,fy-.3,fy,z0,z1,o.floorCol||0x6e665c,3); }
  addCeil(x0,x1,z0,z1,cy); B.box(x0-t,x1+t,cy,cy+.4,z0-t,z1+t,0x5a544c,4);
  const g=k=>(gaps[k]||[]).map(a=>[a[0],a[1],cy+1]);
  lvWall(B,'x',z0-t/2,t,x0-t,x1+t,fy-.3,cy,g('s'),col,wy0,wy1); lvWall(B,'x',z1+t/2,t,x0-t,x1+t,fy-.3,cy,g('n'),col,wy0,wy1);
  lvWall(B,'z',x0-t/2,t,z0,z1,fy-.3,cy,g('w'),col,wy0,wy1); lvWall(B,'z',x1+t/2,t,z0,z1,fy-.3,cy,g('e'),col,wy0,wy1); }
{ const B=lvBuilder(), rock=0xcabda8, brick=0xd0ae94, bone=0xe8dcc0, U=LV.UNDER;
  // pump room (U1) and the collapsed shaft stair from the dig (x -6 at ground down to x 8 at -7, z -24..-20.4)
  lvRoom(B,8,24,-30,-14,U,-2.8,{w:[[-24,-20.4]],s:[[12,16]],e:[[-24,-20]]},brick);
  addHole(-6,8,-24,-20.4); addRamp(-6,8,-24,-20.4,'x',0,U);
  for(const [z0,z1] of [[-24.4,-24],[-20.4,-20]]){ addColY(-6,8,z0,z1,-11,1.1); B.box(-6,8,U-.3,1.1,z0,z1,rock); }
  addColY(8,8.4,-24.4,-20,-2.8,1.1); B.box(8,8.4,-2.8,1.1,-24.4,-20,rock);
  for(let i=0;i<28;i++){ const x0=-6+i*.5, h=U*(i+1)/28; B.box(x0,x0+.5,h-.35,h+.25,-24,-20.4,0x7a7064,3); }
  for(const x of [-4,0,4]) B.box(x-.12,x+.12,-.2,.05,-24.6,-19.8,0x4a3420);                     // fallen shaft timbers
  LVIS.near.push({x:-6,z:-22.2,r:24},{x:2,z:-22.2,r:16});
  addLevelZone('U1',8,24,-30,-14,-12,-2.5); addLevelZone('U1',-6,8,-24,-20.4,-12,-2.5);
  // pump machinery (graybox): boiler, pipes, catwalk rail
  B.box(16,21,U,U+2.6,-17.5,-15,0x5a5a56); addColY(16,21,-17.5,-15,-11,U+2.7);
  for(const x of [10,13]) B.box(x-.25,x+.25,U,-2.8,-14.6,-14.1,0x6a5a4a);
  B.box(9,22,-3.6,-3.3,-14.4,-14.1,0x6a5a4a);
  // tunnel A (south from the pump room), tunnel B (west, rail tunnel), corridor north to the cellar, cellar
  lvRoom(B,12,16,-42,-30,U,-3,{n:[[12,16]],w:[[-42,-38]]},rock);
  lvRoom(B,-64,12,-42,-38,U,-3,{e:[[-42,-38]],n:[[-64,-60]],s:[[-26,-22]]},rock);
  lvRoom(B,-64,-60,-38,-16,U,-3,{s:[[-64,-60]],n:[[-64,-60]]},rock);
  lvRoom(B,-66,-56.5,-16,-6,U,-3,{s:[[-64,-60]],e:[[-12.6,-9.6]]},brick);
  for(const z of [-39.3,-40.7]) B.box(-63,11,U,U+.12,z-.06,z+.06,0x3a3634,6);                      // rails
  for(let x=-62;x<11;x+=1.6) B.box(x-.12,x+.12,U,U+.06,-41.2,-38.8,0x4a3420,6);                    // sleepers
  B.box(-30,-27.6,U+.3,U+1.5,-40.8,-39.2,0x5a4a3a); addColY(-30,-27.6,-40.8,-39.2,-11,U+1.6);     // rail cart
  addLevelZone('U2',12,16,-42,-30,-12,-2.5); addLevelZone('U2',-64,12,-42,-38,-12,-2.5); addLevelZone('U2',-64,-60,-38,-16,-12,-2.5); addLevelZone('U2',-66,-56.5,-16,-6,-12,-2.5); addLevelZone('U2',-56.5,-44.5,-12.6,-9.6,-12,-2.5);
  // ossuary (U3) through a short passage; bone niches along the walls
  lvRoom(B,-26,-22,-46,-42,U,-3,{n:[[-26,-22]],s:[[-26,-22]]},rock);
  lvRoom(B,-34,-14,-60,-46,U,-2.2,{n:[[-26,-22]],s:[[-26,-22]]},bone);
  for(let i=0;i<9;i++){ const z=-58+i*1.5; B.box(-33.95,-33.4,U+.6,U+1.4,z,z+1,0x3a342c); B.box(-14.6,-14.05,U+.6,U+1.4,z,z+1,0x3a342c); }
  B.box(-26,-22,U,U+1.1,-55,-53,0x8a8070); addColY(-26,-22,-55,-53,-11,U+1.2);                               // altar
  addLevelZone('U3',-26,-22,-46,-42,-12,-2.5); addLevelZone('U3',-34,-14,-60,-46,-12,-2.5);
  // the deep vault (U5): ramp down from the ossuary to y -10, tall chamber for the finale
  addRamp(-26,-22,-66,-60,'z',-10,U); for(let i=0;i<12;i++){ const z1=-60-i*.5, h=U-3*(i+1)/12; B.box(-26,-22,h-.3,h+.25,z1-.5,z1,0x6a6258,3); }
  for(const x of [-26.6,-21.4]){ addColY(x-.3,x+.3,-66,-60,-11,-.6); B.box(x-.3,x+.3,-10.3,-2.2,-66,-60,rock); } addCeil(-26,-22,-66,-60,-2.2);
  lvRoom(B,-40,-16,-84,-66,-10,-1,{n:[[-26,-22]]},0x7a7480,{wy1:-.6});
  B.box(-31,-25,-10,-9.6,-78,-72,0x8a8090); for(const [x,z] of [[-36,-70],[-20,-70],[-36,-80],[-20,-80]]){ B.box(x-.6,x+.6,-10,-1,z-.6,z+.6,0x6a6470); addColY(x-.6,x+.6,z-.6,z+.6,-11,-.6); }
  addLevelZone('U5',-26,-22,-66,-60,-12,-2.5); addLevelZone('U5',-40,-16,-84,-66,-12,-2.5);
  // flooded gallery (U4): water bed at -7.4, walkways at -7
  lvRoom(B,24,46,-32,-12,-7.4,-2.6,{w:[[-24,-20]]},brick,{floorCol:0x3a3c3a});
  for(const [x0,x1,z0,z1] of [[24,46,-23,-21],[33,35,-32,-12],[24,46,-14,-12]]){ addSlab(x0,x1,z0,z1,U,{ceil:false}); B.box(x0,x1,U-.25,U,z0,z1,0x7a6048,3); }
  addLevelZone('U4',24,46,-32,-12,-12,-2.5);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(22,20),new THREE.MeshBasicMaterial({color:0x1e3a40,transparent:true,opacity:.62,depthWrite:false})); water.rotation.x=-Math.PI/2; water.position.set(35,-7.12,-22); UNDER.add(water);
  // spawn grates
  for(const k in LEVEL_SPAWNS) for(const s of LEVEL_SPAWNS[k]) B.box(s[0]-.6,s[0]+.6,s[2],s[2]+.04,s[1]-.6,s[1]+.6,0x262422,2);
  // doors: debris at the shaft top, then the tunnel network (the vault door is sealed for the quest lane)
  const shaftDoor=lvDoor('shaft',-6.6,-22.2,false,1250,'C','U1','the collapsed shaft','COLLAPSED SHAFT',{w:4,debris:true,verb:'Dig through the rubble to'});
  addPortal({id:'shaftStair',a:'C',b:'U1',door:shaftDoor,ax:-7.6,ay:0,az:-22.2,bx:9.6,by:U,bz:-22.2,x0:-6,x1:8,z0:-24,z1:-20.4});
  lvDoor('pumpTunnel',14,-30.2,true,1000,'U1','U2','the rail tunnel','RAIL TUNNEL',{y:U,w:4});
  lvDoor('ossuary',-24,-42.2,true,1250,'U2','U3','the ossuary','OSSUARY',{y:U,w:4});
  lvDoor('gallery',24.2,-22,false,1000,'U1','U4','the flooded gallery','FLOODED GALLERY',{y:U,w:4});
  lvDoor('vault',-24,-60.2,true,0,'U3','U5','the deep vault','DEEP VAULT',{y:U,w:4,locked:true,lockedText:'!A sealed vault door. It answers to no coin'});
  const lights=[[12,-3.8,-17,11,1.1,0xffb060],[20,-3.8,-27,11,1,0xffb060],[10,-3.8,-25,8,.8,0xffb060],[2,-1.5,-22,12,.7,0xffc080],
    [14,-3.9,-36,9,.9,0xffa850],[-58,-4,-40,10,.9,0xffa850],[-46,-4,-40,10,.9,0xffa850],[-34,-4,-40,10,.9,0xffa850],[-22,-4,-40,10,.9,0xffa850],[-10,-4,-40,10,.9,0xffa850],[2,-4,-40,10,.9,0xffa850],
    [-62,-4,-27,10,.9,0xffa850],[-61,-4.5,-11,10,1,0xffb070],
    [-24,-3.5,-44,8,.7,0xd8e8c0],[-30,-4.5,-50,10,.9,0xd8e8c0],[-18,-4.5,-56,10,.9,0xd8e8c0],[-24,-3.5,-53,9,.8,0xe8f0d0],
    [-24,-4,-63,8,.7,0xc06050],[-28,-3,-75,20,1.2,0xc04838],[-20,-6,-80,10,.8,0x60c0d0],[-36,-6,-70,10,.8,0x60c0d0],
    [29,-4,-16,10,.9,0x80b0d0],[40,-4,-28,11,.9,0x80b0d0],[34,-4,-22,10,.8,0x90c0d8]];
  lvAdd(B.done(lights.map(l=>[l[0],l[1],l[2],l[3]*1.25,l[4]*1.35,l[5]]),.24,2.2,null,-2.2),lvMat(stoneTex,0xffffff),UNDER,true);
  lvGlows(lights.map(l=>[l[0],l[1],l[2]]),UNDER);
  addMarker('under.pump.valve',{x:12,y:U,z:-14.6,kind:'switch',zone:'U1',note:'pipe valve on the north wall'});
  addMarker('under.pump.perk',{x:23.4,y:U,z:-16,ry:-Math.PI/2,kind:'perk',zone:'U1',note:'east wall, north end'});
  addMarker('under.pump.wallbuy',{x:8.6,y:U,z:-27,ry:Math.PI/2,kind:'wallbuy',zone:'U1',note:'west wall, south of the stair'});
  addMarker('under.rail.cart',{x:-28.8,y:U+1.5,z:-40,kind:'puzzle',zone:'U2',note:'rail cart (push / ride puzzle)'});
  addMarker('under.rail.wallbuy',{x:-40,y:U,z:-37.6,ry:Math.PI,kind:'wallbuy',zone:'U2',note:'rail tunnel, north wall'});
  addMarker('under.cellar.shelf',{x:-65.4,y:U,z:-11,kind:'puzzle',zone:'U2',note:'wine cellar, west wall'});
  addMarker('under.ossuary.altar',{x:-24,y:U+1.1,z:-54,kind:'puzzle',zone:'U3',note:'altar top'});
  addMarker('under.ossuary.niches',{x:-33.7,y:U+1,z:-52,kind:'puzzle',zone:'U3',note:'bone niches, west wall (9 slots)'});
  addMarker('under.ossuary.perk',{x:-14.6,y:U,z:-47,ry:-Math.PI/2,kind:'perk',zone:'U3',note:'east wall, north end'});
  addMarker('under.gallery.sluice',{x:45.4,y:U,z:-22,kind:'switch',zone:'U4',note:'sluice wheel at the end of the walkway'});
  addMarker('under.gallery.wallbuy',{x:34,y:U,z:-12.6,ry:Math.PI,kind:'wallbuy',zone:'U4',note:'north walkway wall'});
  addMarker('under.vault.dais',{x:-28,y:-9.6,z:-75,kind:'boss',zone:'U5',note:'centre of the raised dais: finale / boss arena'});
  addMarker('under.vault.bossSpawn',{x:-28,y:-10,z:-81,kind:'boss',zone:'U5',note:'boss entry point'});
  addMarker('under.vault.seal',{x:-24,y:U,z:-60.2,kind:'door',zone:'U3',note:'LVL.doors.vault (locked: set d.locked=false or call openDoor)'});
}

// the ground plane gets real holes where stairwells cut down (same UV mapping as the original plane)
{ const size=320, h=size/2, sh=new THREE.Shape([new THREE.Vector2(-h,-h),new THREE.Vector2(h,-h),new THREE.Vector2(h,h),new THREE.Vector2(-h,h)]);
  for(const o of HOLES) sh.holes.push(new THREE.Path([new THREE.Vector2(o.x0,-o.z1),new THREE.Vector2(o.x0,-o.z0),new THREE.Vector2(o.x1,-o.z0),new THREE.Vector2(o.x1,-o.z1)]));
  const g=new THREE.ShapeGeometry(sh), p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i,p.getX(i)/size+.5,p.getY(i)/size+.5);
  ground.geometry.dispose(); ground.geometry=g; }
