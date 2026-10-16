/* ================= expanded world: dressing, chapel, no man's land, windows, trap ================= */
const FLAME_MAT=new THREE.MeshBasicMaterial({color:0xff8a3a,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
// duckboards and puddles
box(1.4,.06,23,M.plank,0,.04,17.5,{}); box(46,.06,1.4,M.plank,4,.04,16.5,{}); box(1.2,.06,30,M.plank,-22,.04,-12,{}); box(26,.06,1.2,M.plank,25,.04,-9,{});
const puddleM=L({color:0x1d2023});
for(const [x,z,r] of [[-14,12,1.6],[16,25,1.2],[-20,-24,1.8],[22,-20,1.4],[3,40,1],[48,20,1.2],[75,-6,2],[57,-24,1.5]]){ const m=new THREE.Mesh(new THREE.CircleGeometry(r,14),puddleM); m.rotation.x=-Math.PI/2; m.position.set(x,.035,z); m.scale.y=rand(.6,1); scene.add(m); }
// barbed wire coils (instanced)
const wireMats=[];
function wireRow(x1,z1,x2,z2){ const len=Math.hypot(x2-x1,z2-z1), n=Math.max(1,Math.floor(len/.7)), a=Math.atan2(x2-x1,z2-z1);
  for(let i=0;i<=n;i++){ const k=i/n, m=new THREE.Matrix4(); m.makeRotationY(a); m.setPosition(x1+(x2-x1)*k,.45,z1+(z2-z1)*k); wireMats.push(m); }
  for(let i=0;i<=len;i+=3){ const k=i/len; cyl(.04,.05,1.1,M.wood,x1+(x2-x1)*k,.55,z1+(z2-z1)*k,4); } }
wireRow(64,-28.3,80,-28.3); wireRow(97.8,-26,97.8,-16); wireRow(62,3.4,76,3.4); wireRow(-28.3,-28,-28.3,-22);
{ const wm=new THREE.InstancedMesh(new THREE.TorusGeometry(.42,.02,3,10),M.wire,wireMats.length); wireMats.forEach((m,i)=>wm.setMatrixAt(i,m)); scene.add(wm); }
// shell craters
for(const [x,z,r] of [[62,-12,3.6],[78,-26,3],[94,-18,3.2],[72,1,2.4],[46,-20,2.6],[83,-11,2.4]]){ const d=new THREE.Mesh(new THREE.CircleGeometry(r,18),M.pitDark); d.rotation.x=-Math.PI/2; d.position.set(x,.04,z); scene.add(d);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.45,4,18),M.mud); rim.rotation.x=Math.PI/2; rim.scale.z=.5; rim.position.set(x,.08,z); scene.add(rim);
  const w=new THREE.Mesh(new THREE.CircleGeometry(r*.55,14),puddleM); w.rotation.x=-Math.PI/2; w.position.set(x,.05,z); scene.add(w); }
// wrecked tank
{ const g=new THREE.Group(); g.position.set(70,0,-12.5); g.rotation.y=.35; scene.add(g); const tm=L({color:0x4a4a3a}), td=L({color:0x2a2a24});
  box(6.4,1.5,3.2,tm,0,1.15,0,{parent:g,solid:true}); box(7,1,.8,td,0,.5,1.7,{parent:g}); box(7,1,.8,td,0,.5,-1.7,{parent:g});
  const tur=box(2.6,1,2.2,tm,-.4,2.3,.2,{parent:g}); tur.rotation.set(.08,.5,.12); const gun=cyl(.12,.14,3.4,td,1.4,2.2,.6,6,g); gun.rotation.z=Math.PI/2+.25;
  box(1,1.2,.15,td,2.9,1.4,1.62,{parent:g}); addCol(70,-12.5,7,5); }
// fire barrels
const FLAMES=[];
function fireBarrel(x,z){ cyl(.36,.34,.95,M.rust,x,.48,z,10); for(let i=0;i<3;i++){ const f=new THREE.Mesh(new THREE.PlaneGeometry(.6,1),FLAME_MAT); f.position.set(x,1.35,z); f.rotation.y=i*Math.PI/3; scene.add(f); FLAMES.push(f); } addCol(x,z,.8,.8); }
fireBarrel(46,-27.6); fireBarrel(96,1.8); fireBarrel(76.5,-12); fireBarrel(-6,46.5);
const barrelLight=new THREE.PointLight(0xff7a2a,1.2,18,1.6); barrelLight.position.set(76.5,1.8,-12); scene.add(barrelLight);
// bunker map table
{ box(1.8,.08,1,M.wood,6.5,.85,34,{}); for(const [dx,dz] of [[-.8,-.4],[.8,-.4],[-.8,.4],[.8,.4]]) box(.08,.85,.08,M.wood,6.5+dx,.42,34+dz,{});
  const mapT=makeTex(128,(g,s)=>{ g.fillStyle='#c9b48a'; g.fillRect(0,0,s,s); g.strokeStyle='#6a5030'; g.lineWidth=2; for(let i=0;i<9;i++){ g.beginPath(); g.moveTo(rand(0,s),rand(0,s)); g.bezierCurveTo(rand(0,s),rand(0,s),rand(0,s),rand(0,s),rand(0,s),rand(0,s)); g.stroke(); } g.fillStyle='#8a2a1a'; for(let i=0;i<6;i++) g.fillRect(rand(10,s-10),rand(10,s-10),5,5); });
  const mp=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.8),L({map:mapT})); mp.rotation.x=-Math.PI/2; mp.position.set(6.5,.9,34); scene.add(mp); addCol(6.5,34,1.8,1); }

// ---- the chapel: pews, altar, stained glass, candelabras, bell
const CH={cands:[],panes:[],order:[0,1,2,3],seq:0,solved:false,mural:0,bellT:-9,swing:0,bellG:null,light:null};
function drawSym(g,s,k,bg){ g.fillStyle=bg; g.fillRect(0,0,s,s); g.strokeStyle='#120c06'; g.lineWidth=s*.06; g.strokeRect(s*.03,s*.03,s*.94,s*.94);
  const c=s/2, r=s*.24; g.fillStyle='#ffd27a'; g.strokeStyle='#ffd27a'; g.lineWidth=s*.055; g.beginPath();
  if(k===0){ g.arc(c,c,r*.62,0,Math.PI*2); g.fill(); g.beginPath(); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; g.moveTo(c+Math.cos(a)*r*.9,c+Math.sin(a)*r*.9); g.lineTo(c+Math.cos(a)*r*1.45,c+Math.sin(a)*r*1.45); } g.stroke(); }
  else if(k===1){ g.arc(c,c,r*1.1,0,Math.PI*2); g.fill(); g.fillStyle=bg; g.beginPath(); g.arc(c+r*.55,c-r*.25,r*.95,0,Math.PI*2); g.fill(); }
  else if(k===2){ for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.5:r*1.25, px=c+Math.cos(a)*rr, py=c+Math.sin(a)*rr; if(i) g.lineTo(px,py); else g.moveTo(px,py); } g.closePath(); g.fill(); }
  else { g.moveTo(c-r*1.4,c); g.quadraticCurveTo(c,c-r*1.3,c+r*1.4,c); g.quadraticCurveTo(c,c+r*1.3,c-r*1.4,c); g.stroke(); g.beginPath(); g.arc(c,c,r*.42,0,Math.PI*2); g.fill(); } }
{ const ft=stoneTex.clone(); ft.needsUpdate=true; ft.repeat.set(9,7); const fl=new THREE.Mesh(new THREE.PlaneGeometry(29.4,24.4),L({map:ft,color:0x8d877c})); fl.rotation.x=-Math.PI/2; fl.position.set(45,.03,17.5); scene.add(fl);
  for(const zc of [11,24]) for(let i=0;i<4;i++){ const x=41.5+i*3; box(.8,.48,4.4,M.wood,x,.42,zc,{solid:true,col:true}); box(.14,.95,4.4,M.wood,x+.42,.62,zc,{}); }
  box(1.6,1.1,4,M.stone,57.6,.55,17.5,{solid:true,col:true}); box(1.75,.06,4.2,L({color:0x5a1e1a}),57.6,1.13,17.5,{});
  box(.3,3.2,7.2,M.stone,59.3,3.3,17.5,{}); box(.36,.3,7.6,M.brass,59.2,4.95,17.5,{});
  for(let k=0;k<4;k++){ const c=document.createElement('canvas'); c.width=c.height=128; const tex=new THREE.CanvasTexture(c);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.45),new THREE.MeshBasicMaterial({map:tex,color:0x262626})); m.rotation.y=-Math.PI/2; m.position.set(59.1,3.4,17.5+(k-1.5)*1.65); scene.add(m); CH.panes.push({c,tex,m}); }
  [[38,7.5],[36,27],[54,27.5],[54,7.5]].forEach(([x,z],i)=>{ const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
    cyl(.32,.4,.12,M.brass,0,.06,0,10,g); cyl(.05,.07,1.7,M.brass,0,.9,0,6,g); box(.9,.05,.05,M.brass,0,1.6,0,{parent:g});
    const flames=[]; for(const dx of [-.4,0,.4]){ cyl(.045,.045,.28,B({color:0xe8e0cc}),dx,1.76,0,6,g); const f=new THREE.Mesh(new THREE.ConeGeometry(.05,.16,6),M.add(0xffb050,.95)); f.position.set(dx,1.98,0); f.visible=false; g.add(f); flames.push(f); }
    const pc=document.createElement('canvas'); pc.width=pc.height=128; drawSym(pc.getContext('2d'),128,i,'#20160e');
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc),side:THREE.DoubleSide})); plate.position.set(0,1.05,z<17.5?.1:-.1); plate.rotation.y=z<17.5?0:Math.PI; g.add(plate);
    addCol(x,z,.8,.8); const cd={g,flames,lit:false}; CH.cands.push(cd);
    addInter({quest:true,x,z:z+(z<17.5?1.3:-1.3),r:1.7,prompt:()=>cd.lit?null:'Light the candles',use:()=>lightCandle(i)}); });
  for(const zz of [15,20]) box(.3,5.4,.3,M.wood,34.5,2.7,zz,{col:true}); box(.3,.3,5.6,M.wood,34.5,5.3,17.5,{});
  const bg=new THREE.Group(); bg.position.set(34.5,5.15,17.5); scene.add(bg); CH.bellG=bg;
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(.32,.7,1.05,14,1,true),L({color:0x8a6a30,side:THREE.DoubleSide})); bell.position.y=-.7; bg.add(bell); cyl(.12,.12,.25,M.dark,0,-.12,0,6,bg); cyl(.08,.08,.5,M.dark,0,-1.15,0,6,bg);
  const bh=new THREE.Mesh(new THREE.SphereGeometry(.75,8,6),M.metal); bh.position.y=-.7; bh.visible=false; bh.userData.bell=true; bg.add(bh); addSolid(bh);
  for(let x=35;x<=55;x+=5) box(.35,.35,25.4,M.wood,x,5.3,17.5,{});
  for(const [x,z,w,d,r] of [[38,12,6,8,.12],[52,23,7,9,-.1],[46,8,5,5,.2]]){ const rf=box(w,.15,d,M.plank,x,5.6,z,{}); rf.rotation.z=r; }
  for(let i=0;i<12;i++){ const r=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.25,.6)),M.stone); r.position.set(rand(31.5,58.5),.2,pick([6.2,28.8])+rand(-.3,.3)); scene.add(r); }
  CH.light=new THREE.PointLight(0xffb070,.9,24,1.5); CH.light.position.set(55,3.6,17.5); scene.add(CH.light); }
// workbench (chapel, north wall)
{ const g=new THREE.Group(); g.position.set(40,0,28.7); g.rotation.y=Math.PI; scene.add(g);
  box(2.6,.12,1.1,M.wood,0,.95,0,{parent:g}); for(const [dx,dz] of [[-1.15,-.45],[1.15,-.45],[-1.15,.45],[1.15,.45]]) box(.12,.95,.12,M.wood,dx,.47,dz,{parent:g});
  box(.4,.3,.3,M.metal,-.9,1.15,0,{parent:g}); box(.08,.5,.08,M.metal,-.9,1.3,.2,{parent:g}); box(.7,.06,.2,M.metal,.4,1.04,-.2,{parent:g}); box(2.6,1.2,.1,M.plank,0,1.6,-.55,{parent:g});
  const lab=makeLabel('WORKBENCH',{sx:2,size:48,color:'#c9a35a'}); lab.position.set(0,2.5,0); g.add(lab);
  addCol(40,28.7,2.6,1.1); addInter({x:40,z:27.2,r:2,prompt:()=>benchPrompt(),use:()=>benchUse()}); }
// fuel trench trap (trenches)
const TRAP={x0:1,x1:11,z0:17.4,z1:19.4,t:0,cd:0,flames:[],wheel:null,light:null};
{ box(10,.04,2,M.pitDark,6,.05,18.4,{});
  for(let i=0;i<7;i++) for(let j=0;j<2;j++){ const f=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.6),FLAME_MAT); f.position.set(1.7+i*1.43,.8,18.4); f.rotation.y=j*Math.PI/2+.4; f.visible=false; scene.add(f); TRAP.flames.push(f); }
  const v=new THREE.Group(); v.position.set(-1.3,0,18.4); scene.add(v); box(.18,1.2,.18,M.metal,0,.6,0,{parent:v}); const wh=new THREE.Mesh(new THREE.TorusGeometry(.28,.05,5,14),M.rust); wh.position.y=1.25; wh.rotation.y=Math.PI/2; v.add(wh); TRAP.wheel=wh; addCol(-1.3,18.4,.4,.4);
  const lab=makeLabel('FUEL TRENCH',{sx:1.8,size:44,color:'#ff9a4a'}); lab.position.set(-1.3,2.1,18.4); scene.add(lab);
  TRAP.light=new THREE.PointLight(0xff6a20,0,16,1.6); TRAP.light.position.set(6,1.6,18.4); scene.add(TRAP.light);
  addInter({x:-1.3,z:18.4,r:1.9,prompt:()=>{ if(!POWER.on) return '!The fuel pump needs power'; if(TRAP.t>0) return '!The trench is burning'; if(TRAP.cd>0) return `!The pump is refilling (${Math.ceil(TRAP.cd)}s)`; return 'Ignite the fuel trench [1000]'; },
    use:()=>{ if(!POWER.on||TRAP.t>0||TRAP.cd>0) return; if(!spend(1000)) return; if(NET.role==='client') toHost({t:'trap'}); else { TRAP.t=22; sfx.fire(); bcast({t:'trap'}); } toast('The trench goes up in flames'); }}); }

// ---- boarded windows: the dead tear the planks off and climb through; hold E to rebuild
const WINDOWS=[]; const wPlankGeo=new THREE.BoxGeometry(2.3,.2,.07);
function makeWindow(x,z,nx,nz){ const W={x,z,nx,nz,zone:zoneOf(x-nx*2,z-nz*2),planks:[],inX:x-nx*1.7,inZ:z-nz*1.7,outX:x+nx*1.3,outZ:z+nz*1.3,spX:x+nx*5,spZ:z+nz*5,last:0};
  const g=new THREE.Group(); g.position.set(x-nx*.66,0,z-nz*.66); g.rotation.y=Math.atan2(nx,nz); scene.add(g); W.g=g;
  for(const sx of [-1.18,1.18]) box(.14,1.75,.16,M.wood,sx,1.7,0,{parent:g}); box(2.5,.16,.18,M.wood,0,2.55,0,{parent:g}); box(2.5,.12,.3,M.wood,0,.92,0,{parent:g});
  for(let i=0;i<5;i++){ const m=new THREE.Mesh(wPlankGeo,M.plank); const p0=new V3(rand(-.05,.05),1.08+i*.33,-.04-(i%2)*.03), r0=new THREE.Euler(0,0,rand(-.16,.16)); m.position.copy(p0); m.rotation.copy(r0); g.add(m); W.planks.push({m,p0,r0,on:true,anim:0,slam:0}); }
  W.count=()=>W.planks.reduce((n,p)=>n+(p.on?1:0),0);
  addInter({x:W.inX,z:W.inZ,r:2.3,win:W,prompt:()=>W.count()<5?'Hold to rebuild the barrier':null,use:()=>netPlank(W)});
  WINDOWS.push(W); return W; }
[[-10,40,-1,0],[2,50,0,1],[25,30,0,1],[-30,22,-1,0],[-30,-18,-1,0],[-14,-30,0,-1],[16,-30,0,-1],[36,-30,0,-1],[34,30,0,1],[46,30,0,1],[60,-30,0,-1],[85,-30,0,-1],[100,-12,1,0],[80,5,0,1]].forEach(a=>makeWindow(...a));
function rebuildPlank(W){ const pl=W.planks.find(p=>!p.on); if(!pl) return; pl.on=true; pl.anim=0; pl.m.visible=true; pl.m.position.copy(pl.p0); pl.m.rotation.copy(pl.r0); pl.slam=.18; W.last=GT; sfx.board();
  if((R.rebuild||0)<500){ R.rebuild=(R.rebuild||0)+10; addPts(10); } }
function tearPlank(W){ for(let i=W.planks.length-1;i>=0;i--){ const pl=W.planks[i]; if(pl.on){ pl.on=false; pl.anim=.55; sfx.tear(); const wp=new V3(); pl.m.getWorldPosition(wp); spawnParticles(wp,'dirt',3); return; } } }
function updateWindows(dt){ for(const W of WINDOWS) for(const pl of W.planks){
  if(pl.anim>0){ pl.anim-=dt; pl.m.position.z+=dt*3.2; pl.m.position.y-=dt*(.55-pl.anim)*9; pl.m.rotation.x+=dt*5; if(pl.anim<=0) pl.m.visible=false; }
  if(pl.slam>0){ pl.slam-=dt; pl.m.scale.setScalar(1+Math.max(0,pl.slam)*.6); } } }
function resetWindows(){ for(const W of WINDOWS) for(const pl of W.planks){ pl.on=true; pl.anim=0; pl.slam=0; pl.m.visible=true; pl.m.position.copy(pl.p0); pl.m.rotation.copy(pl.r0); pl.m.scale.setScalar(1); } }
