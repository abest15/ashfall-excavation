/* ---------- player combat ---------- */
const ray=new THREE.Raycaster(); let mouseDown=false, mouseRight=false, trigFresh=false;
function fire(){
  const w=curW(); if(!w||P.swapT>0||w.reloadEnd||P.revive>0||VM.melee>0||P.downed||P.dead) return; const s=statsOf(w); if(GT<w.next) return;
  if(w.mag<=0){ if(trigFresh){ sfx.dry(); trigFresh=false; } if(w.res>0) reload(); return; }
  if(!s.auto&&!trigFresh) return; trigFresh=false;
  NET.shots++; w.mag--; if(w.id==='gatling') w.mag=999; w.next=GT+s.rate*(P.perks.has('rapid')?.75:1); P.sprint=false;
  camera.updateMatrixWorld(); const origin=camera.position.clone(); const fwd=new V3(0,0,-1).applyQuaternion(camera.quaternion);
  const spread=(s.spread*(1-.7*P.ads)*(P.moving?1.5:1)+(P.grounded?0:.03))*(P.perks.has('steady')?.6:1);
  const targets=zparts.concat(solids); const muzzleW=camera.localToWorld(new V3(.2,-.18,-.8));
  for(let k=0;k<s.pellets;k++){
    const dir=fwd.clone(); dir.x+=rand(-1,1)*spread; dir.y+=rand(-1,1)*spread; dir.z+=rand(-1,1)*spread; dir.normalize();
    ray.set(origin,dir); ray.far=160; const hits=ray.intersectObjects(targets,false); let pierce=s.pierce; const seen=new Set(); let end=null, pz=null;
    for(const h of hits){ const o=h.object; const z=o.userData.z;
      if(z){ if(z.dead||seen.has(z)) continue; seen.add(z); if(s.proj||s.jump){ pz={z,head:!!o.userData.head}; end=h.point; break; } const fall=s.pellets>1?Math.max(.35,1-Math.max(0,h.distance-8)/18):1;
        hitZombie(z,s.dmg*fall,o.userData.head?(z.boss?3:s.head)*(P.perks.has('steady')?1.5:1):1,'gun'); spawnParticles(h.point,z.kind==='hollow'||z.prime?'relic':z.boss?'spark':'blood',3); hitMarker(false);
        if(--pierce<=0){ end=h.point; break; } }
      else { const u=o.userData;
        if(NET.role==='client'){ const k=u.reson!==undefined?['reson',u.reson]:u.wraith?['wraith']:u.hcrystal!==undefined?['crystal',u.hcrystal]:u.bell?['bell']:u.cvalve!==undefined?['valve',u.cvalve]:null; if(k) toHost({t:'shoot',k:k[0],i:k[1],w:w.id,up:w.up}); }
        else { if(u.reson!==undefined) hitReson(u.reson); if(u.wraith) hitWraith(w); if(u.hcrystal!==undefined) hitCrystal(u.hcrystal); if(u.bell) ringBell(); if(u.cvalve!==undefined) hitValve(u.cvalve,w); }
        if(w.id==='rod'){ if(o.userData.waystone!==undefined) strikeStone(o.userData.waystone); if(o.userData.lodestone) strikeLodestone(w); }
        spawnParticles(h.point,w.id==='rod'?'relic':'dirt',w.id==='rod'?5:2); end=h.point; break; } }
    if(s.proj){ launchBolt(muzzleW,end||origin.clone().addScaledVector(dir,80),s,pz); continue; }
    if(s.jump){ const e=end||origin.clone().addScaledVector(dir,50); arc(muzzleW,e,1.6,w.up?0xff8a6a:0xcfe8ff); if(pz) chainJump(pz.z,s,w.up); else spawnParticles(e,'spark',6); continue; }
    if(s.splash){ const e=end||origin.clone().addScaledVector(dir,40); explode(e,s.splash,s.dmg*.85); }
    if(s.beam){ const e=end||origin.clone().addScaledVector(dir,60); (s.arc?arc:beam)(muzzleW,e,w.up?2.2:1.3,s.bcol); if(w.id==='rod'){ beam(muzzleW,e,w.up?7:5,w.up?0x2a6a80:0x1a4a5a); spawnParticles(e,'relic',w.up?10:6); }
      if(s.chain){ let n=0; for(const z of zombies){ if(n>=(s.chainN||3)) break; if(z.dead||seen.has(z)||z.rise>0) continue; const zp=z.g.position; if(Math.hypot(zp.x-e.x,zp.z-e.z)<6.5){ n++; (s.arc?arc:beam)(e,new V3(zp.x,1.3,zp.z),.8,s.bcol); hitZombie(z,s.dmg*(s.chainMul||.5),1,'gun'); } } } }
  }
  VM.kick=s.type==='shotgun'||s.type==='rifle'||s.type==='rod'||s.type==='cannon'||s.type==='dynamo'?.09:.035; if(w.id==='rod'||w.id==='dynamo') VM.rodFlare=1; P.kick+=(s.type==='rifle'||s.type==='shotgun'?.022:.008)*(1-.5*P.ads); VM.flashT=.05;
  rumble(s.type==='shotgun'||s.type==='rifle'?.6:.15,.4,s.auto?60:110);
  sfx[s.snd](w.up); if(w.mag===0&&w.res>0) setTimeout(()=>{ if(curW()===w) reload(); },160);
}
function reload(){ const w=curW(); if(!w||w.reloadEnd||P.swapT>0) return; const s=statsOf(w); if(w.mag>=s.mag||w.res<=0) return; w.reloadEnd=GT+s.rl*(P.perks.has('quick')?.5:1); sfx.reload(); }
function updateWeapon(dt){ const w=curW(); if(P.swapT>0) P.swapT-=dt; if(P.meleeT>0) P.meleeT-=dt;
  if(w&&w.reloadEnd&&GT>=w.reloadEnd){ const s=statsOf(w); const take=Math.min(s.mag-w.mag,w.res); w.mag+=take; w.res-=take; w.reloadEnd=0; }
  if((mouseDown||PAD.fire)&&w) fire(); }
function switchTo(i){ if(PU.gatling>0||i===P.cur||!P.weapons[i]) return; const w=curW(); if(w) w.reloadEnd=0; P.cur=i; P.swapT=.4; buildVM(); sfx.swap(); }
function cycleWeapon(dir){ const n=P.weapons.length; if(n<2) return; switchTo((P.cur+dir+n)%n); }
function melee(){ if(P.meleeT>0||P.revive>0||state!=='play'||P.downed||P.dead) return; const res=P.bless.has('knife'); P.meleeT=res?.5:.62; VM.melee=KN.T; P.meleePending=true; updateKnifeLook(); KN.root.visible=true; sfx.swing(); if(res) sfx.ring();
  const t=meleeTarget(3.6); if(t&&t.d>1.5){ P.lungeT=.16; P.lx=(t.z.g.position.x-P.pos.x)/t.d; P.lz=(t.z.g.position.z-P.pos.z)/t.d; } }
function meleeTarget(range){ const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw); let best=null,bd=range;
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<bd&&d>1e-3&&(dx*fx+dz*fz)/d>.45){ best=z; bd=d; } }
  return best?{z:best,d:bd}:null; }
function meleeHit(){ const res=P.bless.has('knife'); const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw); const reach=res?3:2.4; const hits=[];
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<reach+(z.boss?.6:0)&&d>1e-3&&(dx*fx+dz*fz)/d>(res?.2:.4)) hits.push({z,d}); }
  if(!hits.length) return; hits.sort((a,b)=>a.d-b.d);
  for(const h of hits.slice(0,res?4:1)){ const z=h.z; hitZombie(z,res?(z.boss?1500:Math.max(3000,z.maxHp*.5)):(z.boss?250:150),1,'melee'); spawnParticles(z.g.position.clone().setY(1.4),res?'relic':'blood',6); }
  sfx.stab(); hitMarker(false); P.kick+=.01; rumble(.5,.5,90); }
function hurtPlayer(d,src){ if(P.invuln>0||P.revive>0||P.downed||P.dead||(state!=='play'&&!(NET.role!=='solo'&&state==='paused'))) return; d*=DF().dmg*(P.bless.has('stone')?.75:1);
  if(P.aegis&&src){ const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw), dx=src.x-P.pos.x, dz=src.z-P.pos.z, l=Math.hypot(dx,dz)||1; if((dx*fx+dz*fz)/l<-.25){ d*=.2; sfx.clang(); } } if(P.shield>0){ const a=Math.min(P.shield,d); P.shield-=a; d-=a; } P.hp-=d; P.lastHit=GT; P.invuln=.25; sfx.hurt(); rumble(1,.6,220); $('hurtflash').style.opacity=1; setTimeout(()=>$('hurtflash').style.opacity=0,90);
  if(P.hp<=0) down(); }
function down(){
  if(P.perks.has('wind')){ P.perks.clear(); P.maxHp=100; if(P.weapons.length>2){ P.weapons.length=2; if(P.cur>1) P.cur=0; buildVM(); } P.hp=1; P.revive=3; $('reviving').hidden=false; sfx.relic();
    for(const z of zombies){ if(z.dead||z.boss) continue; const dx=z.g.position.x-P.pos.x, dz=z.g.position.z-P.pos.z, d=Math.hypot(dx,dz); if(d<5){ z.g.position.x+=dx/d*(5-d); z.g.position.z+=dz/d*(5-d); collide(z.g.position,.33);} } return; }
  if(NET.role!=='solo'){ goDown(); return; }
  gameOver(); }
