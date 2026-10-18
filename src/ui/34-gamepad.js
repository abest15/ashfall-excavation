/* ---------- gamepad ---------- */
const PAD={prev:[],active:false,mx:0,my:0,fire:false,aim:false,sprintLatch:false,name:''};
// pick the controller the player is actually using: some PCs expose phantom pads first (Steam Input, virtual
// devices, a headset or wheel, or the same pad listed twice), so prefer the most recently active one, then a
// 'standard' layout, then whichever announced itself last
function getPad(){ let ps=[]; try{ ps=navigator.getGamepads?navigator.getGamepads():[]; }catch(e){} let best=null, bs=-1;
  for(const p of ps){ if(!p||!p.connected) continue; const live=p.buttons.some(b=>b&&(b.pressed||b.value>.4))||p.axes.some(a=>Math.abs(a)>.3);
    const sc=(live?4:0)+(p.mapping==='standard'?2:0)+(p.index===PAD.idx?1:0)+(p.timestamp||0)/1e12; if(sc>bs){ bs=sc; best=p; } }
  if(best&&(best.buttons.some(b=>b&&(b.pressed||b.value>.4))||best.axes.some(a=>Math.abs(a)>.3))) PAD.idx=best.index;
  return best?normPad(best):null; }
// non-'standard' layouts (common in Firefox and on Linux): remap the usual XInput-style order onto the standard one
function normPad(p){ if(p.mapping==='standard'||p.axes.length<4) return p;
  const B=i=>p.buttons[i]||{pressed:false,value:0}, trig=a=>{ const v=p.axes[a]; const x=v==null?0:(v+1)/2; return {pressed:x>.4,value:x}; };
  const six=p.axes.length>=6, hat=six&&p.axes.length>=8;
  const dp=(a,s)=>{ const v=hat?p.axes[a]||0:0; return {pressed:s<0?v<-.5:v>.5,value:0}; };
  const buttons=[B(0),B(1),B(2),B(3),B(4),B(5), six?trig(2):B(6), six?trig(5):B(7), six?B(6):B(8), six?B(7):B(9), six?B(9):B(10), six?B(10):B(11),
    hat?dp(7,-1):B(12), hat?dp(7,1):B(13), hat?dp(6,-1):B(14), hat?dp(6,1):B(15)];
  const axes=six?[p.axes[0],p.axes[1],p.axes[3],p.axes[4]]:p.axes.slice(0,4);
  return {id:p.id,index:p.index,mapping:'remapped',connected:true,buttons,axes,vibrationActuator:p.vibrationActuator,timestamp:p.timestamp}; }
function padNote(p){ const e=$('padnote'); if(!e) return; e.textContent=p?`Controller connected: ${p.id.replace(/\s*\(.*$/,'')||'gamepad'}. Press A to start.`:'No controller found. Plug in an Xbox or PlayStation controller and press any button on it.'; }
addEventListener('gamepadconnected',e=>{ PAD.idx=e.gamepad.index; padNote(e.gamepad); if(state==='play') toast('Controller connected'); });
addEventListener('gamepaddisconnected',()=>{ padNote(getPad()); PAD.fire=PAD.aim=false; PAD.mx=PAD.my=0; if(state==='play'){ toast('Controller disconnected'); } });
const dz=v=>{ const d=.16; return Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d); };
// radial deadzone with rescale: returns [x,y,magnitude 0..1]
function padStick(x,y,d=.12){ const m=Math.hypot(x,y); if(m<d) return [0,0,0]; const n=Math.min(1,(m-d)/(1-d)); return [x/m*n,y/m*n,n]; }
// exponential look response: fine control near centre, full speed at the edge
const LOOK={k:2.6,yaw:3.7,pitch:2.5,accelAfter:.25,accelMax:1.55,accelRise:.35};
const padCurve=n=>(Math.exp(LOOK.k*n)-1)/(Math.exp(LOOK.k)-1);
function rumble(strong,weak,ms,force){ if(!force&&(!PAD.active||SETTINGS.rumble===false)) return; const p=getPad(); try{ p&&p.vibrationActuator&&p.vibrationActuator.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:clamp(strong,0,1),weakMagnitude:clamp(weak,0,1)}); }catch(e){} }
/* ----- aim assist (controller only): slowdown over a target, light snap on ADS-in; weaker on bosses ----- */
const AA={snapT:0,snapZ:null,str:0,aimPrev:false,_d:new V3(),_f:new V3(),_o:new V3(),ray:new THREE.Raycaster()};
function aaTargets(maxD){ const out=[], o=camera.position, f=AA._f.set(0,0,-1).applyQuaternion(camera.quaternion);
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const p=z.g.position, ch=z.boss?2.4:z.kind==='hound'?.6:1.25; AA._d.set(p.x-o.x,p.y+ch-o.y,p.z-o.z); const d=AA._d.length(); if(d>maxD||d<.5) continue;
    const ang=Math.acos(clamp(AA._d.dot(f)/d,-1,1)); out.push({z,d,ang,ch,rad:Math.atan((z.boss?1.6:.45)/d)}); }
  return out.sort((a,b)=>a.ang-b.ang); }
function aaVisible(t){ const o=camera.position, p=t.z.g.position; AA._d.set(p.x-o.x,p.y+t.ch-o.y,p.z-o.z); const d=AA._d.length(); AA.ray.set(o,AA._d.normalize()); AA.ray.far=d-.3; try{ return AA.ray.intersectObjects(solids,false).length===0; }catch(e){ return true; } }
function aaSlow(){ if(SETTINGS.aim==='off') return 1; const t=aaTargets(45)[0]; if(!t||t.ang>t.rad+.035) return 1; return t.z.boss?.8:(P.ads>.5?.45:.58); }
function aaSnapStart(){ if(SETTINGS.aim==='off') return; const c=aaTargets(32).find(t=>t.ang<.21&&aaVisible(t)); if(!c) return; AA.snapZ=c; AA.snapT=.16; AA.str=c.z.boss?.25:.6; }
function aaSnapStep(dt){ if(AA.snapT<=0||!AA.snapZ) return; const t=AA.snapZ; if(t.z.dead){ AA.snapT=0; return; } AA.snapT-=dt;
  const o=camera.position, p=t.z.g.position, dx=p.x-o.x, dy=p.y+t.ch-o.y, dzz=p.z-o.z, ty=Math.atan2(-dx,-dzz), tp=Math.atan2(dy,Math.hypot(dx,dzz));
  let dyaw=ty-P.yaw; dyaw=Math.atan2(Math.sin(dyaw),Math.cos(dyaw)); const k=Math.min(1,dt/.16)*AA.str*1.6; P.yaw+=dyaw*k; P.pitch=clamp(P.pitch+(tp-P.pitch)*k,-1.5,1.5); }
{ const a=$('s-aim'); if(a){ a.value=SETTINGS.aim==='off'?'off':'std'; a.addEventListener('change',()=>{ SETTINGS.aim=a.value; saveSettings(); }); }
  const r=$('s-rumble'); if(r){ r.value=SETTINGS.rumble===false?'off':'on'; r.addEventListener('change',()=>{ SETTINGS.rumble=r.value==='on'; saveSettings(); if(SETTINGS.rumble) rumble(.45,.45,140,true); }); } }
function pollPad(dt){
  const p=getPad(); if(!p){ PAD.fire=PAD.aim=false; PAD.mx=PAD.my=0; return; }
  const btn=i=>{ const b=p.buttons[i]; return !!(b&&(b.pressed||b.value>.4)); };
  const now=p.buttons.map((_,i)=>btn(i)); const hit=i=>now[i]&&!PAD.prev[i];
  const ax=i=>dz(p.axes[i]||0);
  const ls=padStick(p.axes[0]||0,p.axes[1]||0,.12), rs=padStick(p.axes[2]||0,p.axes[3]||0,.12), lx=ls[0], ly=ls[1], rx=rs[0], ry=rs[1];
  if(now.some(Boolean)||lx||ly||rx||ry) PAD.active=true;
  if(state==='play'){
    PAD.mx=lx; PAD.my=ly;
    // look: exponential curve on the radial magnitude, separate yaw/pitch speed, ramp after holding full tilt
    if(rs[2]>.95){ PAD.fullT=(PAD.fullT||0)+dt; } else PAD.fullT=0;
    const ramp=1+(LOOK.accelMax-1)*clamp(((PAD.fullT||0)-LOOK.accelAfter)/LOOK.accelRise,0,1);
    if(rs[2]>0){ const c=padCurve(rs[2])/rs[2], k=SETTINGS.sens*(1-.5*P.ads)*dt*ramp*aaSlow(); P.yaw-=rx*c*LOOK.yaw*(SETTINGS.lookX||1)*k; P.pitch=clamp(P.pitch-ry*c*LOOK.pitch*(SETTINGS.lookY||1)*k,-1.5,1.5); }
    const rt=btn(7); if(rt&&!PAD.fire) trigFresh=true; PAD.fire=rt; PAD.aim=btn(6); PAD.useHeld=btn(2);
    if(PAD.aim&&!AA.aimPrev&&P.ads<.3) aaSnapStart(); AA.aimPrev=PAD.aim; aaSnapStep(dt);
    if(hit(10)) PAD.sprintLatch=!PAD.sprintLatch; if(ly>-.3) PAD.sprintLatch=false;
    if(hit(0)&&P.grounded&&P.revive<=0){ P.vy=7; P.grounded=false; }
    if(hit(2)){ if(curInter&&curInter.t[0]!=='!') interact(); else reload(); }
    if(hit(3)) cycleWeapon(1);
    if(hit(1)||hit(5)) melee();
    if(hit(4)) throwLure();
    if(hit(11)) crouchPress(); if(hit(13)) inspectWeapon();
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
