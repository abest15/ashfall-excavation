/* ---------- audio engine: mixer buses, master dynamics, reverb zones, 3D emitters ----------
   Signal flow
     sources -> fx | ui | voice | amb buses -> sfx group (SETTINGS.sfx) ----\
     fx + voice + emitter wet sends -> verbIn -> A/B convolvers -> sfx group  >-> mix -> glue comp -> limiter -> master (SETTINGS.vol) -> soft clip -> out
     score + stingers + menu music -> music bus (SETTINGS.music) ------------/
   All impulse responses and samples are synthesized at runtime; there are no audio files. */
const AU={ctx:null,live:0,peakLive:0,errs:0,lastErr:'',area:null,out:null,em:null,hint:null,vols:{m:-1,s:-1,v:-1},cvA:0,ir:{},emFx:[],emVo:[]};
let VOLK=1;
const AU_MAXLIVE=240; // hard cap on concurrently playing source nodes (oscillators + buffer sources)
const auVols=()=>({m:SETTINGS.music==null?.8:clamp(+SETTINGS.music||0,0,1), s:SETTINGS.sfx==null?1:clamp(+SETTINGS.sfx||0,0,1), v:SETTINGS.vol==null?.7:clamp(+SETTINGS.vol||0,0,1)});
// live one-shot sources: a Set holds a strong ref (so 'ended' always fires) plus a start time, and
// anything older than AU_MAXAGE is pruned in audioFrame so a lost 'ended' can never wedge the cap
const AU_LIVE=new Map(), AU_MAXAGE=12;
function auTrack(s){ AU_LIVE.set(s,AU.ctx?AU.ctx.currentTime:0); AU.live=AU_LIVE.size; if(AU.live>AU.peakLive) AU.peakLive=AU.live; s.onended=auEnded; return s; }
function auEnded(){ AU_LIVE.delete(this); AU.live=AU_LIVE.size; }
function auPrune(t){ for(const [s,t0] of AU_LIVE){ if(t-t0>AU_MAXAGE) AU_LIVE.delete(s); } AU.live=AU_LIVE.size; }
const auBusy=()=>AU.live>=AU_MAXLIVE;
const auDst=()=>AU.em||AU.out||AU.fx;

// ---- low-level layers, usable on the live context or an OfflineAudioContext (weapon pre-rendering)
function lN(c,dst,t,dur,f,q,vol,type,fEnd,att,off){ const s=c.createBufferSource(); s.buffer=AU.noise;
  const fl=c.createBiquadFilter(); fl.type=type||'lowpass'; fl.frequency.setValueAtTime(f,t); if(fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd,t+dur); fl.Q.value=q;
  const g=c.createGain(); if(att){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+att); } else g.gain.setValueAtTime(Math.max(.0002,vol),t); g.gain.exponentialRampToValueAtTime(.0003,t+dur);
  s.connect(fl); fl.connect(g); g.connect(dst); s.start(t,off==null?Math.random()*1.6:off); s.stop(t+dur+.03); return s; }
function lT(c,dst,t,f,dur,type,vol,fEnd,att){ const o=c.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); if(fEnd) o.frequency.exponentialRampToValueAtTime(fEnd,t+dur);
  const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+(att||.004)); g.gain.exponentialRampToValueAtTime(.0003,t+dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t+dur+.03); return o; }
// legacy helpers used by the sfx table: route to the current bus / emitter and honour VOLK
function nz(dur,freq,q,vol,type='lowpass',delay=0,fEnd){ const a=AU.ctx; if(!a||!AU.fx||auBusy()) return; auTrack(lN(a,auDst(),a.currentTime+delay,dur,freq,q,Math.max(.0009,vol*VOLK),type,fEnd)); }
function tn(freq,dur,type,vol,delay=0,fEnd,att=.005){ const a=AU.ctx; if(!a||!AU.fx||auBusy()) return; auTrack(lT(a,auDst(),a.currentTime+delay,freq,dur,type,Math.max(.0002,vol*VOLK),fEnd,att)); }

// ---- synthesized impulse responses per area
const IRDEF={
  open:  {len:1.5,rt:1.0, pre:.012,er:5, erSpan:.07,damp:3200,width:1,  wet:.16},  // trenches, yard, No Man's Land: short, wide, dry earth
  bunker:{len:.9, rt:.55, pre:.004,er:9, erSpan:.03,damp:2600,width:.75,wet:.24},  // spawn bunker: small timber-and-earth room
  chapel:{len:4.2,rt:3.4, pre:.024,er:12,erSpan:.1, damp:4800,width:.95,wet:.36},  // long stone hall
  cabin: {len:.7, rt:.42, pre:.002,er:14,erSpan:.016,damp:7500,width:.55,wet:.3,ring:[540,1260,1910,2870]}, // tight riveted iron box
  hollow:{len:6.8,rt:5.6, pre:.06, er:9, erSpan:.22,damp:2400,width:1,  wet:.46},  // huge crystal cavern
};
function makeIR(name){ const a=AU.ctx, D=IRDEF[name], sr=a.sampleRate, len=Math.floor(Math.min(D.len,QUAL===0?2.6:D.len)*sr), b=a.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); let y=0, k=.5, alt=0;
    for(let i=0;i<len;i++){ const t=i/sr; if((i&63)===0){ const fc=300+D.damp*Math.exp(-t/(D.rt*.45)); k=1-Math.exp(-2*Math.PI*fc/sr); }
      const n=Math.random()*2-1, m=ch?D.width*n+(1-D.width)*alt:n; alt=n; y+=k*(m-y); const env=t<D.pre?0:Math.exp(-6.9*(t-D.pre)/D.rt)*Math.min(1,(t-D.pre)/.004+.02); d[i]=y*env*1.6; }
    for(let e=0;e<D.er;e++){ const t=D.pre+Math.random()*D.erSpan, i=Math.floor(t*sr); if(i<len) d[i]+=(Math.random()<.5?-1:1)*rand(.25,.7)*Math.exp(-t*6/D.rt); }
    if(D.ring) for(const f of D.ring){ const w=2*Math.PI*f*(1+(ch?.004:-.004))/sr, n=Math.min(len,Math.floor(.35*sr)); for(let i=0;i<n;i++) d[i]+=Math.sin(w*i)*.05*Math.exp(-i/sr*11); } }
  return b; }
function irFor(name){ return AU.ir[name]||(AU.ir[name]=makeIR(name)); }
function setArea(name){ if(!AU.cv||AU.area===name) return; AU.area=name; const a=AU.ctx, t=a.currentTime, cur=AU.cv[AU.cvA], nxt=AU.cv[1-AU.cvA];
  if(nxt.area!==name){ nxt.c.buffer=irFor(name); nxt.area=name; }
  cur.g.gain.setTargetAtTime(0,t,.25); nxt.g.gain.setTargetAtTime(1,t,.25); AU.cvA=1-AU.cvA; AU.wet.gain.setTargetAtTime(IRDEF[name].wet,t,.3); }
function areaNow(){ if(mode==='hollow') return 'hollow'; if(P.inCabin) return 'cabin'; if(state==='menu') return 'open'; const z=zoneOf(P.pos.x,P.pos.z); return z==='E'?'chapel':z==='A'?'bunker':'open'; }

// ---- 3D emitters: a fixed pool of panner chains (bounded node count); sounds are routed into one for their lifetime
function mkEmitter(bus,hrtf){ const a=AU.ctx, inp=a.createGain(), lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=18000; lp.Q.value=.5;
  const pn=a.createPanner(); pn.panningModel=hrtf?'HRTF':'equalpower'; pn.distanceModel='linear'; pn.refDistance=1; pn.maxDistance=1e4; pn.rolloffFactor=0;
  const wet=a.createGain(); wet.gain.value=0; inp.connect(lp); lp.connect(pn); pn.connect(bus); lp.connect(wet); wet.connect(AU.verbIn); return {inp,lp,pn,wet,until:0,follow:null,srcs:null}; }
function auPos(pn,x,y,z){ if(pn.positionX){ pn.positionX.value=x; pn.positionY.value=y; pn.positionZ.value=z; } else pn.setPosition(x,y,z); }
function occlusion(x,z){ if(mode==='hollow') return 0; if(P.inCabin) return .75; const a=zoneOf(P.pos.x,P.pos.z), b=zoneOf(x,z); if(a===b) return 0;
  if(a&&b){ let open=false; try{ open=typeof route==='function'&&!!route(a,b); }catch(e){} return open?.35:.7; } return (a==='A'||a==='E'||b==='A'||b==='E')?.5:.15; }
// claim an emitter at world position pos; d = distance, maxD = audible range (0 = no extra attenuation). Returns the emitter or null.
function emitAt(pos,d,maxD,pool,dur,steal){ const a=AU.ctx; if(!a||!AU.emFx.length) return null; const list=pool==='voice'?AU.emVo:AU.emFx, t=a.currentTime;
  let em=null; for(const e of list) if(e.until<=t){ em=e; break; }
  if(!em){ if(!steal) return null; em=list.reduce((p,q)=>q.until<p.until?q:p); if(em.srcs) for(const s of em.srcs){ try{ s.stop(t+.02); }catch(e){} } }
  em.until=t+dur; em.follow=null; em.srcs=null; em.proj=null; auPos(em.pn,pos.x,(pos.y||0)+1.2,pos.z);
  const r=maxD?clamp(d/maxD,0,1):clamp(d/90,0,1), occ=occlusion(pos.x,pos.z);
  em.lp.frequency.setValueAtTime(Math.max(320,17000*Math.pow(.1,r*1.15)*(1-occ*.82)),t);
  em.wet.gain.setValueAtTime(.12+r*.9+occ*.4,t); em.inp.gain.setValueAtTime(1-occ*.4,t); return em; }

// positional one-shot: plays sfx[name](arg) at pos with distance attenuation, panning, distance low-pass and occlusion
function sfxAt(name,pos,maxD,arg){ if(!AU.ctx||!AU.fx||!sfx[name]) return; const d=Math.hypot(pos.x-P.pos.x,pos.z-P.pos.z); if(d>maxD) return;
  const k=Math.pow(1-d/maxD,1.4); if(k<.01) return; const em=emitAt(pos,d,maxD,'fx',2.5,true), pk=VOLK, pe=AU.em; VOLK=k; AU.em=em?em.inp:null;
  try{ sfx[name](arg); }finally{ VOLK=pk; AU.em=pe; } }

function initAudio(){ if(AU.ctx){ if(AU.ctx.state==='suspended') AU.ctx.resume(); return; }
  try{ const C=window.AudioContext||window.webkitAudioContext; AU.ctx=new C({latencyHint:'interactive'}); }catch(e){ return; }
  const a=AU.ctx, V=auVols();
  // master: mix -> glue compressor -> brickwall-ish limiter -> master volume -> soft clipper -> speakers
  AU.mix=a.createGain(); AU.mix.gain.value=.62; // headroom trim; the compressors' automatic make-up gain brings level back
  const comp=a.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=10; comp.ratio.value=3; comp.attack.value=.005; comp.release.value=.25;
  const lim=a.createDynamicsCompressor(); lim.threshold.value=-4; lim.knee.value=1; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.1;
  AU.master=a.createGain(); AU.master.gain.value=V.v; const clip=a.createWaveShaper(); const cc=new Float32Array(1024); for(let i=0;i<1024;i++){ const x=i/511.5-1, ax=Math.abs(x); cc[i]=ax<.8?x:Math.sign(x)*(.8+.2*Math.tanh((ax-.8)/.2)); } clip.curve=cc;
  AU.mix.connect(comp); comp.connect(lim); lim.connect(AU.master); AU.master.connect(clip); clip.connect(a.destination); AU.comp=comp; AU.lim=lim; AU.clip=clip;
  // buses
  AU.music=a.createGain(); AU.music.gain.value=V.m; AU.music.connect(AU.mix);
  AU.sfxG=a.createGain(); AU.sfxG.gain.value=V.s; AU.sfxG.connect(AU.mix);
  AU.fx=a.createGain(); AU.fx.connect(AU.sfxG); AU.ui=a.createGain(); AU.ui.gain.value=.85; AU.ui.connect(AU.sfxG);
  AU.voice=a.createGain(); AU.voice.gain.value=.9; AU.voice.connect(AU.sfxG); AU.amb=a.createGain(); AU.amb.connect(AU.sfxG);
  AU.vols={m:V.m,s:V.s,v:V.v};
  // reverb: sends -> high-pass -> area wet level -> two convolvers crossfaded on area change -> sfx group
  AU.verbIn=a.createGain(); const hp=a.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180; AU.wet=a.createGain(); AU.wet.gain.value=.16;
  AU.verbIn.connect(hp); hp.connect(AU.wet); AU.verbOut=a.createGain(); AU.verbOut.connect(AU.sfxG);
  AU.cv=[0,1].map(()=>{ const c=a.createConvolver(), g=a.createGain(); g.gain.value=0; AU.wet.connect(c); c.connect(g); g.connect(AU.verbOut); return {c,g,area:null}; });
  const fxs=a.createGain(); fxs.gain.value=.55; AU.fx.connect(fxs); fxs.connect(AU.verbIn); const vos=a.createGain(); vos.gain.value=.6; AU.voice.connect(vos); vos.connect(AU.verbIn);
  AU.gunSend=a.createGain(); AU.gunSend.gain.value=.7; AU.gunSend.connect(AU.verbIn);
  // shared buffers, computed once
  const len=a.sampleRate*2; AU.noise=a.createBuffer(1,len,a.sampleRate); const d=AU.noise.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  AU.dist=new Float32Array(512); for(let i=0;i<512;i++){ const x=i/255.5-1; AU.dist[i]=Math.tanh(x*3.2)/Math.tanh(3.2); }
  // emitter pools
  const hrtf=QUAL>=1; for(let i=0;i<(QUAL?14:10);i++) AU.emFx.push(mkEmitter(AU.fx,hrtf)); for(let i=0;i<6;i++) AU.emVo.push(mkEmitter(AU.voice,hrtf));
  // ambience beds
  const src=a.createBufferSource(); src.buffer=AU.noise; src.loop=true;
  const wf=a.createBiquadFilter(); wf.type='lowpass'; wf.frequency.value=420; AU.wind=a.createGain(); AU.wind.gain.value=.07; src.connect(wf); wf.connect(AU.wind); AU.wind.connect(AU.amb);
  const wl=a.createOscillator(); wl.frequency.value=.07; const wlg=a.createGain(); wlg.gain.value=160; wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
  const rf=a.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=3500; AU.rain=a.createGain(); AU.rain.gain.value=.03; src.connect(rf); rf.connect(AU.rain); AU.rain.connect(AU.amb);
  AU.drone=a.createGain(); AU.drone.gain.value=0; AU.drone.connect(AU.amb);
  for(const f of [55,55.6,82.4]){ const o=a.createOscillator(); o.type='sine'; o.frequency.value=f; o.connect(AU.drone); o.start(); }
  const ff=a.createBiquadFilter(); ff.type='bandpass'; ff.frequency.value=160; ff.Q.value=.8; AU.furnace=a.createGain(); AU.furnace.gain.value=0; src.connect(ff); ff.connect(AU.furnace); AU.furnace.connect(AU.amb);
  src.start(); setArea('open'); ambienceMode(mode);
  if(typeof gunWarm==='function') gunWarm('pistol',false);
}
function ambienceMode(m){ if(!AU.ctx) return; const t=AU.ctx.currentTime, H=m==='hollow', C=m==='cabin'; AU.wind.gain.setTargetAtTime(H?.025:C?.01:.07,t,.5); AU.rain.gain.setTargetAtTime(H||C?0:.03,t,.5); AU.drone.gain.setTargetAtTime(H?.08:C?.04:0,t,.8); AU.furnace.gain.setTargetAtTime(C?.16:0,t,.6); }

// ---- per-frame update (called from the main loop): volumes, listener, reverb area, world one-shots, score
const _auF=new V3(), _auU=new V3(); let auPrevState='menu', auAmbT=3;
function audioFrame(dt){ const a=AU.ctx; if(!a||!AU.fx) return; const t=a.currentTime; auPrune(t);
  try{
    const V=auVols(), o=AU.vols; if(V.m!==o.m){ AU.music.gain.setTargetAtTime(V.m,t,.05); o.m=V.m; } if(V.s!==o.s){ AU.sfxG.gain.setTargetAtTime(V.s,t,.05); o.s=V.s; } if(V.v!==o.v){ AU.master.gain.setTargetAtTime(V.v,t,.05); o.v=V.v; }
    // route the title-screen music through the music bus so the Music slider applies to it too
    if(typeof MUS!=='undefined'&&MUS.g&&MUS.g._auRouted!==true){ try{ MUS.g.disconnect(); }catch(e){} MUS.g.connect(AU.music); MUS.g._auRouted=true; }
    const L=a.listener, c=camera.position; _auF.set(0,0,-1).applyQuaternion(camera.quaternion); _auU.set(0,1,0).applyQuaternion(camera.quaternion);
    if(L.positionX){ L.positionX.value=c.x; L.positionY.value=c.y; L.positionZ.value=c.z; L.forwardX.value=_auF.x; L.forwardY.value=_auF.y; L.forwardZ.value=_auF.z; L.upX.value=_auU.x; L.upY.value=_auU.y; L.upZ.value=_auU.z; }
    else { L.setPosition(c.x,c.y,c.z); L.setOrientation(_auF.x,_auF.y,_auF.z,_auU.x,_auU.y,_auU.z); }
    for(const e of AU.emFx.concat(AU.emVo)){ if(e.proj&&(typeof projs==='undefined'||projs.indexOf(e.proj)<0)){ if(e.srcs) for(const s of e.srcs){ try{ s.stop(t+.06); }catch(er){} } e.proj=null; e.follow=null; e.srcs=null; e.until=Math.min(e.until,t+.1); }
      if(e.follow&&e.until>t){ const p=e.follow; auPos(e.pn,p.x,(p.y||0)+1.4,p.z); } }
    setArea(areaNow());
    if(state==='play'){ if(typeof zSteps==='function') zSteps(dt); auWorld(dt); }
    if(typeof gunPrefetch==='function') gunPrefetch(dt);
    if(typeof MX!=='undefined') MX.update(dt,auPrevState);
    auPrevState=state;
  }catch(e){ AU.errs++; AU.lastErr=String(e&&e.stack||e); } }
// world one-shots: boss projectile whooshes, crystal drips in the Hollow, creaks in the chapel
function auWorld(dt){ const a=AU.ctx, t=a.currentTime;
  if(typeof projs!=='undefined') for(const q of projs){ if(q._au) { if(q._au.until>t) q._au.follow=q.m.position; continue; } const p=q.m.position, d=Math.hypot(p.x-P.pos.x,p.z-P.pos.z); if(d>40) continue;
    const em=emitAt(p,d,40,'fx',Math.min(5,q.life),false); if(!em) continue; q._au=em; em.follow=p; em.proj=q; const k=Math.pow(1-d/40,1.1), dur=Math.min(4,q.life);
    const s=lN(a,em.inp,t,dur,700,2,.22*k+.05,'bandpass',300,.15), o=lT(a,em.inp,t,62,dur,'sawtooth',.06*k+.02,48,.2); auTrack(s); auTrack(o); em.srcs=[s,o]; }
  auAmbT-=dt; if(auAmbT>0) return; const area=AU.area;
  if(area==='hollow'){ auAmbT=rand(1.2,3.5); const ang=rand(0,6.28), r=rand(6,22), pos={x:P.pos.x+Math.cos(ang)*r,y:rand(2,6),z:P.pos.z+Math.sin(ang)*r}, em=emitAt(pos,r,30,'fx',2,false); if(!em||auBusy()) return;
    const f=rand(1400,3200); auTrack(lT(a,em.inp,t,f,1.2,'sine',.06,null,.002)); auTrack(lT(a,em.inp,t,f*2.71,.5,'sine',.025,null,.002)); }
  else if(area==='chapel'){ auAmbT=rand(5,11); const pos={x:45+rand(-12,12),y:4,z:17+rand(-10,10)}, em=emitAt(pos,10,30,'fx',2,false); if(!em||auBusy()) return; auTrack(lN(a,em.inp,t,.9,rand(300,520),9,.05,'bandpass',rand(260,600),.2)); }
  else if(area==='cabin'){ auAmbT=rand(.7,1.6); if(auBusy()) return; const prev=AU.out; AU.out=AU.amb; tn(rand(900,1500),.05,'square',.015); nz(.08,2500,6,.03,'bandpass'); AU.out=prev; }
  else auAmbT=rand(3,6); }
