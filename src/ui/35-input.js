/* ---------- input ---------- */
const keys={}; let noLock=false; let journalMin=false;
function locked(){ return document.pointerLockElement===canvas; }
addEventListener('keydown',e=>{
  if(state!=='play') return;
  keys[e.code]=true;
  switch(e.code){
    case 'KeyE': interact(); break; case 'KeyR': reload(); break; case 'KeyF': case 'KeyV': melee(); break;
    case 'Digit1': switchTo(0); break; case 'Digit2': switchTo(1); break; case 'Digit3': switchTo(2); break;
    case 'KeyG': throwLure(); break;
    case 'KeyC': crouchPress(); break; case 'KeyI': inspectWeapon(); break;
    case 'KeyJ': journalMin=!journalMin; $('journal').classList.toggle('min',journalMin); break;
    case 'Space': if(P.grounded){ P.vy=7; P.grounded=false; } break;
    case 'Escape': case 'KeyP': if(noLock) pause(); break;
  }
  if(['Space','Tab','ArrowUp','ArrowDown','ControlLeft','ControlRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; mouseDown=false; mouseRight=false; PAD.fire=PAD.aim=false; });
canvas.addEventListener('mousedown',e=>{ if(state!=='play') return; if(!locked()&&!noLock){ requestLock(); return; } if(e.button===0){ mouseDown=true; trigFresh=true; } if(e.button===2) mouseRight=true; });
addEventListener('mouseup',e=>{ if(e.button===0) mouseDown=false; if(e.button===2) mouseRight=false; });
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{ if(state!=='play') return; cycleWeapon(e.deltaY<0?-1:1); },{passive:true});
addEventListener('mousemove',e=>{ if(state!=='play') return; if(!locked()&&!noLock) return;
  const k=.0022*SETTINGS.sens*(1-.45*P.ads); P.yaw-=(e.movementX||0)*k; P.pitch=clamp(P.pitch-(e.movementY||0)*k,-1.5,1.5); });
let lockFails=0, lockReq=null;
addEventListener('pointerdown',initAudio,true); addEventListener('keydown',initAudio,true);
function lockFailed(){ if(!lockReq||lockReq.failed) return; lockReq.failed=true; lockFails++; if(lockFails>=2&&!noLock){ noLock=true; toast('Mouse capture is blocked here. Move the mouse to look; press Esc to pause.'); } else toast('Click the view to capture the mouse'); }
function requestLock(){ if(noLock) return; lockReq={failed:false}; try{ const r=canvas.requestPointerLock(); if(r&&r.catch) r.catch(lockFailed); }catch(e){ lockFailed(); } }
document.addEventListener('pointerlockerror',lockFailed);
document.addEventListener('pointerlockchange',()=>{ if(locked()){ lockFails=0; return; } if(state==='play'&&!noLock) pause(); });
