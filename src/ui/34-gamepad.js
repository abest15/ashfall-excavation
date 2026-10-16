/* ---------- gamepad ---------- */
const PAD={prev:[],active:false,mx:0,my:0,fire:false,aim:false,sprintLatch:false,name:''};
function getPad(){ let ps=[]; try{ ps=navigator.getGamepads?navigator.getGamepads():[]; }catch(e){} for(const p of ps) if(p&&p.connected) return p; return null; }
function padNote(p){ const e=$('padnote'); if(!e) return; e.textContent=p?`Controller connected: ${p.id.replace(/\s*\(.*$/,'')||'gamepad'}. Press A to start.`:'No controller found. Plug in an Xbox or PlayStation controller and press any button on it.'; }
addEventListener('gamepadconnected',e=>{ padNote(e.gamepad); if(state==='play') toast('Controller connected'); });
addEventListener('gamepaddisconnected',()=>{ padNote(getPad()); PAD.fire=PAD.aim=false; PAD.mx=PAD.my=0; if(state==='play'){ toast('Controller disconnected'); } });
const dz=v=>{ const d=.16; return Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d); };
function rumble(strong,weak,ms){ if(!PAD.active) return; const p=getPad(); try{ p&&p.vibrationActuator&&p.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:strong,weakMagnitude:weak}); }catch(e){} }
function pollPad(dt){
  const p=getPad(); if(!p){ PAD.fire=PAD.aim=false; PAD.mx=PAD.my=0; return; }
  const btn=i=>{ const b=p.buttons[i]; return !!(b&&(b.pressed||b.value>.4)); };
  const now=p.buttons.map((_,i)=>btn(i)); const hit=i=>now[i]&&!PAD.prev[i];
  const ax=i=>dz(p.axes[i]||0);
  const lx=ax(0), ly=ax(1), rx=ax(2), ry=ax(3);
  if(now.some(Boolean)||lx||ly||rx||ry) PAD.active=true;
  if(state==='play'){
    PAD.mx=lx; PAD.my=ly;
    if(rx||ry){ const k=3.4*SETTINGS.sens*(1-.5*P.ads)*dt; P.yaw-=rx*Math.abs(rx)*k; P.pitch=clamp(P.pitch-ry*Math.abs(ry)*k*.75,-1.5,1.5); }
    const rt=btn(7); if(rt&&!PAD.fire) trigFresh=true; PAD.fire=rt; PAD.aim=btn(6); PAD.useHeld=btn(2);
    if(hit(10)) PAD.sprintLatch=!PAD.sprintLatch; if(ly>-.3) PAD.sprintLatch=false;
    if(hit(0)&&P.grounded&&P.revive<=0){ P.vy=7; P.grounded=false; }
    if(hit(2)){ if(curInter&&curInter.t[0]!=='!') interact(); else reload(); }
    if(hit(3)) cycleWeapon(1);
    if(hit(1)||hit(5)) melee();
    if(hit(4)) throwLure();
    if(hit(8)||hit(12)){ journalMin=!journalMin; $('journal').classList.toggle('min',journalMin); }
    if(hit(9)){ PAD.prev=now; pause(); return; }
  } else {
    PAD.fire=PAD.aim=false; PAD.mx=PAD.my=0;
    if(typeof frontPad==='function') frontPad(hit,now,p);
    else if(hit(0)||hit(9)){ PAD.active=true; if(!$('over').hidden) $('again').click(); else if(!$('menu').hidden){ if(FRONT.splash) dismissSplash(); else $('play').click(); } }
  }
  PAD.prev=now;
}
addEventListener('keydown',()=>{ PAD.active=false; },true);
addEventListener('mousedown',()=>{ PAD.active=false; },true);
