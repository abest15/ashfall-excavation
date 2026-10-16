/* ---------- boot sequence: Furnace Lantern Games logo with sting, photosensitivity notice, then the title splash ---------- */
// Browsers keep audio locked until the first key or click, so when sound is still locked a quiet "press any key" gate comes first;
// that first press unlocks audio and lights the lantern. Every later key, click or controller button skips ahead.
const BOOT={on:true,stage:'',t:0,timer:null};
function bootSkipFlag(){ try{ if(sessionStorage.getItem('ashfall:skipboot')){ sessionStorage.removeItem('ashfall:skipboot'); return true; } }catch(e){} return false; }
function bootStage(name){ BOOT.stage=name; BOOT.t=performance.now(); clearTimeout(BOOT.timer);
  for(const id of ['boot-gate','boot-logo','boot-notice']){ const el=$(id); el.hidden=id!=='boot-'+name; el.classList.remove('play','out'); }
  const el=$('boot-'+name); if(el){ void el.offsetWidth; el.classList.add('play'); }
  $('boot-skip').classList.toggle('show',name==='logo'||name==='notice');
  if(name==='logo'){ stingPlay(); BOOT.timer=setTimeout(()=>bootLeave('logo','notice'),4500); }
  else if(name==='notice'){ BOOT.timer=setTimeout(()=>bootLeave('notice'),5200); } }
function bootLeave(from,to){ if(BOOT.stage!==from) return; BOOT.stage='leaving'; const el=$('boot-'+from); el.classList.add('out'); clearTimeout(BOOT.timer);
  BOOT.timer=setTimeout(()=>{ if(to) bootStage(to); else bootEnd(); },from==='logo'?420:380); }
function bootEnd(){ clearTimeout(BOOT.timer); BOOT.on=false; BOOT.stage='done'; const b=$('boot'); b.classList.add('done'); setTimeout(()=>{ b.hidden=true; },700);
  const sp=$('splash'); sp.classList.add('enter'); setTimeout(()=>sp.classList.remove('enter'),2400); sp.focus(); }
function bootUnlocked(){ return !!(AU.ctx&&AU.ctx.state==='running'); }
function bootAdvance(){ if(!BOOT.on) return; const held=performance.now()-BOOT.t;
  if(BOOT.stage==='gate'){ initAudio(); const go=()=>{ if(BOOT.stage==='gate') bootStage('logo'); }; if(AU.ctx&&AU.ctx.resume){ AU.ctx.resume().then(go,go); setTimeout(go,250); } else go(); return; }
  if(held<350) return; // a held key or a double click should not skip two screens at once
  if(BOOT.stage==='logo') bootLeave('logo','notice'); else if(BOOT.stage==='notice') bootLeave('notice'); }
function bootStart(){
  if(bootSkipFlag()){ // reloaded by a graphics change: go straight back to the options panel
    BOOT.on=false; $('boot').hidden=true; FRONT.splash=false; $('splash').hidden=true; $('front-main').hidden=false;
    addEventListener('pointerdown',()=>startMenuMusic(),{once:true}); addEventListener('keydown',()=>startMenuMusic(),{once:true});
    setTimeout(()=>{ showPanel('p-opts',true); navFocus($('s-scale'),true); },60); return; }
  try{ renderer.compile(scene,camera); LOAD.warm=true; }catch(e){}
  try{ initAudio(); }catch(e){}
  if(bootUnlocked()) bootStage('logo'); else bootStage('gate'); }
$('boot').addEventListener('pointerdown',e=>{ if(e.button===0||e.pointerType!=='mouse'){ bootAdvance(); } });
requestAnimationFrame(bootStart);
