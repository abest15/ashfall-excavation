/* ---------- player combat ---------- */
const ray=new THREE.Raycaster(); let mouseDown=false, mouseRight=false, trigFresh=false;
function fire(){
  const w=curW(); if(!w||P.swapT>0||P.revive>0||VM.melee>0||P.downed||P.dead) return;
  if(w.reloadEnd){ if(w.rlShell&&w.mag>0&&trigFresh&&w.rlPh!=='out'){ w.rlPh='out'; w.rlPump=false; w.rlA=GT; w.rlB=w.reloadEnd=GT+.22; } return; }
  const s=statsOf(w); if(GT<w.next) return;
  if(w.mag<=0){ if(trigFresh){ sfx.dry(); trigFresh=false; } if(w.res>0) reload(); return; }
  if(s.staff&&P.ads>.6&&trigFresh&&typeof staffAlt==='function'){ trigFresh=false; staffAlt(w); return; } // staff alt-fire (19f-staffs.js)
  if(!s.auto&&!trigFresh) return; trigFresh=false;
  NET.shots++; w.mag--; if(w.id==='gatling') w.mag=999; w.next=GT+s.rate*(P.perks.has('rapid')?.75:1); P.sprint=false; P.slideT=0;
  camera.updateMatrixWorld(); const origin=camera.position.clone(); const fwd=new V3(0,0,-1).applyQuaternion(camera.quaternion);
  const cRight=new V3(1,0,0).applyQuaternion(camera.quaternion), cUp=new V3(0,1,0).applyQuaternion(camera.quaternion);
  const spread=spreadNow(w); P.bloom=Math.min(1,(P.bloom||0)+handling(w.id).bloom); P.lastShot=GT;
  const targets=zparts.concat(solids); const muzzleW=camera.localToWorld(new V3(.2,-.18,-.8));
  for(let k=0;k<s.pellets;k++){
    // pellets fan out in a fixed ring with a little jitter; single shots spread in a disc
    let a,r; if(s.pellets>1){ a=k===0?0:(k-1)/(s.pellets-1)*Math.PI*2+rand(-.25,.25); r=k===0?rand(0,.2):rand(.55,1); } else { a=rand(0,Math.PI*2); r=Math.sqrt(Math.random()); }
    const dir=fwd.clone().addScaledVector(cRight,Math.cos(a)*r*spread).addScaledVector(cUp,Math.sin(a)*r*spread).normalize();
    ray.set(origin,dir); ray.far=160; const hits=ray.intersectObjects(targets,false); let pierce=s.pierce; const seen=new Set(); let end=null, pz=null;
    for(const h of hits){ const o=h.object; const z=o.userData.z;
      if(z){ if(z.dead||seen.has(z)) continue; seen.add(z); if(s.proj||s.jump){ pz={z,head:!!o.userData.head}; end=h.point; break; } const fall=s.pellets>1?Math.max(.35,1-Math.max(0,h.distance-8)/18):1;
        const hd=!!o.userData.head; HMH.head=hd; hitZombie(z,s.dmg*fall,hd?(z.boss?3:s.head)*(P.perks.has('steady')?1.5:1):1,'gun'); HMH.head=false; spawnParticles(h.point,z.kind==='hollow'||z.prime?'relic':z.boss?'spark':'blood',3); hitMarker(false,hd);
        if(--pierce<=0){ end=h.point; break; } }
      else { const u=o.userData;
        if(NET.role==='client'){ const k=u.reson!==undefined?['reson',u.reson]:u.wraith?['wraith']:u.hcrystal!==undefined?['crystal',u.hcrystal]:u.bell?['bell']:u.cvalve!==undefined?['valve',u.cvalve]:u.qhit!==undefined?['q',u.qhit]:null; if(k) toHost({t:'shoot',k:k[0],i:k[1],w:w.id,up:w.up}); }
        else { if(u.reson!==undefined) hitReson(u.reson); if(u.wraith) hitWraith(w); if(u.hcrystal!==undefined) hitCrystal(u.hcrystal); if(u.bell) ringBell(); if(u.cvalve!==undefined) hitValve(u.cvalve,w); if(u.qhit!==undefined) questShoot(u.qhit,w); }
        if(w.id==='rod'){ if(o.userData.waystone!==undefined) strikeStone(o.userData.waystone); if(o.userData.lodestone) strikeLodestone(w); }
        if(w.id!=='rod'&&typeof spawnImpact==='function') spawnImpact(h.point,h.face&&h.face.normal,o); spawnParticles(h.point,w.id==='rod'?'relic':'dirt',w.id==='rod'?5:2); end=h.point; break; } }
    if(s.proj){ launchBolt(muzzleW,end||origin.clone().addScaledVector(dir,80),s,pz); continue; }
    if(s.jump){ const e=end||origin.clone().addScaledVector(dir,50); arc(muzzleW,e,1.6,w.up?0xff8a6a:0xcfe8ff); if(pz) chainJump(pz.z,s,w.up); else spawnParticles(e,'spark',6); continue; }
    if(s.splash){ const e=end||origin.clone().addScaledVector(dir,40); explode(e,s.splash,s.dmg*.85); }
    if(s.beam){ const e=end||origin.clone().addScaledVector(dir,60); (s.arc?arc:beam)(muzzleW,e,w.up?2.2:1.3,s.bcol); if(w.id==='rod'){ beam(muzzleW,e,w.up?7:5,w.up?0x2a6a80:0x1a4a5a); spawnParticles(e,'relic',w.up?10:6); }
      if(s.staff&&typeof staffImpact==='function') staffImpact(w,s,e,seen);
      if(s.chain){ let n=0; for(const z of zombies){ if(n>=(s.chainN||3)) break; if(z.dead||seen.has(z)||z.rise>0) continue; const zp=z.g.position; if(Math.hypot(zp.x-e.x,zp.z-e.z)<6.5){ n++; (s.arc?arc:beam)(e,new V3(zp.x,1.3,zp.z),.8,s.bcol); hitZombie(z,s.dmg*(s.chainMul||.5),1,'gun'); } } } }
  }
  if(typeof muzzleLight==='function'&&!s.beam&&!s.jump) muzzleLight(muzzleW);
  if(w.id==='rod'||w.id==='dynamo') VM.rodFlare=1; recoil(w,s); vmFire(w,s);
  { const Hh=handling(w.id); rumble(clamp(Hh.v*14,.08,.95),clamp(.2+Hh.v*6,.15,.7),s.auto?55:Math.round(90+Hh.v*1600)); }
  sfx[s.snd](w.up); if(w.mag===0&&w.res>0) setTimeout(()=>{ if(curW()===w) reload(); },160);
}
// current effective spread (radians): ADS, movement, stance, air, bloom and first-shot accuracy
function spreadNow(w){ w=w||curW(); if(!w) return .02; const s=statsOf(w), sg=s.pellets>1;
  let sp=s.spread*(1-(sg?.35:.78)*P.ads); sp*=P.sprint?2.2:P.moving?1.4:1; if(P.crouch>.5&&!(P.slideT>0)) sp*=.75; if(!P.grounded) sp+=.03; if(P.slideT>0) sp+=.015;
  const b=P.bloom||0; sp=sp*(1+b*(1.4-.8*P.ads))+b*.012*(1-P.ads);
  if(!sg&&b<.05&&!P.moving&&P.grounded) sp*=.55-.35*P.ads;
  return sp*(P.perks.has('steady')?.6:1); }
// camera kick: most of it recovers (P.rcP/P.rcY springs back), a quarter moves the aim for good
function recoil(w,s){ const H=handling(w.id), n=GT-(w.lastShot||-9)<s.rate*1.6+.12?(w.shotN||0)+1:0; w.shotN=n; w.lastShot=GT;
  const m=(1-.35*P.ads)*(P.crouch>.5?.8:1), vk=H.v*(n<2?1.25:1)*m, hk=H.h*(H.hb+Math.sin(n*1.7+w.id.length)*.8+rand(-.35,.35))*m;
  P.rcP=(P.rcP||0)+vk*.75; P.rcY=(P.rcY||0)+hk*.75; P.pitch=clamp(P.pitch+vk*.25,-1.5,1.5); P.yaw-=hk*.25; P.kickR=(P.kickR||0)+rand(-1,1)*H.v*1.4; P.rcT=GT; }
function reload(){ const w=curW(); if(!w||w.reloadEnd||P.swapT>0) return; const s=statsOf(w); if(w.mag>=s.mag||w.res<=0) return;
  const tot=s.rl*(P.perks.has('quick')?.5:1); w.rlId=(w.rlId||0)+1; w.rlStart=GT; w.rlEmpty=w.mag===0; VM.inspect=0;
  if(s.type==='shotgun'){ const per=tot/(s.mag+1.8); w.rlShell=true; w.rlPer=per; w.rlPh='in'; w.rlPump=w.mag===0; w.rlA=GT; w.rlB=w.reloadEnd=GT+per*.6; w.rlDur=tot; if(sfx.reloadOut) sfx.reloadOut(w.id); else sfx.reload(); return; }
  w.rlShell=false; w.rlDur=tot; w.reloadEnd=GT+tot; if(!sfx.reloadOut) sfx.reload(); }
function updateWeapon(dt){ const w=curW(); if(P.swapT>0) P.swapT-=dt; if(P.meleeT>0) P.meleeT-=dt;
  if(GT-(P.lastShot||-9)>.12) P.bloom=Math.max(0,(P.bloom||0)-dt*2.4);
  if(w&&w.reloadEnd&&GT>=w.reloadEnd){ const s=statsOf(w);
    if(w.rlShell){ // shell-by-shell: intro → load one per cycle → outro (pump if it ran dry)
      if(w.rlPh==='load'){ if(w.res>0&&w.mag<s.mag){ w.mag++; w.res--; if(sfx.reloadIn) sfx.reloadIn(w.id); } }
      if((w.rlPh==='in'||w.rlPh==='load')&&w.mag<s.mag&&w.res>0){ w.rlPh='load'; w.rlA=GT; w.rlB=w.reloadEnd=GT+w.rlPer; }
      else if(w.rlPh!=='out'){ w.rlPh='out'; w.rlA=GT; w.rlB=w.reloadEnd=GT+w.rlPer*(w.rlPump?1.3:.6); }
      else w.reloadEnd=0; }
    else { const take=Math.min(s.mag-w.mag,w.res); w.mag+=take; w.res-=take; w.reloadEnd=0; } }
  if((mouseDown||PAD.fire)&&w) fire(); }
// the old weapon holsters (.15s) while the new one is already selected; buildVM runs when it is down
function switchTo(i){ if(PU.gatling>0||i===P.cur||!P.weapons[i]) return; const w=curW(); if(w) w.reloadEnd=0; P.cur=i; P.swapT=.5; VM.inspect=0; if(VM.gun){ VM.hol=.15; VM.equip=0; } else buildVM(); sfx.swap(); }
function inspectWeapon(){ const w=curW(); if(!w||w.reloadEnd||P.swapT>0||P.ads>.1||VM.inspect>0||state!=='play') return; VM.inspect=INSPECT_T; }
function cycleWeapon(dir){ const n=P.weapons.length; if(n<2) return; switchTo((P.cur+dir+n)%n); }
function melee(){ if(P.meleeT>0||P.revive>0||state!=='play'||P.downed||P.dead) return; const res=P.bless.has('knife'); P.meleeT=res?.5:.62; VM.melee=KN.T; P.meleePending=true; updateKnifeLook(); KN.root.visible=true; sfx.swing(); if(res) sfx.ring(); if(typeof questMelee==='function') questMelee();
  const t=meleeTarget(3.6); if(t&&t.d>1.5){ P.lungeT=.16; P.lungeZ=t.z; P.lx=(t.z.g.position.x-P.pos.x)/t.d; P.lz=(t.z.g.position.z-P.pos.z)/t.d; } }
function meleeTarget(range){ const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw); let best=null,bd=range;
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<bd&&d>1e-3&&(dx*fx+dz*fz)/d>.45){ best=z; bd=d; } }
  return best?{z:best,d:bd}:null; }
function meleeHit(){ const res=P.bless.has('knife'); const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw); const reach=res?3:2.4; const hits=[];
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<reach+(z.boss?.6:0)&&(d<.7||(dx*fx+dz*fz)/d>(res?.2:.4))) hits.push({z,d}); }
  if(!hits.length) return; hits.sort((a,b)=>a.d-b.d);
  for(const h of hits.slice(0,res?4:1)){ const z=h.z; hitZombie(z,res?(z.boss?1500:Math.max(3000,z.maxHp*.5)):(z.boss?250:150),1,'melee'); spawnParticles(z.g.position.clone().setY(1.4),res?'relic':'blood',6); }
  sfx.stab(); hitMarker(false); P.rcP=(P.rcP||0)+.01; rumble(.5,.5,90); }
function hurtPlayer(d,src){ if(P.invuln>0||P.revive>0||P.downed||P.dead||(state!=='play'&&!(NET.role!=='solo'&&state==='paused'))) return; d*=DF().dmg*(P.bless.has('stone')?.75:1);
  if(P.aegis&&src){ const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw), dx=src.x-P.pos.x, dz=src.z-P.pos.z, l=Math.hypot(dx,dz)||1; if((dx*fx+dz*fz)/l<-.25){ d*=.2; sfx.clang(); } } if(P.shield>0){ const a=Math.min(P.shield,d); P.shield-=a; d-=a; } P.hp-=d; P.lastHit=GT; P.invuln=.25; sfx.hurt(); if(src) dmgIndicator(src); P.kickR=(P.kickR||0)+rand(-1,1)*.03; vmImpulse(0,-.2,.2,-.6,0,rand(-1,1)*.8); rumble(clamp(.35+d/40,.35,1),.5,Math.round(140+Math.min(d,60)*2)); $('hurtflash').style.opacity=1; setTimeout(()=>$('hurtflash').style.opacity=0,90);
  if(P.hp<=0) down(); }
function down(){
  if(P.perks.has('wind')){ P.perks.clear(); P.maxHp=100; if(P.weapons.length>2){ P.weapons.length=2; if(P.cur>1) P.cur=0; buildVM(); } P.hp=1; P.revive=3; $('reviving').hidden=false; sfx.relic();
    for(const z of zombies){ if(z.dead||z.boss) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<5){ z.g.position.x+=dx/d*(5-d); z.g.position.z+=dz/d*(5-d); collide(z.g.position,.33);} } return; }
  if(NET.role!=='solo'){ goDown(); return; }
  gameOver(); }
