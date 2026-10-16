/* ---------- viewmodel ----------
   vmRoot holds the gun; hands are children of the gun so they follow it, and the off hand / magazine / bolt are
   animated in gun space. updateVM layers: hip↔ADS base pose, sprint/slide/crouch poses, bob, sway and lag,
   springs (recoil, landing, jumps), then reload / inspect / equip / holster / knife overrides. */
const VM={gun:null,flash:null,kick:0,flashT:0,melee:0,rodFlare:0,cfg:null,rh:null,lh:null,
  ps:{x:[0,0,0],v:[0,0,0]}, rs:{x:[0,0,0],v:[0,0,0]}, swx:0,swy:0,lyaw:0,lpitch:0,
  equip:0,equipDur:.35,first:0,hol:0,inspect:0,shotT:-9,cycMag:1,cylA:0,cylT:0,sprK:0,slK:0,crK:0,rlId:-1,ev:{},fov:58};
const flashMat=M.add(0xffb050,1), flashMatRelic=M.add(0x8ae8ff,1), FLASHM={};
const flashMatFor=id=>{ const c=id==='rod'||id==='dynamo'?0x8ae8ff:id==='ion'?0x7aff8a:id==='cannon'?0xff8a3a:0xffb050; return FLASHM[c]||(FLASHM[c]=c===0xffb050?flashMat:c===0x8ae8ff?flashMatRelic:M.add(c,1)); };
const INSPECT_T=2.6;
// per weapon: hip pose, ADS eye distance behind the rear sight, ADS viewmodel FOV cut, bolt grab point (gun space)
const VMC={
  pistol:{hip:[.12,-.135,-.46],D:.34,vf:6,bg:[0,.075,.07]}, revolver:{hip:[.12,-.14,-.48],D:.36,vf:6,bg:[0,.06,.05]},
  carbine:{hip:[.14,-.155,-.4],D:.28,vf:8}, marksman:{hip:[.14,-.16,-.4],D:.13,vf:14,bg:[.04,.022,.05]},
  smg:{hip:[.135,-.15,-.42],D:.24,vf:8,bg:[-.04,.022,-.01]}, autorifle:{hip:[.14,-.16,-.4],D:.25,vf:8,bg:[0,.05,.12]},
  shotgun:{hip:[.14,-.155,-.4],D:.26,vf:6}, lmg:{hip:[.15,-.165,-.42],D:.36,vf:6,bg:[.05,.02,-.12]},
  cannon:{hip:[.15,-.17,-.44],D:.37,vf:6}, ion:{hip:[.12,-.14,-.46],D:.32,vf:6}, dynamo:{hip:[.14,-.16,-.42],D:.3,vf:6},
  gauntlet:{hip:[.2,-.21,-.42],ads:[.12,-.19,-.4]}, gatling:{hip:[.2,-.21,-.42],ads:[.1,-.2,-.42]}, rod:{hip:[.27,-.33,-.5],ads:[.1,-.28,-.48]},
};
/* ----- casings (viewmodel space, short-lived) ----- */
const CASES=[]; let caseI=0;
function ejectCase(shell){ const g=VM.gun; if(!g||!g.userData.eject) return; if(!CASES.length){ for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.CylinderGeometry(.0045,.0045,.02,6),GM.brass); m.visible=false; vmCam.add(m); CASES.push({m,v:new V3(),t:0,shell:false}); }
    CASES.shellGeo=new THREE.CylinderGeometry(.0085,.0085,.05,8); CASES.caseGeo=CASES[0].m.geometry; }
  const c=CASES[caseI++%CASES.length]; c.m.geometry=shell?CASES.shellGeo:CASES.caseGeo; c.m.material=shell?GM.shell:GM.brass;
  const e=g.userData.eject; vmCam.updateMatrixWorld(true); c.m.position.set(e[0],e[1],e[2]); g.localToWorld(c.m.position); vmCam.worldToLocal(c.m.position);
  c.v.set(rand(.9,1.4),rand(.9,1.4),rand(.1,.4)); c.m.rotation.set(rand(0,3),0,Math.PI/2); c.t=.55; c.m.visible=true; }
function updateCases(dt){ for(const c of CASES){ if(c.t<=0) continue; c.t-=dt; c.v.y-=7*dt; c.m.position.addScaledVector(c.v,dt); c.m.rotation.x+=dt*18; c.m.rotation.y+=dt*9; if(c.t<=0) c.m.visible=false; } }
/* ----- hands ----- */
const HANDM={};
// organic hands: ellipsoid palm and heel, capsule finger segments curling around the gripped part, knuckles,
// a cloth hand-wrap texture over palm and finger roots, cuff and rolled sleeve. Merged per material (about 3 draw calls a hand).
function handInit(){ if(HANDM.skin) return;
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'); c.fillStyle='#6b5a40'; c.fillRect(0,0,64,64);
  for(let i=-64;i<128;i+=9){ c.strokeStyle='rgba(30,22,14,.55)'; c.lineWidth=2; c.beginPath(); c.moveTo(i,0); c.lineTo(i+40,64); c.stroke(); c.strokeStyle='rgba(210,190,150,.22)'; c.lineWidth=3; c.beginPath(); c.moveTo(i+4,0); c.lineTo(i+44,64); c.stroke(); }
  for(let k=0;k<160;k++){ c.fillStyle=`rgba(${Math.random()<.5?'20,14,8':'220,200,160'},${Math.random()*.12})`; c.fillRect(Math.random()*64,Math.random()*64,2,2); }
  const tx=new THREE.CanvasTexture(cv); tx.wrapS=tx.wrapT=THREE.RepeatWrapping; tx.repeat.set(2,2);
  HANDM.wrap=L({color:0xffffff,map:tx}); HANDM.skin=L({color:0x9a7c62}); HANDM.sleeve=L({color:0x4b4f3c}); HANDM.cuff=L({color:0x34372a}); }
const CAPS=new Map();
function capsuleGeo(r,len){ const k=r.toFixed(4)+'|'+len.toFixed(3); let g=CAPS.get(k); if(g) return g; const pts=[], h=Math.max(0,len/2-r), n=3;
  for(let i=0;i<=n;i++){ const a=-Math.PI/2+i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.max(1e-4,Math.cos(a)*r),-h+Math.sin(a)*r)); }
  for(let i=0;i<=n;i++){ const a=i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.max(1e-4,Math.cos(a)*r),h+Math.sin(a)*r)); }
  g=new THREE.LatheGeometry(pts,QUAL?7:5); CAPS.set(k,g); return g; }
const _ha=new V3(), _hb=new V3(), _hy=new V3(0,1,0);
function capBetween(par,a,b,r,m){ _hb.subVectors(b,a); const len=_hb.length()+r*2, o=new THREE.Mesh(capsuleGeo(r,len),m); o.position.addVectors(a,b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(_hy,_hb.normalize()); par.add(o); return o; }
function ellip(par,m,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){ const o=new THREE.Mesh(gGeo('hs',()=>new THREE.SphereGeometry(1,QUAL?10:7,QUAL?8:5)),m); o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.rotation.set(rx,ry,rz); par.add(o); return o; }
function mergeByMaterial(root){ root.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(), groups=new Map(), m4=new THREE.Matrix4(), nm=new THREE.Matrix3(), v=new V3(), drop=[];
  root.traverse(o=>{ if(!o.isMesh) return; let g=groups.get(o.material); if(!g){ g={p:[],n:[],u:[]}; groups.set(o.material,g); }
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry, P_=geo.attributes.position, N_=geo.attributes.normal, U_=geo.attributes.uv; m4.multiplyMatrices(inv,o.matrixWorld); nm.getNormalMatrix(m4);
    for(let i=0;i<P_.count;i++){ v.fromBufferAttribute(P_,i).applyMatrix4(m4); g.p.push(v.x,v.y,v.z); v.fromBufferAttribute(N_,i).applyMatrix3(nm).normalize(); g.n.push(v.x,v.y,v.z); if(U_) g.u.push(U_.getX(i),U_.getY(i)); else g.u.push(0,0); }
    if(geo!==o.geometry) geo.dispose(); drop.push(o); });
  for(const o of drop) o.parent.remove(o); for(let i=root.children.length-1;i>=0;i--) if(root.children[i].isGroup&&!root.children[i].children.length) root.remove(root.children[i]);
  for(const [m,g] of groups){ const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3)); bg.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3)); bg.setAttribute('uv',new THREE.Float32BufferAttribute(g.u,2)); root.add(new THREE.Mesh(bg,m)); } }
function makeHand(right,kind){ handInit(); const h=new THREE.Group(), s=right?1:-1, W=HANDM.wrap, S=HANDM.skin, fr=.0085;
  const arm=new THREE.Group(); h.add(arm); const P_=(x,y,z)=>new V3(x,y,z);
  if(kind==='grip'){ // origin = centre of an upright grip (about .036 x .055); back of the hand on the +s side
    const ex=.019+fr, ez=.027+fr, pt=(th,y,k)=>P_(s*Math.cos(th)*ex,y,-Math.sin(th)*ez+k*.004);
    ellip(h,W,s*.028,.0,.006,.013,.04,.034,0,0,s*.1); ellip(h,W,s*.012,-.004,.034,.022,.036,.016); // back of hand, heel behind the grip
    for(let k=0;k<4;k++){ const y=.024-k*.0165, r=fr*(k===3?.85:1), sp=[.25,.95,1.6,2.2];
      ellip(h,W,s*(ex+.004),y,.002+k*.004,.009,.008,.009); // knuckle
      for(let j=0;j<3;j++) capBetween(h,pt(sp[j],y,k),pt(sp[j+1],y-.001*j,k),r*(1-j*.08),j===0?W:S); }
    const t0=P_(s*.006,.03,.03), t1=P_(-s*.012,.036,.012), t2=P_(-s*.022,.034,-.008); capBetween(h,t0,t1,.0095,W); capBetween(h,t1,t2,.0085,S);
    ellip(h,W,s*.01,.024,.024,.016,.012,.02); // thumb pad
    arm.position.set(s*.016,-.034,.05); arm.rotation.set(.75,s*.3,0); }
  else { // origin sits under a handguard whose axis is .03 above; palm below, fingers curl up the far side, thumb on the near side
    const cy=.03, R=.026+fr, pt=(th,z)=>P_(-s*Math.sin(th)*R,cy-Math.cos(th)*R,z);
    ellip(h,W,0,cy-R-.004,.004,.026,.012,.04); ellip(h,W,s*.024,cy-R+.01,.01,.012,.022,.034,0,0,-s*.5); // palm, heel/thumb mound
    for(let k=0;k<4;k++){ const z=-.026+k*.0165, sp=[.55,1.25,1.95,2.5];
      ellip(h,W,-s*Math.sin(.5)*(R+.002),cy-Math.cos(.5)*(R+.002),z,.009,.009,.008);
      for(let j=0;j<3;j++) capBetween(h,pt(sp[j],z),pt(sp[j+1],z),fr*(1-j*.08),j===0?W:S); }
    const t0=P_(s*.03,cy-R+.006,.02), t1=P_(s*(R+.004),cy-.004,-.004), t2=P_(s*(R-.002),cy+.012,-.03); capBetween(h,t0,t1,.0095,W); capBetween(h,t1,t2,.0085,S);
    arm.position.set(s*.012,cy-R-.008,.045); arm.rotation.set(.6,s*.5,0); }
  // wrist, cuff with a rolled edge, sleeve
  capBetween(arm,P_(0,0,-.02),P_(0,0,.03),.024,W);
  const cuff=new THREE.Mesh(HANDM.cg||(HANDM.cg=(()=>{ const g=new THREE.CylinderGeometry(.034,.036,.045,QUAL?12:8); g.rotateX(Math.PI/2); return g; })()),HANDM.cuff); cuff.position.z=.035; arm.add(cuff);
  const roll=new THREE.Mesh(gGeo('hroll',()=>new THREE.TorusGeometry(.035,.007,5,QUAL?14:8)),HANDM.cuff); roll.position.z=.013; arm.add(roll);
  for(let i=0;i<2;i++){ const b=new THREE.Mesh(gGeo('hbtn',()=>new THREE.CylinderGeometry(.004,.004,.003,6)),HANDM.cuff); b.rotation.z=Math.PI/2; b.position.set(s*.036,.008-i*.016,.04); arm.add(b); }
  const sl=new THREE.Mesh(HANDM.sg||(HANDM.sg=(()=>{ const g=new THREE.CylinderGeometry(.036,.046,.5,QUAL?12:8); g.rotateX(Math.PI/2); g.translate(0,0,.3); return g; })()),HANDM.sleeve); arm.add(sl);
  for(let i=0;i<2;i++){ const f=new THREE.Mesh(gGeo('hfold'+i,()=>new THREE.TorusGeometry(.039+i*.003,.004,4,QUAL?12:8)),HANDM.sleeve); f.position.z=.1+i*.07; arm.add(f); }
  mergeByMaterial(h);
  return h; }
function addHands(g,id){ VM.rh=VM.lh=null; if(id==='gauntlet') return;
  const ud=g.userData, t=WD[id].type, two=t==='pistol'||t==='ion';
  const old={rod:[[0,-.02,.18],[0,-.02,-.32]],gatling:[[0,-.12,.13],[-.13,-.02,.05]]}[t];
  const rp=ud.rh||old[0], lp=ud.lh||old[1];
  const rh=makeHand(true,t==='rod'?'fore':'grip'); rh.position.set(rp[0],rp[1],rp[2]); if(t==='rod') rh.rotation.z=-.3; g.add(rh);
  const lh=makeHand(false,two?'grip':'fore'); lh.position.set(lp[0],lp[1],lp[2]); if(two){ lh.rotation.set(.1,.25,.25); } g.add(lh);
  VM.rh=rh; VM.lh=lh; }
/* ----- build ----- */
function buildVM(){
  if(VM.gun){ vmRoot.remove(VM.gun); VM.gun=null; } VM.hol=0; VM.inspect=0;
  const w=curW(); if(!w) return;
  const g=buildGun(w.id,w.up||w.id==='gatling'); vmRoot.add(g); VM.gun=g; const ud=g.userData; addHands(g,w.id);
  const C=VMC[w.id]||VMC.autorifle, cfg={hip:C.hip,vf:C.vf||0,style:ud.style||'none'};
  if(ud.sight) cfg.ads=[-(ud.sight.x||0),-ud.sight.y,-C.D-ud.sight.z]; else cfg.ads=C.ads||[0,-.16,-.36]; cfg.near=ud.sight?Math.max(0,C.D-.035):0;
  const H={}; cfg.home=H;
  if(VM.lh){ H.lh=VM.lh.position.clone(); H.lhr=VM.lh.rotation.clone(); } if(VM.rh){ H.rh=VM.rh.position.clone(); H.rhr=VM.rh.rotation.clone(); }
  if(ud.mag){ H.mag=ud.mag.position.clone(); H.magr=ud.mag.rotation.clone(); H.magVis=ud.mag.visible; }
  if(ud.bolt) H.bolt=ud.bolt.position.clone(); if(ud.pump) H.pump=ud.pump.position.clone();
  if(ud.chamber){ const o=new THREE.Object3D(); o.position.fromArray(ud.chamber); (ud.cyl||ud.barrel||g).add(o); cfg.chamber=o; }
  const lh=H.lh||new V3(), mg=H.mag||new V3(0,-.08,-.08);
  cfg.anc={ home:lh, low:lh.clone().add(new V3(-.1,-.34,.2)), mag:mg.clone().add(cfg.style==='box'?new V3(-.045,-.02,0):cfg.style==='cell'?new V3(-.012,0,0):cfg.style==='pistol'?new V3(0,-.06,0):new V3(0,-.05,0)),
    bolt:C.bg?new V3().fromArray(C.bg):lh, port:new V3(0,-.045,-.03), cover:new V3(0,.085,-.02), belt:new V3(-.045,.05,-.04), top:new V3(0,.075,-.03) };
  cfg.anc.low2=cfg.anc.port.clone().add(new V3(-.06,-.17,.12));
  cfg.magOff=mg.clone().sub(cfg.anc.mag);
  vmRoot.position.fromArray(cfg.hip); VM.cfg=cfg;
  const f=new THREE.Group(), fm=flashMatFor(w.id); const pg=new THREE.PlaneGeometry(1,1);
  f.add(new THREE.Mesh(pg,fm)); const s1=new THREE.Mesh(pg,fm); s1.scale.set(.5,1.6,1); s1.rotation.set(Math.PI/2,0,0); s1.position.z=-.06; f.add(s1);
  const s2=new THREE.Mesh(pg,fm); s2.scale.set(.5,1.6,1); s2.rotation.set(0,Math.PI/2,Math.PI/2); s2.position.z=-.06; f.add(s2);
  f.scale.setScalar(t2flash(w.id)); f.position.copy(ud.muzzle.position); f.visible=false; g.add(f); VM.flash=f;
  if(w.id==='rod') g.rotation.set(.05,.08,0);
  VM.equipDur=Math.max(.28,Math.min(.6,P.swapT||.35)); VM.equip=VM.equipDur; VM.first=!w.drawn&&ud.bolt&&cfg.style!=='pistol'?1:0; w.drawn=true; VM.rlId=-1; VM.cylA=0;
}
const t2flash=id=>id==='shotgun'||id==='cannon'?.3:id==='pistol'||id==='revolver'||id==='ion'?.17:id==='gauntlet'?0.001:.22;
/* ----- keyframes ----- */
function kfs(tr,k,out){ const n=tr[0].length-1; if(k<=tr[0][0]){ for(let j=0;j<n;j++) out[j]=tr[0][j+1]; return out; }
  let i=0; while(i<tr.length-2&&k>tr[i+1][0]) i++; const a=tr[i], b=tr[i+1]; let t=clamp((k-a[0])/Math.max(1e-4,b[0]-a[0]),0,1); t=t*t*(3-2*t);
  for(let j=0;j<n;j++) out[j]=a[j+1]+(b[j+1]-a[j+1])*t; return out; }
const _ka=new V3(), _kb=new V3(), _g6=[0,0,0,0,0,0], _b2=[0,0];
// hand track entries: [t, anchor, dx,dy,dz, rx,ry,rz]; anchors resolve to gun-space points
function kfh(tr,k,anc,outP,outR){ let i=0; if(k<=tr[0][0]) i=0; else while(i<tr.length-2&&k>tr[i+1][0]) i++; const a=tr[i], b=tr[Math.min(i+1,tr.length-1)];
  let t=k<=a[0]?0:clamp((k-a[0])/Math.max(1e-4,b[0]-a[0]),0,1); t=t*t*(3-2*t);
  const pa=anc(a[1],_ka), pb=anc(b[1],_kb); outP.set(pa.x+(a[2]||0),pa.y+(a[3]||0),pa.z+(a[4]||0)).lerp(_kb.set(pb.x+(b[2]||0),pb.y+(b[3]||0),pb.z+(b[4]||0)),t);
  for(let j=0;j<3;j++) outR[j]=(a[5+j]||0)+((b[5+j]||0)-(a[5+j]||0))*t; }
const Z6=[0,0,0,0,0,0];
// reload choreography per style. G: gun offset [x,y,z,rx,ry,rz]; H: off hand; B: bolt travel; X: crane/cover/barrel/pump;
// M: magazine timeline {pull, rel, hide, grab, ins, seat}; E: sound events
function rlTracks(style,empty){
  const T={};
  if(style==='mag'||style==='cell'){ const cell=style==='cell';
    T.G=[[0,...Z6],[.14,-.045,.035,.02,.16,cell?.15:.1,cell?.32:-.42],[.3,-.045,.025,.02,.12,cell?.15:.1,cell?.36:-.46],[.58,-.05,.03,.02,.18,cell?.12:.08,cell?.32:-.4],[.66,-.05,.045,.02,.24,.08,cell?.3:-.38],[.7,-.05,.035,.02,.17,.08,cell?.32:-.4],
      [empty?.86:.8,-.03,.025,.01,.1,.04,cell?.15:-.22],[1,...Z6]];
    T.H=cell?[[0,'home'],[.14,'home',-.02,-.03,.02],[.24,'mag',-.01,0,0],[.32,'mag',-.07,-.02,.04],[.44,'low'],[.52,'low'],[.6,'mag',-.07,-.03,.04],[.66,'mag'],[.72,'mag'],[.8,'mag',0,0,0,0,0,.6],[.9,'home'],[1,'home']]
      :[[0,'home'],[.12,'home',0,-.01,.02],[.24,'mag',0,0,0,0,0,.3],[.3,'mag',0,-.05,0,0,0,.3],[.42,'low'],[.5,'low'],[.6,'mag',0,-.07,0,0,0,.3],[.66,'mag',0,0,0,0,0,.3],[.7,'mag',0,-.012,0,0,0,.3],
        ...(empty?[[.76,'bolt',0,.005,-.01],[.79,'bolt',0,.005,.05],[.82,'bolt',0,.02,.06],[.92,'home']]:[[.86,'home']]),[1,'home']];
    T.M={pull:.24,rel:cell?.32:.3,hide:.46,grab:.52,ins:.64,seat:.67};
    if(empty&&!cell) T.B=[[0,0],[.76,0],[.79,1],[.81,1],[.83,0]];
    T.E=[[.25,'out'],[.66,'in']]; if(empty||cell) T.E.push([cell?.8:.82,'rack']); }
  else if(style==='pistol'){
    T.G=[[0,...Z6],[.12,-.03,.02,.02,.2,.15,.35],[.6,-.03,.02,.02,.25,.15,.38],[.65,-.03,.034,.02,.32,.15,.35],[.72,-.03,.02,.02,.2,.15,.3],[empty?.9:.86,-.01,.01,0,.06,.05,.1],[1,...Z6]];
    T.H=[[0,'home'],[.14,'home',-.025,-.04,.02,0,0,.3],[.32,'low'],[.45,'low'],[.58,'mag',0,-.08,0],[.64,'mag'],[.69,'mag',0,-.01,0],
      ...(empty?[[.76,'bolt',-.005,.01,-.01,0,0,1.4],[.8,'bolt',-.005,.01,.04,0,0,1.4],[.84,'bolt',-.005,.02,.05,0,0,1.2],[.94,'home']]:[[.86,'home']]),[1,'home']];
    T.M={pull:.13,rel:.13,hide:.34,grab:.45,ins:.62,seat:.66}; T.B=empty?[[0,1],[.77,1],[.8,1.05],[.83,0]]:[[0,0],[1,0]];
    T.E=[[.13,'out'],[.65,'in']]; if(empty) T.E.push([.82,'rack']); }
  else if(style==='revolver'){
    T.X=[[0,0],[.12,0],[.2,1.35],[.76,1.35],[.82,0]];
    T.G=[[0,...Z6],[.12,-.04,.03,.02,.15,.1,.6],[.25,-.04,.06,.03,.75,.1,.75],[.35,-.04,.06,.03,.8,.1,.75],[.45,-.05,.02,.02,-.35,.1,.6],[.7,-.05,.02,.02,-.35,.1,.6],[.8,-.04,.03,.02,-.1,.1,.4],[.84,-.03,.04,.02,.06,.05,-.12],[.92,-.01,.01,0,0,0,0],[1,...Z6]];
    T.H=[[0,'home'],[.12,'home'],[.2,'cyl',-.02,-.02,0],[.32,'cyl',-.02,-.02,0],[.4,'low'],[.48,'low'],[.6,'chamber',0,.0,.07],[.64,'chamber',0,0,.03],[.68,'chamber',-.015,-.01,.06],[.78,'cyl',-.025,-.02,0],[.82,'cyl',-.01,-.01,0],[.92,'home'],[1,'home']];
    T.M={pull:-1,rel:-1,hide:-1,grab:.48,ins:.62,seat:.64,gone:.67,off:[0,0,-.04]};
    T.E=[[.18,'out'],[.32,'casings'],[.63,'in'],[.82,'rack']]; }
  else if(style==='bolt'){
    T.B=[[0,0,0],[.14,0,0],[.2,1,0],[.27,1,1],[.76,1,1],[.83,1,0],[.88,0,0]];
    T.R=[[0,'grip'],[.1,'grip'],[.15,'knob'],[.86,'knob'],[.94,'grip'],[1,'grip']];
    T.H=[[0,'home'],[.25,'home'],[.33,'low'],[.4,'low'],[.5,'top',0,.06,0],[.53,'top',0,.025,0],[.62,'top',0,-.02,0],[.68,'top',0,.05,.02],[.8,'home'],[1,'home']];
    T.G=[[0,...Z6],[.12,-.03,.03,.02,.12,.08,.25],[.5,-.04,.03,.02,.15,.08,.3],[.62,-.04,.02,.02,.1,.08,.32],[.8,-.03,.03,.02,.12,.08,.25],[.92,-.01,.01,0,.03,0,.05],[1,...Z6]];
    T.M={pull:-1,rel:-1,hide:-1,grab:.4,ins:.53,seat:.62,gone:.64,off:[0,-.03,0],sink:true};
    T.E=[[.27,'out'],[.6,'in'],[.85,'rack']]; }
  else if(style==='box'){
    T.X=[[0,0],[.12,0],[.2,-1.1],[.74,-1.1],[.8,0]];
    T.G=[[0,...Z6],[.1,-.05,.04,.03,.18,.12,-.2],[.75,-.05,.04,.03,.2,.12,-.22],[.8,-.05,.03,.03,.14,.12,-.2],[.9,-.02,.01,.01,.05,.05,-.08],[1,...Z6]];
    T.H=[[0,'home'],[.1,'cover',0,0,.05],[.14,'cover',0,-.01,.05],[.2,'cover',0,.06,.02],[.27,'mag'],[.33,'mag',-.05,-.08,0],[.42,'low'],[.5,'low'],[.6,'mag',-.03,-.08,0],[.65,'mag'],[.7,'belt'],[.73,'belt',0,-.01,0],
      [.76,'cover',0,.06,.03],[.8,'cover',0,-.005,.02],...(empty?[[.84,'bolt'],[.87,'bolt',0,0,.06],[.9,'bolt',0,.01,.05],[.96,'home']]:[[.9,'home']]),[1,'home']];
    T.M={pull:.27,rel:.33,hide:.46,grab:.5,ins:.63,seat:.66}; if(empty) T.B=[[0,0],[.84,0],[.87,1],[.88,1],[.9,0]];
    T.E=[[.18,'out'],[.65,'in'],[.8,'rack']]; }
  else if(style==='break'){
    T.X=[[0,0],[.12,0],[.2,-.55],[.72,-.55],[.78,0]];
    T.G=[[0,...Z6],[.12,-.04,.04,.02,.32,.1,.25],[.25,-.04,.06,.02,.5,.1,.25],[.35,-.04,.03,.02,.3,.1,.25],[.72,-.04,.03,.02,.3,.1,.25],[.76,-.04,.05,.02,.45,.1,.2],[.86,-.01,.01,0,.05,0,0],[1,...Z6]];
    T.H=[[0,'home'],[.15,'home'],[.32,'low'],[.45,'low'],[.58,'chamber',0,-.03,.09],[.63,'chamber',0,0,.03],[.67,'chamber',0,.02,.07],[.8,'home'],[1,'home']];
    T.M={pull:.24,rel:.24,hide:.4,grab:.45,ins:.62,seat:.64,dyn:true,off:[0,.0,-.035]};
    T.E=[[.18,'out'],[.63,'in'],[.77,'rack']]; }
  else if(style==='rod'){ T.G=[[0,...Z6],[.2,-.08,.1,.05,.9,0,.25],[.8,-.08,.12,.05,.95,0,.3],[1,...Z6]]; T.E=[[.15,'out'],[.75,'in']]; }
  else if(style==='gauntlet'){ T.G=[[0,...Z6],[.2,.0,.0,-.08,-.25,.2,.8],[.75,.0,.02,-.08,-.3,.2,.9],[1,...Z6]]; T.E=[[.15,'out'],[.75,'in']]; }
  else T.G=[[0,...Z6],[1,...Z6]];
  return T; }
const RLT={}; const rlT=(style,empty)=>RLT[style+empty]||(RLT[style+empty]=rlTracks(style,empty));
const INSP=[[0,...Z6],[.12,-.07,.05,.04,.1,.6,.35],[.42,-.07,.06,.04,.15,.7,.4],[.55,-.05,.04,.03,-.05,-.3,-.7],[.82,-.05,.04,.03,-.08,-.35,-.75],[1,...Z6]];
const SH_POSE=[-.04,.03,.02,.1,.08,-.55];
const PUMP_CYC=[[0,0],[.22,0],[.32,1],[.4,1],[.5,0]], BOLT_CYC=[[0,0,0],[.18,0,0],[.24,1,0],[.32,1,1],[.36,1,1],[.42,1,0],[.47,0,0]], BOLT_RC=[[0,'grip'],[.12,'grip'],[.18,'knob'],[.47,'knob'],[.6,'grip']];
function vmSnd(name,id){ const f=sfx[name]; if(f) f(id); else if(name==='reloadOut'&&sfx.reload) sfx.reload(); }
function vmEvent(e,w){ if(e==='out') vmSnd('reloadOut',w.id); else if(e==='in') vmSnd('reloadIn',w.id); else if(e==='rack') vmSnd('boltRack',w.id); else if(e==='casings'){ for(let i=0;i<3;i++) ejectCase(false); } }
/* ----- springs and impulses (called from combat and movement) ----- */
function vmImpulse(px,py,pz,rx,ry,rz){ const p=VM.ps.v, r=VM.rs.v; p[0]+=px; p[1]+=py; p[2]+=pz; r[0]+=rx; r[1]+=ry; r[2]+=rz; }
function vmFire(w,s){ const H=handling(w.id), a=1-.55*P.ads, c=P.crouch>.5?.85:1; VM.shotT=GT; VM.cycMag=w.mag; VM.inspect=0; VM.flashT=.05;
  vmImpulse(rand(-.1,.1)*H.vz*a,H.vz*4*a,H.vz*28*a*c,H.vr*24*a*c,rand(-1,1)*H.vr*5*a,rand(-1,1)*H.vr*9*a);
  if(VM.flash){ VM.flash.rotation.z=Math.random()*6; const k=rand(.8,1.25); VM.flash.scale.set(k*t2flash(w.id),k*t2flash(w.id),k*t2flash(w.id)); }
  const id=w.id; if(id==='revolver') VM.cylA+=Math.PI/3;
  if(['pistol','smg','autorifle','lmg','marksman','gatling'].includes(id)) ejectCase(false); }
function springs(dt){ const n=dt>.02?3:1, h=dt/n;
  for(let s=0;s<n;s++){ for(let i=0;i<3;i++){ const P_=VM.ps, R_=VM.rs; P_.v[i]+=(-240*P_.x[i]-24*P_.v[i])*h; P_.x[i]+=P_.v[i]*h; R_.v[i]+=(-170*R_.x[i]-17*R_.v[i])*h; R_.x[i]+=R_.v[i]*h; } } }
/* ----- per-frame ----- */
const _hp=new V3(), _hr=[0,0,0], _tmp=new V3();
function toGun(o,out){ VM.gun.updateMatrixWorld(true); o.getWorldPosition(out); return VM.gun.worldToLocal(out); }
function updateVM(dt){
  const w=curW(); vmRoot.visible=!!VM.gun&&!P.downed&&!P.dead; updateCases(dt);
  if(!VM.gun||!VM.cfg) return;
  const ud=VM.gun.userData, cfg=VM.cfg, Hm=cfg.home, rod=w&&w.id==='rod', st=cfg.style;
  const ae=P.ads*P.ads*(3-2*P.ads), free=1-ae;
  let x=cfg.hip[0]+(cfg.ads[0]-cfg.hip[0])*ae, y=cfg.hip[1]+(cfg.ads[1]-cfg.hip[1])*ae, z=cfg.hip[2]+(cfg.ads[2]-cfg.hip[2])*ae;
  let rxr=0,ryr=.035*free,rzr=0;
  // look lag and sway
  let dy=P.yaw-VM.lyaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); const dp=P.pitch-VM.lpitch; VM.lyaw=P.yaw; VM.lpitch=P.pitch;
  const k=Math.min(1,dt*9), sm=1-.8*ae;
  VM.swx+=(clamp(dy/Math.max(dt,1e-3)*.012,-.05,.05)-VM.swx)*k; VM.swy+=(clamp(dp/Math.max(dt,1e-3)*.012,-.04,.04)-VM.swy)*k;
  x+=VM.swx*.5*sm; y-=VM.swy*.4*sm; ryr-=VM.swx*1.1*sm; rxr-=VM.swy*.9*sm; rzr+=VM.swx*1.4*sm;
  // idle breathing
  const br=.25+.75*free; y+=Math.sin(GT*1.7)*.0024*br; rxr+=Math.sin(GT*1.7+.6)*.005*br; x+=Math.sin(GT*.85)*.0016*br; rzr+=Math.sin(GT*.6)*.006*free;
  // bob, tied to the footstep phase
  const mv=P.moving&&P.grounded&&!(P.slideT>0)?1:0; VM.sprK+=((P.sprint&&!(P.slideT>0)?1:0)-VM.sprK)*Math.min(1,dt*9);
  VM.slK+=((P.slideT>0?1:0)-VM.slK)*Math.min(1,dt*10); VM.crK+=((P.crouch>.5?1:0)-VM.crK)*Math.min(1,dt*8);
  const amp=mv*(1-.85*ae)*(VM.crK>.5?.6:1)*(1+VM.sprK*1.1), bt=P.bobT||0;
  x+=Math.cos(bt)*.009*amp; y-=Math.abs(Math.sin(bt))*.011*amp; rzr+=Math.cos(bt)*.014*amp; ryr+=Math.sin(bt)*.01*amp*VM.sprK;
  // poses
  const pis=st==='pistol'||st==='revolver'||w&&WD[w.id].type==='ion';
  if(VM.sprK>.001){ const s_=VM.sprK; if(pis){ x-=.02*s_; y-=.07*s_; z+=.04*s_; rxr+=.55*s_; ryr+=.25*s_; rzr-=.1*s_; } else { x-=.03*s_; y-=.05*s_; z+=.02*s_; rxr-=.35*s_; ryr+=.7*s_; rzr+=.3*s_; } }
  if(VM.slK>.001){ x-=.03*VM.slK; y-=.02*VM.slK; rzr+=.28*VM.slK; ryr+=.1*VM.slK; }
  rzr+=.05*VM.crK*free; y+=.006*VM.crK*free;
  // springs
  springs(dt); const sa=1-.45*ae; x+=VM.ps.x[0]*sa; y+=VM.ps.x[1]*sa; z+=VM.ps.x[2]; rxr+=VM.rs.x[0]*sa; ryr+=VM.rs.x[1]*sa; rzr+=VM.rs.x[2]*sa;
  // reset animated parts to rest
  const lh=VM.lh, rh=VM.rh; if(lh){ lh.position.copy(Hm.lh); lh.rotation.copy(Hm.lhr); } if(rh){ rh.position.copy(Hm.rh); rh.rotation.copy(Hm.rhr); }
  if(ud.mag){ ud.mag.position.copy(Hm.mag); ud.mag.rotation.copy(Hm.magr); ud.mag.visible=Hm.magVis; }
  let boltAmt=0, boltLift=0, pumpAmt=0, xAmt=0;
  const sinceShot=GT-VM.shotT;
  // firing cycles
  if(w&&!w.reloadEnd){
    if(st==='pistol'){ boltAmt=w.mag===0?1:sinceShot<.025?sinceShot/.025:sinceShot<.09?1-(sinceShot-.025)/.065:0; }
    else if(['smg','lmg','marksman'].includes(w.id)){ boltAmt=sinceShot<.02?sinceShot/.02:sinceShot<.06?1-(sinceShot-.02)/.04:0; }
    else if(st==='shell'&&VM.cycMag>0&&sinceShot<.6){ const sc=Math.min(1,statsOf(w).rate*(P.perks.has('rapid')?.75:1)/.75); const c=sinceShot/sc; pumpAmt=kfs(PUMP_CYC,c,_b2)[0];
      if(c>=.3&&!VM.pumped){ VM.pumped=true; vmSnd('boltRack',w.id); ejectCase(true); } if(c<.3) VM.pumped=false; y-=pumpAmt*.008; rxr-=pumpAmt*.03; }
    else if(st==='bolt'&&VM.cycMag>0&&sinceShot<.7){ const sc=Math.min(1,statsOf(w).rate*(P.perks.has('rapid')?.75:1)/.7); const c=sinceShot/sc; kfs(BOLT_CYC,c,_b2); boltLift=_b2[0]; boltAmt=_b2[1];
      if(rh){ kfh(BOLT_RC,c,boltAnc,_hp,_hr); rh.position.copy(_hp); rh.rotation.set(Hm.rhr.x+.4*boltLift,Hm.rhr.y,Hm.rhr.z+.8*(boltLift)); }
      if(c>=.26&&!VM.racked){ VM.racked=true; vmSnd('boltRack',w.id); ejectCase(false); } if(c<.26) VM.racked=false; rzr+=.1*Math.min(1,c*5)*(1-clamp((c-.47)*6,0,1)); }
  }
  // revolver cylinder and hammer
  if(ud.cyl){ VM.cylT+=(VM.cylA-VM.cylT)*Math.min(1,dt*30); ud.cyl.rotation.z=VM.cylT; }
  if(ud.hammer){ const c=sinceShot, rate=w?statsOf(w).rate:.3; ud.hammer.rotation.x=st==='revolver'?(c<.04?.55:.55*(1-clamp((c-.04)/(rate*.7),0,1))):(c<.06?.5:0); }
  // reload
  let rk=-1;
  if(w&&w.reloadEnd&&w.rlStart!==undefined){
    if(VM.rlId!==w.rlId){ VM.rlId=w.rlId; VM.ev={}; VM.inspect=0; }
    { const k0=w.rlShell?(w.rlPh==='in'?clamp((GT-w.rlA)/Math.max(.05,w.rlB-w.rlA),0,1):w.rlPh==='out'?1-clamp((GT-w.rlA)/Math.max(.05,w.rlB-w.rlA),0,1):1):clamp((GT-w.rlStart)/Math.max(.05,w.rlDur),0,1);
      const env=w.rlShell?k0*k0*(3-2*k0):clamp(Math.min(k0/.14,(1-k0)/.12),0,1), e=env*env*(3-2*env), lift=st==='gauntlet'||st==='rod'?[0,0,0]:st==='pistol'||st==='revolver'?[-.04,.05,.06]:[-.06,.07,.02]; x+=lift[0]*e; y+=lift[1]*e; z+=lift[2]*e; }
    if(w.rlShell){ shellAnim(w,ud,cfg); x+=_g6[0]; y+=_g6[1]; z+=_g6[2]; rxr+=_g6[3]; ryr+=_g6[4]; rzr+=_g6[5]; pumpAmt=Math.max(pumpAmt,VM.pumpR||0); }
    else { rk=clamp((GT-w.rlStart)/Math.max(.05,w.rlDur),0,1); const T=rlT(st,!!w.rlEmpty);
      kfs(T.G,rk,_g6); x+=_g6[0]; y+=_g6[1]; z+=_g6[2]; rxr+=_g6[3]; ryr+=_g6[4]; rzr+=_g6[5];
      if(T.H&&lh){ kfh(T.H,rk,ancF,_hp,_hr); lh.position.copy(_hp); lh.rotation.set(Hm.lhr.x+_hr[0],Hm.lhr.y+_hr[1],Hm.lhr.z+_hr[2]); }
      if(T.R&&rh){ kfh(T.R,rk,boltAnc,_hp,_hr); rh.position.copy(_hp); }
      if(T.B){ kfs(T.B,rk,_b2); if(T.B[0].length>2){ boltLift=_b2[0]; boltAmt=_b2[1]; if(rh) rh.rotation.set(Hm.rhr.x+.4*boltLift,Hm.rhr.y,Hm.rhr.z+.8*boltLift); } else boltAmt=_b2[0]; }
      if(T.X) xAmt=kfs(T.X,rk,_b2)[0];
      if(T.M&&ud.mag) magAnim(T.M,rk,w,ud,cfg);
      if(T.E) for(const [t,e] of T.E){ if(rk>=t&&!VM.ev[t]){ VM.ev[t]=1; vmEvent(e,w); } }
      if(st==='rod') VM.rodFlare=Math.max(VM.rodFlare,Math.sin(rk*Math.PI)*.6); }
  }
  if(ud.bolt&&Hm.bolt){ ud.bolt.position.copy(Hm.bolt); ud.bolt.position.z+=boltAmt*(ud.boltTravel||.04); if(ud.boltLift) ud.bolt.rotation.z=boltLift*ud.boltLift; }
  if(ud.pump){ ud.pump.position.z=Hm.pump.z+pumpAmt*ud.pumpTravel; if(lh&&!(w&&w.reloadEnd&&w.rlShell&&w.rlPh!=='out')) lh.position.z+=pumpAmt*ud.pumpTravel; }
  if(ud.crane) ud.crane.rotation.z=xAmt; if(ud.cover) ud.cover.rotation.x=xAmt; if(ud.barrel) ud.barrel.rotation.x=xAmt;
  // inspect
  if(VM.inspect>0){ if(P.ads>.1||P.sprint||(w&&w.reloadEnd)||P.swapT>0) VM.inspect=0; else { VM.inspect-=dt; kfs(INSP,1-VM.inspect/INSPECT_T,_g6); x+=_g6[0]; y+=_g6[1]; z+=_g6[2]; rxr+=_g6[3]; ryr+=_g6[4]; rzr+=_g6[5]; } }
  // equip / holster
  if(VM.equip>0){ VM.equip=Math.max(0,VM.equip-dt); const e=VM.equip/VM.equipDur, p=e*e; y-=.26*p; z+=.05*p; rxr-=.85*p; rzr+=.35*p; x+=.03*p;
    if(VM.equip===0&&VM.first){ VM.firstT=.4; VM.first=0; } }
  if(VM.firstT>0){ VM.firstT-=dt; const c=.4-VM.firstT; const b=c<.1?c/.1:c<.18?1:Math.max(0,1-(c-.18)/.06); if(ud.bolt&&Hm.bolt){ ud.bolt.position.z=Hm.bolt.z+b*(ud.boltTravel||.04); if(ud.boltLift) ud.bolt.rotation.z=Math.min(1,b*1.5)*ud.boltLift; }
    rzr+=.12*Math.sin(Math.min(1,c/.4)*Math.PI); if(c>=.1&&!VM.firstSnd){ VM.firstSnd=1; if(w) vmSnd('boltRack',w.id); } } else VM.firstSnd=0;
  if(VM.hol>0){ VM.hol=Math.max(0,VM.hol-dt); const h=1-VM.hol/.15; y-=.3*h*h; rxr-=1.0*h; rzr+=.3*h; if(VM.hol===0) buildVM(); }
  // knife
  if(VM.melee>0){ const k2=clamp(1-VM.melee/KN.T,0,1); let g=k2<.2?k2/.2:k2<.78?1:1-(k2-.78)/.22; g=g*g*(3-2*g); y-=.38*g; x+=.08*g; rxr-=.6*g; rzr-=.25*g; }
  if(P.revive>0) y-=.3;
  // relic glows
  VM.rodFlare=Math.max(0,(VM.rodFlare||0)-dt*3);
  if(ud.glow||ud.bulb){ const ready=w?clamp(1-(w.next-GT)/Math.max(.05,statsOf(w).rate),0,1):1;
    if(ud.glow){ ud.glow.scale.setScalar(1+Math.sin(GT*6)*.08+VM.rodFlare*1.4); ud.glow.material.opacity=(w&&w.up?.3:.2)+ready*.12+VM.rodFlare*.5; }
    if(ud.bulb){ ud.bulb.material.opacity=(.3+.55*ready)*(.8+Math.random()*.2); ud.bulb.scale.setScalar(1+VM.rodFlare*.6); } }
  if(rod){ if(ud.crystal) ud.crystal.scale.set(1+VM.rodFlare*.5,1+VM.rodFlare*.5,1.8+VM.rodFlare*.8);
    if(ud.rings) ud.rings.forEach((r,i)=>{ r.rotation.x+=dt*(i?2.2:-1.6)*(1+VM.rodFlare*4); r.rotation.y+=dt*(i?-1.1:1.4); });
    if(ud.plume) ud.plume.scale.set(1,1+Math.random()*.4+VM.rodFlare,1);
    rxr+=Math.sin(GT*1.3)*.02; rzr+=Math.sin(GT*.9)*.03; z-=VM.rodFlare*.07; }
  vmRoot.position.set(x,y,z); vmRoot.rotation.set(rxr,ryr,rzr);
  // at ADS clip what sits between the eye and the rear sight (stock, receiver) so it never fills the screen
  const fov=58-(cfg.vf||0)*ae, near=.01+(cfg.near||0)*ae*ae; if(Math.abs(vmCam.fov-fov)>.01||Math.abs(vmCam.near-near)>.001){ vmCam.fov=fov; vmCam.near=near; vmCam.updateProjectionMatrix(); }
  if(VM.flash){ VM.flashT-=dt; VM.flash.visible=VM.flashT>0&&w&&w.id!=='gauntlet'; }
  if(ud.crystal) ud.crystal.rotation.z+=dt*2;
  if(ud.spin) ud.spin.rotation.z+=dt*((mouseDown||PAD.fire)?30:3);
}
function ancF(n,out){ const c=VM.cfg, ud=VM.gun.userData;
  if(n==='chamber'&&c.chamber) return toGun(c.chamber,out);
  if(n==='cyl'&&ud.cyl) return toGun(ud.cyl,out);
  return out.copy(c.anc[n]||c.anc.home); }
function boltAnc(n,out){ const ud=VM.gun.userData; if(n==='knob'&&ud.bolt){ VM.gun.updateMatrixWorld(true); out.set(.052,-.01,.075); ud.bolt.localToWorld(out); VM.gun.worldToLocal(out); out.x+=.012; out.y-=.03; out.z+=.01; return out; } return out.copy(VM.cfg.home.rh); }
// magazine: home → pulled with the hand → falling → hidden → new one in the hand → inserted → seated
function magAnim(Mt,k,w,ud,cfg){ const m=ud.mag, H=cfg.home, lh=VM.lh, tot=w.rlDur, off=Mt.off?_tmp.fromArray(Mt.off):cfg.magOff;
  const attached=()=>{ m.position.copy(lh.position).add(off); m.visible=true; };
  if(Mt.pull>=0&&k>=Mt.pull&&k<Mt.rel) attached();
  else if(Mt.rel>=0&&k>=Mt.rel&&k<Mt.hide){ const t=(k-Mt.rel)*tot; if(Mt.dyn) ancF('chamber',m.position); else if(Mt.pull===Mt.rel) m.position.copy(H.mag); else m.position.copy(cfg.anc.mag).add(off).add(new V3(0,-.05,0));
    m.position.y-=1.2*t*t+.1*t; m.position.x-=.08*t; m.position.z+=.1*t; m.rotation.x+=t*3; m.rotation.z+=t*2; m.visible=true; }
  else if(k>=Mt.hide&&k<Mt.grab) m.visible=false;
  else if(k>=Mt.grab&&k<Mt.ins) attached();
  else if(k>=Mt.ins&&k<Mt.seat){ const t=(k-Mt.ins)/(Mt.seat-Mt.ins); const from=_ka.copy(lh.position).add(off); const to=Mt.dyn||ud.chamber?ancF('chamber',_kb):_kb.copy(H.mag); if(Mt.sink) to.copy(from).add(new V3(0,-.03,0)); m.position.copy(from).lerp(to,t*t*(3-2*t)); m.visible=true; }
  else if(k>=Mt.seat){ if(Mt.gone!==undefined&&k>=Mt.gone) m.visible=H.magVis; else if(Mt.gone!==undefined){ if(Mt.sink) m.position.copy(lh.position).add(off).add(new V3(0,-.03,0)); else ancF('chamber',m.position); m.visible=true; }
    else if(Mt.dyn) ancF('chamber',m.position); }
  if(m.visible&&Mt.dyn&&k>=Mt.seat){ m.rotation.copy(H.magr); } }
// shotgun: lift, then one shell per cycle into the loading port, then a pump if it ran dry
function shellAnim(w,ud,cfg){ const lh=VM.lh, ph=w.rlPh, k=clamp((GT-w.rlA)/Math.max(.05,w.rlB-w.rlA),0,1), m=ud.mag; VM.pumpR=0;
  if(ph==='in'){ const e=k*k*(3-2*k); for(let i=0;i<6;i++) _g6[i]=SH_POSE[i]*e; if(lh){ kfh([[0,'home'],[1,'port',0,-.02,.01]],k,ancF,_hp,_hr); lh.position.copy(_hp); } }
  else if(ph==='load'){ for(let i=0;i<6;i++) _g6[i]=SH_POSE[i]; const push=k>.7&&k<.9?Math.sin((k-.7)/.2*Math.PI):0; _g6[1]+=push*.006; _g6[3]+=push*.03;
    if(lh){ kfh([[0,'port',0,-.02,.01],[.3,'low2'],[.45,'low2'],[.75,'port',0,0,0],[.85,'port',0,.006,-.012],[1,'port',0,-.02,.01]],k,ancF,_hp,_hr); lh.position.copy(_hp); lh.rotation.z+=.5; }
    if(m&&lh&&k>.38&&k<.86){ m.visible=true; m.position.copy(lh.position).add(_tmp.set(0,.03,-.01)); } }
  else { const e=1-k*k*(3-2*k), pump=w.rlPump; for(let i=0;i<6;i++) _g6[i]=SH_POSE[i]*(pump?clamp(1-k*1.6,0,1)*1:e);
    if(pump){ VM.pumpR=kfs([[0,0],[.35,0],[.5,1],[.62,1],[.78,0]],k,_b2)[0]; if(k>=.5&&!VM.ev.pump){ VM.ev.pump=1; vmSnd('boltRack',w.id); ejectCase(true); } }
    if(lh){ const tr=pump?[[0,'port',0,-.02,.01],[.35,'home']]:[[0,'port',0,-.02,.01],[1,'home']]; kfh(tr,k,ancF,_hp,_hr); lh.position.copy(_hp); lh.position.z+=VM.pumpR*ud.pumpTravel; } } }
