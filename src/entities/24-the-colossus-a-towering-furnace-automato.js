/* ---------- the Colossus: a towering furnace-automaton that patrols No Man's Land ---------- */
const COL={path:[[52,-20],[88,-20],[88,-5],[52,-5]],s:0,speed:2.1,T:3.4,t:0,heading:Math.PI/2,feet:[],arms:[],felled:false,fall:0,stagger:0,lastRide:-99,vOn:false,vBurst:[false,false,false],valves:[],boomed:false,msgT:-9};
{ const pts=COL.path; COL.cum=[0]; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; COL.cum.push(COL.cum[i]+Math.hypot(b[0]-a[0],b[1]-a[1])); } COL.len=COL.cum[pts.length]; }
function colAt(s){ s=((s%COL.len)+COL.len)%COL.len; const pts=COL.path; let i=0; while(i<pts.length-1&&s>COL.cum[i+1]) i++; const a=pts[i], b=pts[(i+1)%pts.length], k=(s-COL.cum[i])/(COL.cum[i+1]-COL.cum[i]);
  return {x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,h:Math.atan2(b[0]-a[0],b[1]-a[1])}; }
const CM={metal:L({color:0x4d4741}),dark:L({color:0x26221f}),rust:L({color:0x6e3c22}),glow:B({color:0xff7a2a}),eye:B({color:0xffc860}),valve:B({color:0xff6a1a})};
{ const g=new THREE.Group(); g.rotation.order='YXZ'; scene.add(g); COL.g=g;
  box(4.8,1.8,2.9,CM.dark,0,9.4,0,{parent:g,round:true});
  box(6.4,5.2,4.4,CM.metal,0,12.9,0,{parent:g,round:true}); box(6.9,.5,4.9,CM.rust,0,15.6,0,{parent:g,round:true}); box(6.9,.5,4.9,CM.rust,0,10.3,0,{parent:g,round:true});
  box(3,2.2,.2,CM.glow,0,12.5,2.25,{parent:g,round:true}); for(let i=0;i<5;i++) box(.14,2.4,.28,CM.dark,-1.2+i*.6,12.5,2.33,{parent:g,round:true});
  for(const sx of [-1,1]) for(let i=0;i<4;i++) box(.3,.3,.3,CM.rust,sx*2.9,11.2+i*1.3,2.25,{parent:g,round:true});
  box(3.3,2.6,3.1,CM.metal,0,17.3,.2,{parent:g,round:true}); box(2.6,.45,.12,CM.eye,0,17.5,1.8,{parent:g,round:true}); box(3.5,.3,3.3,CM.rust,0,18.7,.2,{parent:g,round:true}); box(1.4,.25,1.4,CM.dark,0,18.95,.2,{parent:g,round:true});
  for(const sx of [-1,1]){ cyl(.45,.55,4.2,CM.dark,sx*1.7,17.6,-1.9,8,g); cyl(.6,.6,.3,CM.rust,sx*1.7,19.8,-1.9,8,g); }
  for(const sx of [-1,1]){ box(2,1.7,2.4,CM.rust,sx*4.1,14.8,0,{parent:g,round:true}); const arm=new THREE.Group(); arm.position.set(sx*4.2,14.2,0); g.add(arm); box(1.3,4.6,1.3,CM.metal,0,-2.4,0,{parent:arm,round:true});
    const fa=new THREE.Group(); fa.position.y=-4.7; arm.add(fa); box(1.15,4,1.15,CM.dark,0,-2,0,{parent:fa,round:true}); box(1.7,1.3,1.7,CM.rust,0,-4.4,0,{parent:fa,round:true}); COL.arms.push({arm,fa,sx}); }
  const segGeo=w=>{ const q=QUAL?new THREE.CylinderGeometry(w*.56,w*.5,1,12):new THREE.BoxGeometry(w,w,1); if(QUAL) q.rotateX(Math.PI/2); q.translate(0,0,.5); return q; };
  const thighG=segGeo(1.5), shinG=segGeo(1.25), footG=QUAL?roundBox(2.4,.9,3.4):new THREE.BoxGeometry(2.4,.9,3.4), kneeG=new THREE.SphereGeometry(.95,10,8), valveG=new THREE.CylinderGeometry(.5,.5,.4,12);
  for(const side of [-1,1]){ const f={side,plant:new V3(),from:new V3(),to:new V3(),cur:new V3(),sw:false,hatch:false};
    f.thigh=new THREE.Mesh(thighG,CM.metal); f.shin=new THREE.Mesh(shinG,CM.dark); f.foot=new THREE.Mesh(footG,CM.rust); f.knee=new THREE.Mesh(kneeG,CM.rust);
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
  f.foot.position.set(f.cur.x,f.cur.y+.45,f.cur.z); f.foot.rotation.y=COL.heading; }
function colStomp(f){ const p=f.plant, d=Math.hypot(P.pos.x-p.x,P.pos.z-p.z);
  if(state==='play'){ if(P.inCabin) P.shake=Math.max(P.shake,.12); else { P.shake=Math.max(P.shake,clamp(1-d/48,0,1)*.42); sfx.stomp(clamp(1-d/75,0,1)); } }
  spawnParticles(new V3(p.x,.4,p.z),'dirt',7);
  for(const z of zombies){ if(!z.dead&&z.rise<=0&&!z.boss&&!z.wstate&&Math.hypot(z.g.position.x-p.x,z.g.position.z-p.z)<2.9) killZombie(z,'self'); }
  if(state==='play'&&!P.inCabin&&d<2.8&&P.pos.y<1.5){ if(f.hatch&&hatchReady()) enterCabin(); else { const l=d||1; P.lx=(P.pos.x-p.x)/l; P.lz=(P.pos.z-p.z)/l; P.lungeT=.3; hurtPlayer(130,null); toast('Crushed under the Colossus'); } } }
function updateColossus(dt){
  const vis=mode==='main'; COL.g.visible=vis; for(const f of COL.feet){ f.thigh.visible=f.shin.visible=f.foot.visible=f.knee.visible=vis; if(!vis) f.shadow.visible=false; }
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
  if(Math.random()<dt*3){ const top=new V3((Math.random()<.5?-1:1)*1.7,20,-1.9).applyMatrix4(COL.g.matrixWorld); spawnParticles(top,'ember',1); } }
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
