/* ---------- quest sounds: breakers, generator, puzzles, special dead, the vault, the four staffs (procedural, original) ----------
   Names and arguments are the quest lane's contract (qSound / sfxAt / sfx.* calls in src/gameplay/16*, 19b-19f); keep them.
   Positional calls arrive through sfxAt, which places them in 3D on the right floor (33-audio.js). */
// small builders on the current bus / emitter (they honour VOLK and the live-source cap like nz/tn)
function qN(dur,f,q,v,type,dl,fEnd,att){ const a=AU.ctx; if(!a||!AU.fx||auBusy()) return; auTrack(lN(a,auDst(),a.currentTime+(dl||0),dur,f,q,Math.max(.0009,v*VOLK),type||'lowpass',fEnd,att)); }
function qT(f,dur,type,v,dl,fEnd,att){ const a=AU.ctx; if(!a||!AU.fx||auBusy()) return; auTrack(lT(a,auDst(),a.currentTime+(dl||0),f,dur,type,Math.max(.0002,v*VOLK),fEnd,att)); }
// formant "voice": a buzzy source through two vowel bands (radio voices, choir notes); no words, just the colour of a voice
function qVoice(f0,dur,f1,f2,v,dl,fEnd){ const a=AU.ctx; if(!a||!AU.fx||auBusy()) return; const t=a.currentTime+(dl||0), dst=auDst();
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(f0,t); if(fEnd) o.frequency.linearRampToValueAtTime(fEnd,t+dur);
  const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,v*VOLK),t+Math.min(.06,dur*.3)); g.gain.exponentialRampToValueAtTime(.0003,t+dur);
  for(const [f,gn] of [[f1,1],[f2,.5]]){ const b=a.createBiquadFilter(); b.type='bandpass'; b.frequency.value=f; b.Q.value=8; const bg=a.createGain(); bg.gain.value=gn; o.connect(b); b.connect(bg); bg.connect(g); }
  g.connect(dst); o.start(t); o.stop(t+dur+.03); auTrack(o); }
function qSparks(n,span,v,dl){ for(let i=0;i<n;i++){ const d=(dl||0)+Math.random()*span; qN(.012+Math.random()*.02,rand(2500,7000),3,v*rand(.5,1),'bandpass',d); if(Math.random()<.4) qT(rand(1500,3500),.03,'square',v*.15,d); } }
// keep the emitter this sound plays on for longer than the default 2.5 s (long positional sounds)
function qHold(sec){ if(!AU.em||!AU.ctx) return; const t=AU.ctx.currentTime; for(const e of AU.emFx) if(e.inp===AU.em) e.until=Math.max(e.until,t+sec); }

Object.assign(sfx,{
  // ---- power: unthrown breaker hum (mains buzz + crackle), breaker throw, alarm line, rusted housing, generator crank and spin-up
  hum:()=>{ qT(60,2.2,'sawtooth',.035,0,null,.3); qT(120,2,'sine',.04,0,null,.3); qT(180,1.8,'square',.008,0,null,.3); qN(2,240,6,.02,'bandpass',0,null,.4); qSparks(2,1.8,.05); },
  breaker:()=>{ clk(1800,.25); qT(85,.28,'sine',.35,0,42,.003); [420,1130,1870].forEach((f,i)=>qT(jt(f),.4-i*.1,'triangle',[.06,.035,.02][i],.01));
    qT(1800,.12,'sawtooth',.06,.03,300); qSparks(9,.45,.14,.02); qN(.3,2600,2,.18,'bandpass',.03,600); qT(55,1.6,'sawtooth',.1,.15,110,.25); qT(110,1.4,'sine',.05,.2,220,.3); },
  alarm:()=>{ qHold(4); for(let i=0;i<3;i++){ const d=i*1.2; qT(480,.6,'sawtooth',.07,d,760,.05); qT(760,.6,'sawtooth',.07,d+.6,480,.02); qT(240,1.2,'square',.02,d,380,.05); } qT(1200,.08,'square',.03,0); },
  jam:n=>{ const k=1+(n||1)*.04; [310,860,1390].forEach((f,i)=>qT(f*k*jt(1),.22-i*.05,'triangle',[.14,.07,.04][i])); qN(.25,1800,3,.3,'bandpass',0,400); qN(.35,900,1.5,.12,'bandpass',.04,500); qSparks(4,.15,.12); },
  crank:()=>{ qHold(3.4); let d=0; for(let i=0;i<18;i++){ clk(rand(900,1500),.1,d); d+=Math.max(.07,.2-i*.008); }
    [1,1.9,2.6].forEach((c,i)=>{ qN(.35,260,.8,.32+i*.06,'lowpass',c,70); qT(42+i*4,.3,'sawtooth',.12,c,30,.01); }); qT(80,3,'sine',.08,0,220,.4); },
  // the generator catches: chugs accelerating into a steady drone, turbine whine, relays clunk, lamps hum up
  power:()=>{ qHold(4); let d=0; for(let i=0;i<9;i++){ qN(.18,300,.9,.3,'lowpass',d,80); qT(45,.2,'sawtooth',.12,d,34,.01); d+=Math.max(.11,.38-i*.035); }
    qT(48,3.2,'sawtooth',.14,.4,62,.6); qT(96,3,'square',.025,.6,124,.6); qT(300,2.6,'sine',.04,.3,1400,.8); [1.6,2,2.4].forEach(c=>clk(rand(1500,2600),.1,c)); qT(120,2.2,'sine',.06,1.4,null,.5); qN(1.8,300,1,.25,'lowpass',0,1200); },
  // ---- puzzle 1: pressure manifold
  valve:n=>{ qN(.28,900,15,.12,'bandpass',0,1300); for(let i=0;i<3;i++) clk(rand(1400,1900),.1,.05+i*.07); qT(1500+(n||1)*120,.03,'square',.03,.26); qT(220+(n||1)*40,.18,'triangle',.06,.24); qN(.3,4000,1,.04,'highpass',.1); },
  steam:ok=>{ if(ok){ qN(1.6,2600,1.2,.35,'bandpass',0,5000,.02); qN(1.4,5000,1,.12,'highpass',.15,2000); qT(120,.12,'sine',.2,.05,70); [523.3,659.3,784].forEach((f,i)=>qT(f,.9,'sine',.07,.35+i*.12)); }
    else { qN(2,1500,.8,.45,'highpass',0,800,.01); qN(1.4,500,.8,.25,'lowpass',0,120); qT(70,.6,'sawtooth',.14,0,45); qT(jt(640),.3,'triangle',.08,.02,420); } },
  // ---- puzzle 2: field radio (dial sweep, static, an answering voice, morse)
  tune:()=>{ qN(.35,rand(1200,3200),4,.12,'bandpass',0,rand(900,4000)); qT(rand(900,1400),.3,'sine',.03,0,rand(2200,3000)); clk(2200,.12); qSparks(3,.3,.04); },
  static:loud=>{ qN(loud?1.2:.6,2400,.6,loud?.3:.16,'bandpass',0,1200); qSparks(loud?10:5,loud?1.1:.55,.06);
    if(loud){ qT(2800,.9,'sine',.05,.1,3100,.05); qT(1400,.8,'sawtooth',.02,.15,900,.1); } },
  morse:n=>{ qHold(3.5); qN(1.6,2000,.7,.05,'bandpass',0,1600); const syl=4+(n||1); let d=.05;
    for(let i=0;i<syl;i++){ const len=rand(.1,.22); qVoice(rand(105,140),len,rand(500,800),rand(1100,1900),.09,d,rand(95,150)); d+=len+rand(.03,.09); }
    const pat=[.08,.08,.24,.08,.24,.24].slice(0,3+(n||1)); d+=.15; for(const x of pat){ qT(700,x,'sine',.1,d); d+=x+.07; } },
  flare:()=>{ qHold(3); qN(.5,900,1,.3,'bandpass',0,5000); qT(400,.5,'sine',.05,0,1600); qN(.06,3000,1,.3,'bandpass',.5); qN(2,2500,.7,.12,'bandpass',.55,1800); qSparks(8,1.8,.05,.6); },
  // ---- puzzle 3: glyph strongbox
  dial:()=>{ clk(3200,.18); qT(880,.06,'triangle',.05); qT(2640,.05,'sine',.015,.004); },
  unlock:()=>{ [0,.09,.18].forEach(d=>clk(rand(1800,2600),.2,d)); qN(.25,1200,2,.12,'bandpass',.28,700); qN(.8,320,18,.1,'bandpass',.5,240); qT(110,.35,'sine',.25,.3,55); qN(.8,700,1,.25,'lowpass',.32,90); },
  // ---- puzzle 4: soul canisters (k = fill 0..1)
  soul:k=>{ const f=330+(k||0)*550; qT(f,.7,'sine',.07,0,f*1.5,.05); qT(f*1.5,.6,'sine',.03,.08,f*2,.05); qN(.5,1400,5,.05,'bandpass',0,3000,.15); qN(.3,5000,6,.04,'bandpass'); },
  // ---- puzzle 5: music box (a plucked steel comb in a wooden box), singing bowls, brazier ignition
  mbox:f=>{ const a=f*2; qT(a,1.1,'sine',.1,0,null,.002); qT(a*5.4,.18,'sine',.02,0,null,.001); qT(a*2,.5,'triangle',.02,0,null,.002); qT(a*.5,.6,'sine',.02,.004,null,.004); clk(5200,.04); },
  bowl:f=>{ qT(f,2.6,'sine',.06,0,null,.08); qT(f*1.004,2.6,'sine',.04,0,null,.1); qT(f*2.71,1.4,'sine',.018,0,null,.08); qT(f*5.1,.6,'sine',.006,0,null,.05); },
  brazier:f=>{ qN(.12,400,1,.4,'lowpass',0,3200,.03); qN(.9,700,.8,.3,'lowpass',.05,2400); qSparks(8,1.2,.05,.1); qT(f,2.6,'sine',.12,.1,null,.02); qT(f*2.01,1.4,'triangle',.04,.1); qT(f*2.71,1,'sine',.015,.1); },
  // ---- special dead and the vault
  shriek:()=>{ qT(900,1.1,'sawtooth',.11,0,1800,.02); qT(1340,1,'square',.04,.05,2400); qN(1,3800,2,.22,'bandpass',0,6000); qVoice(420,1,900,2600,.12,0,700); qT(160,.9,'sawtooth',.07,0,90); },
  tick:()=>{ clk(4200,.22); qT(1800,.03,'square',.04); },
  hymn:f=>{ qHold(2); for(const det of [-7,0,7]) qVoice(f*(1+det/1200),1.7,700,1150,.05,0); qT(f/2,1.8,'triangle',.05,0,null,.3); qT(f*2,1.2,'sine',.015,.1,null,.4); },
  vaultOpen:()=>{ qHold(4.5); let d=0; for(let i=0;i<7;i++){ clk(rand(500,1100),.3,d); d+=.18+i*.06; } qN(3.4,380,.8,.4,'lowpass',.2,120); qN(3,2400,.6,.06,'bandpass',.5,600);
    qT(38,3.6,'sawtooth',.2,0,60,.4); qT(46,1.4,'sine',.5,2.6,32,.01); qN(1.6,500,1,.35,'lowpass',2.6,70); qN(2.2,1200,.7,.12,'bandpass',2.8,300); },
});

// ---- the four staffs. Primary fire is pre-rendered like the guns (GUNP + GUN_FN recipe, round-robin variations, forged layer when upgraded).
Object.assign(GUNP,{
  cinder:{len:1.05,lv:.66,fn:'cinder',fg:330},  // molten slag: whumph, roar, crackle, sizzle
  brine: {len:.95, lv:.66, fn:'brine', fg:520},  // tidal pressure: jet hiss, deep thoomp, bubbles, wash
  grave: {len:.5,  lv:.46,fn:'grave', fg:740,auto:1}, // soul drain: beating tones, ghost inhale, tether snap
  gale:  {len:.85, lv:.66,fn:'gale',  fg:1480}, // glass storm: whoosh, shards, shimmer
});
Object.assign(GUN_OF_SND,{staffCinder:'cinder',staffBrine:'brine',staffGrave:'grave',staffGale:'gale'});
Object.assign(GUN_FN,{
  cinder:(T,N,u)=>{ T(u?60:80,.38,'sine',.6,30,0,.003); N(.5,800,.9,.55,'lowpass',0,2600); N(.06,3000,1,.3,'bandpass'); for(let i=0;i<7;i++) N(.02,rand(2500,6500),3,.12,'bandpass',rand(.05,.7));
    T(u?220:300,.28,'sawtooth',.06,90); N(.8,500,1,.18,'lowpass',.1,150); if(u){ T(44,.6,'sine',.32,30,.02); N(.9,3200,1,.06,'highpass',.2,1500); } },
  brine:(T,N,u)=>{ N(.38,3200,1.2,.5,'bandpass',0,1800); T(u?78:95,.32,'sine',.55,42,0,.003); for(let i=0;i<5;i++) T(rand(280,600),.07,'sine',.08,rand(800,1500),rand(.05,.4));
    N(.55,900,.8,.25,'lowpass',.08,300); if(u){ N(.8,600,.7,.3,'lowpass',.05,150); T(55,.5,'sine',.3,32,.02); } },
  grave:(T,N,u)=>{ const f=u?110:146.8; T(f,.32,'sine',.25,f*.95); T(f*1.007,.32,'sine',.25); T(f*2,.26,'triangle',.06); N(.26,2200,6,.12,'bandpass',0,700); N(.03,4500,3,.08,'bandpass');
    N(.2,700,9,.06,'bandpass',.02); N(.2,1150,9,.04,'bandpass',.02); if(u) T(f/2,.4,'sine',.18,f/2*.9,.01); },
  gale:(T,N,u)=>{ N(.28,2500,1,.4,'bandpass',0,7000); for(let i=0;i<(u?12:8);i++) T(rand(2200,6500),rand(.08,.25),'triangle',.07,null,rand(0,.14),.001); N(.08,6000,1,.25,'highpass');
    T(u?520:700,.32,'sine',.05,u?1040:1400); if(u) N(.5,4500,2,.1,'bandpass',.05,9000); },
});
// alt-fire cast at the hand: a short charge riser into a heavy release (the impact at the aim point is sfx.staffAlt)
function staffCast(k,u){ const g=u?1.2:1;
  if(k==='cinder'){ qN(.14,300,1,.25,'lowpass',0,2500,.12); qT(70,.7,'sine',.6*g,.12,30,.004); qN(.9,1200,.8,.55,'lowpass',.12,200); qSparks(8,.6,.1,.15); }
  else if(k==='brine'){ for(let i=0;i<5;i++) qT(rand(250,500),.05,'sine',.06,i*.025,rand(700,1100)); qN(1,700,.7,.55,'lowpass',.12,150); qT(70,.8,'sine',.55*g,.12,35,.004); qN(.5,3200,1,.25,'bandpass',.12,1500); }
  else if(k==='grave'){ qN(.16,1500,4,.2,'bandpass',0,600,.14); qT(55,1,'sine',.45*g,.14,40,.01); for(const m of [0,3,7]) qVoice(110*Math.pow(2,m/12),1.1,700,1150,.05,.14); qT(440,.9,'sawtooth',.03,.2,220,.05); }
  else { qT(1200,.16,'sine',.06,0,3000,.12); qN(.9,2000,.7,.5,'bandpass',.14,600); for(let i=0;i<10;i++) qT(rand(2400,6500),.12,'triangle',.05,.14+Math.random()*.4,null,.001); qT(90,.5,'sine',.25*g,.14,50,.01); } }
let auStaffAlt=false;
const auCurUp=()=>{ try{ const w=curW(); return !!(w&&w.up); }catch(e){ return false; } };
Object.assign(sfx,{
  staffCinder:u=>{ if(auStaffAlt){ staffCast('cinder',auCurUp()); return; } gunShot('staffCinder',u); },
  staffBrine:u=>{ if(auStaffAlt){ staffCast('brine',auCurUp()); return; } gunShot('staffBrine',u); },
  staffGrave:u=>{ if(auStaffAlt){ staffCast('grave',auCurUp()); return; } gunShot('staffGrave',u); },
  staffGale:u=>{ if(auStaffAlt){ staffCast('gale',auCurUp()); return; } gunShot('staffGale',u); },
  // alt-fire effect at the aim point (positional): Slag Geyser, Undertow, Soul Harvest, Glass Cyclone (4 s)
  staffAlt:k=>{
    if(k==='cinder'){ qHold(3); qN(.06,4000,.7,.4,'highpass'); qT(55,.9,'sine',.55,0,30,.004); qN(1.4,600,.6,.6,'lowpass',0,90); for(let i=0;i<6;i++) qT(rand(90,180),.15,'sine',.12,rand(.2,1.2),rand(50,90));
      for(let i=0;i<6;i++) qN(.04,rand(1500,3500),2,.08,'bandpass',rand(.3,1.4)); qN(1.8,3500,1,.05,'highpass',.4,1500); }
    else if(k==='brine'){ qHold(2.5); qN(1.6,500,.6,.5,'lowpass',0,150,.35); qN(1.2,2500,.8,.2,'bandpass',.3,900); qT(60,1,'sine',.45,.25,32,.05); for(let i=0;i<6;i++) qT(rand(200,450),.08,'sine',.07,.4+Math.random()*.9,rand(600,900)); }
    else if(k==='grave'){ qHold(2.5); qN(.4,800,2,.2,'bandpass',0,3000,.38); qT(55,1.2,'sine',.5,.38,40,.05); qN(1,1400,5,.15,'bandpass',.4,300); for(let i=0;i<3;i++){ const f=rand(300,600); qT(f,1.2,'sine',.05,.4+i*.1,f*.7,.05); } }
    else { qHold(4.6); qN(4,900,1.5,.3,'bandpass',0,2400,.5); qN(4,2600,3,.12,'bandpass',.2,1200,.5); for(let i=0;i<16;i++) qT(rand(2500,6500),.12,'triangle',.04,Math.random()*3.8,null,.001); qT(70,4,'sine',.15,0,50,.4); } },
  // a staff answers its upgrade trial: each element its own flourish over a rising chord
  staffUp:k=>{ const r={cinder:48,brine:50,grave:47,gale:55}[k]||50, n=m=>440*Math.pow(2,(m-69)/12);
    if(k==='cinder'){ qN(1.4,400,1,.45,'lowpass',0,3000,.05); qSparks(14,1.6,.08); }
    else if(k==='brine'){ qN(1.8,600,.7,.4,'lowpass',0,200,.6); for(let i=0;i<8;i++) qT(rand(300,700),.08,'sine',.06,.3+i*.12,rand(800,1300)); }
    else if(k==='grave'){ for(const m of [0,3,7,10]) qVoice(n(r+12+m),2.2,700,1150,.045,.1); }
    else { for(let i=0;i<14;i++) qT(n(r+36)*Math.pow(2,(i%7)/7),.5,'sine',.03,i*.08,null,.002); qN(2,3000,1,.2,'bandpass',0,7000,.4); }
    [0,7,12,16].forEach((m,i)=>{ for(const det of [-6,6]) qT(n(r+m)*(1+det/1200),2.4,'sawtooth',.025,.2+i*.12,null,.5); }); qT(n(r-12),2.6,'sine',.2,0,null,.3); },
});
sfxWrapAll();
// alt-fire: mark the cast so the staff's own sound plays its charge-and-release instead of a primary shot
if(typeof staffAlt==='function'){ const _sa=staffAlt; staffAlt=function(){ auStaffAlt=true; try{ return _sa.apply(this,arguments); }finally{ auStaffAlt=false; } }; }
// upgrade flourish for everyone (the host runs staffUpgrade; qSound broadcasts the element to co-op clients)
if(typeof staffUpgrade==='function'&&typeof qSound==='function'){ const _su=staffUpgrade; staffUpgrade=function(k){ const was=typeof STF!=='undefined'&&STF[k]&&STF[k].up; const r=_su.apply(this,arguments); try{ if(!was&&STF[k]&&STF[k].up) qSound('staffUp',undefined,undefined,undefined,k); }catch(e){} return r; }; }
