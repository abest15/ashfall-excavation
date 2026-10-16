/* ---------- the Colossus: a towering furnace-automaton that patrols No Man's Land ---------- */
const COL={path:[[52,-20],[88,-20],[88,-5],[52,-5]],s:0,speed:2.1,T:3.4,t:0,heading:Math.PI/2,feet:[],arms:[],felled:false,fall:0,stagger:0,lastRide:-99,vOn:false,vBurst:[false,false,false],valves:[],boomed:false,msgT:-9};
{ const pts=COL.path; COL.cum=[0]; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; COL.cum.push(COL.cum[i]+Math.hypot(b[0]-a[0],b[1]-a[1])); } COL.len=COL.cum[pts.length]; }
function colAt(s){ s=((s%COL.len)+COL.len)%COL.len; const pts=COL.path; let i=0; while(i<pts.length-1&&s>COL.cum[i+1]) i++; const a=pts[i], b=pts[(i+1)%pts.length], k=(s-COL.cum[i])/(COL.cum[i+1]-COL.cum[i]);
  return {x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,h:Math.atan2(b[0]-a[0],b[1]-a[1])}; }
const CM={metal:L({color:0x4d4741}),dark:L({color:0x26221f}),rust:L({color:0x6e3c22}),glow:B({color:0xff7a2a}),eye:B({color:0xffc860}),valve:B({color:0xff6a1a})};
{ const g=new THREE.Group(); g.rotation.order='YXZ'; scene.add(g); COL.g=g;
  const RBX=(w,h,d)=>QUAL?roundBox(w,h,d):new THREE.BoxGeometry(w,h,d);
  // riveted boiler-plate body: ONE merged plate mesh + ONE glow mesh (furnace, visor, cabin windows, stack embers)
  const b=GB(), gl=GB(), S=SEG, PL=0x5c544b, DK=0x2e2924, RS=0x77432a, BR=0x8c6c3a;
  const rivRing=(rx,rz,y,n)=>{ if(QUAL) for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; b.add(new THREE.SphereGeometry(.07,5,4),DK,{p:[Math.sin(a)*rx,y,Math.cos(a)*rz]}); } };
  const seams=(c,x,y,z)=>{ const a=Math.atan2(x,z); if(Math.abs(Math.sin(a*4))<.06) c.multiplyScalar(.6); if(hash3(Math.round(x*3),Math.round(y*3),Math.round(z*3))>.82) c.lerp(new THREE.Color(RS),.45); };
  b.add(RBX(4.8,1.8,2.9),DK,{p:[0,9.4,0],grime:.2}); for(const sx of [-1,1]) b.add(new THREE.CylinderGeometry(.9,.9,.8,S(14)),RS,{p:[sx*2.2,9.2,0],r:[0,0,Math.PI/2]});
  b.add(new THREE.CylinderGeometry(3,2.8,5.2,S(22,12)),PL,{p:[0,12.9,0],s:[1,1,.74],grime:.25,paint:seams});
  for(const y of [10.3,15.6]){ b.add(new THREE.CylinderGeometry(3.15,3.15,.45,S(22,12)),RS,{p:[0,y,0],s:[1,1,.76],grime:.3}); rivRing(3.17,2.41,y+.12,36); rivRing(3.17,2.41,y-.12,36); }
  rivRing(3.02,2.24,12.9,32);
  b.add(RBX(3.5,2.7,.4),DK,{p:[0,12.5,2.12]}); for(let i=0;i<6;i++) b.add(new THREE.BoxGeometry(.16,2.3,.3),DK,{p:[-1.25+i*.5,12.5,2.33]});
  for(const sx of [-1,1]){ b.add(new THREE.BoxGeometry(.2,.5,.2),BR,{p:[sx*1.75,13.4,2.35]}); b.add(new THREE.BoxGeometry(.2,.5,.2),BR,{p:[sx*1.75,11.6,2.35]});
    b.add(new THREE.CylinderGeometry(.32,.32,.1,S(14)),BR,{p:[sx*2.4,14.4,1.75],r:[Math.PI/2,0,sx*.4]}); for(let i=0;i<4;i++) b.add(new THREE.SphereGeometry(.16,S(6),S(5)),RS,{p:[sx*2.75,11+i*1.3,1.55]}); }
  const fg=new THREE.PlaneGeometry(3,2.2,4,3); gl.add(fg,0xff7a2a,{p:[0,12.5,2.33],paint:(c,x,y)=>{ const d=Math.hypot(x/1.5,(y-12.3)/1.1); c.setRGB(1,.42+.4*(1-d),.12+.25*(1-d)); }});
  for(const sx of [-1,1]){ b.add(new THREE.SphereGeometry(1.3,S(12),S(8)),RS,{p:[sx*3.6,14.9,0],s:[1,.85,1.1],grime:.3}); b.add(RBX(2.2,.25,2.6),PL,{p:[sx*3.8,15.9,0],r:[0,0,-sx*.25]}); rivRing(1.1,1.1,15.98,QUAL?10:0); }
  b.add(new THREE.CylinderGeometry(1.6,2,.6,S(16)),DK,{p:[0,16.1,0]});
  b.add(RBX(3.3,2.6,3.1),PL,{p:[0,17.3,.2],grime:.2,paint:seams}); b.add(RBX(3.5,.3,3.3),RS,{p:[0,18.7,.2]}); b.add(RBX(3.4,.25,3.2),RS,{p:[0,16.05,.2]});
  b.add(new THREE.CylinderGeometry(.62,.62,.2,S(14)),DK,{p:[0,18.95,-.3]}); b.add(new THREE.TorusGeometry(.4,.05,5,S(14)),BR,{p:[0,19.12,-.3],r:[Math.PI/2,0,0]}); b.add(new THREE.BoxGeometry(.9,.05,.08),BR,{p:[0,19.12,-.3]});
  if(QUAL){ for(const [x,z] of [[-1.6,-1.4],[1.6,-1.4],[-1.6,1.8],[1.6,1.8],[0,1.8],[0,-1.4]]) b.add(new THREE.CylinderGeometry(.04,.04,.7,5),DK,{p:[x,19.2,z]});
    for(const [x,z,w,d] of [[0,-1.4,3.2,.06],[0,1.8,3.2,.06],[-1.6,.2,.06,3.2],[1.6,.2,.06,3.2]]) b.add(new THREE.BoxGeometry(w,.06,d),DK,{p:[x,19.5,z]}); }
  b.add(new THREE.BoxGeometry(2.9,.7,.18),DK,{p:[0,17.5,1.72]}); gl.add(new THREE.PlaneGeometry(2.6,.42),0xffc860,{p:[0,17.5,1.82]});
  for(const sx of [-1,1]) for(const z of [-.5,.7]){ b.add(new THREE.BoxGeometry(.12,.75,.65),DK,{p:[sx*1.66,17.4,z]}); gl.add(new THREE.PlaneGeometry(.5,.58),0xffb050,{p:[sx*1.73,17.4,z],r:[0,sx*Math.PI/2,0]}); }
  for(const sx of [-1,1]){ b.add(new THREE.CylinderGeometry(.45,.6,4.6,S(12)),DK,{p:[sx*1.7,17.8,-1.9],r:[0,0,sx*.04],grime:.3}); b.add(new THREE.CylinderGeometry(.78,.5,.55,S(12)),RS,{p:[sx*1.78,20.25,-1.9]});
    for(const y of [16.4,17.9,19.2]) b.add(new THREE.CylinderGeometry(.6,.6,.14,S(12)),RS,{p:[sx*1.7+sx*(y-17.8)*.04,y,-1.9]}); gl.add(new THREE.CircleGeometry(.5,S(12)),0xff5a1a,{p:[sx*1.78,20.5,-1.9],r:[-Math.PI/2,0,0]});
    b.add(new THREE.TorusGeometry(.75,.17,S(6,4),S(10,6),Math.PI/2),DK,{p:[sx*1.7,15.7,-1.15],r:[0,Math.PI/2,Math.PI]}); }
  b.add(new THREE.CylinderGeometry(1.1,1.1,3.6,S(14)),RS,{p:[0,13.4,-2.75],r:[0,0,Math.PI/2],grime:.3}); for(const x of [-1.2,0,1.2]) b.add(new THREE.CylinderGeometry(1.16,1.16,.12,S(14)),DK,{p:[x,13.4,-2.75],r:[0,0,Math.PI/2]});
  const COLM=L({map:metalTex,vertexColors:true,specular:0x2a2420,shininess:24}), COLG=new THREE.MeshBasicMaterial({vertexColors:true}); COL.mat=COLM;
  g.add(new THREE.Mesh(b.done(),COLM)); g.add(new THREE.Mesh(gl.done(),COLG));
  const armG=GB(); armG.add(RBX(1.3,4.6,1.3),PL,{p:[0,-2.4,0],grime:.25}); for(const y of [-.6,-4]) armG.add(new THREE.BoxGeometry(1.45,.25,1.45),RS,{p:[0,y,0]});
  armG.add(new THREE.CylinderGeometry(.32,.32,1.8,S(10)),DK,{p:[0,-1.3,.85]}); armG.add(new THREE.CylinderGeometry(.15,.15,3.4,S(8)),0xb8b0a0,{p:[0,-2.9,.85]}); armG.add(new THREE.SphereGeometry(.85,S(10),S(8)),RS,{p:[0,-4.7,0]});
  const faG=GB(); faG.add(RBX(1.15,4,1.15),DK,{p:[0,-2,0],grime:.25}); faG.add(new THREE.BoxGeometry(1.3,.22,1.3),RS,{p:[0,-.7,0]}); faG.add(RBX(1.7,1.3,1.7),RS,{p:[0,-4.4,0],grime:.3});
  for(let i=0;i<3;i++) faG.add(new THREE.BoxGeometry(.32,.9,.36),DK,{p:[-.5+i*.5,-5.3,.5],r:[.35,0,0]}); faG.add(new THREE.BoxGeometry(.32,.8,.36),DK,{p:[.75,-5,-.3],r:[-.3,0,.3]});
  const armGeo=armG.done(), faGeo=faG.done();
  for(const sx of [-1,1]){ const arm=new THREE.Group(); arm.position.set(sx*4.2,14.2,0); g.add(arm); arm.add(new THREE.Mesh(armGeo,COLM));
    const fa=new THREE.Group(); fa.position.y=-4.7; arm.add(fa); fa.add(new THREE.Mesh(faGeo,COLM)); COL.arms.push({arm,fa,sx}); }
  const segGeo=(w,col)=>{ const b2=GB(), rx=q=>q.rotateX(Math.PI/2); if(!QUAL){ b2.add(new THREE.BoxGeometry(w,w,1),col,{p:[0,0,.5]}); return b2.done(); }
    b2.add(new THREE.CylinderGeometry(w*.56,w*.5,1,14),col,{p:[0,0,.5],pre:rx});
    for(const t of [.08,.5,.92]) b2.add(new THREE.CylinderGeometry(w*.6-t*w*.05,w*.6-t*w*.05,.05,14),RS,{p:[0,0,t],pre:rx});
    b2.add(new THREE.BoxGeometry(w*.5,w*.12,.7),DK,{p:[0,-w*.52,.5]}); return b2.done(); };
  const thighG=segGeo(1.5,PL), shinG=segGeo(1.25,0x3a352f), footG=(()=>{ const q=GB(); q.add(QUAL?roundBox(2.4,.9,3.4):new THREE.BoxGeometry(2.4,.9,3.4),RS,{grime:.3}); for(let i=0;i<3;i++) q.add(RBX(.62,.6,.9),DK,{p:[-.75+i*.75,-.1,1.9]}); q.add(RBX(1.2,.5,.6),DK,{p:[0,-.15,-1.85]}); return q.done(); })(),
    kneeG=(()=>{ const q=GB(); q.add(new THREE.SphereGeometry(.95,QUAL?10:7,QUAL?8:5),RS,{grime:.3}); q.add(new THREE.CylinderGeometry(.5,.5,2.3,QUAL?10:6),DK,{r:[0,0,Math.PI/2]}); return q.done(); })(), valveG=new THREE.CylinderGeometry(.5,.5,.4,12);
  const housG=new THREE.CylinderGeometry(.3,.3,1,QUAL?10:6); housG.rotateX(Math.PI/2); housG.translate(0,0,.5); const rodG=new THREE.CylinderGeometry(.14,.14,1,QUAL?8:5); rodG.rotateX(Math.PI/2); rodG.translate(0,0,.5);
  const housM=L({color:0x2c2824,map:metalTex}), rodM=L({color:0xb8b2a6,specular:0x888888,shininess:60});
  const hatchG=(()=>{ const q=GB(); q.add(new THREE.CylinderGeometry(.75,.75,.08,16),DK,{}); q.add(new THREE.TorusGeometry(.5,.05,5,14),BR,{p:[0,.12,0],r:[Math.PI/2,0,0]}); q.add(new THREE.BoxGeometry(1.0,.05,.08),BR,{p:[0,.12,0]}); q.add(new THREE.BoxGeometry(.08,.05,1.0),BR,{p:[0,.12,0]});
    if(QUAL) for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; q.add(new THREE.SphereGeometry(.05,4,3),BR,{p:[Math.sin(a)*.68,.05,Math.cos(a)*.68]}); } return q.done(); })();
  for(const side of [-1,1]){ const f={side,plant:new V3(),from:new V3(),to:new V3(),cur:new V3(),sw:false,hatch:false};
    f.thigh=new THREE.Mesh(thighG,COLM); f.shin=new THREE.Mesh(shinG,COLM); f.foot=new THREE.Mesh(footG,COLM); f.knee=new THREE.Mesh(kneeG,COLM);
    f.hous=new THREE.Mesh(housG,housM); f.rod=new THREE.Mesh(rodG,rodM); scene.add(f.hous,f.rod); if(COL.feet.length===0){ const h=new THREE.Mesh(hatchG,COLM); h.position.set(0,.47,-.3); f.foot.add(h); }
    f.valve=new THREE.Mesh(valveG,CM.valve); f.valve.visible=false; f.valve.userData.cvalve=COL.feet.length; COL.valves[COL.feet.length]=f.valve;
    f.shadow=new THREE.Mesh(new THREE.CircleGeometry(2.6,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,depthWrite:false})); f.shadow.rotation.x=-Math.PI/2; f.shadow.visible=false;
    scene.add(f.thigh,f.shin,f.foot,f.knee,f.valve,f.shadow); COL.feet.push(f); }
  const cv=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.45,14),CM.valve); cv.rotation.x=Math.PI/2; cv.position.set(0,14.6,2.35); cv.visible=false; cv.userData.cvalve=2; g.add(cv); COL.valves[2]=cv;
  const mk=new THREE.Group(); mk.visible=false; scene.add(mk); COL.marker=mk;
  const ring=new THREE.Mesh(new THREE.RingGeometry(2,2.5,28),new THREE.MeshBasicMaterial({color:0x74d9ea,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.y=.08; mk.add(ring); COL.ring=ring;
  const colm=new THREE.Mesh(new THREE.CylinderGeometry(2,2,12,18,1,true),M.add(0x74d9ea,.1)); colm.position.y=6; mk.add(colm);
  COL.lamp=new THREE.Mesh(new THREE.BoxGeometry(.6,.4,.3),B({color:0x74d9ea})); COL.lamp.visible=false; scene.add(COL.lamp); }
const hatchReady=()=>POWER.on&&!COL.felled&&mode==='main'&&GT-COL.lastRide>30;
function setValves(on){ COL.vOn=on; COL.valves.forEach((v,i)=>{ const live=on&&!COL.vBurst[i]; v.visible=live; if(live) addSolid(v); else removeSolid(v); }); }
function colReset(){ COL.s=0; COL.t=0; COL.felled=false; COL.fall=0; COL.stagger=0; COL.lastRide=-99; COL.boomed=false; COL.vBurst=[false,false,false]; setValves(false);
  const bp=colAt(0); COL.heading=bp.h; COL.g.rotation.set(0,bp.h,0); COL.g.position.set(bp.x,0,bp.z);
  COL.feet.forEach(f=>{ const lat=f.side*2.2; f.plant.set(bp.x+Math.cos(bp.h)*lat,0,bp.z-Math.sin(bp.h)*lat); f.cur.copy(f.plant); f.sw=false; f.shadow.visible=false; }); COL.marker.visible=false; }
const _ch=new V3(), _cf=new V3(), _ck=new V3(), _cv=new V3(), _cb=new V3(), UPV=new V3(0,1,0);
function legIK(f,fwd){ COL.g.updateMatrixWorld(); _ch.set(f.side*1.9,9,0).applyMatrix4(COL.g.matrixWorld); _cf.copy(f.cur); _cf.y+=.9;
  const L1=5.4; let d=_ch.distanceTo(_cf); _cv.subVectors(_cf,_ch).normalize(); d=Math.min(d,L1*2-.05); _cf.copy(_ch).addScaledVector(_cv,d);
  _cb.copy(fwd).addScaledVector(_cv,-fwd.dot(_cv)).normalize(); _ck.copy(_ch).addScaledVector(_cv,d/2).addScaledVector(_cb,Math.sqrt(Math.max(0,L1*L1-d*d/4)));
  f.thigh.position.copy(_ch); f.thigh.lookAt(_ck); f.thigh.scale.z=_ch.distanceTo(_ck);
  f.shin.position.copy(_ck); f.shin.lookAt(_cf); f.shin.scale.z=_ck.distanceTo(_cf);
  f.knee.position.copy(_ck); f.valve.position.copy(_ck).addScaledVector(fwd,.95); f.valve.quaternion.setFromUnitVectors(UPV,fwd);
  f.foot.position.set(f.cur.x,f.cur.y+.45,f.cur.z); f.foot.rotation.y=COL.heading;
  // hydraulic ram behind the leg: the housing hangs from the hip, the rod from the ankle, so it telescopes with the stride
  _pa.copy(_ch).addScaledVector(fwd,-1.05).addScaledVector(UPV,-.5); _pb.copy(_cf).addScaledVector(fwd,-1).addScaledVector(UPV,1.5);
  f.hous.position.copy(_pa); f.hous.lookAt(_pb); f.hous.scale.z=5.4; f.rod.position.copy(_pb); f.rod.lookAt(_pa); f.rod.scale.z=Math.max(1,_pa.distanceTo(_pb)-3.6)+1.8; }
const _pa=new V3(), _pb=new V3();
function colStomp(f){ const p=f.plant, d=Math.hypot(P.pos.x-p.x,P.pos.z-p.z);
  if(state==='play'){ if(P.inCabin) P.shake=Math.max(P.shake,.12); else { P.shake=Math.max(P.shake,clamp(1-d/48,0,1)*.42); sfx.stomp(clamp(1-d/75,0,1)); } }
  spawnParticles(new V3(p.x,.4,p.z),'dirt',7); for(let i=0;i<(QUAL?10:5);i++){ const a=i/(QUAL?10:5)*6.28; spawnParticles(new V3(p.x+Math.cos(a)*2.2,.25,p.z+Math.sin(a)*2.2),'dirt',1); }
  if(typeof spawnDecal==='function') spawnDecal(new V3(p.x,0,p.z),null,'scorch',rand(2.4,3)); colSmoke(p.x,.4,p.z,QUAL?6:3,true);
  for(const z of zombies){ if(!z.dead&&z.rise<=0&&!z.boss&&!z.wstate&&Math.hypot(z.g.position.x-p.x,z.g.position.z-p.z)<2.9) killZombie(z,'self'); }
  if(state==='play'&&!P.inCabin&&d<2.8&&P.pos.y<1.5){ if(f.hatch&&hatchReady()) enterCabin(); else { const l=d||1; P.lx=(P.pos.x-p.x)/l; P.lz=(P.pos.z-p.z)/l; P.lungeT=.3; hurtPlayer(130,null); toast('Crushed under the Colossus'); } } }
function updateColossus(dt){ updateSmoke(dt);
  const vis=mode==='main'; COL.g.visible=vis; for(const f of COL.feet){ f.thigh.visible=f.shin.visible=f.foot.visible=f.knee.visible=f.hous.visible=f.rod.visible=vis; if(!vis) f.shadow.visible=false; }
  if(!vis){ COL.marker.visible=false; COL.lamp.visible=false; return; }
  const fwd=new V3(Math.sin(COL.heading),0,Math.cos(COL.heading));
  if(COL.felled){ if(COL.fall<1){ COL.fall=Math.min(1,COL.fall+dt/3.2); const k=COL.fall*COL.fall; COL.g.rotation.x=k*1.38; COL.g.position.y=-k*7.4;
      if(COL.fall>=1&&!COL.boomed){ COL.boomed=true; const p=COL.g.position.clone().addScaledVector(fwd,10), d=Math.hypot(P.pos.x-p.x,P.pos.z-p.z); if(state==='play'&&!P.inCabin){ P.shake=Math.max(P.shake,clamp(1-d/60,0,1)*.6); sfx.stomp(clamp(1-d/80,.2,1)); sfx.boom(); } spawnParticles(new V3(p.x,1,p.z),'dirt',20); } }
    for(const a of COL.arms) a.arm.rotation.x=-.4; for(const f of COL.feet){ f.shadow.visible=false; legIK(f,fwd); } COL.marker.visible=false; COL.lamp.visible=false; return; }
  const moving=COL.stagger<=0; if(!moving) COL.stagger-=dt;
  if(moving){ COL.t+=dt; COL.s+=COL.speed*dt; }
  const bp=colAt(COL.s); let dh=bp.h-COL.heading; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); COL.heading+=dh*Math.min(1,dt*.9);
  fwd.set(Math.sin(COL.heading),0,Math.cos(COL.heading));
  const ph=(COL.t%COL.T)/COL.T; COL.marker.visible=false;
  COL.feet.forEach((f,i)=>{ let local=ph-i*.5; if(local<0) local+=1; const swinging=moving&&local<.5;
    if(swinging&&!f.sw){ f.sw=true; f.from.copy(f.plant); const tp=colAt(COL.s+COL.speed*COL.T*.75), lat=f.side*2.2; f.to.set(tp.x+Math.cos(tp.h)*lat,0,tp.z-Math.sin(tp.h)*lat); f.hatch=i===0&&hatchReady(); }
    if(f.sw){ if(!swinging){ f.sw=false; f.plant.copy(f.to); f.cur.copy(f.plant); f.shadow.visible=false; colStomp(f); }
      else { const e=clamp(local/.5,0,1), k=e*e*(3-2*e); f.cur.lerpVectors(f.from,f.to,k); f.cur.y=Math.sin(e*Math.PI)*3.4; f.shadow.visible=true; f.shadow.position.set(f.to.x,.06,f.to.z); f.shadow.material.opacity=.15+e*.5;
        if(f.hatch&&hatchReady()){ COL.marker.visible=true; COL.marker.position.set(f.to.x,0,f.to.z); COL.ring.material.opacity=.5+Math.sin(GT*10)*.3; } } }
    else f.cur.copy(f.plant); });
  const sw=Math.sin(ph*Math.PI*2); COL.g.position.set(bp.x,-Math.abs(sw)*.4,bp.z); COL.g.rotation.y=COL.heading; COL.g.rotation.x=COL.stagger>0?Math.sin(GT*14)*.03:0; COL.g.rotation.z=sw*.03;
  for(const a of COL.arms){ a.arm.rotation.x=sw*.28*a.sx; a.fa.rotation.x=-.25-Math.max(0,sw*a.sx)*.2; }
  for(const f of COL.feet) legIK(f,fwd);
  const lf=COL.feet[0]; COL.lamp.visible=hatchReady(); if(COL.lamp.visible){ COL.lamp.position.set(lf.cur.x,lf.cur.y+.6,lf.cur.z).addScaledVector(fwd,1.75); COL.lamp.rotation.y=COL.heading; }
  if(COL.vOn) COL.valves.forEach((v,i)=>{ if(!COL.vBurst[i]) v.scale.setScalar(1+Math.sin(GT*8+i)*.12); });
  if(Math.random()<dt*3){ const top=new V3((Math.random()<.5?-1:1)*1.7,20,-1.9).applyMatrix4(COL.g.matrixWorld); spawnParticles(top,'ember',1); }
  COL.smokeT=(COL.smokeT||0)-dt; if(COL.smokeT<=0){ COL.smokeT=QUAL?.12:.3; for(const sx of [-1,1]){ const top=_sm.set(sx*1.78,20.6,-1.9).applyMatrix4(COL.g.matrixWorld); colSmoke(top.x,top.y,top.z,1,false); } } }
// drifting smoke from the stacks and dust from the stomps: one Points draw call, per-particle size and alpha
const _sm=new V3();
const SMOKE=(()=>{ const N=QUAL?90:36, pos=new Float32Array(N*3), sz=new Float32Array(N), al=new Float32Array(N), geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('aSize',new THREE.BufferAttribute(sz,1)); geo.setAttribute('aAlpha',new THREE.BufferAttribute(al,1));
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); for(let i=0;i<7;i++){ const x=rand(18,46), y=rand(18,46), r=rand(10,20), gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(255,255,255,.5)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); }
  const mat=new THREE.ShaderMaterial({ uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{map:{value:new THREE.CanvasTexture(c)},scale:{value:300}}]), fog:true, transparent:true, depthWrite:false,
    vertexShader:'attribute float aSize; attribute float aAlpha; varying float vA; uniform float scale;\n#include <fog_pars_vertex>\nvoid main(){ vA=aAlpha; vec4 mvPosition=modelViewMatrix*vec4(position,1.); gl_PointSize=min(160.,aSize*scale/max(1.,-mvPosition.z)); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader:'uniform sampler2D map; varying float vA;\n#include <fog_pars_fragment>\nvoid main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vec3(.16,.145,.13),t.a*vA); if(gl_FragColor.a<.004) discard;\n#include <fog_fragment>\n}' });
  mat.uniforms.map.value=new THREE.CanvasTexture(c);
  const pts=new THREE.Points(geo,mat); pts.frustumCulled=false; scene.add(pts); const P_=[]; for(let i=0;i<N;i++){ P_.push({life:0,max:1,vx:0,vy:0,vz:0,s0:1,s1:1}); al[i]=0; }
  return {pts,pos,sz,al,P:P_,i:0,N}; })();
function colSmoke(x,y,z,n,dust){ for(let k=0;k<n;k++){ const S_=SMOKE, i=S_.i++%S_.N, q=S_.P[i]; S_.pos[i*3]=x+rand(-.3,.3); S_.pos[i*3+1]=y; S_.pos[i*3+2]=z+rand(-.3,.3);
    q.max=q.life=dust?rand(1.2,2):rand(4,7); q.vx=dust?rand(-2.5,2.5):rand(.3,.8); q.vy=dust?rand(.3,.9):rand(1.1,1.8); q.vz=dust?rand(-2.5,2.5):rand(-.2,.2); q.s0=dust?2:1.2; q.s1=dust?5:7; q.a=dust?.55:.5; } }
function updateSmoke(dt){ const S_=SMOKE; let any=false; for(let i=0;i<S_.N;i++){ const q=S_.P[i]; if(q.life<=0){ S_.al[i]=0; continue; } any=true; q.life-=dt; const k=1-q.life/q.max;
    S_.pos[i*3]+=q.vx*dt; S_.pos[i*3+1]+=q.vy*dt; S_.pos[i*3+2]+=q.vz*dt; q.vx*=1-dt*.3; q.vz*=1-dt*.6; S_.sz[i]=q.s0+(q.s1-q.s0)*k; S_.al[i]=q.a*Math.min(1,k*6)*(1-k); }
  S_.pts.visible=mode==='main'; S_.pts.material.uniforms.scale.value=renderer.domElement.height*.9; const ge=S_.pts.geometry; ge.attributes.position.needsUpdate=ge.attributes.aSize.needsUpdate=ge.attributes.aAlpha.needsUpdate=true; }
function hitValve(i,w){ if(!COL.vOn||COL.vBurst[i]||COL.felled) return;
  if(!(w.id==='gauntlet'||(w.id==='rod'&&w.up))){ if(GT-COL.msgT>3){ COL.msgT=GT; toast('Bullets ping off. Only a relic weapon breaches the valves'); } return; }
  COL.vBurst[i]=true; const v=COL.valves[i], wp=new V3(); v.getWorldPosition(wp); v.visible=false; removeSolid(v); spawnParticles(wp,'ember',14); spawnParticles(wp,'spark',8); sfx.boom(); COL.stagger=3;
  const left=COL.vBurst.filter(b=>!b).length; if(left) toast(`A valve bursts. ${left} left`); else fellColossus(); }
function fellColossus(){ COL.felled=true; COL.fall=0; COL.vOn=false; rite(); Q.stage='strike'; banner('The Colossus falls','Strike the Lodestone with the Awakened Rod');
  const p=COL.g.position; dropPup(clamp(p.x+rand(-3,3),42,98),clamp(p.z+rand(-3,3),-28,3),'ammo'); dropPup(clamp(p.x+rand(-3,3),42,98),clamp(p.z+rand(-3,3),-28,3),'health'); }
// the cabin inside the Colossus's head
const CABX=-220, CAB={t:0,item:null,gears:[],models:{}};
{ const g=new THREE.Group(); g.position.set(CABX,0,0); scene.add(g); const iron=L({color:0x3a3430}), rust=L({color:0x5a3220});
  box(10,.3,10,iron,0,-.15,0,{parent:g}); box(10,.3,10,iron,0,4.35,0,{parent:g});
  for(const [x,z,w,d] of [[0,-5,10,.3],[0,5,10,.3],[-5,0,.3,10],[5,0,.3,10]]) box(w,4.5,d,rust,x,2.1,z,{parent:g});
  box(3.2,2.8,1.2,CM.dark,0,1.4,-4.3,{parent:g}); box(1.8,1.1,.1,CM.glow,0,1.2,-3.68,{parent:g}); box(3.4,.5,.1,CM.eye,0,2.9,4.83,{parent:g});
  for(let i=0;i<3;i++){ const r=.9-i*.15, gr=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.25,12),M.brass); gr.rotation.z=Math.PI/2; gr.position.set(-4.75,1.6+i*.9,-2.4+i*1.9); g.add(gr); CAB.gears.push(gr); const g2=gr.clone(); g2.position.x=4.75; g.add(g2); CAB.gears.push(g2); }
  for(const z of [-3,0,3]){ const pp=cyl(.12,.12,10,M.metal,0,4,z,6,g); pp.rotation.z=Math.PI/2; }
  box(1,1,1,M.brass,0,.5,-1.8,{parent:g});
  const heart=new THREE.Mesh(new THREE.OctahedronGeometry(.3),B({color:0xff9a3a})); heart.position.set(0,1.45,-1.8); heart.scale.y=1.4; g.add(heart); const hh=new THREE.Mesh(new THREE.TorusGeometry(.55,.04,5,18),M.add(0xff9a3a,.7)); hh.rotation.x=Math.PI/2; heart.add(hh); CAB.models.heart=heart;
  const chest=new THREE.Group(); chest.position.set(0,1,-1.8); g.add(chest); box(.8,.45,.5,M.plank,0,.22,0,{parent:chest}); box(.84,.08,.54,M.brass,0,.45,0,{parent:chest}); CAB.models.loot=chest;
  box(1.5,.06,1.5,B({color:0x0a0806}),0,.03,1.8,{parent:g}); const hr=new THREE.Mesh(new THREE.RingGeometry(.85,1,24),M.add(0x74d9ea,.7)); hr.rotation.x=-Math.PI/2; hr.position.set(0,.05,1.8); g.add(hr);
  addInter({x:CABX,z:-.7,r:1.5,prompt:()=>!P.inCabin||!CAB.item?null:CAB.item==='heart'?'Take the Colossus Heart':'Open the strongbox',use:()=>takeCabin()});
  addInter({x:CABX,z:1.8,r:1.3,prompt:()=>P.inCabin?'Drop through the hatch':null,use:()=>exitCabin()}); }
const cabinLight=new THREE.PointLight(0xff9a50,0,14,1.4); cabinLight.position.set(CABX,3,0); scene.add(cabinLight);
function enterCabin(){ P.inCabin=true; COL.lastRide=GT; CAB.t=22; P.pos.set(CABX,0,.4); P.vy=0; P.yaw=0; P.pitch=0; flashScreen('#ffd9a0'); sfx.clank(); setAtmosphere('cabin'); ambienceMode('cabin');
  CAB.item=(Q.stage==='colossus'&&!P.items.has('heart'))?'heart':pick(['tonic','points','ammo','gatling']);
  CAB.models.heart.visible=CAB.item==='heart'; CAB.models.loot.visible=CAB.item!=='heart';
  banner('Inside the Colossus','Take what you came for, then drop through the hatch',true); }
function exitCabin(){ if(!P.inCabin) return; P.inCabin=false; const bp=COL.g.position, h=COL.heading; const x=clamp(bp.x+Math.cos(h)*6,42,98), z=clamp(bp.z-Math.sin(h)*6,-28,3);
  P.pos.set(x,7,z); P.vy=0; flashScreen('#ffd9a0'); setAtmosphere('main'); ambienceMode('main'); toast('You drop out of the Colossus'); }
function takeCabin(){ const it=CAB.item; if(!it||!P.inCabin) return; CAB.item=null; CAB.models.heart.visible=false; CAB.models.loot.visible=false;
  if(it==='heart'){ P.items.add('heart'); rite(); Q.stage='gauntlet'; sfx.relic(); banner('The Colossus Heart',"Bring it and the Saint's Ember to the chapel workbench"); }
  else if(it==='tonic'){ const opts=Object.keys(TONICS).filter(k=>!P.perks.has(k)); if(opts.length){ const k=pick(opts); P.perks.add(k); if(k==='iron'){ P.maxHp=175; P.hp=175; } sfx.tonic(); toast(`A free ${TONICS[k].name}`); } else { addPts(2000); toast('A stash of coin'); } }
  else if(it==='points'){ addPts(1500); sfx.buy(); toast('A stash of coin'); }
  else applyPup(it); }
function updateCabin(dt){ for(const g of CAB.gears) g.rotation.x+=dt*(P.inCabin?1.2:.2); CAB.models.heart.rotation.y+=dt*2;
  if(P.inCabin){ CAB.t-=dt; if(CAB.t<=0){ toast('The Colossus shakes you loose'); exitCabin(); } } }
function updateBeams(dt){ for(const q of BEAMS){ if(q.life<=0) continue; q.life-=dt; q.m.material.opacity=Math.max(0,q.life/.14); if(q.life<=0) q.m.visible=false; } }
