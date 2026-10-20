/* ---------- zombie voices and footsteps ----------
   Each zombie gets a persistent "vocal tract": a vowel (three formants), a tract-size scale and a base pitch, so the same zombie
   always sounds like itself. A voice = glottal source (saw + sub-harmonic creak) -> optional grit -> 3 parallel formant filters,
   plus breath noise and optional gurgle (fast amplitude flutter). Voices play through the 6-slot positional voice pool,
   which is also the hard cap on concurrent voices; deaths and attacks may steal the oldest slot. */
const ZV_VOWELS=[[730,1090,2440],[520,1190,2390],[300,870,2240],[570,840,2410],[660,1720,2410],[530,1840,2480],[440,1020,2240]];
function zvTract(z){ if(z._vx) return z._vx; const a=ZV_VOWELS[Math.floor(Math.random()*ZV_VOWELS.length)], b=ZV_VOWELS[Math.floor(Math.random()*ZV_VOWELS.length)];
  return z._vx={a,b,s:rand(.86,1.14),p:rand(.8,1.25),gurgle:Math.random()<.4,rasp:rand(.5,1)}; }
function zvoice(z,kind){ const a=AU.ctx; if(!a||!AU.voice||!z||!z.g||auBusy()) return; const p=z.g.position, dx=p.x-P.pos.x, dz=p.z-P.pos.z, d=Math.hypot(dx,dz,(p.y||0)-(P.pos.y||0)), maxD=kind==='death'?28:kind==='scream'?40:z.boss?44:34; if(d>maxD) return;
  const vol=Math.pow(1-d/maxD,1.35)*(z.boss?1.4:1)*(P.inCabin?.5:1); if(vol<.02) return;
  const pri=kind==='death'||kind==='attack'||z.boss; const em=emitAt(p,d,maxD,'voice',.1,pri); if(!em) return; em.follow=p;
  try{ zvBuild(a,em,z,kind,vol); }catch(e){ AU.errs++; AU.lastErr='zvoice: '+e; } }
function zvBuild(a,em,z,kind,vol){ const t=Math.max(a.currentTime+.005,(em.t0||0)+.002), V=zvTract(z), hound=z.kind==='hound', hollow=z.kind==='hollow'||z.prime, srcs=[];
  let dur,base,end,fa=V.a,fb=V.b,q=7,grit=0,breath=.12,flut=0,sharp=false,att=.12,sub=.25;
  if(hound){ fa=[700,1600,2900]; fb=[500,1300,2600]; q=4; grit=.6;
    if(kind==='death'){ dur=.55; base=420; end=140; breath=.3; sharp=true; att=.01; }
    else if(kind==='attack'){ dur=rand(.18,.28); base=rand(260,320); end=base*.8; breath=.4; sharp=true; att=.008; grit=1; }
    else { dur=rand(.6,1); base=rand(85,110); end=base*.9; flut=rand(22,32); breath=.25; sub=.5; } }
  else if(z.boss){ fa=[380,720,2200]; fb=[340,650,2000]; q=9; grit=.8; sub=.6; dur=kind==='death'?1.9:kind==='attack'?.9:rand(1.2,1.7); base=(kind==='attack'?64:50)*(z.prime?.85:1); end=base*.72; flut=kind==='death'?16:0; att=kind==='attack'?.04:.2; }
  else if(kind==='scream'){ dur=rand(.55,.9); base=rand(220,330)*V.p; end=base*rand(1.05,1.35); q=3.5; grit=1; breath=.45; sharp=true; att=.03; fb=[V.a[0]*1.25,V.a[1]*1.2,V.a[2]*1.1]; sub=.1; }
  else if(kind==='attack'){ dur=rand(.3,.45); base=rand(125,170)*V.p; end=base*.75; grit=.7; breath=.35; sharp=true; att=.025; }
  else if(kind==='death'){ dur=rand(.8,1.2); base=rand(130,165)*V.p; end=48; flut=V.gurgle||Math.random()<.5?rand(14,22):0; breath=.25; att=.04; }
  else { dur=rand(1,1.8); base=rand(70,118)*V.p; end=base*rand(.72,1.15); flut=V.gurgle?rand(9,16):0; grit=V.rasp*.35; }
  if(hollow){ base*=1.3; end*=1.3; }
  const fs=V.s*(hollow?1.08:1), stop=t+dur+.06;
  em.until=t+dur+.15; em.srcs=srcs;
  // optional inhale before a moan (breath realism)
  let t0=t; if(kind==='moan'&&!hound&&!z.boss&&Math.random()<.3){ const s=lN(a,em.inp,t,.45,rand(900,1300),1.4,.05*vol+.01,'bandpass',rand(1800,2400),.25); auTrack(s); srcs.push(s); t0=t+.42; em.until+=.42; }
  const tEnd=t0+dur;
  const out=a.createGain(); out.gain.value=vol; out.connect(em.inp);
  const env=a.createGain(); env.gain.setValueAtTime(.0001,t0); env.gain.exponentialRampToValueAtTime(sharp?.55:.34,t0+att); env.gain.setTargetAtTime(sharp?.3:.26,t0+att,dur*.3); env.gain.exponentialRampToValueAtTime(.0006,tEnd);
  let node=env; if(flut){ const fl=a.createGain(); fl.gain.value=.6; const lfo=a.createOscillator(); lfo.frequency.value=flut; const lg=a.createGain(); lg.gain.value=.4; lfo.connect(lg); lg.connect(fl.gain); lfo.start(t0); lfo.stop(tEnd+.06); auTrack(lfo); srcs.push(lfo); env.connect(fl); node=fl; }
  node.connect(out);
  // glottal source with vibrato/jitter and a sub-harmonic creak
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(base,t0); o.frequency.linearRampToValueAtTime((base+end)/2*rand(.95,1.08),t0+dur*.45); o.frequency.linearRampToValueAtTime(end,tEnd);
  const vib=a.createOscillator(); vib.frequency.value=kind==='death'?rand(11,15):rand(4.5,8); const vg=a.createGain(); vg.gain.value=base*(kind==='death'?.16:kind==='scream'?.05:.06); vib.connect(vg); vg.connect(o.frequency);
  const o2=a.createOscillator(); o2.type='square'; o2.frequency.setValueAtTime(base*.5,t0); o2.frequency.linearRampToValueAtTime(end*.5,tEnd); const g2=a.createGain(); g2.gain.value=sub*.35;
  const src=a.createGain(); o.connect(src); o2.connect(g2); g2.connect(src);
  let exc=src; if(grit>0){ const sh=a.createWaveShaper(); sh.curve=AU.dist; const pre=a.createGain(); pre.gain.value=1+grit*2.5; src.connect(pre); pre.connect(sh); const post=a.createGain(); post.gain.value=.55; sh.connect(post); exc=post; }
  // formants, gliding from vowel a to vowel b
  [[0,1],[1,.6],[2,.28]].forEach(([i,gn])=>{ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q*(i===2?1.4:1); bp.frequency.setValueAtTime(fa[i]*fs,t0); bp.frequency.linearRampToValueAtTime(fb[i]*fs,tEnd);
    const g=a.createGain(); g.gain.value=gn; exc.connect(bp); bp.connect(g); g.connect(env); });
  if(hollow){ const sh=a.createOscillator(); sh.type='sine'; sh.frequency.setValueAtTime(fa[2]*fs*1.5,t0); sh.frequency.linearRampToValueAtTime(fb[2]*fs*1.4,tEnd); const sg=a.createGain(); sg.gain.value=.025; sh.connect(sg); sg.connect(env); sh.start(t0); sh.stop(stop+.42); auTrack(sh); srcs.push(sh); }
  // breath / rasp noise shaped by the first formant
  const n=a.createBufferSource(); n.buffer=AU.noise; const nb=a.createBiquadFilter(); nb.type='bandpass'; nb.frequency.setValueAtTime(fa[1]*fs*1.2,t0); nb.frequency.linearRampToValueAtTime(fb[1]*fs,tEnd); nb.Q.value=1.3;
  const ng=a.createGain(); ng.gain.setValueAtTime(.0001,t0); ng.gain.exponentialRampToValueAtTime(breath,t0+Math.min(.06,att+.02)); ng.gain.exponentialRampToValueAtTime(.0006,tEnd); n.connect(nb); nb.connect(ng); ng.connect(out);
  for(const s of [o,vib,o2]){ s.start(t0); s.stop(tEnd+.06); auTrack(s); srcs.push(s); } n.start(t0,Math.random()*1.5); n.stop(tEnd+.06); auTrack(n); srcs.push(n);
  // wet gurgle burst at the tail of deaths
  if(kind==='death'&&!hound&&!z.boss){ const s=lN(a,em.inp,tEnd-.25,.35,rand(250,420),5,.08*vol+.01,'bandpass',rand(150,220),.05); auTrack(s); srcs.push(s); }
  if(z.boss){ const s=lN(a,em.inp,t0,dur*.8,rand(1100,1300),14,.05*vol,'bandpass',null,.1); auTrack(s); srcs.push(s); } }

// zombie footsteps: subtle, positional, distance-gated, globally rate limited (about 9 a second)
let zsTok=3;
function zSteps(dt){ zsTok=Math.min(3,zsTok+dt*9); const a=AU.ctx; if(typeof zombies==='undefined') return;
  for(const z of zombies){ if(!z||z.dead||!z.g) continue; const p=z.g.position; if(z._fx===undefined||z.rise>0){ z._fx=p.x; z._fz=p.z; z._fd=0; continue; }
    const m=Math.hypot(p.x-z._fx,p.z-z._fz); z._fx=p.x; z._fz=p.z; if(m>3) continue; z._fd+=m; const stride=z.boss?1.5:z.kind==='hound'?.75:.82; if(z._fd<stride) continue; z._fd-=stride;
    const maxD=z.boss?30:17, d=Math.hypot(p.x-P.pos.x,p.z-P.pos.z,(p.y||0)-(P.pos.y||0)); if(d>maxD||zsTok<1||auBusy()) continue; zsTok--;
    const em=emitAt(p,d,maxD,'fx',.35,false); if(!em) continue; const k=Math.pow(1-d/maxD,1.6)*(z.boss?1:.6), t=a.currentTime;
    const sf=typeof surfaceAt==='function'?surfaceAt(p.x,p.z):(mode==='hollow'?'crystal':'mud');
    if(z.boss){ auTrack(lN(a,em.inp,t,.3,300,1,.3*k,'lowpass',70)); auTrack(lT(a,em.inp,t,60,.25,'sine',.35*k,35)); auTrack(lT(a,em.inp,t+.01,rand(380,460),.2,'triangle',.05*k)); }
    else if(z.kind==='hound'){ auTrack(lN(a,em.inp,t,.05,rand(2500,3500),3,.06*k,'bandpass')); auTrack(lN(a,em.inp,t,.07,350,1,.08*k,'lowpass')); }
    else { auTrack(lN(a,em.inp,t,.14,rand(280,380),1.1,.13*k,'lowpass',110)); const dr=sf==='mud'?[900,.04]:sf==='crystal'?[3800,.035]:[1800,.04];
      auTrack(lN(a,em.inp,t+.02,rand(.1,.2),rand(.85,1.15)*dr[0],2,dr[1]*k,'bandpass',dr[0]*.6)); } } }
