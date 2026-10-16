/* ---------- performance overlay (F3) · lane 5 ----------
   FPS, frame time, draw calls, triangles, zombie count, zombie simulation path (WASM/JS) and its cost, quality,
   network role and ping.
   Reads only; it never changes game state. Toggle with F3 (remembered per browser).
   Network ping shows when the co-op code provides NET.ping (milliseconds); otherwise "n/a".
   Also fills an element with id "game-version" with GAME_VERSION if the menu provides one. */
const PERF={on:false,el:null,body:null,frames:0,acc:0,worst:0,last:0,showT:0,calls:0,tris:0,fps:0,ms:0,peak:0};
function perfBuild(){ if(PERF.el) return; const d=document.createElement('div'); d.id='perf-overlay'; d.setAttribute('aria-hidden','true');
  d.style.cssText='position:fixed;top:8px;left:8px;z-index:2147483000;pointer-events:none;background:rgba(8,6,4,.78);color:#e8dcc0;font:11px/1.35 ui-monospace,Consolas,Menlo,monospace;padding:6px 9px;border:1px solid rgba(201,163,90,.55);border-radius:4px;white-space:pre;min-width:190px;text-shadow:0 1px 0 #000';
  document.body.appendChild(d); PERF.el=d; }
function perfToggle(on){ PERF.on=on===undefined?!PERF.on:!!on; perfBuild(); PERF.el.hidden=!PERF.on;
  renderer.info.autoReset=!PERF.on; renderer.info.reset(); PERF.frames=0; PERF.acc=0; PERF.worst=0; PERF.showT=0; if(PERF.on) PERF.el.textContent=perfText();
  try{ localStorage.setItem('ashfall:perf',PERF.on?'1':'0'); }catch(e){} }
addEventListener('keydown',e=>{ if(e.code!=='F3') return; e.preventDefault(); perfToggle(); },true);
function perfRow(k,v){ return (k+'          ').slice(0,10)+v+'\n'; }
function perfText(){ const zs=typeof zombies!=='undefined'?zombies:[]; let alive=0; for(const z of zs) if(!z.dead) alive++;
  const qn=['Low','Medium','High'][QUAL]||QUAL, sz=renderer.getDrawingBufferSize(new THREE.Vector2()), mem=renderer.info.memory;
  let net=NET.role; if(NET.role!=='solo'){ const n=typeof NP==='function'?NP():1; net+=' · '+n+' player'+(n===1?'':'s'); }
  const ping=NET.role==='solo'?'-':(typeof NET.ping==='number'?Math.round(NET.ping)+' ms':'n/a');
  return 'ASHFALL v'+GAME_VERSION+'  [F3]\n'+
    perfRow('fps',PERF.fps.toFixed(0))+
    perfRow('frame',PERF.ms.toFixed(1)+' ms  (worst '+PERF.peak.toFixed(1)+')')+
    perfRow('draws',String(PERF.calls))+
    perfRow('tris',PERF.tris>=1e6?(PERF.tris/1e6).toFixed(2)+' M':(PERF.tris/1e3).toFixed(1)+' k')+
    perfRow('geo/tex',mem.geometries+' / '+mem.textures)+
    perfRow('zombies',alive+' alive')+
    (typeof WSIM!=='undefined'?perfRow('sim',wsimLabel()):'')+
    perfRow('quality',qn+' · '+sz.x+'x'+sz.y)+
    perfRow('state',state+(typeof mode!=='undefined'?' · '+mode:''))+
    perfRow('net',net)+
    perfRow('ping',ping).replace(/\n$/,''); }
// Runs once per animation frame, registered before the main loop's frame() so it sees the previous frame's
// renderer counters (autoReset is off while the overlay is open, so all passes of a frame add up).
function perfFrame(t){ requestAnimationFrame(perfFrame);
  if(!PERF.on){ PERF.last=t; return; }
  const dt=PERF.last?t-PERF.last:16.7; PERF.last=t;
  const info=renderer.info.render; PERF.calls=info.calls; PERF.tris=info.triangles; renderer.info.reset();
  PERF.frames++; PERF.acc+=dt; if(dt>PERF.worst) PERF.worst=dt;
  if(PERF.acc>=500){ PERF.fps=PERF.frames*1000/PERF.acc; PERF.ms=PERF.acc/PERF.frames; PERF.peak=PERF.worst; PERF.frames=0; PERF.acc=0; PERF.worst=0;
    PERF.el.textContent=perfText(); } }
requestAnimationFrame(perfFrame);
try{ if(localStorage.getItem('ashfall:perf')==='1') perfToggle(true); }catch(e){}
{ const v=document.getElementById('game-version'); if(v&&!v.textContent.trim()) v.textContent='v'+GAME_VERSION; }
