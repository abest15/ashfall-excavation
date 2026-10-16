/* ---------- front end sound: studio sting and quiet menu sounds (all procedural) ---------- */
// Routes to AU.buses.music / AU.buses.sfx when the audio lane provides them, otherwise to AU.master scaled by SETTINGS.music / SETTINGS.sfx.
function frontBus(kind){ const b=(AU.buses&&AU.buses[kind])||(kind==='music'?AU.music:AU.ui); if(b) return {node:b,k:1,own:false}; return {node:AU.master,k:kind==='music'?SETTINGS.music:SETTINGS.sfx,own:true}; }
const FX={last:{},verb:null};
function fxReady(){ return !!(AU.ctx&&AU.master&&AU.ctx.state==='running'); }
function fxOut(kind,vol){ const a=AU.ctx, bus=frontBus(kind), g=a.createGain(); g.gain.value=vol*bus.k; g.connect(bus.node); return g; }
function fxNoiseBuf(){ const a=AU.ctx; if(AU.noise) return AU.noise; if(!FX.nb){ const len=a.sampleRate; FX.nb=a.createBuffer(1,len,a.sampleRate); const d=FX.nb.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1; } return FX.nb; }
function fxTone(out,f,t,dur,type,vol,fEnd,att){ const a=AU.ctx, o=a.createOscillator(), g=a.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(fEnd) o.frequency.exponentialRampToValueAtTime(fEnd,t+dur);
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+(att||.005)); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+.05); return o; }
function fxNoise(out,t,dur,f,q,vol,type,fEnd,att){ const a=AU.ctx, s=a.createBufferSource(); s.buffer=fxNoiseBuf(); const fl=a.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.setValueAtTime(f,t); if(fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd,t+dur); fl.Q.value=q;
  const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+(att||.004)); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t,Math.random()*.5); s.stop(t+dur+.05); }
// menu sounds: quiet, short, throttled so hovering across a list never stacks up
function uiSfx(name){ if(!fxReady()) return; const now=performance.now(); if(now-(FX.last[name]||0)<(name==='tick'?60:35)) return; FX.last[name]=now;
  try{ const a=AU.ctx, t=a.currentTime+.005, o=fxOut('sfx',1);
    if(name==='move'){ fxTone(o,1750,t,.045,'sine',.035); fxNoise(o,t,.03,4200,3,.02); }
    else if(name==='tick'){ fxTone(o,2600,t,.02,'triangle',.018); }
    else if(name==='confirm'){ fxTone(o,150,t,.16,'sine',.16,70); fxTone(o,880,t+.01,.22,'triangle',.045); fxTone(o,1318.5,t+.05,.3,'sine',.03); fxNoise(o,t,.06,2400,2,.05); }
    else if(name==='open'){ fxNoise(o,t,.2,700,1.4,.06,'bandpass',2600,.05); fxTone(o,1174.7,t+.04,.12,'sine',.025); }
    else if(name==='back'){ fxNoise(o,t,.16,2600,1.4,.05,'bandpass',700,.02); fxTone(o,660,t,.14,'triangle',.035,440); }
    else if(name==='deny'){ fxTone(o,150,t,.18,'square',.03,120); }
    else if(name==='start'){ fxTone(o,90,t,1.2,'sine',.3,38); fxNoise(o,t,.9,300,.8,.22,'lowpass',90); fxNoise(o,t,.7,600,1.2,.05,'bandpass',4000,.5); [146.8,220,293.7].forEach((f,i)=>fxTone(o,f,t+.02*i,1.6,'triangle',.05,null,.2)); }
    setTimeout(()=>o.disconnect(),2200);
  }catch(e){} }
function fxVerb(){ const a=AU.ctx; if(FX.verb) return FX.verb; const len=Math.floor(a.sampleRate*3), ir=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++){ const k=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-k,3.2)*(i<a.sampleRate*.02?i/(a.sampleRate*.02):1); } }
  const cv=a.createConvolver(); cv.buffer=ir; FX.verb=cv; return cv; }
// studio sting, about 4.3 s: match strike, ignition whoosh, furnace thump with a ringing lantern frame, a warm chord swelling out of the fire, embers crackling
function stingPlay(){ if(!AU.ctx||!AU.master) return; try{
  const a=AU.ctx, t0=a.currentTime+.06, out=fxOut('music',.9), dry=a.createGain(), wet=a.createGain(), verb=a.createConvolver();
  verb.buffer=fxVerb().buffer; dry.gain.value=1; wet.gain.value=.55; dry.connect(out); verb.connect(wet); wet.connect(out); const both=a.createGain(); both.connect(dry); both.connect(verb);
  fxNoise(both,t0,.09,5200,1.2,.22,'highpass'); fxTone(both,3100,t0,.05,'square',.03); fxNoise(both,t0+.12,.06,4400,2,.08,'bandpass');
  fxNoise(dry,t0+.08,.72,260,.9,.32,'lowpass',4200,.55);
  const T=t0+.72;
  fxTone(dry,74,T,1.7,'sine',.75,33,.01); fxNoise(dry,T,1,180,.7,.5,'lowpass',60,.01);
  [[392,.06],[1083,.04],[2117,.025],[3460,.015]].forEach(([f,v],i)=>fxTone(both,f,T+.01,2.4-i*.4,'triangle',v));
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=.8; lp.frequency.setValueAtTime(380,T); lp.frequency.exponentialRampToValueAtTime(1900,T+1.5); lp.frequency.exponentialRampToValueAtTime(700,T+3.4); lp.connect(both);
  const pad=a.createGain(); pad.gain.setValueAtTime(.0001,T); pad.gain.exponentialRampToValueAtTime(1,T+.9); pad.gain.setValueAtTime(1,T+2.3); pad.gain.exponentialRampToValueAtTime(.0001,T+3.6); pad.connect(lp);
  [73.42,110,146.83,174.61,220,329.63].forEach(f=>{ for(const det of [-6,6]){ const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=det; const g=a.createGain(); g.gain.value=f<100?.05:.032; o.connect(g); g.connect(pad); o.start(T); o.stop(T+3.7); } });
  fxTone(both,1174.66,T+.65,2.2,'sine',.03,null,.25); fxTone(both,1760,T+.85,1.8,'sine',.018,null,.3);
  for(let i=0;i<34;i++){ const tt=T+.1+Math.random()*2.9; fxNoise(dry,tt,.012+Math.random()*.02,1500+Math.random()*4500,2,.02+Math.random()*.06,'bandpass'); }
  setTimeout(()=>{ try{ out.disconnect(); }catch(e){} },6500);
}catch(e){} }
