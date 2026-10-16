/* ---------- reset ---------- */
function newGame(){
  for(const z of zombies) scene.remove(z.g); zombies.length=0; zparts=[];
  projs.forEach(q=>scene.remove(q.m)); projs.length=0; PUPS.forEach(q=>pupFree(q.g)); PUPS.length=0; pickups.forEach(q=>scene.remove(q.m)); pickups.length=0;
  DOORS.forEach(d=>{ d.open=false; d.anim=0; d.g.visible=true; d.g.position.y=0; d.col.on=true; addSolid(d.hit); });
  for(const k in ZONES) ZONES[k].open=(k==='A'||k==='H');
  POWER.on=false; GEN.lever.rotation.z=.6; bulbs.forEach((b,i)=>b.material.color.set(i===0?0xf2cb78:0x3a3326)); tonicPanels.forEach(t=>t.pm.emissiveIntensity=t.T.noPower?.9:.12); forgeLight.intensity=0; FORGE.mouth.material.color.set(0x3a1a0c);
  FORGE.state='idle'; FORGE.inst=null; if(FORGE.model){ scene.remove(FORGE.model); FORGE.model=null; }
  closeCrate(); CRATE.uses=0; placeCrate(0);
  Q.frag={dig:false,locker:false,marked:false}; Q.stage='frags'; Q.t=0; Q.sink=0; Q.rites=0; Q.echo=null; Q.wr=null; Q.warden=false; hideResonators(); WR.g.visible=false; removeSolid(WR.hit); Q.stones.forEach(s=>{ s.kills=0; s.fed=false; s.lit=false; s.rm.color.set(0x2a2620); s.ring.material.opacity=0; });
  lodeParts.slots.forEach(s=>s.visible=false); lodeParts.rodShow.visible=false; lodeParts.rodShowUp.visible=false; lodeParts.shaft.visible=false; lodeParts.shaftBeam.visible=false; lodeParts.ob.position.y=2.5; lodeParts.vein.position.y=2.3; lodeParts.cap.position.y=5.5; lodeParts.cap.material.color.set(0x2a5a66); addSolid(lodeParts.ob);
  MOUNDS.forEach(m=>{ m.dug=false; m.m.scale.y=1; }); LOCKER.open=false; LOCKER.door.rotation.y=0;
  resetWindows(); colReset(); chapelReset(); P.inCabin=false; CAB.item=null; TRAP.t=0; TRAP.cd=0; TRAP.light.intensity=0; TRAP.flames.forEach(f=>f.visible=false); Q.gauntlet=false; LT.t=14; LT.f=0;
  HL.wave=0; HL.toSpawn=0; HL.inBreak=true; HL.gateOpen=false; HL.gate.visible=false; HL.lit=null; HL.pups=0; HL.primeT=0;
  HL.crystals.forEach(c=>{ c.visible=true; c.material=c.userData.base; addSolid(c); c.userData.col.on=true; });
  mode='main'; setAtmosphere('main'); ambienceMode('main');
  Object.assign(P,{vy:0,yaw:0,pitch:0,hp:100,maxHp:100,lastHit:-99,points:500,weapons:[mkInst('pistol')],cur:0,swBuys:0,ads:0,sprint:false,meleeT:0,swapT:0,kick:0,kills:0,heads:0,invuln:0,revive:0,zone:'A',earned:0,shield:0,lungeT:0,shake:0,meleePending:false});
  P.perks=new Set(); P.bless=new Set(); P.pos.set(0,0,44); PU.double=0; PU.insta=0; PU.freeze=0; PU.sale=0; PU.gatling=0; PU.gat=null; VM.melee=0; R.hound=false; R.houndPos=null; boomLight.intensity=0; updateKnifeLook(); P.items=new Set(); P.aegis=false; spawnAegisParts(); P.lures=0; P.lureOwned=false; LURES.forEach(q=>scene.remove(q.g)); LURES.length=0; BOLTS.forEach(q=>scene.remove(q.m)); BOLTS.length=0;
  R.n=0; R.inBreak=true; R.breakT=3; R.bossDue=false; GT=0; playTime=0; buildVM(); setRoundHud('',false); $('reviving').hidden=true; netResetLocal();
}
