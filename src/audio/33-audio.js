/* ---------- audio ---------- */
const AU={ctx:null}; let VOLK=1;
function sfxAt(name,pos,maxD,arg){ const d=Math.hypot(pos.x-P.pos.x,pos.z-P.pos.z); if(d>maxD) return; VOLK=Math.pow(1-d/maxD,1.4); try{ sfx[name](arg); }finally{ VOLK=1; } }
// zombie voices: formant-filtered saw + breath, panned to where the zombie is; at most five at once
let VOICE_N=0;
function zvoice(z,kind){ const a=AU.ctx; if(!a||!AU.master||VOICE_N>=5||P.inCabin) return; const p=z.g.position, dx=p.x-P.pos.x, dz=p.z-P.pos.z, d=Math.hypot(dx,dz), maxD=kind==='death'?26:32; if(d>maxD) return;
  const vol=Math.pow(1-d/maxD,1.5)*(z.boss?1.4:1); if(vol<.02) return;
  const rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw), pan=clamp((dx*rx+dz*rz)/(d||1),-1,1)*.85, t=a.currentTime;
  const out=a.createGain(); out.gain.value=vol; if(a.createStereoPanner){ const sp=a.createStereoPanner(); sp.pan.value=pan; out.connect(sp); sp.connect(AU.master); } else out.connect(AU.master);
  const hound=z.kind==='hound', hollow=z.kind==='hollow'||z.prime; let dur,base,end,f1,f2,q=6;
  if(hound){ if(kind==='death'){dur=.5;base=320;end=120;f1=900;f2=2200;} else if(kind==='attack'){dur=.25;base=260;end=200;f1=1100;f2=2600;} else {dur=.7;base=110;end=95;f1=500;f2=1400;} }
  else if(z.boss){ dur=kind==='death'?1.6:1.1; base=kind==='attack'?70:55; end=base*.7; f1=380; f2=900; }
  else if(kind==='scream'){ dur=rand(.5,.8); base=rand(190,260); end=base*rand(1.1,1.4); f1=rand(800,1000); f2=rand(2000,2600); q=4; }
  else if(kind==='attack'){ dur=.35; base=rand(120,160); end=base*.8; f1=rand(600,800); f2=rand(1300,1700); }
  else if(kind==='death'){ dur=rand(.7,1); base=rand(130,160); end=55; f1=550; f2=1100; }
  else { dur=rand(1,1.7); base=rand(70,115); end=base*rand(.75,1.15); f1=rand(480,750); f2=rand(1050,1450); }
  if(hollow){ base*=1.3; end*=1.3; }
  VOICE_N++; setTimeout(()=>VOICE_N--,dur*1000+60);
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(base,t); o.frequency.linearRampToValueAtTime(end,t+dur);
  const lfo=a.createOscillator(); lfo.frequency.value=kind==='death'?14:rand(5,9); const lg=a.createGain(); lg.gain.value=base*(kind==='death'?.18:.07); lfo.connect(lg); lg.connect(o.frequency);
  const b1=a.createBiquadFilter(); b1.type='bandpass'; b1.frequency.value=f1; b1.Q.value=q; const b2=a.createBiquadFilter(); b2.type='bandpass'; b2.frequency.value=f2; b2.Q.value=q;
  const sharp=kind==='attack'||kind==='scream'; const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(sharp?.5:.32,t+(kind==='attack'?.03:.12)); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
  const n=a.createBufferSource(); n.buffer=AU.noise; const nb=a.createBiquadFilter(); nb.type='bandpass'; nb.frequency.value=f1*1.6; nb.Q.value=1.5; const ng=a.createGain(); ng.gain.setValueAtTime(.0001,t); ng.gain.exponentialRampToValueAtTime(sharp||hound?.35:.12,t+.05); ng.gain.exponentialRampToValueAtTime(.0008,t+dur*.9); n.connect(nb); nb.connect(ng); ng.connect(out);
  o.start(t); lfo.start(t); n.start(t,Math.random()*1.5); o.stop(t+dur+.05); lfo.stop(t+dur+.05); n.stop(t+dur+.05); }
function initAudio(){ if(AU.ctx){ if(AU.ctx.state==='suspended') AU.ctx.resume(); return; }
  try{ const C=window.AudioContext||window.webkitAudioContext; AU.ctx=new C(); }catch(e){ return; }
  const a=AU.ctx; AU.master=a.createGain(); AU.master.gain.value=SETTINGS.vol; AU.master.connect(a.destination);
  const len=a.sampleRate*2; AU.noise=a.createBuffer(1,len,a.sampleRate); const d=AU.noise.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  const src=a.createBufferSource(); src.buffer=AU.noise; src.loop=true;
  const wf=a.createBiquadFilter(); wf.type='lowpass'; wf.frequency.value=420; AU.wind=a.createGain(); AU.wind.gain.value=.07; src.connect(wf); wf.connect(AU.wind); AU.wind.connect(AU.master);
  const rf=a.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=3500; AU.rain=a.createGain(); AU.rain.gain.value=.03; src.connect(rf); rf.connect(AU.rain); AU.rain.connect(AU.master);
  AU.drone=a.createGain(); AU.drone.gain.value=0; AU.drone.connect(AU.master);
  for(const f of [55,55.6,82.4]){ const o=a.createOscillator(); o.type='sine'; o.frequency.value=f; o.connect(AU.drone); o.start(); }
  src.start(); ambienceMode(mode);
}
function ambienceMode(m){ if(!AU.ctx) return; const t=AU.ctx.currentTime, H=m==='hollow', C=m==='cabin'; AU.wind.gain.setTargetAtTime(H?.02:C?.01:.07,t,.5); AU.rain.gain.setTargetAtTime(H||C?0:.03,t,.5); AU.drone.gain.setTargetAtTime(H?.09:C?.05:0,t,.8); }
function nz(dur,freq,q,vol,type='lowpass',delay=0,fEnd){ const a=AU.ctx; if(!a) return; const t=a.currentTime+delay; const s=a.createBufferSource(); s.buffer=AU.noise;
  const f=a.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(freq,t); if(fEnd) f.frequency.exponentialRampToValueAtTime(fEnd,t+dur); f.Q.value=q;
  const g=a.createGain(); g.gain.setValueAtTime(Math.max(.0009,vol*VOLK),t); g.gain.exponentialRampToValueAtTime(.0008,t+dur); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()*1.5); s.stop(t+dur+.05); }
function tn(freq,dur,type,vol,delay=0,fEnd,att=.005){ const a=AU.ctx; if(!a) return; const t=a.currentTime+delay; const o=a.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,t); if(fEnd) o.frequency.exponentialRampToValueAtTime(fEnd,t+dur);
  const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*VOLK),t+att); g.gain.exponentialRampToValueAtTime(.0008,t+dur); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+dur+.05); }
function groan(vol,hi){ const a=AU.ctx; if(!a||vol<.01) return; const t=a.currentTime; const o=a.createOscillator(); o.type='sawtooth'; const base=rand(70,120)*(hi?2.6:1); o.frequency.setValueAtTime(base,t); o.frequency.linearRampToValueAtTime(base*rand(.7,1.2),t+1.1);
  const lfo=a.createOscillator(); lfo.frequency.value=rand(5,9); const lg=a.createGain(); lg.gain.value=base*.06; lfo.connect(lg); lg.connect(o.frequency);
  const f=a.createBiquadFilter(); f.type='bandpass'; f.frequency.value=rand(500,900); f.Q.value=2.5; const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.15); g.gain.exponentialRampToValueAtTime(.0008,t+1.2);
  o.connect(f); f.connect(g); g.connect(AU.master); o.start(t); lfo.start(t); o.stop(t+1.3); lfo.stop(t+1.3); }
const sfx={
  pistol:u=>{ nz(.16,u?3600:2600,.8,.55,'lowpass',0,400); tn(u?220:160,.07,'square',.12,0,50); if(u) tn(900,.12,'sine',.06,0,300); },
  rifle:u=>{ nz(.4,1900,.6,.85,'lowpass',0,180); tn(90,.22,'sine',.38,0,40); if(u) tn(600,.2,'sawtooth',.05,0,150); },
  smg:u=>{ nz(.09,u?3600:3000,.8,.42,'lowpass',0,600); tn(130,.05,'square',.06,0,60); },
  shotgun:u=>{ nz(.5,1400,.5,.95,'lowpass',0,140); tn(70,.28,'sine',.42,0,35); nz(.07,2600,4,.16,'bandpass',.42); nz(.07,1900,4,.16,'bandpass',.55); },
  lmg:u=>{ nz(.13,2300,.7,.52,'lowpass',0,350); tn(110,.07,'square',.1,0,55); },
  rod:u=>{ nz(.32,400,3,.35,'bandpass',0,3200); tn(u?60:90,.28,'sine',.45,0,32); [1318.5,1975.5,2637].forEach((f,i)=>tn(f*(u?.75:1)*(1+rand(-.004,.004)),.5-i*.1,'sine',.09,.02+i*.015)); tn(u?440:880,.6,'triangle',.06,.05,u?1320:1760); if(u){ tn(110,.5,'sawtooth',.08,0,55); nz(.45,700,2,.25,'bandpass',.05,2400); } },
  ion:u=>{ tn(u?520:780,.18,'square',.1,0,u?160:240); nz(.18,3000,2,.3,'bandpass',0,800); tn(u?90:130,.2,'sine',.3,0,60); },
  ionHit:()=>{ nz(.4,1800,1,.45,'bandpass',0,300); tn(240,.3,'sawtooth',.12,0,60); },
  dynamo:u=>{ nz(.6,6000,1.5,.6,'bandpass',0,900); tn(55,.6,'sawtooth',.25,0,40); tn(2400,.3,'square',.06,0,400); nz(1.2,200,1,.3,'lowpass',.1,60); },
  drum:()=>{ nz(.08,180,1,.45,'lowpass'); tn(150,.09,'sine',.25,0,85); },
  chime:()=>{ tn(rand(900,1400),.3,'triangle',.07); },
  toss:()=>{ nz(.2,900,2,.2,'bandpass',0,2400); tn(1600,.05,'square',.03,.05); },
  dry:()=>tn(1500,.03,'square',.07), reload:()=>{ nz(.05,2500,5,.25,'bandpass'); nz(.06,1700,5,.25,'bandpass',.4); },
  swap:()=>nz(.06,2200,4,.14,'bandpass'), buy:()=>{ tn(660,.12,'triangle',.2); tn(990,.25,'triangle',.2,.1); }, deny:()=>tn(150,.25,'square',.1,0,110),
  hit:()=>tn(1900,.035,'square',.035), kill:()=>nz(.14,700,1,.25), swing:()=>nz(.16,900,1,.22,'bandpass',0,3200), stab:()=>{ nz(.12,600,1,.35); tn(120,.1,'sine',.25,0,60); },
  hurt:()=>{ nz(.28,500,1,.5); tn(90,.25,'sawtooth',.14,0,60); },
  roundStart:()=>{ [73.4,110,146.8,220].forEach((f,i)=>tn(f,4.5,'sine',.22-i*.04,i*.02,null,.02)); nz(1.4,180,1,.5,'lowpass',0,60); tn(55,1.6,'sine',.4,0,40); },
  roundEnd:()=>{ [329.6,311.1,293.7,261.6,246.9].forEach((f,i)=>tn(f,.9,'triangle',.13,i*.38)); tn(123.5,3,'sine',.18,1.5); },
  power:()=>{ tn(40,2.4,'sawtooth',.3,0,120,.3); nz(1.8,300,1,.45,'lowpass',0,1200); tn(60,3,'sine',.3,.8); },
  door:()=>{ nz(.9,700,1,.5,'lowpass',0,90); tn(80,.6,'sine',.32,0,40); nz(.2,1800,3,.2,'bandpass',.25); },
  crate:()=>{ [523.3,659.3,784,1046.5,784,659.3,880,1174.7].forEach((f,i)=>tn(f,.5,'triangle',.1,i*.22)); },
  flee:()=>{ tn(220,1.2,'sawtooth',.15,0,55); nz(1,300,1,.4,'lowpass',0,60); },
  forge:()=>{ nz(1.3,400,1,.5,'lowpass',0,2400); tn(110,1.4,'sawtooth',.12,0,440); [0,.7,1.4,2.1,2.8].forEach(d=>{ tn(1250,.5,'triangle',.18,d+.2); nz(.08,5000,3,.25,'bandpass',d+.2); }); tn(523,1.2,'sine',.2,3.4); },
  tonic:()=>{ for(let i=0;i<6;i++) tn(rand(300,520),.12,'sine',.18,i*.13,rand(160,260)); tn(880,.5,'triangle',.12,.9); },
  pup:()=>{ tn(523,.15,'sine',.25); tn(784,.3,'sine',.25,.12); tn(1046,.4,'sine',.2,.24); },
  boss:()=>{ tn(46,2.6,'sawtooth',.32,0,38,.3); nz(2.2,220,1,.32); tn(69,2.2,'square',.08,.2,52,.3); },
  fireball:()=>{ nz(.6,900,1,.35,'lowpass',0,200); },
  relic:()=>{ [880,1108.7,1318.5,1760].forEach((f,i)=>tn(f,1.4,'sine',.1,i*.08)); },
  ignite:()=>{ nz(.8,600,1,.4,'lowpass',0,4000); [440,660,880].forEach((f,i)=>tn(f,1.2,'sine',.12,i*.1)); },
  portal:()=>{ tn(110,3,'sine',.3,0,440,.5); [1318.5,1568,1760,2093].forEach((f,i)=>tn(f,2.5,'sine',.08,.3+i*.15)); nz(2.5,800,1,.3,'bandpass',0,5000); },
  dig:()=>{ nz(.25,500,1,.4); nz(.25,400,1,.35,'lowpass',.3); },
  cannon:u=>{ nz(.7,900,.5,1,'lowpass',0,80); tn(50,.5,'sine',.55,0,28); if(u) tn(320,.4,'sawtooth',.08,0,90); },
  boom:()=>{ nz(1.1,700,.6,1,'lowpass',0,50); tn(42,.9,'sine',.6,0,25); },
  ring:()=>{ tn(1320,.6,'sine',.08); tn(1980,.4,'sine',.05,.02); },
  tone:f=>{ tn(f,2.2,'sine',.28,0,null,.01); tn(f*2,1.2,'triangle',.07); tn(f*3.01,.8,'sine',.03); },
  clash:()=>{ tn(233,1,'sawtooth',.12); tn(247,1,'sawtooth',.12); nz(.5,300,1,.3); },
  wraith:()=>{ tn(900,1.1,'sawtooth',.07,0,300,.05); tn(1210,1,'sine',.08,.05,400); nz(.9,2400,3,.2,'bandpass',0,600); },
  shatter:()=>{ for(let i=0;i<5;i++) tn(rand(1800,3200),.4,'triangle',.07,i*.04); nz(.4,5000,2,.25,'highpass'); },
  howl:()=>{ tn(300,1.8,'sawtooth',.08,0,620,.4); tn(310,1.6,'sine',.12,.1,560,.4); nz(1.6,500,2,.15,'bandpass'); },
  houndSpawn:()=>{ nz(.25,3000,2,.25,'bandpass',0,600); tn(160,.3,'square',.06,0,60); },
  stomp:v=>{ if(v<=.02) return; nz(1.4,260,.7,.9*v,'lowpass',0,40); tn(38,1.2,'sine',.7*v,0,22); },
  tear:()=>{ nz(.25,1800,2,.35,'bandpass',0,500); tn(140,.15,'square',.08,0,70); },
  board:()=>{ nz(.08,900,3,.4,'bandpass'); tn(220,.06,'square',.08); nz(.06,1200,3,.3,'bandpass',.14); },
  bell:()=>{ [220,440.5,553,661,880].forEach((f,i)=>tn(f,3.2-i*.4,'sine',[.22,.12,.08,.06,.04][i],0,null,.004)); },
  candle:()=>{ nz(.4,1200,1,.18,'bandpass',0,3000); tn(660,.6,'sine',.05,.1); },
  zap:u=>{ nz(.22,5200,2,.4,'bandpass',0,1400); tn(1800,.12,'sawtooth',.08,0,300); tn(90,.25,'square',.1,0,50); },
  clang:()=>{ tn(820,.3,'triangle',.18,0,500); nz(.1,3000,4,.2,'bandpass'); },
  thunder:d=>{ nz(2.8,180,.5,.55,'lowpass',d,40); nz(.6,900,.6,.25,'lowpass',d,120); },
  distant:()=>{ nz(1.5,150,.5,.14,'lowpass',.6,40); },
  clank:()=>{ tn(110,.6,'square',.12,0,60); nz(.4,700,2,.4,'bandpass',0,200); tn(440,.3,'triangle',.08,.25); },
  fire:()=>{ nz(1.6,700,.6,.5,'lowpass',0,2400); tn(80,1,'sawtooth',.06,0,160); },
  gameOver:()=>{ [196,185,174.6,146.8].forEach((f,i)=>tn(f,1.8,'triangle',.16,i*.55)); tn(49,4,'sine',.3,.4); },
};
