/* ---------- per-frame world updates ---------- */
let groanT=1;
function updateWorld(dt){
  updateWindows(dt); levelVisUpdate();
  for(const f of FLAMES) f.scale.y=.75+Math.random()*.5; barrelLight.intensity=1+Math.random()*.4; CH.light.intensity=.8+Math.random()*.2;
  if(CH.swing>0){ CH.swing=Math.max(0,CH.swing-dt*.35); CH.bellG.rotation.z=Math.sin(GT*5)*CH.swing*.45; }
  if(CH.mural>0){ CH.mural-=dt; if(CH.mural<=0&&!CH.solved) muralLit(false); }
  if(TRAP.cd>0) TRAP.cd-=dt;
  if(TRAP.t>0){ TRAP.t-=dt; TRAP.light.intensity=1.6+Math.random()*1.2; TRAP.wheel.rotation.x+=dt*3; for(const f of TRAP.flames){ f.visible=true; f.scale.set(1,.7+Math.random()*.6,1); }
    for(const z of zombies){ if(z.dead||z.rise>0||z.wstate) continue; const p=z.g.position; if(p.x>TRAP.x0&&p.x<TRAP.x1&&p.z>TRAP.z0&&p.z<TRAP.z1){ z.hp-=(z.boss?400:z.maxHp*1.6)*dt; if(Math.random()<.3) spawnParticles(new V3(p.x,1,p.z),'ember',1); if(z.hp<=0) killZombie(z,'body'); } }
    if(P.pos.x>TRAP.x0&&P.pos.x<TRAP.x1&&P.pos.z>TRAP.z0&&P.pos.z<TRAP.z1&&P.pos.y<1) hurtPlayer(18,null);
    if(TRAP.t<=0){ TRAP.cd=50; TRAP.light.intensity=0; TRAP.flames.forEach(f=>f.visible=false); } }
  if(mode==='main'&&!P.inCabin){ LT.t-=dt; if(LT.t<=0){ LT.t=rand(16,38); LT.f=.45; sfx.thunder(rand(.4,1.6)); }
    for(const q of sky.userData.flashes){ if(q.t>0){ q.t-=dt; q.f.material.opacity=Math.max(0,q.t)*1.4; } else if(Math.random()<dt*.05){ q.t=.5; sfx.distant(); } } }
  if(LT.f>0){ LT.f-=dt; const k=(LT.f>.33||(LT.f>.12&&LT.f<.2))?1:0; if(mode==='main'&&!P.inCabin){ hemi.intensity=.85+k*1.8; sky.material.color.setScalar(1+k*2); } if(LT.f<=0){ sky.material.color.setScalar(1); if(mode==='main'&&!P.inCabin) hemi.intensity=.85; } }
  if(boomLight.intensity>0) boomLight.intensity=Math.max(0,boomLight.intensity-dt*12);
  if(NET.role!=='client'&&Q.stage==='echoes'&&Q.echo&&Q.echo.moveT>0){ Q.echo.moveT-=dt; if(Q.echo.moveT<=0) placeResonators(); }
  for(const r of RESON){ if(r.flash>0){ r.flash-=dt*1.5; r.ring.material.opacity=Math.max(0,r.flash)*.8; r.ring.scale.setScalar(1+(1-Math.max(0,r.flash))*.6); } }
  if(WR.g.visible&&Q.wr&&NET.role!=='client'){ const W=Q.wr, wp=WR.g.position;
    if(W.moving>0){ W.moving-=dt; const k=1-Math.max(0,W.moving)/2.4, e=k*k*(3-2*k); wp.lerpVectors(W.from,W.to,e); wp.y=2.6+Math.sin(k*Math.PI)*4; }
    else { wp.y=2.6+Math.sin(GT*2)*.25; if(Math.hypot(P.pos.x-wp.x,P.pos.z-wp.z)<2.6&&GT-W.touch>1){ W.touch=GT; hurtPlayer(20); toast('Its touch is grave-cold'); } }
    WR.g.rotation.y=Math.atan2(P.pos.x-wp.x,P.pos.z-wp.z); WR.halo.rotation.x+=dt*.6; WR.halo.rotation.z+=dt; if(Math.random()<.25) spawnParticles(wp,'relic',1); }
  for(const d of DOORS){ if(d.anim>0){ d.anim-=dt; d.g.position.y=(d.y||0)-(1-Math.max(0,d.anim))*4; if(d.anim<=0) d.g.visible=false; } }
  updateCrate(dt);
  if(FORGE.state==='working'){ FORGE.t-=dt; forgeLight.intensity=1.6+Math.random()*1.2; if(Math.random()<.3) spawnParticles(new V3(-24.6+rand(-.5,.5),1.2,-24.6),'ember',1);
    if(FORGE.t<=0){ FORGE.state='ready'; FORGE.t=18; const m=buildGun(FORGE.inst.id,true); m.position.set(-24.1,1.4,-24.1); m.rotation.y=Math.PI/4+Math.PI/2; m.scale.setScalar(1.5); scene.add(m); FORGE.model=m; toast('The Forge is done'); } }
  else if(FORGE.state==='ready'){ FORGE.t-=dt; if(FORGE.model) FORGE.model.rotation.y+=dt; if(FORGE.t<=0){ toast('The Forge swallowed your weapon'); FORGE.state='idle'; FORGE.inst=null; scene.remove(FORGE.model); FORGE.model=null; } }
  else if(POWER.on) forgeLight.intensity=1.4+Math.sin(GT*3)*.2;
  // quest timers & visuals
  if(NET.role!=='client'&&Q.stage==='assembling'){ Q.t-=dt; lodeParts.slots.forEach((s,i)=>{ s.position.y=1.05+(6-Q.t)/6*.65; s.position.x=-.4+i*.4*(Q.t/6); }); if(Q.t<=0){ Q.stage='rodReady'; lodeParts.slots.forEach(s=>s.visible=false); lodeParts.rodShow.visible=true; sfx.relic(); toast('The Lodestone Rod is whole'); } }
  if(NET.role!=='client'&&Q.stage==='awakening'){ const near=Math.hypot(P.pos.x-LODE.x,P.pos.z-LODE.z)<14; Q.near=near; if(near) Q.t-=dt; else if(GT-(Q.warnT||-9)>4){ Q.warnT=GT; toast('The awakening stalls. Get back to the Lodestone!'); }
    if(!Q.warden&&Q.t<=25){ Q.warden=true; spawnZombie('boss'); }
    lodeParts.cap.material.color.setHSL(.53,.8,.4+Math.sin(GT*8)*.15); if(Math.random()<.4) spawnParticles(new V3(LODE.x+rand(-1,1),rand(1,5),LODE.z+rand(-1,1)),'relic',1);
    if(Q.t<=0){ Q.stage='awakenReady'; lodeParts.rodShow.visible=false; lodeParts.rodShowUp.visible=true; lodeParts.cap.material.color.set(0x74d9ea); rite(); banner('The Rod is awake','Take it from the pedestal'); sfx.portal(); } }
  if(NET.role!=='client'&&Q.stage==='descent'&&Q.sink>0){ Q.sink=Math.max(0,Q.sink-dt*.3); const k=1-Q.sink; lodeParts.ob.position.y=2.5-k*5.2; lodeParts.vein.position.y=2.3-k*5.2; lodeParts.cap.position.y=5.5-k*5.2; if(Q.sink===0) removeSolid(lodeParts.ob); }
  lodeParts.vein.material.opacity=.08+Math.sin(GT*1.5)*.05+(Q.stage==='awakening'?.25:0);
  lodeParts.cap.rotation.y+=dt*.6; lodeParts.rodShow.rotation.z+=dt; lodeParts.rodShowUp.rotation.z+=dt*1.4;
  if(lodeParts.shaft.visible){ lodeParts.shaft.material.opacity=.6+Math.sin(GT*4)*.25; }
  for(const st of Q.stones) if(st.lit) st.ring.rotation.z+=dt;
  for(const q of pickups){ q.m.rotation.y+=dt*2; q.m.position.y=(q.y||1)+Math.sin(GT*3)*.15; }
  if(VM.gun&&VM.gun.userData.orb) VM.gun.userData.orb.rotation.z+=dt*4;
  if(mode==='hollow'){ for(const r of HL.rocks){ r.m.rotation.y+=r.s*dt; r.m.rotation.x+=r.s*dt*.5; } if(HL.gateOpen){ HL.disc.material.opacity=.6+Math.sin(GT*5)*.2; HL.gate.rotation.y+=dt*.4; } }
  // groans
  for(const z of zombies){ if(z.dead||z.rise>0) continue; if(z.voiceT===undefined) z.voiceT=rand(.5,4); z.voiceT-=dt; if(z.voiceT<=0){ const fast=(z.speed||0)>3; z.voiceT=rand(2.5,6)/(fast?1.6:1); zvoice(z,fast&&z.kind!=='hound'&&!z.boss?'scream':'moan'); } }
}
