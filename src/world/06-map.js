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

// walls
const postMats=[];
function wall(x1,z1,x2,z2,ops=[],o={}){
  // ops: centres of window openings along the wall (2.2 wide, sill at 0.9, lintel from 2.5)
  const T=1.2,H=o.h||3.4, horiz=z1===z2, len=horiz?Math.abs(x2-x1):Math.abs(z2-z1);
  const lo=horiz?Math.min(x1,x2):Math.min(z1,z2), a0=lo-T/2, a1=lo+len+T/2, fx=horiz?z1:x1;
  const tex=o.stone?stoneTex:earthTex, tint=o.stone?0x8f8a80:0xffffff;
  const piece=(s0,s1,y0,y1)=>{ const l=s1-s0, h=y1-y0; if(l<=.02||h<=.02) return; const t=tex.clone(); t.needsUpdate=true; t.repeat.set(Math.max(1,l/4),Math.max(.35,h/3.4)); const c=(s0+s1)/2;
    box(horiz?l:T,h,horiz?T:l,L({map:t,color:tint}),horiz?c:fx,y0+h/2,horiz?fx:c,{solid:true}); };
  let cur=a0; for(const c of ops.slice().sort((p,q)=>p-q)){ piece(cur,c-1.1,0,H); piece(c-1.1,c+1.1,0,.9); piece(c-1.1,c+1.1,2.5,H); cur=c+1.1; } piece(cur,a1,0,H);
  const cx=(x1+x2)/2, cz=(z1+z2)/2, w=horiz?len+T:T, d=horiz?T:len+T; addCol(cx,cz,w,d);
  if(o.stone){ box(w+.3,.35,d+.3,L({map:stoneTex,color:0x77736b}),cx,H+.17,cz,{solid:true}); return; }
  const sd=sandTex.clone(); sd.needsUpdate=true; sd.repeat.set(Math.max(1,len/1.6),1); box(w+0.35,0.5,d+0.35,L({map:sd}),cx,H+0.22,cz,{solid:true});
  for(let k=0;k<=len;k+=6){ const along=lo+k; if(ops.some(c=>Math.abs(c-along)<1.5)) continue; const px=horiz?along:x1, pz=horiz?z1:along;
    for(const side of [-1,1]){ const m=new THREE.Matrix4(); m.makeTranslation(px+(horiz?0:side*0.68),1.9,pz+(horiz?side*0.68:0)); postMats.push(m);} }
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
{ const pm=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09,0.11,3.8,5),M.wood,postMats.length); postMats.forEach((m,i)=>pm.setMatrixAt(i,m)); scene.add(pm); }

// distant scenery
for(let i=0;i<26;i++){ const a=i/26*Math.PI*2, r=rand(112,145); const h=rand(10,26); const m=new THREE.Mesh(new THREE.ConeGeometry(rand(16,30),h,6),M.hill); m.position.set(Math.cos(a)*r+30,h/2-2,Math.sin(a)*r+5); scene.add(m); }
function deadTree(x,z,s){ const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(s); scene.add(g);
  cyl(0.12,0.28,5,M.tree,0,2.5,0,6,g); for(let i=0;i<4;i++){ const b=cyl(0.04,0.09,rand(1.4,2.4),M.tree,0,rand(2.8,4.5),0,4,g); b.rotation.z=rand(.6,1.2)*(i%2?1:-1); b.rotation.y=rand(0,6); b.position.x=Math.sin(b.rotation.z)*-0.6; } }
[[-45,20,1.3],[-50,-10,1.6],[-38,38,1.4],[22,42,1.2],[-20,62,1.5],[25,60,1.3],[-40,-45,1.7],[20,-48,1.4],[0,-50,1.2],[75,-45,1.5],[110,-10,1.4],[70,20,1.3],[52,42,1.2]].forEach(a=>deadTree(...a));
// ruined bell tower silhouette
{ const g=new THREE.Group(); g.position.set(-62,0,-38); scene.add(g); box(6,18,6,M.stone,0,9,0,{parent:g}); box(7,1,7,M.stone,0,18.5,0,{parent:g}); box(2,6,7,M.stone,-2,22,0,{parent:g}); box(1,3,4,M.dark,0,14,3.01,{parent:g}); }

// ---- doors
const DOORS=[];
const plankGeo=new THREE.BoxGeometry(6.4,0.36,0.12);
function makeDoor(x,z,alongX,cost,a,b,label,sign){
  const g=new THREE.Group(); g.position.set(x,0,z); if(!alongX) g.rotation.y=Math.PI/2; scene.add(g);
  for(let i=0;i<5;i++){ const p=new THREE.Mesh(plankGeo,M.plank); p.position.set(0,0.45+i*0.62,(i%2)*0.1); p.rotation.z=rand(-.07,.07); g.add(p); }
  for(const s of [-1,1]){ const p=new THREE.Mesh(plankGeo,M.plank); p.position.set(0,1.7,0.18); p.rotation.z=0.42*s; p.scale.x=1.05; g.add(p); }
  for(let i=-2;i<=2;i++){ const t=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.025,4,12),M.wire); t.position.set(i*1.2,3.35,0); t.rotation.y=Math.PI/2; g.add(t); }
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
function crate(x,z,s=1,ry=0){ box(1.1*s,1.1*s,1.1*s,M.plank,x,0.55*s,z,{ry,solid:true,col:true}); }
function sandbags(x,z,len,horiz){ const s=sandTex.clone(); s.needsUpdate=true; s.repeat.set(len/1.6,1); box(horiz?len:1.1,0.9,horiz?1.1:len,L({map:s}),x,0.45,z,{solid:true,col:true}); }
function lampPost(x,z){ cyl(0.07,0.09,3.6,M.wood,x,1.8,z,6); box(0.6,0.06,0.06,M.wood,x+0.25,3.5,z); const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),M.bulbOff.clone()); bulb.position.set(x+0.5,3.35,z); scene.add(bulb); return bulb; }
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
