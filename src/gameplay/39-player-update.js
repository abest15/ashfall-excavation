/* ---------- player update ---------- */
function updatePlayer(dt){
  if(P.invuln>0) P.invuln-=dt;
  if(P.revive>0){ P.revive-=dt; if(P.revive<=0){ P.hp=P.maxHp; $('reviving').hidden=true; toast('Back on your feet'); } }
  const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw), rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw);
  let mx=0,mz=0; if(P.downed||P.dead){ if(P.downed){ P.bleed-=dt; $('reviving').textContent=`Downed · a teammate can revive you (${Math.max(0,Math.ceil(P.bleed))}s)`; if(P.bleed<=0){ P.downed=false; P.dead=true; $('reviving').textContent='Bled out · you return next round'; } } } else if(P.revive<=0){ if(keys.KeyW){mx+=fx;mz+=fz} if(keys.KeyS){mx-=fx;mz-=fz} if(keys.KeyD){mx+=rx;mz+=rz} if(keys.KeyA){mx-=rx;mz-=rz}
    if(PAD.mx||PAD.my){ mx+=fx*-PAD.my+rx*PAD.mx; mz+=fz*-PAD.my+rz*PAD.mx; } }
  let ml=Math.hypot(mx,mz); P.moving=ml>.01; const stickMag=Math.min(1,Math.hypot(PAD.mx,PAD.my));
  P.sprint=!!(((keys.ShiftLeft||keys.ShiftRight)&&keys.KeyW||PAD.sprintLatch&&PAD.my<-.3)&&P.moving&&P.ads<.3&&!mouseDown&&!PAD.fire);
  let sp=4.4*(P.perks.has('fleet')?1.15:1); if(P.sprint) sp*=1.55; sp*=1-.4*P.ads;
  if(ml>0){ const mag=(PAD.mx||PAD.my)&&!(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD)?Math.max(.35,stickMag):1; mx/=ml; mz/=ml; P.pos.x+=mx*sp*mag*dt; P.pos.z+=mz*sp*mag*dt; }
  if(P.lungeT>0){ P.lungeT-=dt; P.pos.x+=P.lx*10*dt; P.pos.z+=P.lz*10*dt; }
  collide(P.pos,.4);
  P.vy-=22*dt; P.pos.y+=P.vy*dt; if(P.pos.y<=0){ P.pos.y=0; P.vy=0; P.grounded=true; }
  const wantAds=((mouseRight||PAD.aim)&&!P.sprint&&curW()&&P.swapT<=0)?1:0; P.ads+=(wantAds-P.ads)*Math.min(1,dt*12);
  P.bobT+=dt*(P.moving&&P.grounded?(P.sprint?13:9):0);
  const bob=P.moving&&P.grounded?Math.sin(P.bobT)*.045*(1-P.ads*.8):0;
  P.kick=Math.max(0,P.kick-dt*.12-P.kick*dt*8);
  camera.position.set(P.pos.x,P.pos.y+(P.dead?.3:P.downed?.55:P.revive>0?.7:1.62)+bob,P.pos.z);
  camera.rotation.set(clamp(P.pitch+P.kick,-1.55,1.55),P.yaw,(P.revive>0||P.downed)?.4:0);
  if(P.shake>0){ P.shake=Math.max(0,P.shake-dt); camera.position.x+=rand(-1,1)*P.shake*.3; camera.position.y+=rand(-1,1)*P.shake*.3; }
  const fov=SETTINGS.fov-(curW()&&curW().id==='marksman'?35:18)*P.ads; if(Math.abs(camera.fov-fov)>.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
  if(GT-P.lastHit>3&&P.hp<P.maxHp&&P.revive<=0&&!P.downed&&!P.dead) P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.7*dt);
}
function updateVM(dt){
  const w=curW(); vmRoot.visible=!!VM.gun&&!P.downed&&!P.dead;
  if(!VM.gun) return;
  const rod=w&&w.id==='rod';
  const hip=rod?[.27,-.33,-.5]:[.2,-.21,-.42], ads=rod?[.1,-.28,-.48]:[0,-.158,-.36];
  let x=hip[0]+(ads[0]-hip[0])*P.ads, y=hip[1]+(ads[1]-hip[1])*P.ads, z=hip[2]+(ads[2]-hip[2])*P.ads;
  const mv=P.moving&&P.grounded?1:0; x+=Math.cos(P.bobT*.5)*.012*mv*(1-P.ads); y-=Math.abs(Math.sin(P.bobT*.5))*.014*mv*(1-P.ads);
  VM.kick=Math.max(0,VM.kick-dt*.6); z+=VM.kick; y+=VM.kick*.25;
  let rxr=0,ryr=0,rzr=0;
  if(P.sprint){ ryr+=.6; rxr-=.25; x-=.05; y-=.04; }
  if(w&&w.reloadEnd){ const s=statsOf(w); const tot=s.rl*(P.perks.has('quick')?.5:1); const k=Math.sin(clamp(1-(w.reloadEnd-GT)/tot,0,1)*Math.PI); rxr-=.7*k; rzr+=.4*k; y-=.08*k; }
  if(P.swapT>0) y-=P.swapT*.6;
  if(VM.melee>0){ const k=clamp(1-VM.melee/KN.T,0,1); let g=k<.2?k/.2:k<.78?1:1-(k-.78)/.22; g=g*g*(3-2*g); y-=.38*g; x+=.08*g; rxr-=.6*g; rzr-=.25*g; }
  if(P.revive>0) y-=.3;
  const ud=VM.gun.userData; VM.rodFlare=Math.max(0,(VM.rodFlare||0)-dt*3);
  if(ud.glow||ud.bulb){ const ready=w?clamp(1-(w.next-GT)/Math.max(.05,statsOf(w).rate),0,1):1;
    if(ud.glow){ ud.glow.scale.setScalar(1+Math.sin(GT*6)*.08+VM.rodFlare*1.4); ud.glow.material.opacity=(w&&w.up?.3:.2)+ready*.12+VM.rodFlare*.5; }
    if(ud.bulb){ ud.bulb.material.opacity=(.3+.55*ready)*(.8+Math.random()*.2); ud.bulb.scale.setScalar(1+VM.rodFlare*.6); } }
  if(rod){ if(ud.crystal) ud.crystal.scale.set(1+VM.rodFlare*.5,1+VM.rodFlare*.5,1.8+VM.rodFlare*.8);
    if(ud.rings) ud.rings.forEach((r,i)=>{ r.rotation.x+=dt*(i?2.2:-1.6)*(1+VM.rodFlare*4); r.rotation.y+=dt*(i?-1.1:1.4); });
    if(ud.plume) ud.plume.scale.set(1,1+Math.random()*.4+VM.rodFlare,1);
    rxr+=Math.sin(GT*1.3)*.02; rzr+=Math.sin(GT*.9)*.03; z-=VM.rodFlare*.07; }
  vmRoot.position.set(x,y,z); vmRoot.rotation.set(rxr,ryr,rzr);
  if(VM.flash){ VM.flashT-=dt; VM.flash.visible=VM.flashT>0; if(VM.flash.visible){ VM.flash.rotation.z=Math.random()*3; VM.flash.scale.setScalar(rand(.7,1.3)); } }
  if(VM.gun.userData.crystal) VM.gun.userData.crystal.rotation.z+=dt*2;
  if(VM.gun.userData.spin) VM.gun.userData.spin.rotation.z+=dt*((mouseDown||PAD.fire)?30:3);
}
