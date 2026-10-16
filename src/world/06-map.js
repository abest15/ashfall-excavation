/* ================= map ================= */
const HX=220, HZ=0;
const ZONES={
  A:{name:'Spawn bunker', c:{x:0,z:40}, open:true},
  B:{name:'The trenches', c:{x:0,z:17}, open:false},
  C:{name:'The dig', c:{x:-10,z:-12}, open:false},
  D:{name:'Generator yard', c:{x:25,z:-12}, open:false},
  E:{name:'The chapel', c:{x:45,z:17}, open:false},
  G:{name:"No man's land", c:{x:70,z:-12}, open:false},
  H:{name:'The Hollow', c:{x:HX,z:HZ}, open:true},
};
function zoneOf(x,z){
  if(x>150) return 'H';
  if(x>-10&&x<10&&z>30&&z<50) return 'A';
  if(x>-30&&x<30&&z>5&&z<30) return 'B';
  if(x>-30&&x<10&&z>-30&&z<5) return 'C';
  if(x>10&&x<40&&z>-30&&z<5) return 'D';
  if(x>30&&x<60&&z>5&&z<30) return 'E';
  if(x>40&&x<100&&z>-30&&z<5) return 'G';
  return null;
}

// ground
const ground=new THREE.Mesh(new THREE.PlaneGeometry(320,320),M.mud); ground.rotation.x=-Math.PI/2; scene.add(ground); addSolid(ground);

// ---- shared prop shapes (instanced): burlap sandbags, slatted crates
const burlapTex=makeTex(64,(g,s)=>{ g.fillStyle='#a89a78'; g.fillRect(0,0,s,s); for(let i=0;i<s;i+=2){ g.fillStyle='rgba(60,50,34,.25)'; g.fillRect(i,0,1,s); g.fillRect(0,i,s,1); }
  speckle(g,s,300,['#6a5c44','#c8b894','#5a4c36'],1,2); for(let i=0;i<4;i++){ g.fillStyle=`rgba(40,30,20,${rand(.2,.4)})`; g.beginPath(); g.ellipse(rand(0,s),rand(0,s),rand(5,14),rand(3,9),rand(0,3),0,7); g.fill(); } });
function bagGeo(w,h){ const g=new THREE.SphereGeometry(1,w,h), p=g.attributes.position; for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i); y=clamp(y,-.6,.6); const end=Math.max(0,Math.abs(x)-.75)*2.2; z*=1-end*.6; y*=1-end*.4;
    const j=(hash3(x*3,y*3,z*3)-.5)*.08; p.setXYZ(i,x*.31,(y+j)*.15,(z+j)*.17); } g.computeVertexNormals(); return g; }
const BAG_MAT=L({map:burlapTex});
const BAGS=batch(bagGeo(QUAL===2?11:8,QUAL===2?6:5),BAG_MAT), TOPBAGS=batch(bagGeo(7,4),BAG_MAT,{cell:30});
const bagCol=()=>new THREE.Color().setHSL(.1+rand(-.015,.015),rand(.18,.3),rand(.33,.45)).getHex();
// lay sandbags in a running bond along a line (len metres, rows deep, courses high) centred at x,z
function layBags(b,x,y0,z,len,horiz,rows,courses,depth){ const n=Math.max(1,Math.round(len/.6)), step=len/n;
  for(let c=0;c<courses;c++) for(let r=0;r<rows;r++){ const off=(c%2)*step*.5, rr=rows>1?(r/(rows-1)-.5)*depth:0;
    for(let i=0;i<n-(c%2?1:0);i++){ const a=-len/2+step*(i+.5)+off+rand(-.03,.03), px=horiz?x+a:x+rr+rand(-.02,.02), pz=horiz?z+rr+rand(-.02,.02):z+a;
      batchAdd(b,px,y0+.075+c*.15,pz,(horiz?0:Math.PI/2)+rand(-.08,.08),[step/.6*rand(.95,1.05),rand(.9,1.1),rand(.95,1.08)],bagCol(),rand(-.04,.04),rand(-.05,.05)); } } }
const STONES=batch(new THREE.BoxGeometry(1,1,1),L({map:stoneTex}),{shadow:QUAL===2,cell:30});
// wall pieces are merged per material and per 40 m cell (world-space UVs keep the texture scale), so the whole
// trench network costs a handful of draw calls instead of one per piece
const WALLSETS={earth:{tex:plankRevTex,col:0xffffff,u:4,v:3.4},iron:{tex:ironTex,col:0xc8c4bc,u:2.4,v:3.4},wicker:{tex:wickerTex,col:0xffffff,u:2.2,v:1.7},bags:{tex:sandTex,col:0xe0d8c8,u:1.6,v:.9},stone:{tex:stoneTex,col:0x8f8a80,u:4,v:3.4},cap:{tex:stoneTex,col:0x77736b,u:4,v:3.4},sand:{tex:sandTex,col:0xffffff,u:1.6,v:.5}};
const WALLGEO=new Map();
function wallPiece(k,w,h,d,x,y,z){ const g=new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); const p=g.attributes.position, n=g.attributes.normal, uv=g.attributes.uv, S_=WALLSETS[k];
  for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)), ay=Math.abs(n.getY(i)); if(ay>.5) uv.setXY(i,p.getX(i)/S_.u,p.getZ(i)/S_.u); else if(ax>.5) uv.setXY(i,p.getZ(i)/S_.u,p.getY(i)/S_.v); else uv.setXY(i,p.getX(i)/S_.u,p.getY(i)/S_.v); }
  const key=k+'|'+Math.floor(x/40)+','+Math.floor(z/40); if(!WALLGEO.has(key)) WALLGEO.set(key,[]); WALLGEO.get(key).push(g); }
function flushWalls(){ const mats={}; for(const [key,list] of WALLGEO){ const k=key.split('|')[0], S_=WALLSETS[k]; if(!mats[k]){ const t=S_.tex.clone(); t.needsUpdate=true; t.repeat.set(1,1); mats[k]=L({map:t,color:S_.col}); }
    const m=new THREE.Mesh(mergeGeos(list),mats[k]); m.geometry.deleteAttribute('sway'); m.geometry.deleteAttribute('color'); m.castShadow=m.receiveShadow=QUAL===2; scene.add(m); addSolid(m); } WALLGEO.clear(); }
const REVPOSTS=batch(new THREE.CylinderGeometry(.08,.1,3.5,6),L({color:0xffffff,map:plankTex}),{cell:40}), PICKETS=batch(new THREE.CylinderGeometry(.03,.04,.9,5),L({color:0xffffff}),{cell:40}), WIRECOIL=batch(new THREE.TorusGeometry(.3,.012,3,10),L({color:0xffffff}),{cell:40});
// walls
const postMats=[];
function wall(x1,z1,x2,z2,ops=[],o={}){
  // ops: centres of window openings along the wall (2.2 wide, sill at 0.9, lintel from 2.5)
  const T=1.2,H=o.h||3.4, horiz=z1===z2, len=horiz?Math.abs(x2-x1):Math.abs(z2-z1);
  const lo=horiz?Math.min(x1,x2):Math.min(z1,z2), a0=lo-T/2, a1=lo+len+T/2, fx=horiz?z1:x1;
  const tex=o.stone?stoneTex:earthTex, tint=o.stone?0x8f8a80:0xffffff;
  const seg=(k,s0,s1,y0,y1)=>{ const l=s1-s0, h=y1-y0, c=(s0+s1)/2; wallPiece(k,horiz?l:T,h,horiz?T:l,horiz?c:fx,y0+h/2,horiz?fx:c); };
  // earthen walls alternate revetment types in 3-7 m sections; window surrounds stay planked
  const piece=(s0,s1,y0,y1)=>{ const l=s1-s0, h=y1-y0; if(l<=.02||h<=.02) return; if(o.stone) return seg('stone',s0,s1,y0,y1);
    if(y0>0||y1<H||l<3) return seg('earth',s0,s1,y0,y1);
    const kinds=QUAL?['earth','earth','iron','wicker','bags']:['earth','earth','iron']; let a=s0;
    while(a<s1-.01){ let b=Math.min(s1,a+rand(3,7)); if(s1-b<1.5) b=s1; const k=pick(kinds); seg(k,a,b,y0,y1);
      if(QUAL&&k!=='earth'){ const at=b-.12; for(const side of [-1,1]) batchAdd(REVPOSTS,horiz?at:fx+side*.66,H/2,horiz?fx+side*.66:at,rand(-.2,.2),[1,1,1],0x4a3420,rand(-.05,.05),rand(-.05,.05)); }
      a=b; } };
  let cur=a0; for(const c of ops.slice().sort((p,q)=>p-q)){ piece(cur,c-1.1,0,H); piece(c-1.1,c+1.1,0,.9); piece(c-1.1,c+1.1,2.5,H); cur=c+1.1; } piece(cur,a1,0,H);
  const cx=(x1+x2)/2, cz=(z1+z2)/2, w=horiz?len+T:T, d=horiz?T:len+T; addCol(cx,cz,w,d);
  if(o.stone){ wallPiece('cap',w+.3,.35,d+.3,cx,H+.17,cz);
    const L_=horiz?w:d; for(let a=-L_/2+.3;a<L_/2-.2;a+=rand(.5,.9)){ if(Math.random()<.3) continue; const hh=rand(.15,.7)*(Math.random()<.15?2:1), px=horiz?cx+a:cx+rand(-.2,.2), pz=horiz?cz+rand(-.2,.2):cz+a;
      batchAdd(STONES,px,H+.35+hh/2,pz,rand(-.2,.2),[rand(.45,.8),hh,rand(.7,1.2)],new THREE.Color().setHSL(.09,.06,rand(.42,.58)).getHex(),rand(-.08,.08),rand(-.08,.08)); }
    return; }
  if(QUAL===2){ const hb=box(w+0.35,0.5,d+0.35,M.sand,cx,H+0.22,cz,{solid:true}); hb.visible=false; box(w+.1,.12,d+.1,M.hill,cx,H+.06,cz,{}); layBags(TOPBAGS,cx,H+.08,cz,(horiz?w:d)+.2,horiz,2,1,.62); layBags(TOPBAGS,cx,H+.08+.15,cz,(horiz?w:d)-.2,horiz,1,1,0); }
  else wallPiece('sand',w+0.35,0.5,d+0.35,cx,H+0.22,cz);
  for(let k=0;k<=len;k+=6){ const along=lo+k; if(ops.some(c=>Math.abs(c-along)<1.5)) continue; const px=horiz?along:x1, pz=horiz?z1:along;
    for(const side of [-1,1]){ const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rand(-.06,.06),rand(0,3),rand(-.06,.06))); m.setPosition(px+(horiz?0:side*0.68),1.9,pz+(horiz?side*0.68:0)); postMats.push(m);} }
  // barbed-wire pickets along some wall tops (Medium and High)
  if(QUAL&&Math.random()<.7){ const L_=(horiz?w:d)-1, n=Math.floor(L_/2.6); for(let i=0;i<=n;i++){ const a=-L_/2+i*L_/Math.max(1,n), px=horiz?cx+a:cx, pz=horiz?cz:cz+a, yb=H+(QUAL===2?.4:.45);
      batchAdd(PICKETS,px,yb+.45,pz,rand(0,3),[1,rand(.85,1.1),1],0x3a2a1a,rand(-.12,.12),rand(-.12,.12));
      if(i<n) for(let j=0;j<4;j++){ const t=(j+.5)/4, wx=horiz?px+t*L_/n:px, wz=horiz?pz:pz+t*L_/n; batchAdd(WIRECOIL,wx,yb+.55+rand(-.05,.05),wz,horiz?Math.PI/2:0,rand(.85,1.1),0x3a3a3a,rand(-.2,.2)); } } }
}
wall(-10,30,-10,50,[40]); wall(10,30,10,50); wall(-10,50,10,50,[2]);
wall(-30,30,-3,30); wall(3,30,30,30,[25]);
wall(-30,5,-30,30,[22]); wall(30,5,30,13.5); wall(30,19.5,30,30);
wall(-30,5,-15,5); wall(-9,5,17,5); wall(23,5,40,5);
wall(-30,-30,-30,5,[-18]); wall(-30,-30,40,-30,[-14,16,36]); wall(40,-30,40,-13); wall(40,-7,40,5);
wall(10,-30,10,-12); wall(10,-6,10,5);
// the chapel: stone walls, taller
wall(30,30,60,30,[34,46],{stone:true,h:5}); wall(60,5,60,30,[],{stone:true,h:5}); wall(40,5,47,5,[],{stone:true,h:5}); wall(53,5,60,5,[],{stone:true,h:5});
// no man's land
wall(40,-30,100,-30,[60,85]); wall(100,-30,100,5,[-12]); wall(60,5,100,5,[80]);
flushWalls();
{ const pm=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09,0.11,3.8,5),M.wood,postMats.length); postMats.forEach((m,i)=>pm.setMatrixAt(i,m)); pm.frustumCulled=false; scene.add(pm); }

// distant scenery
for(let i=0;i<26;i++){ const a=i/26*Math.PI*2, r=rand(112,145); const h=rand(10,26); const m=new THREE.Mesh(new THREE.ConeGeometry(rand(16,30),h,6),M.hill); m.position.set(Math.cos(a)*r+30,h/2-2,Math.sin(a)*r+5); scene.add(m); }
function deadTree(x,z,s){ const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(s); scene.add(g);
  cyl(0.12,0.28,5,M.tree,0,2.5,0,6,g); for(let i=0;i<4;i++){ const b=cyl(0.04,0.09,rand(1.4,2.4),M.tree,0,rand(2.8,4.5),0,4,g); b.rotation.z=rand(.6,1.2)*(i%2?1:-1); b.rotation.y=rand(0,6); b.position.x=Math.sin(b.rotation.z)*-0.6; } }
[[-45,20,1.3],[-50,-10,1.6],[-38,38,1.4],[22,42,1.2],[-20,62,1.5],[25,60,1.3],[-40,-45,1.7],[20,-48,1.4],[0,-50,1.2],[75,-45,1.5],[110,-10,1.4],[70,20,1.3],[52,42,1.2]].forEach(a=>deadTree(...a));
// ruined bell tower silhouette
{ const g=new THREE.Group(); g.position.set(-62,0,-38); scene.add(g); box(6,18,6,M.stone,0,9,0,{parent:g}); box(7,1,7,M.stone,0,18.5,0,{parent:g}); box(2,6,7,M.stone,-2,22,0,{parent:g}); box(1,3,4,M.dark,0,14,3.01,{parent:g}); }

// ---- doors
const DOORS=[];
const plankGeo=new THREE.BoxGeometry(6.4,0.36,0.12), DOOR_MAT=L({map:plankTex,vertexColors:true});
function makeDoor(x,z,alongX,cost,a,b,label,sign){
  const g=new THREE.Group(); g.position.set(x,0,z); if(!alongX) g.rotation.y=Math.PI/2; scene.add(g);
  { const b=GB(); for(let i=0;i<5;i++) b.add(plankGeo,0xffffff,{p:[0,0.45+i*0.62,(i%2)*0.1],r:[0,0,rand(-.07,.07)],grime:.15}); for(const s of [-1,1]) b.add(plankGeo,0xd8d0c0,{p:[0,1.7,0.18],r:[0,0,0.42*s],s:[1.05,1,1]});
    g.add(new THREE.Mesh(b.done(),DOOR_MAT)); const w=GB(); for(let i=-2;i<=2;i++) w.add(new THREE.TorusGeometry(0.35,0.025,4,12),0xffffff,{p:[i*1.2,3.35,0],r:[0,Math.PI/2,0]}); g.add(new THREE.Mesh(w.done(),M.wire)); }
  const sg=makeLabel(sign,{sx:2.6,size:52,color:'#e8d6a8'}); sg.position.set(0,2.2,0.6); g.add(sg);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(6.4,3.6,0.6),M.plank); hit.position.y=1.8; hit.visible=false; g.add(hit); addSolid(hit);
  const col=alongX?{minX:x-3.2,maxX:x+3.2,minZ:z-0.5,maxZ:z+0.5,on:true}:{minX:x-0.5,maxX:x+0.5,minZ:z-3.2,maxZ:z+3.2,on:true};
  colliders.push(col);
  const d={x,z,cost,a,b,label,open:false,g,col,hit,anim:0}; DOORS.push(d);
  addInter({x,z,r:3.4,prompt:()=>d.open?null:`Clear the barricade to ${label} [${cost}]`,use:()=>{ if(d.open)return; if(!spend(cost))return; netDoor(d); }});
}
function openDoor(d){ d.open=true; d.anim=1; d.col.on=false; removeSolid(d.hit); ZONES[d.a].open=true; ZONES[d.b].open=true; sfx.door(); }
makeDoor(0,30,true,750,'A','B','the trenches','TO THE TRENCHES');
makeDoor(-12,5,true,1000,'B','C','the dig','TO THE DIG');
makeDoor(20,5,true,1000,'B','D','the generator yard','GENERATOR YARD');
makeDoor(10,-9,false,750,'C','D','the generator yard','GENERATOR YARD');
makeDoor(30,16.5,false,1250,'B','E','the chapel','THE CHAPEL');
makeDoor(40,-10,false,1250,'D','G',"no man's land","NO MAN'S LAND");
makeDoor(50,5,true,1000,'E','G',"no man's land","NO MAN'S LAND");

// ---- props
const CRATE_GEO=(()=>{ const b=GB(), W=1.1, e=.07, h=W/2, lt=0xc9b08a, dk=0x8a6a48;
  b.add(new THREE.BoxGeometry(W-.04,W-.04,W-.04),lt,{grime:.15});
  for(const a of [-1,1]) for(const c of [-1,1]){ b.add(new THREE.BoxGeometry(e,W,e),dk,{p:[a*(h-e/2),0,c*(h-e/2)]}); b.add(new THREE.BoxGeometry(W,e,e),dk,{p:[0,a*(h-e/2),c*(h-e/2)]}); b.add(new THREE.BoxGeometry(e,e,W),dk,{p:[a*(h-e/2),c*(h-e/2),0]}); }
  for(const c of [-1,1]){ b.add(new THREE.BoxGeometry(e*.8,W*1.25,e*.5),dk,{p:[0,0,c*(h+.005)],r:[0,0,.79]}); b.add(new THREE.BoxGeometry(e*.5,W*1.25,e*.8),dk,{p:[c*(h+.005),0,0],r:[.79,0,0]}); }
  if(QUAL) b.add(new THREE.BoxGeometry(.26,.12,.01),0x2a2018,{p:[.18,.2,h+.012]});
  return b.done(); })();
const CRATES=batch(CRATE_GEO,L({map:plankTex,vertexColors:true}),{shadow:QUAL===2});
function crate(x,z,s=1,ry=0){ const m=box(1.1*s,1.1*s,1.1*s,M.plank,x,0.55*s,z,{ry,solid:true,col:true}); m.visible=false; batchAdd(CRATES,x,.55*s,z,ry,s,new THREE.Color().setHSL(.08,rand(.15,.35),rand(.55,.8)).getHex()); }
function sandbags(x,z,len,horiz){ if(!QUAL){ const s=sandTex.clone(); s.needsUpdate=true; s.repeat.set(len/1.6,1); box(horiz?len:1.1,0.9,horiz?1.1:len,L({map:s}),x,0.45,z,{solid:true,col:true}); return; }
  const hb=box(horiz?len:1.1,0.9,horiz?1.1:len,M.sand,x,0.45,z,{solid:true,col:true}); hb.visible=false; box(horiz?len-.2:.7,.75,horiz?.7:len-.2,M.hill,x,.37,z,{});
  layBags(BAGS,x,0,z,len,horiz,2,6,.72); layBags(BAGS,x,.9,z,len-.3,horiz,1,1,0); }
const LAMP_GEO=(()=>{ const b=GB(), wd=0x4a3420, iron=0x2a2c2a, en=0x2f3b30;
  b.add(new THREE.CylinderGeometry(.065,.095,3.7,SEG(8,5)),wd,{p:[0,1.85,0],grime:.3}); b.add(new THREE.BoxGeometry(.75,.08,.08),wd,{p:[.27,3.52,0]});
  b.add(new THREE.BoxGeometry(.05,.5,.05),wd,{p:[.18,3.28,0],r:[0,0,-.8]}); b.add(new THREE.BoxGeometry(.03,.14,.03),iron,{p:[.5,3.47,0]});
  b.add(new THREE.CylinderGeometry(.05,.24,.16,SEG(12,6),1,true),en,{p:[.5,3.38,0]});
  b.add(new THREE.CylinderGeometry(.055,.055,.05,8),iron,{p:[.5,3.47,0]});
  if(QUAL){ for(let i=0;i<6;i++){ const t=i/5, x=-.1-t*1.6, y=3.6-Math.sin(t*Math.PI)*.35-t*.2; b.add(new THREE.CylinderGeometry(.008,.008,.33,4),0x111111,{p:[x,y,0],r:[0,0,Math.PI/2+(t-.5)*.6]}); }
    b.add(new THREE.BoxGeometry(.12,.16,.08),iron,{p:[-.02,2.9,.08]}); }
  return b.done(); })();
const LAMP_MAT=L({vertexColors:true,side:THREE.DoubleSide});
function lampPost(x,z){ const m=new THREE.Mesh(LAMP_GEO,LAMP_MAT); m.position.set(x,0,z); scene.add(m); const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),M.bulbOff.clone()); bulb.position.set(x+0.5,3.34,z); scene.add(bulb); return bulb; }
// spawn bunker
box(19,0.08,19,M.plank,0,0.04,40,{});
crate(-8.5,32,1); crate(-8.5,33.2,.8,.3); crate(8.3,48.3,1.1); crate(6.9,48.6,.8,.5);
box(1.8,0.9,0.9,M.wood,-4,0.45,48.8,{solid:true,col:true}); box(0.5,0.35,0.35,M.dark,-4.3,1.08,48.8,{}); box(0.08,0.5,0.02,M.metal,-4.1,1.4,48.8,{});
const bulbs=[];
bulbs.push(lampPost(-3,36));
// trenches
sandbags(-18,6.4,10,true); sandbags(8,6.4,6,true); sandbags(-28.4,12,6,false); sandbags(28.4,10,6,false); sandbags(18,28.4,8,true); sandbags(-16,28.4,8,true);
crate(27.5,27.3); crate(-27.5,5.8,.9);
// broken cart
{ const g=new THREE.Group(); g.position.set(-10,0,22); g.rotation.y=0.6; scene.add(g); box(2.6,0.15,1.4,M.plank,0,0.8,0,{parent:g}); box(2.6,0.5,0.08,M.plank,0,1.1,0.7,{parent:g}); const w=cyl(0.55,0.55,0.12,M.wood,1,0.55,0.75,10,g); w.rotation.x=Math.PI/2; w.rotation.z=0.3; addCol(-10,22,2.4,2.0); }
bulbs.push(lampPost(-6,18)); bulbs.push(lampPost(18,14));
// dig site pit & scaffolding
const LODE={x:-10,z:-14};
{ const pit=new THREE.Mesh(new THREE.CircleGeometry(5.5,24),M.pitDark); pit.rotation.x=-Math.PI/2; pit.position.set(LODE.x,0.03,LODE.z); scene.add(pit);
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; const r=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.35,.6)),M.stone); r.position.set(LODE.x+Math.cos(a)*5.6,0.2,LODE.z+Math.sin(a)*5.6); r.rotation.set(rand(0,3),rand(0,3),0); scene.add(r); }
  for(const [dx,dz] of [[-4,-4],[4,-4],[-4,4],[4,4]]){ cyl(0.1,0.12,5,M.wood,LODE.x+dx,2.5,LODE.z+dz,6); }
  box(8.4,0.18,0.18,M.wood,LODE.x,4.8,LODE.z-4,{}); box(8.4,0.18,0.18,M.wood,LODE.x,4.8,LODE.z+4,{}); box(0.18,0.18,8.4,M.wood,LODE.x-4,4.8,LODE.z,{}); box(0.18,0.18,8.4,M.wood,LODE.x+4,4.8,LODE.z,{});
  box(0.04,3,0.04,M.wire,LODE.x,3.3,LODE.z-4,{});
}
crate(-27,4,1); crate(-26.4,-12,.9,.4); crate(7.6,2.6,1);
sandbags(-2,-28.4,6,true);
bulbs.push(lampPost(-19,-20));
// generator yard
crate(38.3,3.4,1); crate(12,3.2,.9,.2); crate(38.5,-18.5,1);
sandbags(28,-28.4,6,true);
bulbs.push(lampPost(30,-10));
