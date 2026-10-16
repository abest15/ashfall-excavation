/* ---------- loop ---------- */
let last=performance.now(), hudT=0, interT=0;
function tick(dt){
  GT+=dt; playTime+=dt;
  updatePlayer(dt); updateWeapon(dt); if(NET.role!=='client'){ updateRounds(dt); updateZombies(dt); } else updateNetZombies(dt); updateColossus(dt); updateCabin(dt); if(NET.role!=='client'){ updateProjs(dt); updatePups(dt); } else updateNetPups(dt); updateWorld(dt); updateParticles(dt); updateBeams(dt); updateBolts(dt); if(NET.role!=='client') updateLures(dt); else updateNetLures(dt); updateKnife(dt); updateVM(dt); updateRain(dt);
  interT-=dt; if(interT<=0){ interT=.08; updateInteract(); }
  if(curInter&&curInter.o.win&&(keys.KeyE||PAD.useHeld)&&GT-curInter.o.win.last>.5) curInter.o.use();
  if(curInter&&curInter.o.revive&&(keys.KeyE||PAD.useHeld)&&!P.downed&&!P.dead){ P.revProg=(P.revProg||0)+dt; if(P.revProg>=3){ P.revProg=0; const id=curInter.o.revive; if(NET.role==='client') toHost({t:'revive',target:id}); else sendTo(id,{t:'revived',by:NET.name}); toast('You revived '+curInter.o.name); sfx.relic(); } } else if(!(curInter&&curInter.o.revive)) P.revProg=0;
  netTick(dt);
  hudT-=dt; if(hudT<=0){ hudT=.05; updateHud(); }
}
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(t-last)/1000); last=t;
  pollPad(dt);
  if(state==='play'||(state==='paused'&&NET.role!=='solo')) tick(dt); else if(state==='menu') updateMenuScene(dt,t);
  if(!$('menu').hidden) drawEmbers(dt);
  renderFrame(state==='play'||state==='paused');
}
placeCrate(0); P.weapons=[mkInst('pistol')]; buildVM();
requestAnimationFrame(frame);
$('splash').focus();
