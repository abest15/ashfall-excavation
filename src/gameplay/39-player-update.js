/* ---------- player update ----------
   Movement keeps a smoothed horizontal velocity (P.hv) so starts, stops and slides have weight.
   Stance: P.crouch 0..1 (C toggles, Ctrl holds, right-stick click toggles); crouching while sprinting starts a slide. */
const MOVE={walk:4.4,sprint:1.55,crouch:.55,ads:.6,accel:38,airAccel:7,slideV:9.5,slideT:.75,eye:1.62,crouchEye:1.05,slideEye:.85};
let crouchTog=false, crouchHeldPrev=false, adsPrev=false;
function crouchPress(){ crouchTog=!crouchTog; }
function resetMovement(){ crouchTog=false; Object.assign(P,{crouch:0,slideT:0,slideCd:0,eyeH:MOVE.eye,hv:new V3(),stepD:0,bobT:0,rcP:0,rcY:0,kickY:0,kickR:0,bloom:0,landDip:0,fovK:0,tilt:0}); VM.lgt=GT; }
function updatePlayer(dt){
  if(!P.hv||GT<(VM.lgt||0)) resetMovement(); VM.lgt=GT;
  if(P.invuln>0) P.invuln-=dt;
  if(P.revive>0){ P.revive-=dt; if(P.revive<=0){ P.hp=P.maxHp; $('reviving').hidden=true; toast('Back on your feet'); } }
  const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw), rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw);
  let mx=0,mz=0; const canMove=!P.downed&&!P.dead&&P.revive<=0;
  if(P.downed||P.dead){ if(P.downed){ P.bleed-=dt; $('reviving').textContent=`Downed · a teammate can revive you (${Math.max(0,Math.ceil(P.bleed))}s)`; if(P.bleed<=0){ P.downed=false; P.dead=true; $('reviving').textContent='Bled out · you return next round'; } } }
  else if(canMove){ if(keys.KeyW){mx+=fx;mz+=fz} if(keys.KeyS){mx-=fx;mz-=fz} if(keys.KeyD){mx+=rx;mz+=rz} if(keys.KeyA){mx-=rx;mz-=rz}
    if(PAD.mx||PAD.my){ mx+=fx*-PAD.my+rx*PAD.mx; mz+=fz*-PAD.my+rz*PAD.mx; } }
  let ml=Math.hypot(mx,mz); const stickMag=Math.min(1,Math.hypot(PAD.mx,PAD.my));
  // stance input: rising edge while sprinting starts a slide
  const ctrl=!!(keys.ControlLeft||keys.ControlRight), wantCrouch=canMove&&(crouchTog||ctrl), sprintKey=!!(((keys.ShiftLeft||keys.ShiftRight)&&keys.KeyW)||(PAD.sprintLatch&&PAD.my<-.3));
  if(sprintKey&&crouchTog&&!(P.slideT>0)&&!crouchHeldPrev) crouchTog=false;
  const wasSprint=P.sprint;
  if(P.slideCd>0) P.slideCd-=dt;
  if(wantCrouch&&!crouchHeldPrev&&wasSprint&&P.grounded&&P.slideCd<=0&&ml>.01){ const l=Math.hypot(P.hv.x,P.hv.z)||1; P.slideT=MOVE.slideT; P.slideCd=1; P.sdx=P.hv.x/l; P.sdz=P.hv.z/l; P.hv.x=P.sdx*MOVE.slideV; P.hv.z=P.sdz*MOVE.slideV; sfx.slide&&sfx.slide(); vmImpulse(0,-.25,.1,-.3,0,.6); }
  crouchHeldPrev=wantCrouch;
  const sliding=P.slideT>0; if(sliding){ P.slideT-=dt; if(P.slideT<=0||!P.grounded&&P.vy>0){ P.slideT=0; } }
  P.crouch+=((wantCrouch||sliding?1:0)-P.crouch)*Math.min(1,dt*12);
  P.moving=ml>.01;
  P.sprint=!!(sprintKey&&P.moving&&P.ads<.3&&!mouseDown&&!PAD.fire&&!(P.crouch>.5)&&!sliding);
  if(P.sprint&&VM.inspect>0) VM.inspect=0;
  let sp=MOVE.walk*(P.perks.has('fleet')?1.15:1); if(P.sprint) sp*=MOVE.sprint; else if(P.crouch>.5) sp*=MOVE.crouch; sp*=1-(1-MOVE.ads)*P.ads;
  const mag=ml>0&&(PAD.mx||PAD.my)&&!(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD)?Math.max(.35,stickMag):1;
  const tx=ml>0?mx/ml*sp*mag:0, tz=ml>0?mz/ml*sp*mag:0;
  if(sliding){ const dec=Math.max(0,1-dt*1.6); P.hv.x*=dec; P.hv.z*=dec; P.hv.x+=(tx-P.hv.x)*dt*.6; P.hv.z+=(tz-P.hv.z)*dt*.6; if(Math.hypot(P.hv.x,P.hv.z)<2.5) P.slideT=0; }
  else { const a=(P.grounded?MOVE.accel:MOVE.airAccel)*dt, dx=tx-P.hv.x, dz=tz-P.hv.z, dl=Math.hypot(dx,dz); if(dl<=a){ P.hv.x=tx; P.hv.z=tz; } else { P.hv.x+=dx/dl*a; P.hv.z+=dz/dl*a; } }
  const px=P.pos.x, pz=P.pos.z; P.pos.x+=P.hv.x*dt; P.pos.z+=P.hv.z*dt;
  if(P.lungeT>0){ P.lungeT-=dt; P.pos.x+=P.lx*10*dt; P.pos.z+=P.lz*10*dt; }
  collide(P.pos,.4);
  const moved=Math.hypot(P.pos.x-px,P.pos.z-pz);
  // gravity, jump and landing
  const wasGround=P.grounded, vyBefore=P.vy;
  if(!P.grounded&&wasGround===false&&P.vy>6.5&&!P.jumpFx){ P.jumpFx=true; vmImpulse(0,-.25,0,.35,0,0); if(sliding) P.slideT=0; crouchTog=false; }
  P.vy-=22*dt; P.pos.y+=P.vy*dt;
  if(P.pos.y<=0){ P.pos.y=0; if(!wasGround||vyBefore<-1){ const f=clamp(-vyBefore/14,0,1); if(f>.15){ P.landDip=Math.min(.18,.05+f*.14); vmImpulse(0,-.4*f-.15,0,-.5*f,0,rand(-.3,.3)*f); sfx.land&&sfx.land(f); } } P.vy=0; P.grounded=true; P.jumpFx=false; }
  else if(P.pos.y>0) P.grounded=false;
  // ADS
  const w=curW(), wantAds=((mouseRight||PAD.aim)&&!P.sprint&&w&&P.swapT<=0&&!(w&&w.reloadEnd)&&VM.melee<=0)?1:0;
  if(!!wantAds!==adsPrev){ adsPrev=!!wantAds; const f=wantAds?sfx.adsIn:sfx.adsOut; if(f) f(); }
  P.ads+=(wantAds-P.ads)*Math.min(1,dt*(wantAds?13:11));
  // footsteps and bob phase advance with distance travelled
  if(P.grounded&&moved>0&&!sliding){ const stride=P.sprint?2.1:P.crouch>.5?1.25:1.7; P.bobT+=moved/stride*Math.PI; P.stepD+=moved;
    if(P.stepD>=stride){ P.stepD-=stride; if(!(P.crouch>.5&&!P.sprint&&Math.random()<.5)){ const surf=typeof surfaceAt==='function'?surfaceAt(P.pos.x,P.pos.z):'mud'; sfx.step&&sfx.step(surf||'mud'); } } }
  else if(!P.moving) P.stepD=Math.min(P.stepD,.8);
  const bob=P.moving&&P.grounded&&!sliding?Math.abs(Math.sin(P.bobT))*.035*(1-P.ads*.8)*(P.sprint?1.3:1):0;
  // recoil recovery: the recovering offsets decay after a short hold, the displayed kick chases them
  if(GT-(P.rcT||-9)>.06){ const H=handling(w?w.id:'pistol'), d=Math.exp(-H.rec*dt); P.rcP*=d; P.rcY*=d; }
  P.kick+=((P.rcP||0)-P.kick)*Math.min(1,dt*30); P.kickY+=((P.rcY||0)-P.kickY)*Math.min(1,dt*30); P.kickR*=Math.exp(-dt*12);
  // eye height and camera
  const eyeT=P.dead?.3:P.downed?.55:P.revive>0?.7:sliding?MOVE.slideEye:MOVE.eye+(MOVE.crouchEye-MOVE.eye)*P.crouch;
  P.eyeH+=(eyeT-P.eyeH)*Math.min(1,dt*(sliding?16:11)); P.landDip*=Math.exp(-dt*9);
  camera.position.set(P.pos.x,P.pos.y+P.eyeH-bob*.5-P.landDip,P.pos.z);
  P.tilt+=((sliding?.07:0)-P.tilt)*Math.min(1,dt*10);
  camera.rotation.set(clamp(P.pitch+P.kick,-1.55,1.55),P.yaw-P.kickY,((P.revive>0||P.downed)?.4:0)+P.tilt+P.kickR+(P.moving&&P.grounded?Math.cos(P.bobT)*.003*(1-P.ads):0));
  if(P.shake>0){ P.shake=Math.max(0,P.shake-dt); camera.position.x+=rand(-1,1)*P.shake*.3; camera.position.y+=rand(-1,1)*P.shake*.3; }
  P.fovK+=((P.sprint?1:sliding?1.4:0)-P.fovK)*Math.min(1,dt*6);
  const fov=SETTINGS.fov-(w?handling(w.id).zoom:15)*P.ads+P.fovK*6; if(Math.abs(camera.fov-fov)>.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
  if(GT-P.lastHit>3&&P.hp<P.maxHp&&P.revive<=0&&!P.downed&&!P.dead) P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.7*dt);
}
