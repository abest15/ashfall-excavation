/* ---------- menu ---------- */
// Front end flow: boot (studio logo, notice; ui/front/boot.js) -> splash -> main menu / panels -> loading (ui/front/loading.js) -> play.
// Keyboard and controller navigation lives in ui/front/nav.js, the end-of-game scoreboard in ui/front/scoreboard.js.
if(typeof SETTINGS.music!=='number') SETTINGS.music=.8;
if(typeof SETTINGS.sfx!=='number') SETTINGS.sfx=1;
const FRONT={splash:true};
function pause(){ if(state!=='play') return; state='paused'; mouseDown=false; mouseRight=false; for(const k in keys) keys[k]=false; $('menu').hidden=false; $('menu').classList.add('paused'); $('splash').hidden=true; FRONT.splash=false; $('front-main').hidden=false; $('play').textContent='Resume'; $('play').dataset.desc='Back to the fight.'; $('restart').hidden=NET.role==='client'; $('m-quit').hidden=false; $('m-coop').hidden=true; $('hud').hidden=true; showPanel(null,true);
  const ps=$('pause-stats'); if(ps){ const where=mode==='hollow'?`The Hollow · wave ${HL.wave||1}`:`Round ${Math.max(1,R.n)}`; ps.textContent=`${where}  ·  ${(P.points||0).toLocaleString()} points  ·  ${P.kills||0} kills  ·  ${fmtTime(playTime)}`; }
  $('pause-head').hidden=false; uiSfx('open'); setTimeout(()=>navFocus($('play')),30); }
function startPlay(){ initAudio(); stopMenuMusic(); hideMenuScene(); showPanel(null,true); $('menu').hidden=true; $('menu').classList.remove('paused'); $('pause-head').hidden=true; $('over').hidden=true; $('hud').hidden=false; state='play'; if(!PAD.active) requestLock();
  if(R.n===0&&R.inBreak&&GT===0){ if(!LOAD.on) veilIn(); banner('Dig Site 7','Hold out. Open the site. Find the way down.',true); } }
$('play').addEventListener('click',()=>{ if(LOAD.on) return; if(state==='menu'&&NET.role==='host'){ $('mp-start').click(); return; } if(state==='menu'&&NET.role==='client'){ setStatus('Waiting for the host to start'); showPanel('p-coop'); return; } if(state==='menu'){ loadThenPlay(true); return; } uiSfx('back'); startPlay(); });
// ---- title screen: splash, panels, embers, grain, ticker, music, cinematic backdrop
function showPanel(id,quiet){ let changed=false; document.querySelectorAll('#front-main .panel').forEach(p=>{ const on=p.id===id; if(p.hidden===on) changed=true; p.hidden=!on; });
  document.querySelectorAll('.mbtn[data-panel]').forEach(b=>b.classList.toggle('on',b.dataset.panel===id)); $('front-main').classList.toggle('has-panel',!!id);
  if(changed&&!quiet) uiSfx(id?'open':'back'); navHint(); }
document.querySelectorAll('.mbtn[data-panel]').forEach(b=>b.addEventListener('click',()=>{ const open=!$(b.dataset.panel).hidden; showPanel(open?null:b.dataset.panel); }));
function dismissSplash(){ if(!FRONT.splash||BOOT.on) return; FRONT.splash=false; const sp=$('splash'); sp.classList.add('leaving'); uiSfx('confirm'); initAudio(); startMenuMusic();
  setTimeout(()=>{ sp.hidden=true; sp.classList.remove('leaving'); $('front-main').hidden=false; navHint(); navFocus($('play')); },420); }
function toSplash(){ if(FRONT.splash||state!=='menu') return; showPanel(null,true); FRONT.splash=true; uiSfx('back'); $('front-main').hidden=true; $('splash').hidden=false; $('splash').focus(); }
$('splash').addEventListener('click',dismissSplash);
function toTitle(){ try{ document.exitPointerLock&&document.exitPointerLock(); }catch(e){} if(window.netLeave) netLeave(); state='menu'; newGame(); $('hud').hidden=true; $('over').hidden=true; $('menu').hidden=false; $('menu').classList.remove('paused'); $('pause-head').hidden=true; $('play').textContent='Solo'; $('play').dataset.desc='Hold the dig alone against the dead.'; $('restart').hidden=true; $('m-quit').hidden=true; $('m-coop').hidden=false; showPanel(null,true); startMenuMusic(); setTimeout(()=>navFocus($('play')),30); }
$('m-quit').addEventListener('click',toTitle);
$('over-menu').addEventListener('click',()=>{ uiSfx('back'); toTitle(); });
{ // film grain from a generated noise tile
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), d=g.createImageData(128,128); for(let i=0;i<d.data.length;i+=4){ const v=Math.random()*255; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } g.putImageData(d,0,0); $('grain').style.backgroundImage=`url(${c.toDataURL()})`; }
const EMB={c:$('embers'),p:[]};
for(let i=0;i<70;i++) EMB.p.push({x:Math.random(),y:Math.random(),v:rand(.02,.07),s:rand(1,2.6),w:rand(0,6),h:Math.random()<.2?'#9ff3ff':'#ff9a40'});
function drawEmbers(dt){ const c=EMB.c, w=c.clientWidth, h=c.clientHeight; if(!w) return; if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } const g=c.getContext('2d'); g.clearRect(0,0,w,h);
  for(const q of EMB.p){ q.y-=q.v*dt; q.w+=dt; if(q.y<-.05){ q.y=1.05; q.x=Math.random(); } const x=(q.x+Math.sin(q.w*.7)*.02)*w, y=q.y*h, a=.35+.45*Math.sin(q.w*3)**2;
    g.globalAlpha=a; g.fillStyle=q.h; g.shadowColor=q.h; g.shadowBlur=8; g.beginPath(); g.arc(x,y,q.s,0,7); g.fill(); } g.globalAlpha=1; g.shadowBlur=0; }
const TICKS=['Night patrol reports the big walker crossed the wire again. Nobody saw it stop.','Chapel bell rang at 0300 with no one in the tower.','Quartermaster swears the relic crate hummed a tune before it sank into the mud.','Do not stand under anything that is walking.','The marked one glows blue. Kill it and keep what it drops.','Every board you nail back up is a minute you get to keep.','A digger in C-section heard tones under the soil. Low, then high.','The Forge takes your rifle and gives back something angrier.'];
let tickI=0; setInterval(()=>{ if($('menu').hidden) return; const e=$('ticker'); e.style.opacity=0; setTimeout(()=>{ tickI=(tickI+1)%TICKS.length; e.textContent=TICKS[tickI]; e.style.opacity=1; },600); },7000); $('ticker').textContent=TICKS[0];
// procedural menu music: a choir-like pad, a low drone, a music-box line with echoes, and a distant bell
const MUS={on:false,timer:null,bar:0,g:null,next:0,k:1}; const BAR=3.2;
const PROG=[[57,60,64],[53,57,60],[50,53,57],[52,56,59]], MEL=[69,72,76,74,72,71,69,64,65,69,72,71,69,68,64,-1];
const mtof=m=>440*Math.pow(2,(m-69)/12);
function startMenuMusic(){ const a=AU.ctx; if(!a||MUS.on||!AU.master) return; MUS.on=true; const bus=frontBus('music'); MUS.k=bus.k; MUS.own=bus.own; MUS.g=a.createGain(); MUS.g.gain.value=0; MUS.g.connect(bus.node); MUS.g.gain.setTargetAtTime(.6*MUS.k,a.currentTime,1.5); MUS.next=a.currentTime+.1; MUS.bar=0; musTick(); MUS.timer=setInterval(musTick,250); }
function stopMenuMusic(){ if(!MUS.on) return; MUS.on=false; clearInterval(MUS.timer); const g=MUS.g, a=AU.ctx; g.gain.setTargetAtTime(0,a.currentTime,.5); setTimeout(()=>g.disconnect(),3500); }
function musTick(){ const a=AU.ctx; if(!a) return; while(MUS.next<a.currentTime+.8){ musBar(MUS.next,MUS.bar); MUS.next+=BAR; MUS.bar++; } }
function musVoice(type,f,t0,t1,peak,att,out,filt){ const a=AU.ctx, o=a.createOscillator(); o.type=type; o.frequency.value=f; const g=a.createGain(); g.gain.setValueAtTime(.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+att); g.gain.linearRampToValueAtTime(.0001,t1);
  if(filt){ const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=filt; fl.Q.value=1.1; o.connect(fl); fl.connect(g); } else o.connect(g); g.connect(out); o.start(t0); o.stop(t1+.05); return o; }
function musBar(t,b){ const a=AU.ctx, out=MUS.g, ch=PROG[b%4];
  for(const m of ch) for(const det of [-7,7]){ const o=musVoice('sawtooth',mtof(m-12),t,t+BAR+.4,.03,1.3,out,b%2?760:640); o.detune.value=det; }
  musVoice('triangle',mtof(ch[0]-24),t,t+BAR+.3,.13,.8,out);
  if(b>=2) for(let i=0;i<4;i++){ const m=MEL[(b%4)*4+i]; if(m<0) continue; const tt=t+i*BAR/4;
    for(const [dl,vv] of [[0,.07],[.34,.025],[.68,.01]]){ const o=a.createOscillator(); o.type='sine'; o.frequency.value=mtof(m+12); const g=a.createGain(); g.gain.setValueAtTime(.0001,tt+dl); g.gain.exponentialRampToValueAtTime(vv,tt+dl+.01); g.gain.exponentialRampToValueAtTime(.0001,tt+dl+1.1); o.connect(g); g.connect(out); o.start(tt+dl); o.stop(tt+dl+1.2); } }
  if(b%4===0){ const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(30,t+1.2); const g=a.createGain(); g.gain.setValueAtTime(.35,t); g.gain.exponentialRampToValueAtTime(.0001,t+1.6); o.connect(g); g.connect(out); o.start(t); o.stop(t+1.7);
    [220,440.5,553,661].forEach((f,i)=>{ const o2=a.createOscillator(); o2.type='sine'; o2.frequency.value=f; const g2=a.createGain(), tb=t+BAR*2; g2.gain.setValueAtTime(.0001,tb); g2.gain.exponentialRampToValueAtTime([.05,.03,.02,.015][i],tb+.01); g2.gain.exponentialRampToValueAtTime(.0001,tb+3); o2.connect(g2); g2.connect(out); o2.start(tb); o2.stop(tb+3.1); }); } }
// cinematic backdrop: low in No Man's Land, the Colossus striding past, a few dead shambling toward the camera
const MENUZ=[];
for(let i=0;i<5;i++){ const z=makeZombie('walker'); z.g.visible=false; scene.add(z.g); MENUZ.push({z,ph:rand(0,6),sp:rand(.7,1.1)}); }
function menuZReset(m,first){ m.z.g.position.set(rand(64,82),0,rand(-24,-2)); if(first) m.z.g.position.x=rand(52,80); }
MENUZ.forEach(m=>menuZReset(m,true));
function updateMenuScene(dt,t){ updateColossus(dt); updateRain(dt); lodeParts.cap.rotation.y+=dt*.6; CRATE.beam.material.opacity=.06; for(const f of FLAMES) f.scale.y=.75+Math.random()*.5;
  const cp=COL.g.position, sw=Math.sin(t*.00025); camera.position.set(45+sw*1.2,2.2+Math.sin(t*.0004)*.25,-11+Math.cos(t*.0002)*2); camera.lookAt(cp.x*.6+70*.4,7.5,cp.z*.6-12*.4-13);
  for(const m of MENUZ){ const g=m.z.g; g.visible=true; const dx=46-g.position.x, dz=-11-g.position.z, d=Math.hypot(dx,dz); g.position.x+=dx/d*m.sp*dt; g.position.z+=dz/d*m.sp*dt; g.rotation.y=Math.atan2(dx,dz); animZombie(m.z,dt,true,m.sp,-1); if(d<5) menuZReset(m); }
  LT.t-=dt; if(LT.t<=0){ LT.t=rand(9,20); LT.f=.45; if(AU.ctx) sfx.thunder(rand(.4,1.4)); }
  if(LT.f>0){ LT.f-=dt; const k=(LT.f>.33||(LT.f>.12&&LT.f<.2))?1:0; hemi.intensity=.85+k*1.8; sky.material.color.setScalar(1+k*2); if(LT.f<=0){ hemi.intensity=.85; sky.material.color.setScalar(1); } } }
function hideMenuScene(){ for(const m of MENUZ) m.z.g.visible=false; }
$('restart').addEventListener('click',()=>{ if(NET.role==='client') return; if(NET.role==='host'){ bcast({t:'start'}); newGame(); startPlay(); return; } loadThenPlay(true); });
$('again').addEventListener('click',()=>{ if(NET.role==='client'){ toast('Waiting for the host to start again'); return; } if(NET.role==='host'){ bcast({t:'start'}); newGame(); startPlay(); return; } loadThenPlay(true); });
function rangeFill(i){ i.style.setProperty('--p',((i.value-i.min)/(i.max-i.min)*100).toFixed(1)+'%'); }
function bindRange(id,key,fmt,after){ const i=$('s-'+id), o=$('o-'+id); i.value=SETTINGS[key]; o.textContent=fmt(SETTINGS[key]); rangeFill(i); i.addEventListener('input',()=>{ SETTINGS[key]=+i.value; o.textContent=fmt(+i.value); rangeFill(i); saveSettings(); after&&after(); uiSfx('tick'); }); }
bindRange('sens','sens',v=>v.toFixed(1)+'×');
bindRange('fov','fov',v=>v+'°');
bindRange('vol','vol',v=>Math.round(v*100)+'%',()=>{ if(AU.master) AU.master.gain.value=SETTINGS.vol; });
bindRange('music','music',v=>Math.round(v*100)+'%',()=>{ if(MUS.on&&MUS.g&&MUS.own){ MUS.k=SETTINGS.music; MUS.g.gain.setTargetAtTime(.6*MUS.k,AU.ctx.currentTime,.05); } });
bindRange('sfx','sfx',v=>Math.round(v*100)+'%');
{ const s=$('s-scale'); s.value=String(SETTINGS.scale); if(!s.value){ s.value='0.75'; SETTINGS.scale=.75; } s.addEventListener('change',()=>{ SETTINGS.scale=+s.value; saveSettings(); resize(); const nq=SETTINGS.scale<.6?0:SETTINGS.scale<.9?1:2; if(nq!==QUAL){ if(state==='menu'&&NET.role==='solo'){ try{ sessionStorage.setItem('ashfall:skipboot','1'); }catch(e){} location.reload(); } else toast('The new graphics quality fully applies the next time you load the game'); } }); }
{ const s=$('s-diff'); s.value=SETTINGS.diff; if(!s.value){ s.value='vet'; SETTINGS.diff='vet'; } s.addEventListener('change',()=>{ SETTINGS.diff=s.value; saveSettings(); uiSfx('tick'); }); }
if(POST.on) $('vig').style.opacity=.45;
$('best').textContent=BEST?`Best: survived to round ${BEST}`:'No rounds survived yet';
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>labels.forEach(s=>s.userData.draw()));
