/* ---------- adaptive score (original, procedural) ----------
   Layers over a slow four-chord cycle, mixed by an intensity value that follows the number of living zombies:
     drone (always) -> pad cluster (swells) -> heartbeat pulse -> low plucked ostinato -> metal ticks -> war drums (peak)
   Boss alive adds a low brass motif and heavier drums. The Hollow switches to a glassy, slower mood in another key.
   The Deep Vault finale (quest stages seals / furnace / escape) switches to its own driving cue: faster, drums on every
   beat, a brass ostinato, a choir-like pad and a recurring finale line.
   Stingers: round start / round end / boss / one per rite (each rite its own phrase, rising through the quest) /
   finale (vault opens) / escape / victory / game over.
   Everything plays on the music bus (SETTINGS.music). The score fades out on game over, victory and quitting to the title. */
const MX_LVL=.75; // score level inside the music bus (loudness pass: combat bed about -23 LUFS at music .8)
const MXN=m=>440*Math.pow(2,(m-69)/12);
const MX_FINALE=['seals','furnace','escape'];
const MX={on:false,g:null,bed:null,timer:null,next:0,step:0,inten:0,mood:null,stings:[],lastRite:0,lastStage:null,
  // chord roots and voicings as MIDI notes; main: D minor colour, hollow: F-sharp with raised fourth (glassy), finale: C minor with a raised leading tone
  main:{bpm:92,prog:[[50,53,57,64],[46,50,53,60],[43,46,50,57],[45,50,52,57]]},
  cave:{bpm:66,prog:[[42,49,54,60],[44,49,52,59],[40,47,52,56],[42,48,54,61]]},
  fin: {bpm:112,prog:[[48,51,55,62],[44,48,51,58],[46,50,53,60],[43,47,50,55]]},
  start(){ const a=AU.ctx; if(!a||!AU.music||this.on) return; this.on=true; const t=a.currentTime;
    this.g=a.createGain(); this.g.gain.value=.0001; this.g.gain.setTargetAtTime(MX_LVL,t,1.2); this.g.connect(AU.music);
    // shared echo for plucks/bells
    const dl=a.createDelay(1.5), fb=a.createGain(), lp=a.createBiquadFilter(), eo=a.createGain(); dl.delayTime.value=60/this.main.bpm*.75; fb.gain.value=.32; lp.type='lowpass'; lp.frequency.value=2200; eo.gain.value=.5;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(eo); eo.connect(this.g); this.echo=dl;
    // bed: drone pair + four pad voices, filtered, with slow tremolo
    const bed={osc:[]}; bed.dg=a.createGain(); bed.dg.gain.value=0; bed.df=a.createBiquadFilter(); bed.df.type='lowpass'; bed.df.frequency.value=260; bed.df.Q.value=2; bed.df.connect(bed.dg); bed.dg.connect(this.g);
    for(const det of [-6,6]){ const o=a.createOscillator(); o.type='sawtooth'; o.detune.value=det; o.connect(bed.df); bed.osc.push(o); }
    bed.pg=a.createGain(); bed.pg.gain.value=0; bed.pf=a.createBiquadFilter(); bed.pf.type='bandpass'; bed.pf.frequency.value=900; bed.pf.Q.value=.7; bed.pf.connect(bed.pg); bed.pg.connect(this.g);
    bed.pads=[0,1,2,3].map(i=>{ const o=a.createOscillator(); o.type=i%2?'triangle':'sawtooth'; o.detune.value=(i-1.5)*5; const g=a.createGain(); g.gain.value=i===3?.35:.6; o.connect(g); g.connect(bed.pf); bed.osc.push(o); return o; });
    const trem=a.createOscillator(); trem.frequency.value=.23; const tg=a.createGain(); tg.gain.value=.012; trem.connect(tg); tg.connect(bed.pg.gain); bed.osc.push(trem);
    for(const o of bed.osc) o.start(t); this.bed=bed; this.inten=0; this.step=0; this.next=t+.25; this.mood=null; this.setMood(t);
    this.timer=setInterval(()=>this.tick(),90); },
  stop(fast){ if(!this.on) return; this.on=false; clearInterval(this.timer); this.timer=null; const a=AU.ctx, t=a.currentTime, g=this.g, bed=this.bed;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.setTargetAtTime(.0001,t,fast?.15:.6); const e=t+(fast?1:3.5);
    for(const o of bed.osc){ try{ o.stop(e); }catch(er){} } setTimeout(()=>{ try{ g.disconnect(); }catch(er){} },(e-t)*1000+200); this.g=null; this.bed=null; },
  hush(){ const a=AU.ctx; if(!a) return; const t=a.currentTime; for(const s of this.stings){ s.gain.cancelScheduledValues(t); s.gain.setTargetAtTime(.0001,t,.2); } this.stings=[]; },
  finale(){ return mode==='main'&&typeof Q!=='undefined'&&MX_FINALE.includes(Q.stage); },
  setMood(t){ const k=mode==='hollow'?'cave':this.finale()?'fin':'main'; if(k===this.mood) return; this.mood=k; this.hollow=k==='cave'; const M=this[k]; this.M=M;
    this.echo.delayTime.setTargetAtTime(60/M.bpm*.75,t,.1); this.chord(t,0); },
  chord(t,i){ const ch=this.M.prog[i%4], bed=this.bed; this.ch=ch;
    bed.osc[0].frequency.setTargetAtTime(MXN(ch[0]-12),t,.4); bed.osc[1].frequency.setTargetAtTime(MXN(ch[0]-12)*1.5,t,.4);
    bed.pads.forEach((o,k)=>o.frequency.setTargetAtTime(MXN(ch[k]),t,.6)); },
  // intensity target from the game state
  target(){ let alive=0, boss=false; for(const z of zombies){ if(!z.dead){ alive++; if(z.boss) boss=true; } } this.boss=boss;
    const brk=mode==='hollow'?HL.inBreak:R.inBreak; let k=brk&&!alive?.06:.18+clamp(alive/18,0,1)*.62; if(boss) k+=.25; if(P.hp<P.maxHp*.35&&!P.dead) k+=.1;
    if(this.mood==='fin') k=Math.max(k,.82); return clamp(k,0,1); },
  // quest cues, read from the replicated quest state so co-op clients hear them too
  questCues(){ if(typeof Q==='undefined') return; const n=Q.rites||0;
    if(n<this.lastRite) this.lastRite=n; // new game
    if(n>this.lastRite){ this.lastRite=n; if(state==='play') this.sting('rite',n); }
    const st=Q.stage; if(st!==this.lastStage){ const was=this.lastStage; this.lastStage=st; if(state!=='play'||was==null) return;
      if(st==='seals') this.sting('finale'); else if(st==='escape') this.sting('escape'); } },
  update(dt,prev){ const a=AU.ctx; if(!a) return;
    if(state!==prev){ if(state==='end'){ this.stop(); this.hush(); this.sting('victory'); } else if(state==='menu'){ this.stop(true); this.hush(); } else if(state==='over') this.stop(); }
    if(state==='menu'){ this.lastRite=0; this.lastStage=null; } else this.questCues();
    if(state==='play'&&!this.on) this.start();
    else if(state!=='play'&&state!=='paused'&&this.on) this.stop();
    if(!this.on) return; const t=a.currentTime; dt=clamp(t-(this.lastT||t),0,.25); this.lastT=t; this.setMood(t);
    const tg=this.target(), r=tg>this.inten?.22:.08; this.inten+=clamp(tg-this.inten,-r*dt,r*dt); const I=this.inten, bed=this.bed, F=this.mood==='fin';
    bed.dg.gain.setTargetAtTime((this.hollow?.06:.045)+I*.05,t,.3); bed.df.frequency.setTargetAtTime(180+I*I*1400,t,.4);
    bed.pg.gain.setTargetAtTime(clamp((I-.15)*.07,0,.05)+(this.hollow?.012:0)+(F?.02:0),t,.6); bed.pf.frequency.setTargetAtTime(600+I*1600,t,.6);
    this.g.gain.setTargetAtTime((state==='paused'?.33:1)*(F?.62:1)*MX_LVL,t,.3); }, // finale cue sits 4 dB lower: it is denser
  tick(){ const a=AU.ctx; if(!a||!this.on) return; const sp=60/this.M.bpm/4; if(this.next<a.currentTime-.3) this.next=a.currentTime+.05;
    while(this.next<a.currentTime+.35){ try{ this.stepAt(this.next,this.step); }catch(e){ AU.errs++; AU.lastErr='music: '+e; } this.next+=sp; this.step++; } },
  // ---- instruments (each note is a few nodes that free themselves)
  note(type,f,t,dur,v,lpF,dst,att){ if(auBusy()) return; const a=AU.ctx, o=a.createOscillator(); o.type=type; o.frequency.value=f; const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+(att||.008)); g.gain.exponentialRampToValueAtTime(.0003,t+dur);
    if(lpF){ const f_=a.createBiquadFilter(); f_.type='lowpass'; f_.frequency.setValueAtTime(lpF,t); f_.frequency.exponentialRampToValueAtTime(Math.max(80,lpF*.25),t+dur); o.connect(f_); f_.connect(g); } else o.connect(g); g.connect(dst||this.g); o.start(t); o.stop(t+dur+.03); auTrack(o); return g; },
  drum(t,f,v,dur,dst){ if(auBusy()) return; const a=AU.ctx, o=a.createOscillator(); o.frequency.setValueAtTime(f*2.2,t); o.frequency.exponentialRampToValueAtTime(f,t+.04); o.frequency.exponentialRampToValueAtTime(Math.max(32,f*.6),t+dur); const g=a.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0003,t+dur); o.connect(g); g.connect(dst||this.g); o.start(t); o.stop(t+dur+.03); auTrack(o);
    auTrack(lN(a,dst||this.g,t,.07,900,.8,v*.25,'lowpass')); },
  snare(t,v,dst){ if(auBusy()) return; const a=AU.ctx; auTrack(lN(a,dst||this.g,t,.16,1800,.7,v,'bandpass',900)); auTrack(lT(a,dst||this.g,t,190,.08,'triangle',v*.5,120)); },
  stepAt(t,s){ const I=this.inten, st=s%16, bar=Math.floor(s/16); if(st===0&&bar%2===0) this.chord(t,bar/2);
    const ch=this.ch, H=this.hollow;
    if(this.mood==='fin'){ // finale: drums every beat, snare backbeat, brass 8ths, finale line every 4 bars
      if(st%4===0) this.drum(t,st===0?46:52,.22+I*.1,.45);
      if(st===4||st===12) this.snare(t,.06+I*.03);
      if(st%2===0){ const pat=[0,0,1,0,2,0,1,3]; const m=ch[pat[(st/2)%8]]-12; for(const det of [-6,6]) this.note('sawtooth',MXN(m)*(1+det/1200),t,.2,.022,900+I*1500,null,.01); }
      if(st===14) this.drum(t+.06,50,.12,.3);
      if(st===0&&bar%4===0) this.finaleLine(t,ch[0]);
      if(this.boss&&st===8&&bar%2===1) this.motif(t,ch[0]-12);
      return; }
    if(H){ // glass bells on sparse steps, slow heartbeat, deep swells
      if(st%4===0&&Math.random()<.35+I*.4){ const m=ch[Math.floor(Math.random()*4)]+24, f=MXN(m); const g=this.note('sine',f,t,2.2,.03+I*.02); if(g) g.connect(this.echo); this.note('sine',f*2.76,t,.8,.008); }
      if(I>.3&&(st===0||st===6)) this.drum(t,50,.12+I*.18,.7);
      if(this.boss&&st===0&&bar%2===0) this.motif(t,ch[0]-12);
      return; }
    if(I>.25&&(st===0||st===3)) this.drum(t,52,(st?.12:.18)*(.6+I),.35);                          // heartbeat
    if(I>.4){ const pat=[0,0,2,0,1,0,2,3]; if(st%2===0){ const m=ch[pat[(st/2)%8]]-12; const g=this.note('sawtooth',MXN(m),t,.22,.03+(I-.4)*.06,1600+I*1800); if(g&&st%8===4) g.connect(this.echo); } } // ostinato
    if(I>.6&&st%4===2) { const g=this.note('square',MXN(ch[3]+24),t,.05,.008+(I-.6)*.02,4000); }  // metal tick
    if(I>.8&&(st===0||st===8||st===14)) { this.drum(t,48,.28*(I-.5)*2,.6); if(st===14) this.drum(t+.06,52,.15,.4); } // war drums
    if(this.boss){ if(st===0&&bar%2===0) this.motif(t,ch[0]-12); if(st===10) this.drum(t,46,.3,.7); } },
  // boss motif: four low brass notes, original contour (root, up a semitone, back, down a fourth)
  motif(t,root){ const sp=60/this.M.bpm, seq=[[0,1.5],[1,.5],[0,1],[-5,2]]; let tt=t; for(const [iv,b] of seq){ const f=MXN(root+iv);
      for(const det of [0,7,-7]){ const g=this.note('sawtooth',f*(1+det/1200),tt,b*sp*.95,.035,500+this.inten*900,null,.06); } tt+=b*sp; } },
  // finale line: an original eight-note brass-and-bell phrase over the finale chords (root-relative semitones, beats)
  finaleLine(t,root){ const sp=60/this.M.bpm, seq=[[0,1],[3,.5],[7,.5],[8,1.5],[7,.5],[3,1],[2,1],[0,2]]; let tt=t;
    for(const [iv,b] of seq){ const f=MXN(root+iv); for(const det of [-5,5]) this.note('sawtooth',f*(1+det/1200),tt,b*sp*.92,.028,1300+this.inten*900,null,.03); const g=this.note('sine',f*2,tt,b*sp*1.6,.018,null,null,.01); if(g) g.connect(this.echo); tt+=b*sp; } },
  // one stinger per rite: a bell phrase chosen from the rite number (no two alike), rising through the quest; milestones add brass and a low hit
  riteSting(n,N,D,r){ const mode_=[0,2,3,5,7,8,10,12,14,15], k=Math.max(1,n|0), lift=Math.floor((k-1)/6)*5, base=r+12+lift;
    const deg=[(k*3)%7,(k*3+2)%7+1,(k*5+4)%7,((k*2)%3)+4], rhy=[0,.16+(k%3)*.04,.36+(k%2)*.08,.62];
    deg.forEach((d,i)=>{ const m=base+mode_[d]; N('sine',m+12,rhy[i],1.8-i*.15,.042,null,.004); N('sine',m+24,rhy[i]+.006,.7,.01,null,.004); N('triangle',m,rhy[i],1.1,.012,null,.01); });
    const ch=this.main.prog[k%4]; ch.slice(0,3).forEach(m=>N('sawtooth',m+lift,.05,2.6,.012,900,.6)); N('sine',ch[0]-12+lift,0,2.8,.06,null,.3);
    const big=[1,12,18,22].includes(k); if(big){ D(48,0,.4,1.8); ch.forEach(m=>{ for(const det of [-7,7]) N('sawtooth',m+lift+det/100,.1,3.2,.02,1600,.4); }); }
    return big?4.5:3.2; },
  // stingers: their own gain node on the music bus so they ring out over a fading score
  sting(kind,arg){ const a=AU.ctx; if(!a||!AU.music) return; const t=a.currentTime+.02, sg=a.createGain(); sg.gain.value=1; sg.connect(AU.music); this.stings.push(sg);
    const N=(type,m,dl,dur,v,lp,att)=>this.note(type,MXN(m),t+dl,dur,v,lp,sg,att), D=(f,dl,v,dur)=>{ if(auBusy()) return; const o=a.createOscillator(); o.frequency.setValueAtTime(f*2,t+dl); o.frequency.exponentialRampToValueAtTime(Math.max(32,f*.55),t+dl+dur); const g=a.createGain(); g.gain.setValueAtTime(v,t+dl); g.gain.exponentialRampToValueAtTime(.0003,t+dl+dur); o.connect(g); g.connect(sg); o.start(t+dl); o.stop(t+dl+dur+.05); auTrack(o); };
    const H=mode==='hollow', r=H?42:50; let len=4;
    if(kind==='start'){ D(55,0,.5,1.6); auTrack(lN(a,sg,t,1.4,180,1,.35,'lowpass',60));
      [0,7,12,15,19].forEach((iv,i)=>{ for(const det of [-8,8]) N('sawtooth',r+iv+(det/100),.1+i*.04,3.2,.03,1100,1.4); }); N('sine',r-12,0,4,.18,null,.3);
      [0,3,7].forEach((iv,i)=>{ const g=N('triangle',r+24+iv,.9+i*.22,1.4,.03); if(g&&this.echo) g.connect(this.echo); }); len=5; }
    else if(kind==='end'){ [[r+10,0],[r+14,.5],[r+17,1],[r+12,1.6]].forEach(([m,dl])=>N('triangle',m+12,dl,1.6,.05)); [0,4,7].forEach(iv=>N('sine',r+iv,1.6,2.8,.05,null,.4)); len=5; }
    else if(kind==='boss'){ D(48,0,.6,1.8); D(46,.45,.45,1.4); [0,1,6].forEach(iv=>N('sawtooth',r-12+iv,.1,2.2,.05,700,.2)); len=3; }
    else if(kind==='rite') len=this.riteSting(arg,N,D,r);
    else if(kind==='finale'){ // the vault opens: three low hits, a swelling brass chord, a rising choir and the finale line's head
      [0,.55,1.1].forEach((dl,i)=>D(46-i*2,dl,.5,1.6)); auTrack(lN(a,sg,t,2.6,220,.8,.3,'lowpass',60));
      [48,51,55,59,62].forEach((m,i)=>{ for(const det of [-8,8]) N('sawtooth',m+det/100,1.2+i*.05,4.2,.024,700,1.6); });
      [60,63,67,72].forEach((m,i)=>N('triangle',m,1.6+i*.35,3,.025,null,.5)); [[60,2.8],[63,3.2],[67,3.45],[68,3.7]].forEach(([m,dl])=>N('sine',m+12,dl,1.6,.04,null,.006)); len=7; }
    else if(kind==='escape'){ // the Heart breaks: an urgent rising figure over a pulse
      for(let i=0;i<8;i++) D(50,i*.28,.18,.25); [0,2,3,5,7,8,10,12].forEach((iv,i)=>N('sawtooth',60+iv,i*.14,.3,.03,2400,.01)); [48,55,60,63].forEach(m=>N('sawtooth',m,1.2,2.6,.02,1400,.3)); len=4.5; }
    else if(kind==='victory'){ D(48,0,.4,2); [0,4,7,11,14].forEach((iv,i)=>{ for(const det of [-6,6]) N('sawtooth',r+2+iv+det/100,i*.08,5.5,.025,1400,1.2); });
      [12,16,19,23,26,31].forEach((iv,i)=>N('sine',r+14+iv,1+i*.3,2.5,.035,null,.004)); len=7; }
    else if(kind==='over'){ D(46,0,.55,2.5); [[0,0],[-1,.7],[-3,1.4],[-5,2.1]].forEach(([iv,dl])=>{ for(const det of [-7,7]) N('sawtooth',r+iv+det/100,dl,1.8,.035,500,.25); }); N('sine',r-12,.3,4.5,.2,null,.6); len=6; }
    setTimeout(()=>{ const i=this.stings.indexOf(sg); if(i>=0) this.stings.splice(i,1); try{ sg.disconnect(); }catch(e){} },len*1000+500); },
};
// handles for automated audio tests (window.__G.AU.dbg in test builds)
AU.dbg={MX,sfx,SFXRAW,GUNBUF,GUNP,IRDEF,gunWarm,emitAt,sfxAt};
