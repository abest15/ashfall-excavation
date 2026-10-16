/* ---------- sound effects: layered weapons (pre-rendered round-robin samples), mechanics, foley, world ---------- */
// Weapon recipe. Every shot is built from layers:
//   click  mechanical transient (hammer / bolt / sear)        snap  supersonic crack (short high-passed burst)
//   crack  main body: band-limited, saturated noise burst      body  tonal "bark" of the action and barrel
//   thump  low-end pressure: sine pitch-drop                   tail  distant rolling report (also sent to the room reverb)
//   ring   optional metallic resonance                         forged weapons add a molten-metal ring + plasma sweep + sub layer
// Values: click[f,v] snap[f,dur,v] crack[f,q,dur,fEnd,type,v] body[f0,f1,dur,wave,v] thump[f0,f1,dur,v] tail[dur,f,v] ring[f,dur,v]; lv = playback level; fg = forged layer pitch
const GUNP={
  pistol:   {len:.75,lv:.62,click:[5200,.2], snap:[3800,.035,.3], crack:[2600,.9,.14,500,'lowpass',.62],  body:[190,60,.06,'square',.12],   thump:[150,48,.1,.42], tail:[.6,700,.07],  fg:880},
  carbine:  {len:1.3,lv:.9, click:[4200,.22],snap:[4500,.03,.35], crack:[1900,.7,.32,180,'lowpass',.85],  body:[120,45,.12,'sawtooth',.1],  thump:[100,36,.24,.62],tail:[1.2,500,.12], fg:620, cycle:'bolt'},
  revolver: {len:1.25,lv:.95,click:[3600,.26],snap:[3000,.04,.3], crack:[1500,.7,.3,160,'lowpass',.9],   body:[95,40,.12,'square',.14],    thump:[85,32,.28,.7],  tail:[1.1,450,.13], fg:520, ring:[2350,.25,.03]},
  marksman: {len:1.5,lv:.95,click:[4800,.2], snap:[6000,.025,.5], crack:[2100,.6,.28,200,'lowpass',.8],   body:[110,42,.1,'sawtooth',.1],   thump:[90,34,.26,.62], tail:[1.4,550,.14], fg:700},
  smg:      {len:.5, lv:.5, click:[6000,.12],snap:[4200,.02,.18], crack:[3200,.8,.08,700,'lowpass',.55],  body:[150,70,.05,'square',.08],   thump:[160,60,.06,.28],tail:[.45,800,.05], fg:1100,auto:1,shell:1},
  autorifle:{len:.65,lv:.6, click:[5000,.14],snap:[4600,.022,.25],crack:[2300,.8,.11,450,'lowpass',.66],  body:[130,55,.06,'sawtooth',.09], thump:[125,45,.1,.4],  tail:[.6,650,.07],  fg:900, auto:1,shell:1},
  shotgun:  {len:1.3,lv:1,  click:[3000,.2], snap:[2600,.05,.3],  crack:[1400,.5,.48,140,'lowpass',1],    body:[80,35,.15,'square',.1],     thump:[72,30,.3,.75],  tail:[1.2,420,.15], fg:440, cycle:'pump'},
  lmg:      {len:.65,lv:.66,click:[4400,.15],snap:[3800,.025,.22],crack:[2100,.7,.12,350,'lowpass',.66],  body:[100,48,.07,'sawtooth',.12], thump:[110,42,.1,.5],  tail:[.6,520,.08],  fg:660, auto:1,shell:1},
  gatling:  {len:.45,lv:.48,click:[7000,.1], snap:[5200,.018,.18],crack:[2700,.9,.06,600,'lowpass',.5],   body:[170,80,.04,'square',.07],   thump:[140,60,.05,.3], tail:[.4,900,.05],  fg:1320,auto:1,shell:1},
  cannon:   {len:1.9,lv:1,  click:[2500,.25],snap:[2000,.06,.3],  crack:[900,.5,.7,80,'lowpass',1],      body:[60,30,.25,'square',.12],    thump:[52,32,.55,.85], tail:[1.6,300,.2],  fg:330},
  rod:      {len:1.1,lv:.8, fn:'rod',fg:660},
  ion:      {len:.6, lv:.62,fn:'ion',fg:980},
  dynamo:   {len:1.7,lv:.9, fn:'dynamo',fg:440},
  gauntlet: {len:.6, lv:.62,fn:'zap',fg:1200},
};
const GUN_OF_SND={pistol:'pistol',rifle:'carbine',smg:'smg',shotgun:'shotgun',lmg:'lmg',rod:'rod',cannon:'cannon',ion:'ion',dynamo:'dynamo',zap:'gauntlet'};
const GUNBUF={};
function gunLayers(c,dst,t,id,u,k){ const p=GUNP[id], j=x=>x*(1+(Math.random()*2-1)*.045); k=k||(x=>x);
  if(p.fn) gunEnergy(c,dst,t,p.fn,u,k);
  else { let sat=dst; if(c!==AU.ctx||!auBusy()){ sat=c.createWaveShaper(); sat.curve=AU.dist; sat.connect(dst); }
    const [cf,cq,cd,ce,ct,cv]=p.crack; k(lN(c,sat,t,j(cd),j(cf),cq,cv*.9,ct,j(ce)));
    k(lN(c,dst,t,.012,j(p.click[0]),2.5,p.click[1],'bandpass')); k(lT(c,dst,t,j(p.click[0]*.5),.018,'square',p.click[1]*.25));
    k(lN(c,dst,t,p.snap[1],j(p.snap[0]),.8,p.snap[2],'highpass'));
    const b=p.body; k(lT(c,dst,t+.002,j(b[0]),b[2],b[3],b[4],b[1]));
    const h=p.thump; k(lT(c,dst,t,j(h[0]),h[2],'sine',h[3],h[1],.003));
    const tl=p.tail; k(lN(c,dst,t+.02,j(tl[0]),j(tl[1]),.6,tl[2],'lowpass',j(tl[1]*.35),.05));
    if(p.ring) k(lT(c,dst,t,j(p.ring[0]),p.ring[1],'triangle',p.ring[2])); }
  if(u){ const f=p.fg*(1+(Math.random()*2-1)*.01), sh=p.auto?.45:1; // forged: molten ring (inharmonic partials), plasma sweep, sub swell
    [[1,.38,.07],[2.76,.22,.04],[5.4,.12,.02]].forEach(([r,d,v])=>k(lT(c,dst,t+.004,f*r,d*sh,'sine',v,f*r*.985,.002)));
    k(lN(c,dst,t,.26*sh,6200,3,.12,'bandpass',900)); k(lT(c,dst,t,58,.32*sh,'sine',.22,40,.01)); } }
function gunEnergy(c,dst,t,fn,u,k){ const T=(f,d,w,v,e,dl=0,at)=>k(lT(c,dst,t+dl,f,d,w,v,e,at)), N=(d,f,q,v,ty,dl=0,e)=>k(lN(c,dst,t+dl,d,f,q,v,ty,e));
  if(fn==='rod'){ N(.32,400,3,.35,'bandpass',0,3200); T(u?60:90,.28,'sine',.45,32); [1318.5,1975.5,2637].forEach((f,i)=>T(f*(u?.75:1)*(1+rand(-.004,.004)),.5-i*.1,'sine',.09,null,.02+i*.015)); T(u?440:880,.6,'triangle',.06,u?1320:1760,.05); }
  else if(fn==='ion'){ T(u?520:780,.18,'square',.1,u?160:240); N(.18,3000,2,.3,'bandpass',0,800); T(u?90:130,.2,'sine',.3,60); T(rand(2400,2600),.08,'sawtooth',.03,900); }
  else if(fn==='dynamo'){ N(.6,6000,1.5,.6,'bandpass',0,900); T(55,.6,'sawtooth',.25,40); T(2400,.3,'square',.06,400); N(1.2,200,1,.3,'lowpass',.1,60); N(.05,8000,1,.3,'highpass'); }
  else { N(.22,5200,2,.4,'bandpass',0,1400); T(1800,.12,'sawtooth',.08,300); T(90,.25,'square',.1,50); for(let i=0;i<3;i++) N(.03,rand(3000,7000),4,.15,'bandpass',rand(.01,.12)); } }
// render all variations of one weapon into one mono buffer (round-robin by offset); first shot before it is ready synthesizes live
function gunWarm(id,u){ const key=id+(u?'+':''); if(GUNBUF[key]||!GUNP[id]||!AU.ctx) return; const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext; GUNBUF[key]={buf:null,n:0,len:0,last:-1}; if(!OAC) return;
  const p=GUNP[id], sr=AU.ctx.sampleRate, n=p.auto?4:3, len=Math.ceil(p.len*sr);
  let oc; try{ oc=new OAC(1,n*len,sr); }catch(e){ return; }
  for(let v=0;v<n;v++){ const g=oc.createGain(); g.connect(oc.destination); gunLayers(oc,g,v*p.len+.001,id,u); }
  const done=b=>{ const d=b.getChannelData(0); for(let v=0;v<n;v++){ let pk=1e-6; for(let i=v*len;i<(v+1)*len;i++){ const x=Math.abs(d[i]); if(x>pk) pk=x; } const s=.9/pk; for(let i=v*len;i<(v+1)*len;i++) d[i]*=s;
      const f=Math.floor(.012*sr); for(let i=0;i<f;i++) d[(v+1)*len-1-i]*=i/f; }
    const G=GUNBUF[key]; G.buf=b; G.n=n; G.len=p.len; };
  try{ const pr=oc.startRendering(); if(pr&&pr.then) pr.then(done,()=>{}); else oc.oncomplete=e=>done(e.renderedBuffer); }catch(e){} }
let gunPreT=0; function gunPrefetch(dt){ gunPreT-=dt; if(gunPreT>0) return; gunPreT=1; if(!P.weapons) return; for(const w of P.weapons) if(w&&GUNP[w.id]) gunWarm(w.id,!!w.up); if(PU.gat&&PU.gatling>0) gunWarm('gatling',false); }
function gunId(name){ if(!AU.em){ try{ const w=curW(); if(w&&WD[w.id]&&(WD[w.id].snd===name||w.id===name)) return w.id; }catch(e){} } return GUNP[name]?name:GUN_OF_SND[name]||'pistol'; }
let auShellT=0, auBoltSeen=false;
function gunShot(name,u){ const a=AU.ctx, id=gunId(name), p=GUNP[id], key=id+(u?'+':''), G=GUNBUF[key], dst=auDst(), t=a.currentTime, local=!AU.em;
  if(!G||!G.buf){ gunWarm(id,!!u); if(auBusy()) return; const g=a.createGain(); g.gain.value=VOLK*p.lv*.55; g.connect(dst); if(local) g.connect(AU.gunSend); gunLayers(a,g,t,id,u,auTrack); }
  else { let v=Math.floor(Math.random()*G.n); if(v===G.last) v=(v+1)%G.n; G.last=v;
    const s=a.createBufferSource(); s.buffer=G.buf; s.playbackRate.value=1+rand(-.04,.04); const g=a.createGain(); g.gain.value=VOLK*p.lv*rand(.86,1); s.connect(g); g.connect(dst); if(local) g.connect(AU.gunSend);
    s.start(t,v*G.len,G.len); auTrack(s); }
  if(!local) return;
  if(p.shell&&t>auShellT&&!auBusy()){ auShellT=t+.14; const sf=typeof surfaceAt==='function'?surfaceAt(P.pos.x,P.pos.z):'mud', dl=rand(.35,.6), soft=sf==='mud';
    nz(.05,soft?600:4200,soft?1:6,soft?.03:.035,soft?'lowpass':'bandpass',dl); if(!soft){ tn(rand(3800,4600),.12,'sine',.018,dl); tn(rand(5600,6400),.08,'sine',.012,dl+.07); } }
  if(p.cycle&&!auBoltSeen) setTimeout(()=>{ if(AU.ctx&&state==='play') SFXRAW.boltRack(id,true); },p.cycle==='pump'?380:520); }

// ---- small foley helpers
const jt=x=>x*rand(.94,1.06);
function clk(f,v,d=0){ nz(.014,jt(f),3,v,'bandpass',d); tn(jt(f*.62),.035,'triangle',v*.35,d); }
function slideN(f0,f1,dur,v,d=0){ nz(dur,jt(f0),2.2,v,'bandpass',d,jt(f1)); }
function rfam(id){ if(id==null){ try{ const w=curW(); id=w&&w.id; }catch(e){} } const w=WD[id]; if(!w) return 'rifle';
  if(id==='revolver') return 'revolver'; if(id==='shotgun') return 'shotgun'; if(id==='cannon') return 'cannon'; if(['rod','ion','dynamo','gauntlet'].includes(id)) return 'energy';
  if(w.type==='lmg'||id==='gatling') return 'lmg'; if(w.type==='pistol') return 'pistol'; if(id==='carbine'||id==='marksman') return 'bolt'; return 'rifle'; }
const STEPS={
  mud:v=>{ nz(.17,jt(380),1.2,.2*v,'lowpass',0,120); nz(.12,jt(900),2,.05*v,'bandpass',.03,450); tn(jt(150),.09,'sine',.05*v,.02,85); },
  wood:v=>{ tn(jt(190),.09,'triangle',.11*v,0,140); nz(.07,jt(700),3,.13*v,'bandpass'); nz(.05,jt(2200),4,.035*v,'bandpass',.01); if(Math.random()<.15) tn(jt(520),.2,'sawtooth',.01,.04,jt(460)); },
  stone:v=>{ nz(.05,jt(2600),1.5,.11*v,'bandpass'); nz(.09,jt(500),1,.11*v,'lowpass'); tn(jt(120),.05,'sine',.07*v,0,70); nz(.06,5200,1,.025*v,'highpass',.02); },
  metal:v=>{ nz(.04,jt(3000),3,.09*v,'bandpass'); [420,1130,1870].forEach((f,i)=>tn(jt(f),.26-i*.06,'triangle',[.045,.028,.018][i]*v)); tn(jt(95),.07,'sine',.09*v,0,60); },
  crystal:v=>{ nz(.04,jt(4500),2,.07*v,'bandpass'); [2100,3300,5200].forEach((f,i)=>tn(jt(f),.42-i*.09,'sine',[.032,.022,.014][i]*v,i*.006)); nz(.1,jt(450),1,.07*v); },
};
// positional helper: run f() with output routed to an emitter at pos
function auAt(pos,maxD,f,dur){ if(!pos){ f(); return; } const d=Math.hypot(pos.x-P.pos.x,pos.z-P.pos.z); if(maxD&&d>maxD) return; const em=emitAt(pos,d,maxD,'fx',dur||2.5,true), pe=AU.em, pk=VOLK;
  AU.em=em?em.inp:null; if(maxD) VOLK*=Math.max(.12,Math.pow(1-d/maxD,1.1)); try{ f(); }finally{ AU.em=pe; VOLK=pk; } }

const sfx={
  // weapons: every snd name and every weapon id resolves to a layered profile
  pistol:u=>gunShot('pistol',u), rifle:u=>gunShot('rifle',u), smg:u=>gunShot('smg',u), shotgun:u=>gunShot('shotgun',u), lmg:u=>gunShot('lmg',u),
  rod:u=>gunShot('rod',u), cannon:u=>gunShot('cannon',u), ion:u=>gunShot('ion',u), dynamo:u=>gunShot('dynamo',u), zap:u=>gunShot('zap',u),
  carbine:u=>gunShot('carbine',u), revolver:u=>gunShot('revolver',u), autorifle:u=>gunShot('autorifle',u), marksman:u=>gunShot('marksman',u), gatling:u=>gunShot('gatling',u), gauntlet:u=>gunShot('gauntlet',u),
  ionHit:()=>{ nz(.4,1800,1,.45,'bandpass',0,300); tn(240,.3,'sawtooth',.12,0,60); nz(.6,500,1,.2,'lowpass',.02,90); },
  // weapon handling (contract with lane 3)
  reloadOut:id=>{ const f=rfam(id);
    if(f==='pistol'){ clk(3400,.12); slideN(1500,800,.12,.09,.04); }
    else if(f==='rifle'){ clk(3000,.13); slideN(1300,700,.16,.11,.05); nz(.06,2400,5,.05,'bandpass',.12); }
    else if(f==='bolt'){ clk(2600,.16); slideN(1800,1100,.14,.1,.03); clk(3600,.1,.15); }
    else if(f==='shotgun'){ nz(.18,900,1.2,.06,'bandpass',0,1600); for(let i=0;i<3;i++) clk(rand(2000,2600),.04,.08+i*.06); }
    else if(f==='revolver'){ clk(2200,.14); for(let i=0;i<4;i++) clk(4200,.035,.06+i*.03); for(let i=0;i<5;i++){ const d=.32+i*.045+rand(0,.03); tn(jt(4100),.1,'sine',.02,d); tn(jt(6100),.06,'sine',.012,d+.01); } }
    else if(f==='lmg'){ clk(1800,.2); tn(jt(420),.25,'sawtooth',.03,.05,jt(300)); slideN(700,1500,.2,.08,.1); for(let i=0;i<4;i++) clk(3000,.04,.28+i*.04); }
    else if(f==='energy'){ tn(900,.5,'sawtooth',.05,0,120); nz(.45,3000,.8,.08,'highpass',.05,8000); clk(1800,.08,.4); }
    else { clk(1400,.22); tn(160,.3,'square',.05,0,90); nz(.5,2200,1,.08,'highpass',.1,600); } },
  reloadIn:id=>{ const f=rfam(id);
    if(f==='pistol'){ nz(.05,700,1,.14,'lowpass'); clk(2800,.16,.03); }
    else if(f==='rifle'){ nz(.06,600,1,.15,'lowpass'); clk(2400,.14,.02); clk(3200,.11,.07); }
    else if(f==='bolt'){ for(let i=0;i<4;i++) clk(3400,.05,i*.05); slideN(900,1700,.1,.07,.2); clk(2600,.13,.3); }
    else if(f==='shotgun'){ nz(.05,1100,2,.1,'bandpass'); clk(2000,.11,.03); slideN(1200,700,.07,.05,.05); }
    else if(f==='revolver'){ clk(3000,.16); for(let i=0;i<6;i++) clk(5200,.03,.08+i*.035); }
    else if(f==='lmg'){ for(let i=0;i<6;i++) clk(3600,.03,i*.04); clk(1600,.25,.3); tn(110,.12,'sine',.12,.3,60); }
    else if(f==='energy'){ clk(2200,.12); tn(150,.6,'sawtooth',.05,.05,1400,.1); tn(rand(1300,1500),.25,'sine',.05,.62); tn(rand(1950,2100),.3,'sine',.03,.7); }
    else { clk(1200,.25); tn(90,.25,'sine',.25,.02,45); nz(.2,500,1,.1,'lowpass',.05); } },
  boltRack:(id,auto)=>{ if(!auto) auBoltSeen=true; const f=rfam(id), v=auto?.75:1;
    if(f==='shotgun'){ slideN(900,1500,.09,.12*v); clk(2200,.15*v,.06); slideN(1500,900,.08,.11*v,.16); clk(2700,.17*v,.22); }
    else if(f==='bolt'){ clk(2400,.13*v); slideN(1600,2400,.08,.08*v,.03); clk(3200,.12*v,.12); slideN(2400,1500,.08,.08*v,.17); clk(2600,.15*v,.26); }
    else if(f==='energy'){ tn(300,.35,'sawtooth',.04*v,0,1600); clk(4000,.06*v,.3); }
    else { clk(2600,.13*v); slideN(1400,2200,.07,.07*v,.02); clk(3000,.16*v,.12); } },
  slide:()=>{ clk(3200,.15); nz(.04,1800,3,.08,'bandpass',.004); tn(jt(1500),.06,'triangle',.03,.004); },
  reload:()=>{ SFXRAW.reloadOut(); setTimeout(()=>{ if(AU.ctx) SFXRAW.reloadIn(); },420); },
  dry:()=>{ clk(1700,.1); tn(1500,.03,'square',.04); },
  swap:()=>{ nz(.08,1400,1.5,.06,'bandpass',0,2400); clk(2400,.07,.06); },
  adsIn:()=>{ nz(.14,700,1.4,.05,'bandpass',0,1500); clk(3800,.025,.09); },
  adsOut:()=>{ nz(.12,1300,1.4,.04,'bandpass',0,650); },
  lowAmmo:()=>{ tn(1480,.05,'triangle',.05); tn(1240,.07,'triangle',.05,.09); },
  hitmarker:head=>{ tn(jt(head?2600:1900),.035,'square',head?.045:.035); nz(.02,head?5200:3600,3,.05,'bandpass'); if(head){ tn(3150,.18,'sine',.035,.01); tn(4730,.12,'sine',.02,.012); } },
  step:s=>{ (STEPS[s]||STEPS.mud)(rand(.85,1.1)); },
  land:force=>{ let f=+force||.5; if(f>1) f=clamp(f/14,0,1); nz(.26,320,1,.12+.3*f,'lowpass',0,80); tn(72,.2,'sine',.12+.35*f,0,40); nz(.12,2400,3,.04+.05*f,'bandpass',.04);
    const sf=typeof surfaceAt==='function'?surfaceAt(P.pos.x,P.pos.z):'mud'; (STEPS[sf]||STEPS.mud)(.9+.6*f); },
  // world and gameplay one-shots
  drum:()=>{ nz(.08,180,1,.45,'lowpass'); tn(150,.09,'sine',.25,0,85); nz(.03,2400,2,.08,'bandpass'); },
  chime:()=>{ const f=rand(900,1400); tn(f,.3,'triangle',.07); tn(f*2.01,.18,'sine',.02); },
  toss:()=>{ nz(.2,900,2,.2,'bandpass',0,2400); tn(1600,.05,'square',.03,.05); },
  buy:()=>{ tn(660,.12,'triangle',.2); tn(990,.25,'triangle',.2,.1); clk(3000,.05); }, deny:()=>tn(150,.25,'square',.1,0,110),
  hit:()=>tn(jt(1900),.035,'square',.035),
  kill:()=>{ nz(.14,jt(700),1,.22); nz(.18,jt(260),1.5,.14,'lowpass',.02,90); if(Math.random()<.5) nz(.1,jt(1600),3,.05,'bandpass',.05,500); },
  swing:()=>nz(.16,900,1,.22,'bandpass',0,3200),
  stab:()=>{ nz(.12,600,1,.35); tn(120,.1,'sine',.25,0,60); nz(.08,1400,2,.1,'bandpass',.02,500); },
  hurt:()=>{ nz(.28,500,1,.45); tn(90,.25,'sawtooth',.12,0,60); tn(55,.3,'sine',.3,0,35); },
  roundStart:()=>{ MX.sting('start'); }, roundEnd:()=>{ MX.sting('end'); },
  power:()=>{ tn(40,2.4,'sawtooth',.3,0,120,.3); nz(1.8,300,1,.45,'lowpass',0,1200); tn(60,3,'sine',.3,.8); for(let i=0;i<5;i++) clk(rand(1500,3000),.06,1+i*.18); },
  door:()=>{ nz(.9,700,1,.5,'lowpass',0,90); tn(80,.6,'sine',.32,0,40); nz(.2,1800,3,.2,'bandpass',.25); tn(rand(300,360),.5,'sawtooth',.02,.1,rand(240,280),.1); },
  crate:()=>{ [523.3,659.3,784,1046.5,784,659.3,880,1174.7].forEach((f,i)=>tn(f,.5,'triangle',.1,i*.22)); },
  flee:()=>{ tn(220,1.2,'sawtooth',.15,0,55); nz(1,300,1,.4,'lowpass',0,60); },
  forge:()=>{ nz(1.3,400,1,.5,'lowpass',0,2400); tn(110,1.4,'sawtooth',.12,0,440); [0,.7,1.4,2.1,2.8].forEach(d=>{ tn(1250,.5,'triangle',.18,d+.2); tn(1250*2.76,.25,'sine',.04,d+.2); nz(.08,5000,3,.25,'bandpass',d+.2); }); tn(523,1.2,'sine',.2,3.4); },
  tonic:()=>{ for(let i=0;i<6;i++) tn(rand(300,520),.12,'sine',.18,i*.13,rand(160,260)); tn(880,.5,'triangle',.12,.9); },
  pup:()=>{ tn(523,.15,'sine',.25); tn(784,.3,'sine',.25,.12); tn(1046,.4,'sine',.2,.24); },
  boss:()=>{ tn(46,2.6,'sawtooth',.3,0,38,.3); nz(2.2,220,1,.3); tn(69,2.2,'square',.07,.2,52,.3); MX.sting('boss'); },
  fireball:()=>{ const q=typeof projs!=='undefined'&&projs[projs.length-1]; auAt(q?q.m.position:null,50,()=>{ nz(.6,900,1,.35,'lowpass',0,200); nz(.25,2400,1.5,.12,'bandpass',0,700); tn(110,.4,'sawtooth',.05,0,55); },1); },
  relic:()=>{ [880,1108.7,1318.5,1760].forEach((f,i)=>tn(f,1.4,'sine',.1,i*.08)); },
  ignite:()=>{ nz(.8,600,1,.4,'lowpass',0,4000); [440,660,880].forEach((f,i)=>tn(f,1.2,'sine',.12,i*.1)); },
  portal:()=>{ tn(110,3,'sine',.3,0,440,.5); [1318.5,1568,1760,2093].forEach((f,i)=>tn(f,2.5,'sine',.08,.3+i*.15)); nz(2.5,800,1,.3,'bandpass',0,5000); },
  dig:()=>{ nz(.25,500,1,.4); nz(.25,400,1,.35,'lowpass',.3); nz(.1,1800,2,.06,'bandpass',.05); },
  // explosion: transient crack, saturated body, sub drop, debris patter, long rolling tail
  boom:()=>{ nz(.05,5000,.7,.5,'highpass'); nz(1.1,700,.6,.9,'lowpass',0,50); tn(48,.9,'sine',.6,0,31,.004); tn(90,.25,'square',.08,0,40); nz(2.2,240,.5,.22,'lowpass',.08,40);
    for(let i=0;i<4;i++) nz(.05,rand(1500,3500),2,.05,'bandpass',.2+Math.random()*.6); },
  ring:()=>{ tn(1320,.6,'sine',.08); tn(1980,.4,'sine',.05,.02); },
  tone:f=>{ tn(f,2.2,'sine',.28,0,null,.01); tn(f*2,1.2,'triangle',.07); tn(f*3.01,.8,'sine',.03); },
  clash:()=>{ tn(233,1,'sawtooth',.12); tn(247,1,'sawtooth',.12); nz(.5,300,1,.3); },
  wraith:()=>{ tn(900,1.1,'sawtooth',.07,0,300,.05); tn(1210,1,'sine',.08,.05,400); nz(.9,2400,3,.2,'bandpass',0,600); },
  shatter:()=>{ for(let i=0;i<5;i++) tn(rand(1800,3200),.4,'triangle',.07,i*.04); nz(.4,5000,2,.25,'highpass'); },
  howl:()=>{ tn(300,1.8,'sawtooth',.08,0,620,.4); tn(310,1.6,'sine',.12,.1,560,.4); nz(1.6,500,2,.15,'bandpass'); },
  houndSpawn:()=>{ nz(.25,3000,2,.25,'bandpass',0,600); tn(160,.3,'square',.06,0,60); },
  // Colossus footfall: sub impact, ground rumble, iron clank and a hydraulic hiss (positioned at the foot by colStomp)
  stomp:v=>{ if(v<=.02) return; nz(1.4,260,.7,.85*v,'lowpass',0,40); tn(42,1.2,'sine',.7*v,0,31); tn(jt(160),.35,'square',.06*v,.03,70); nz(.18,jt(1300),4,.12*v,'bandpass',.04); nz(.6,4500,1,.05*v,'highpass',.2,2500); },
  tear:()=>{ nz(.25,1800,2,.35,'bandpass',0,500); tn(140,.15,'square',.08,0,70); },
  board:()=>{ nz(.08,900,3,.4,'bandpass'); tn(220,.06,'square',.08); nz(.06,1200,3,.3,'bandpass',.14); },
  bell:()=>{ [220,440.5,553,661,880].forEach((f,i)=>tn(f,3.2-i*.4,'sine',[.22,.12,.08,.06,.04][i],0,null,.004)); },
  candle:()=>{ nz(.4,1200,1,.18,'bandpass',0,3000); tn(660,.6,'sine',.05,.1); },
  clang:()=>{ tn(820,.3,'triangle',.18,0,500); tn(820*2.7,.15,'sine',.04); nz(.1,3000,4,.2,'bandpass'); },
  thunder:d=>{ nz(2.8,180,.5,.55,'lowpass',d,40); nz(.6,900,.6,.25,'lowpass',d,120); nz(4,90,.5,.25,'lowpass',d+.3,30); },
  distant:()=>{ nz(1.5,150,.5,.14,'lowpass',.6,40); tn(36,1.2,'sine',.08,.6,24,.05); },
  clank:()=>{ tn(110,.6,'square',.12,0,60); nz(.4,700,2,.4,'bandpass',0,200); tn(440,.3,'triangle',.08,.25); },
  fire:()=>{ nz(1.6,700,.6,.5,'lowpass',0,2400); tn(80,1,'sawtooth',.06,0,160); },
  gameOver:()=>{ MX.stop(); MX.sting('over'); },
};
// mixing: bus per sound, rate limit per name, error isolation, and positional hints set by wrappers below
const SFX_BUS={hit:'ui',hitmarker:'ui',buy:'ui',deny:'ui',lowAmmo:'ui',pup:'ui',dry:'ui',adsIn:'ui',adsOut:'ui'};
const SFX_CAP={kill:3,hit:3,hitmarker:3,stomp:2,boom:3,step:2};
const SFXRAW={}, SFXRL={};
for(const k of Object.keys(sfx)){ const fn=sfx[k], bus=SFX_BUS[k]||'fx'; SFXRAW[k]=fn;
  sfx[k]=function(arg,arg2){ const a=AU.ctx; if(!a||!AU.fx) return; const t=a.currentTime, r=SFXRL[k]||(SFXRL[k]={t:-1,n:0}); if(t-r.t>.05){ r.t=t; r.n=0; } if(++r.n>(SFX_CAP[k]||4)) return;
    const po=AU.out, pe=AU.em, pk=VOLK; AU.out=AU[bus];
    try{ if(!AU.em&&AU.hint&&bus==='fx'){ const h=AU.hint, d=Math.hypot(h.pos.x-P.pos.x,h.pos.z-P.pos.z); const em=emitAt(h.pos,d,h.maxD,'fx',3,true); if(em) AU.em=em.inp; if(h.maxD) VOLK*=Math.max(.15,Math.pow(clamp(1-d/h.maxD,0,1),1.1)); }
      return fn(arg,arg2); }catch(e){ AU.errs++; AU.lastErr=k+': '+(e&&e.message); }finally{ AU.out=po; AU.em=pe; VOLK=pk; } }; }
// positional hints for sounds whose callers don't pass a position (behaviour-preserving wrappers)
function auHinted(fn,posOf,maxD){ return function(){ const ph=AU.hint; let pos=null; try{ pos=posOf.apply(null,arguments); }catch(e){} AU.hint=pos&&pos.x!=null?{pos,maxD}:ph; try{ return fn.apply(this,arguments); }finally{ AU.hint=ph; } }; }
if(typeof colStomp==='function') colStomp=auHinted(colStomp,f=>f&&f.plant,0);
if(typeof explode==='function') explode=auHinted(explode,p=>p,140);
if(typeof explodeFx==='function') explodeFx=auHinted(explodeFx,p=>p,140);
if(typeof rite==='function'){ const _rite=rite; rite=function(){ const r=_rite.apply(this,arguments); try{ if(AU.ctx&&state==='play') MX.sting('rite'); }catch(e){} return r; }; }
