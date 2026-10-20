/* ---------- spaces: ambience beds and one-shots for the Château and the Underworks ----------
   One looping bed per area (built when you enter, faded out and freed when you leave; at most the current one and one fading):
     chateau  wind whistling through broken windows, rain muffled by the roof
     upper    stronger wind, rain on the boards overhead (+ timber creaks)
     tunnel   low moving air, a far draught whistle (+ drips, metal groans)
     pump     machinery hum with a slow pump beat and a steam hiss, positioned at the boiler (+ dripping, steam bursts at the pipes)
     gallery  water lapping round the walkways, a faint shimmer off the water (+ plops, splashes)
     ossuary  wind through the bone niches, two drifting whistles (+ whispers, bone rattles, moaning gusts)
     vault    furnace roar and crackle at the dais (positioned), a low beating drone (+ furnace pops, iron groans)
   Beds play on the ambience bus; levels set by the loudness pass (about -30 LUFS for an area alone). */
const SPACE_AT={pump:{x:18.5,y:-5.6,z:-16,ref:5},vault:{x:-28,y:-8.4,z:-75,ref:7}};
function spNoise(a){ const s=a.createBufferSource(); s.buffer=AU.noise; s.loop=true; s.loopStart=0; return s; }
function spFilt(a,type,f,q){ const b=a.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q==null?.7:q; return b; }
function spLfo(a,f,depth,param,B){ const o=a.createOscillator(); o.frequency.value=f; const g=a.createGain(); g.gain.value=depth; o.connect(g); g.connect(param); B.srcs.push(o); return o; }
// noise -> filter chain -> gain -> dst; returns the gain
function spBand(a,B,dst,chain,v){ const s=spNoise(a); let h=s, first=null; for(const [ty,f,q] of chain){ const b=spFilt(a,ty,f,q); first=first||b; h.connect(b); h=b; } const g=a.createGain(); g.gain.value=v; h.connect(g); g.connect(dst); B.srcs.push(s); g.filt=first; return g; }
function spOsc(a,B,dst,type,f,v){ const o=a.createOscillator(); o.type=type; o.frequency.value=f; const g=a.createGain(); g.gain.value=v; o.connect(g); g.connect(dst); B.srcs.push(o); return g; }
const SPACE_BEDS={
  chateau:(a,B,g)=>{ const w=spBand(a,B,g,[['bandpass',650,6]],.08); spLfo(a,.13,.04,w.gain,B); spLfo(a,.09,220,w.filt.frequency,B); spBand(a,B,g,[['highpass',60,.7],['lowpass',900,.7]],.06); },
  upper:(a,B,g)=>{ const w=spBand(a,B,g,[['bandpass',900,5]],.07); spLfo(a,.17,.035,w.gain,B); spLfo(a,.12,300,w.filt.frequency,B); spBand(a,B,g,[['highpass',500,.7],['lowpass',1600,.7]],.06); },
  tunnel:(a,B,g)=>{ const air=spBand(a,B,g,[['highpass',45,.7],['lowpass',170,.7]],.34); spLfo(a,.05,.12,air.gain,B); spBand(a,B,g,[['bandpass',420,10]],.025); },
  pump:(a,B,g,f)=>{ const hum=a.createGain(); hum.gain.value=1; hum.connect(g); const lp=spFilt(a,'lowpass',380,.8); lp.connect(hum);
    spOsc(a,B,lp,'sawtooth',50,.075); spOsc(a,B,hum,'sine',100,.05); spOsc(a,B,hum,'sine',150.5,.017); spLfo(a,.85,.35,hum.gain,B);
    spBand(a,B,g,[['bandpass',3200,1.5]],.008); spBand(a,B,f,[['highpass',40,.7],['lowpass',140,.7]],.05); },
  gallery:(a,B,g)=>{ const lap=spBand(a,B,g,[['highpass',60,.7],['lowpass',480,.7]],.2); spLfo(a,.31,.11,lap.gain,B); spLfo(a,.53,.07,lap.gain,B); const sh=spBand(a,B,g,[['bandpass',1400,3]],.022); spLfo(a,.7,.014,sh.gain,B); },
  ossuary:(a,B,g)=>{ const w1=spBand(a,B,g,[['bandpass',1100,12]],.22), w2=spBand(a,B,g,[['bandpass',1750,14]],.11); spLfo(a,.07,.14,w1.gain,B); spLfo(a,.11,.07,w2.gain,B); spLfo(a,.05,320,w1.filt.frequency,B); spLfo(a,.08,420,w2.filt.frequency,B);
    spBand(a,B,g,[['highpass',45,.7],['lowpass',200,.7]],.2); },
  vault:(a,B,g,f)=>{ spBand(a,B,g,[['highpass',45,.7],['lowpass',320,.8]],.075); const cr=spBand(a,B,g,[['highpass',2500,.7]],.007); spLfo(a,13,.006,cr.gain,B);
    spOsc(a,B,f,'sine',41.2,.025); spOsc(a,B,f,'sine',41.7,.025); spOsc(a,B,f,'sine',61.8,.01); },
};
const SPB={cur:null,area:null,fading:[]};
function spaceBuild(area){ const a=AU.ctx, mk=SPACE_BEDS[area]; if(!mk) return null; const B={srcs:[],area}; const t=a.currentTime;
  B.g=a.createGain(); B.g.gain.value=0; B.f=a.createGain(); B.f.gain.value=0; B.f.connect(AU.amb);
  const at=SPACE_AT[area]; if(at){ const pn=a.createPanner(); pn.panningModel='equalpower'; pn.distanceModel='inverse'; pn.refDistance=at.ref; pn.rolloffFactor=1; pn.maxDistance=1e4; auPos(pn,at.x,at.y,at.z); B.g.connect(pn); pn.connect(AU.amb); B.pn=pn; }
  else B.g.connect(AU.amb);
  mk(a,B,B.g,B.f);
  for(const s of B.srcs){ try{ s.start(t,s.buffer?Math.random()*1.5:undefined); }catch(e){ try{ s.start(t); }catch(er){} } }
  B.g.gain.setTargetAtTime(1,t,.9); B.f.gain.setTargetAtTime(1,t,.9); return B; }
function spaceFree(B){ const a=AU.ctx, t=a.currentTime; B.g.gain.cancelScheduledValues(t); B.f.gain.cancelScheduledValues(t); B.g.gain.setTargetAtTime(0,t,.5); B.f.gain.setTargetAtTime(0,t,.5);
  for(const s of B.srcs){ try{ s.stop(t+3); }catch(e){} } setTimeout(()=>{ try{ B.g.disconnect(); B.f.disconnect(); if(B.pn) B.pn.disconnect(); }catch(e){} },3300); }
// called every frame from audioFrame with the current reverb area (null on the title screen)
function spaceBeds(area){ if(!AU.ctx||!AU.amb) return; const want=area&&SPACE_BEDS[area]?area:null; if(want===SPB.area) return; SPB.area=want;
  if(SPB.cur){ spaceFree(SPB.cur); SPB.cur=null; } if(want) SPB.cur=spaceBuild(want); }
// ---- one-shots (from auWorld's ambience timer); returns seconds until the next one
function spAt(x,y,z,dur){ const d=Math.hypot(x-P.pos.x,z-P.pos.z,y-(P.pos.y||0)); return emitAt({x,y,z},d,30,'fx',dur||2,false); }
function spNear(rmin,rmax,dy){ const ang=rand(0,6.28), r=rand(rmin,rmax); return {x:P.pos.x+Math.cos(ang)*r,y:(P.pos.y||0)+(dy||0),z:P.pos.z+Math.sin(ang)*r}; }
function spaceTick(area,a,t){ if(auBusy()) return 1; const T_=(em,f,d,ty,v,fe,at,dl)=>auTrack(lT(a,em.inp,t+(dl||0),f,d,ty,v,fe,at)), N_=(em,d,f,q,v,ty,dl,fe,at)=>auTrack(lN(a,em.inp,t+(dl||0),d,f,q,v,ty,fe,at));
  const drip=(em,v)=>{ const f=rand(1100,1900); T_(em,f,.09,'sine',v,f*.6,.001); N_(em,.02,4000,3,v*.4,'bandpass'); };
  if(area==='upper'){ const p=spNear(3,10,1.5), em=spAt(p.x,p.y,p.z,1.2); if(!em) return 2; if(Math.random()<.65){ const f=rand(380,560); N_(em,rand(.3,.6),f,18,.06,'bandpass',0,f*rand(.8,.95),.08); T_(em,rand(140,190),.07,'triangle',.04,null,.003,rand(.2,.4)); } else T_(em,rand(110,160),.12,'triangle',.06,80,.003); return rand(3.5,8); }
  if(area==='chateau'){ const p=spNear(6,14,1), em=spAt(p.x,p.y,p.z,2); if(!em) return 3; T_(em,rand(120,170),.1,'triangle',.06,90,.003); T_(em,rand(120,170),.08,'triangle',.04,90,.003,.14); N_(em,.6,3500,1,.012,'highpass',.2); return rand(7,14); }
  if(area==='tunnel'){ const p=spNear(4,10,2.5), em=spAt(p.x,p.y,p.z,1.8); if(!em) return 2; if(Math.random()<.15){ N_(em,1.4,180,20,.08,'bandpass',0,120,.3); T_(em,55,.8,'sawtooth',.012,48,.2); } else drip(em,.05); return rand(2,5); }
  if(area==='pump'){ if(Math.random()<.1){ const em=spAt(rand(9,23),-4,-29.5,1.2); if(!em) return 1; N_(em,.8,4000,1,.06,'highpass',0,2500,.02); return rand(1,3); }
    const em=spAt(rand(8.5,23.5),-4.4,rand(-29.5,-14.5),1); if(!em) return 1; drip(em,.06); return rand(.5,1.4); }
  if(area==='gallery'){ const em=spAt(rand(25,45),-7.3,rand(-31,-13),1.4); if(!em) return 1.5; if(Math.random()<.15){ N_(em,.6,900,.7,.08,'lowpass',0,250,.02); T_(em,220,.3,'sine',.05,90); } else { T_(em,rand(500,750),.12,'sine',.05,rand(250,350),.003); N_(em,.15,900,1,.03,'lowpass'); } return rand(1,3); }
  if(area==='ossuary'){ const p=spNear(6,14,1.2), em=spAt(p.x,p.y,p.z,2.5); if(!em) return 2; const r=Math.random();
    if(r<.4){ const n=3+Math.floor(Math.random()*4); let d=0; for(let i=0;i<n;i++){ const len=rand(.12,.22); N_(em,len,rand(500,900),6,.03,'bandpass',d,null,.04); N_(em,len,rand(1500,2400),7,.02,'bandpass',d,null,.04); d+=len+rand(.04,.1); } }
    else if(r<.75){ let d=0; for(let i=0;i<5+Math.floor(Math.random()*4);i++){ N_(em,.015,rand(2200,3600),8,.05,'bandpass',d); if(Math.random()<.5) T_(em,rand(600,900),.03,'triangle',.02,null,.002,d); d+=rand(.03,.09); } }
    else N_(em,2,700,8,.04,'bandpass',0,900,.8); return rand(2.5,6); }
  if(area==='vault'){ const at=SPACE_AT.vault; if(Math.random()<.12){ const p=spNear(6,14,2), em=spAt(p.x,p.y,p.z,2); if(!em) return 1; N_(em,1.6,140,14,.07,'bandpass',0,90,.3); T_(em,48,1.2,'sawtooth',.012,38,.2); return rand(2,4); }
    const em=spAt(at.x+rand(-2,2),at.y,at.z+rand(-2,2),.6); if(!em) return 1; for(let i=0;i<1+Math.floor(Math.random()*3);i++) N_(em,.04,1800,2,.08,'bandpass',i*.07); return rand(.6,1.8); }
  return 0; }
// test handles (window.__G.AU.dbg in test builds)
Object.assign(AU.dbg,{SPB,spaceTick,areaNow,occlusion,auSrcY});
