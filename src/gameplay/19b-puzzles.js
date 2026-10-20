/* ---------- new puzzles: pressure manifold, field radio, glyph strongbox, soul canisters, brazier melody ----------
   Each puzzle reads its place from QA (16a-quest-anchors.js) and its answer from the per-game seed (questLayout).
   Solutions are in docs/QUEST.md. All state changes go through qAct (host-authoritative). */
// anchor-local → world: lx along the anchor's right, lz toward its facing
function aw(a,lx,lz){ const t=a.ry||0, c=Math.cos(t), s=Math.sin(t); return {x:a.x+lx*c+lz*s,z:a.z-lx*s+lz*c}; }
function canvasTex(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; const t=new THREE.CanvasTexture(c); return {c,g:c.getContext('2d'),t}; }
function drawGauge(g,cx,cy,r,v,chalk){ g.strokeStyle=chalk?'#e8e4d8':'#1a1410'; g.fillStyle=g.strokeStyle; g.lineWidth=r*.07; g.beginPath(); g.arc(cx,cy,r,Math.PI*1.1,Math.PI*1.9); g.stroke();
  g.font=`${Math.round(r*.32)}px "Special Elite", monospace`; g.textAlign='center'; g.textBaseline='middle';
  for(let k=1;k<=5;k++){ const a=Math.PI*1.1+(k-1)/4*Math.PI*.8, x1=cx+Math.cos(a)*r, y1=cy+Math.sin(a)*r; g.beginPath(); g.moveTo(x1,y1); g.lineTo(cx+Math.cos(a)*r*.82,cy+Math.sin(a)*r*.82); g.stroke(); g.fillText(String(k),cx+Math.cos(a)*r*.62,cy+Math.sin(a)*r*.62); }
  if(v){ const a=Math.PI*1.1+(v-1)/4*Math.PI*.8; g.lineWidth=r*.09; g.strokeStyle=chalk?'#ffd27a':'#a01a10'; g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*r*.9,cy+Math.sin(a)*r*.9); g.stroke(); } }
const needleAng=v=>1.25-(v-1)*.625;

/* ===== 1. the pressure manifold (generator yard) and its chalkboard (spawn bunker) ===== */
const VAL={set:[1,1,1],tgt:[3,3,3],solved:false,wheels:[],needles:[],lastWrong:-9};
{ const a=QA.valves, g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); g.rotation.y=a.ry; qPar(qy(a)).add(g); VAL.g=g;
  const b=GB(), S=SEG;
  b.add(new THREE.CylinderGeometry(.2,.2,5,S(10,6)),0x6a3a24,{p:[0,1.65,0],r:[0,0,Math.PI/2],grime:.3});
  for(const x of [-2.3,2.3]) b.add(new THREE.CylinderGeometry(.26,.26,.2,S(10,6)),0x4b4e51,{p:[x,1.65,0],r:[0,0,Math.PI/2]});
  for(let i=0;i<3;i++){ const x=(i-1)*1.3; b.add(new THREE.CylinderGeometry(.08,.08,.5,S(6,4)),0x4b4e51,{p:[x,1.3,.2],r:[Math.PI/2,0,0]}); b.add(new THREE.CylinderGeometry(.18,.18,.12,S(12,8)),0xa8823f,{p:[x,2.12,.12],r:[Math.PI/2,0,0]}); b.add(new THREE.CylinderGeometry(.05,.05,.3,4),0x4b4e51,{p:[x,1.9,0]}); }
  b.add(new THREE.BoxGeometry(.3,.5,.2),0x26272a,{p:[2,1.05,.15]}); b.add(new THREE.BoxGeometry(5.2,.1,.5),0x26272a,{p:[0,.05,0]});
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const face=canvasTex(128,128); face.g.fillStyle='#e8dcc0'; face.g.fillRect(0,0,128,128); drawGauge(face.g,64,74,52,0,false); face.t.needsUpdate=true; const fm=B({map:face.t});
  for(let i=0;i<3;i++){ const x=(i-1)*1.3; const f=new THREE.Mesh(new THREE.CircleGeometry(.16,16),fm); f.position.set(x,2.12,.185); g.add(f);
    const n=new THREE.Mesh(new THREE.BoxGeometry(.018,.13,.01),B({color:0xa01a10})); n.geometry.translate(0,.06,0); n.position.set(x,2.09,.195); g.add(n); VAL.needles.push(n);
    const w=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,5,14),M.rust); w.position.set(x,1.3,.46); g.add(w); const sp=box(.4,.03,.03,M.rust,0,0,0,{parent:w}); VAL.wheels.push(w);
    const lab=makeLabel('ABC'[i],{sx:.5,size:70,color:'#e8d6a8'}); lab.position.set(x,2.45,.2); g.add(lab);
    const p=aw(a,x,1.1); addInter({y:qy(a),x:p.x,z:p.z,r:.72,prompt:()=>valvePrompt(i),use:()=>qAct('valve',i)}); }
  const lever=new THREE.Group(); lever.position.set(2,1.2,.27); g.add(lever); box(.05,.45,.05,M.metal,0,.2,0,{parent:lever}); box(.1,.1,.1,B({color:0xa01a10}),0,.44,0,{parent:lever}); lever.rotation.x=-.5; VAL.lever=lever;
  const lp=aw(a,2.2,1.1); addInter({y:qy(a),x:lp.x,z:lp.z,r:.8,prompt:()=>VAL.solved||Q.stage!=='valves'||!POWER.on?null:'Pull the release lever',use:()=>qAct('vrel')});
  qCol(a.x,a.z,Math.abs(Math.sin(a.ry))>.7?.8:5.2,Math.abs(Math.sin(a.ry))>.7?5.2:.8,qy(a));
  const sg=makeLabel('PRESSURE MANIFOLD',{sx:2.2,size:44,color:'#c9a35a'}); sg.position.set(0,2.9,0); g.add(sg); }
const CHALK=canvasTex(256,192);
{ const a=QA.chalk, m=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.35),L({map:CHALK.t})); m.position.set(a.x,1.75,a.z); m.rotation.y=a.ry; scene.add(m);
  const fr=box(1.95,1.5,.06,M.wood,a.x-Math.sin(a.ry)*.04,1.75,a.z-Math.cos(a.ry)*.04,{ry:a.ry}); }
function drawChalk(){ const g=CHALK.g; g.fillStyle='#1e2a22'; g.fillRect(0,0,256,192); g.globalAlpha=.08; for(let i=0;i<40;i++){ g.fillStyle='#fff'; g.fillRect(rand(0,256),rand(0,192),rand(10,60),1); } g.globalAlpha=1;
  g.fillStyle='#e8e4d8'; g.font='20px "Special Elite", monospace'; g.textAlign='center'; g.fillText('MANIFOLD - HOLD AT',128,26);
  for(let i=0;i<3;i++){ drawGauge(g,46+i*82,108,34,VAL.tgt[i],true); g.fillStyle='#e8e4d8'; g.font='22px "Special Elite", monospace'; g.fillText('ABC'[i],46+i*82,150); }
  g.font='12px "Special Elite", monospace'; g.fillText('then pull the red lever. Not before.',128,180); CHALK.t.needsUpdate=true; }
function valvePrompt(i){ if(VAL.solved) return null; if(Q.stage!=='valves') return '!A pressure manifold. Its wheels are chained'; if(!POWER.on) return '!No pressure. The manifold needs power'; return `Turn wheel ${'ABC'[i]} (gauge reads ${VAL.set[i]})`; }
QACT.valve=i=>{ if(VAL.solved||Q.stage!=='valves'||!POWER.on) return; VAL.set[i]=VAL.set[i]%5+1; const p=aw(QA.valves,(i-1)*1.3,.5); qSound('valve',p.x,p.z,30,VAL.set[i]); };
QACT.vrel=()=>{ if(VAL.solved||Q.stage!=='valves'||!POWER.on) return; const a=QA.valves, p=aw(a,2,.6);
  if(VAL.set.every((v,i)=>v===VAL.tgt[i])){ VAL.solved=true; qSound('steam',p.x,p.z,60,1); rite(); Q.stage='candles'; const d=aw(a,0,1.6); qDrop('shard1',d.x,d.z,'Take the record shard',0xe8d6a8,qy(a));
    banner('The manifold holds','A record shard drops from the relief pipe. The chapel bell is free: ring it'); return; }
  if(GT-VAL.lastWrong<1) return; VAL.lastWrong=GT; qSound('steam',p.x,p.z,60,0); qEv('fx',{p:[p.x,qy(a)+1.4,p.z],t:'dirt',n:14});
  for(const pl of questPlayers()) if(pl.m==='main'&&Math.hypot(pl.x-p.x,pl.z-p.z)<3.5&&qdy(pl,a)<2) hurtTarget(pl.id==='h'?{remote:false}:{remote:true,id:pl.id},25,{x:p.x,z:p.z});
  qEv('toast',{s:'Scalding steam! The readings are wrong'}); for(let k=0;k<3;k++) questSpawn('walker',p.x,p.z,8,qy(a)); };

/* ===== 2. the field radio: dog tags carried by Shriekers, transmit their frequencies in order ===== */
const RADIO_DIAL=['31.5','38.0','42.5','47.0','53.5','58.0','64.5','71.0'];
const RAD={dial:0,freqs:[0,1,2],seq:0,dropped:0,spawnT:6,drop:null,done:false,lastTx:-9};
{ const a=QA.radio, g=new THREE.Group(); g.position.set(a.x,.9+qy(a),a.z); g.rotation.y=a.ry; qPar(qy(a)).add(g); RAD.g=g;
  const b=GB(); b.add(new THREE.BoxGeometry(.6,.36,.34),0x4a4a36,{grime:.3,p:[0,.18,0]}); b.add(new THREE.BoxGeometry(.5,.2,.02),0x1e1a16,{p:[0,.22,.17]});
  b.add(new THREE.CylinderGeometry(.008,.012,.9,4),0x3a3a3a,{p:[.24,.75,-.1]}); b.add(new THREE.BoxGeometry(.18,.06,.12),0x26272a,{p:[-.45,.03,.05]});
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const knob=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.04,10),M.brass); knob.rotation.x=Math.PI/2; knob.position.set(-.16,.22,.19); g.add(knob); RAD.knob=knob;
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.03,6,4),B({color:0x3a2a1a})); lamp.position.set(.18,.3,.18); g.add(lamp); RAD.lamp=lamp;
  RAD.lab=makeLabel('31.5 kc',{sx:.9,size:56,color:'#9ad06a'}); RAD.lab.position.set(0,.65,0); g.add(RAD.lab);
  addInter({y:qy(a),x:a.dial.x,z:a.dial.z,r:1.1,prompt:()=>`Turn the radio dial (${RADIO_DIAL[RAD.dial]} kc)`,use:()=>qAct('dial')});
  addInter({y:qy(a),x:a.key.x,z:a.key.z,r:1,prompt:radioKeyPrompt,use:()=>qAct('tx')}); }
function radioKeyPrompt(){ if(RAD.done) return null; if(Q.stage!=='radio') return '!Tap the key: only static answers'; return `Transmit on ${RADIO_DIAL[RAD.dial]} kc`; }
QACT.dial=()=>{ RAD.dial=(RAD.dial+1)%RADIO_DIAL.length; qSound('tune',QA.radio.x,QA.radio.z,20); };
QACT.tx=()=>{ if(Q.stage!=='radio'||RAD.done||GT-RAD.lastTx<1.2) return; RAD.lastTx=GT; const a=QA.radio;
  const need=RAD.seq+1; if(!QI.has('tag'+need)){ qSound('static',a.x,a.z,25); qEv('toast',{s:`Static. You need dog tag ${['I','II','III'][RAD.seq]} to know where to listen`}); return; }
  if(RAD.dial===RAD.freqs[RAD.seq]){ RAD.seq++; qSound('morse',a.x,a.z,30,RAD.seq);
    if(RAD.seq<3){ qEv('toast',{s:`A voice answers on ${RADIO_DIAL[RAD.dial]}… (${RAD.seq}/3)`}); return; }
    RAD.done=true; rite(); const r=qrng(Q.seed+77), d=QA.drop[Math.floor(r()*QA.drop.length)]; RAD.drop={x:d.x,z:d.z,y:40,open:false};
    banner('"Supply drop inbound. God help you."','A crate is falling near '+(ZONES[d.zone]?ZONES[d.zone].name.toLowerCase():'the site')); qSound('flare',d.x,d.z,200); return; }
  RAD.seq=0; qSound('static',a.x,a.z,25,1); qEv('toast',{s:'Wrong frequency. The static screams and the dead answer'}); for(let k=0;k<2;k++) questSpawn('walker',a.x,a.z,9,qy(a)); };
const DROP={g:null};
{ const g=new THREE.Group(); g.visible=false; scene.add(g); DROP.g=g; box(1.1,.8,.8,CRATE_MAT,0,.4,0,{parent:g}); box(1.14,.1,.84,M.metal,0,.8,0,{parent:g});
  const chute=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,6,0,Math.PI*2,0,Math.PI/2),L({color:0xd8d0b8,side:THREE.DoubleSide})); chute.position.y=4; g.add(chute); DROP.chute=chute;
  const smoke=new THREE.Mesh(new THREE.CylinderGeometry(.15,.6,12,8,1,true),M.add(0xff5a3a,.12)); smoke.position.y=6; g.add(smoke); DROP.smoke=smoke;
  DROP.o=addInter({x:0,z:0,r:1.9,prompt:()=>RAD.drop&&RAD.drop.y<=0&&!RAD.drop.open?'Open the supply drop':null,use:()=>qAct('dropOpen')}); }
QACT.dropOpen=(a,who)=>{ const d=RAD.drop; if(!d||d.y>0||d.open) return; d.open=true; qSound('crate',d.x,d.z,30); qEv('drum',{},who||'h');
  qDrop('shard2',d.x+1.2,d.z,'Take the record shard',0xe8d6a8); Q.stage='return'; banner('The Quartermaster\'s gift','Now return the Rod to the Lodestone. It needs power'); };
QEV.drum=()=>{ P.drum=true; for(const w of P.weapons){ const s=statsOf(w); w.res=s.res; } sfx.relic(); banner('Quartermaster\'s Drum Magazine','Every gun you carry holds half again as many rounds',true); };

/* ===== 3. the glyph strongbox: four glyphs with tally marks on the walls; set the box's dials to match ===== */
const GLY={walls:[],tally:[1,2,3,4],order:[0,1,2,3],dials:[1,1,1,1],open:false,lastShot:[0,0,0,0],lastWrong:-9};
for(let i=0;i<4;i++){ const ct=canvasTex(128,160), m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.375),new THREE.MeshBasicMaterial({map:ct.t,transparent:true,color:0x8a8a8a,depthWrite:false})); m.visible=false; scene.add(m); GLY.walls.push({m,ct}); }
function drawGlyphWall(w,sym,n){ const g=w.ct.g; g.clearRect(0,0,128,160); g.globalAlpha=.9; g.save(); g.beginPath(); g.rect(4,4,120,120); g.clip(); drawSym(g,120,sym,'rgba(20,14,8,0)'); g.restore();
  g.strokeStyle='#ffd27a'; g.lineWidth=5; for(let k=0;k<n;k++){ const x=16+k*18+(k>=5?6:0); if(k===4){ g.beginPath(); g.moveTo(10,150); g.lineTo(96,128); g.stroke(); continue; } g.beginPath(); g.moveTo(x,126); g.lineTo(x+3,154); g.stroke(); }
  w.ct.t.needsUpdate=true; }
const LOCKF=canvasTex(512,128);
{ const a=QA.lockbox, g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); g.rotation.y=a.ry; qPar(qy(a)).add(g); GLY.g=g;
  const b=GB(); b.add(new THREE.BoxGeometry(2.2,1.1,1),0x3a3430,{p:[0,.55,0],grime:.35}); b.add(new THREE.BoxGeometry(2.3,.12,1.1),0x6a3a24,{p:[0,1.1,0]});
  for(const x of [-1.05,1.05]) b.add(new THREE.BoxGeometry(.08,1.1,1.04),0x26272a,{p:[x,.55,0]}); b.add(new THREE.BoxGeometry(.3,.3,.1),0xa8823f,{p:[0,.35,.52]});
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const lid=new THREE.Group(); lid.position.set(0,1.16,-.5); g.add(lid); box(2.24,.1,1.04,M.rust,0,0,.5,{parent:lid}); GLY.lid=lid;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.475),B({map:LOCKF.t})); face.position.set(0,.78,.505); g.add(face);
  for(let k=0;k<4;k++){ const h=new THREE.Mesh(new THREE.BoxGeometry(.44,.44,.2),M.metal); h.position.set(-.71+k*.475,.78,.55); h.visible=false; h.userData.qhit='gd'+k; g.add(h); addSolid(h); }
  qCol(a.x,a.z,Math.abs(Math.sin(a.ry))>.7?1:2.2,Math.abs(Math.sin(a.ry))>.7?2.2:1,qy(a));
  const p=aw(a,0,1.5); addInter({y:qy(a),x:p.x,z:p.z,r:1.7,prompt:lockPrompt,use:()=>qAct('lockOpen')});
  }
function drawLockFace(){ const g=LOCKF.g; g.fillStyle='#1e1a16'; g.fillRect(0,0,512,128);
  for(let k=0;k<4;k++){ const x=k*128; g.save(); g.translate(x+10,8); drawSym(g,64,GLY.order[k],'#2a2018'); g.restore();
    g.fillStyle='#e8dcc0'; g.fillRect(x+80,24,40,64); g.fillStyle='#1a1410'; g.font='52px "Special Elite", monospace'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(GLY.dials[k]),x+100,58);
    g.strokeStyle='#6a5030'; g.lineWidth=3; g.strokeRect(x+4,4,120,120); }
  LOCKF.t.needsUpdate=true; }
function lockPrompt(){ if(GLY.open) return null; if(Q.stage!=='glyphs') return '!The diggers\' strongbox. Its dials will not turn yet'; return 'Try the strongbox lid (shoot a dial to turn it)'; }
QACT.lockOpen=()=>{ if(GLY.open||Q.stage!=='glyphs') return; const a=QA.lockbox;
  if(GLY.dials.every((v,k)=>v===GLY.tally[GLY.order[k]])){ GLY.open=true; GLY.lid.rotation.x=-1.4; rite(); qSound('unlock',a.x,a.z,40); const p=aw(a,-.6,1.4), p2=aw(a,.6,1.4);
    qDrop('vkey',p.x,p.z,'Take the vault key',0xffd27a,qy(a)); qDrop('shard3',p2.x,p2.z,'Take the record shard',0xe8d6a8,qy(a)); Q.stage='souls'; soulStart();
    banner('The strongbox opens','A vault key and the last record shard. Now feed the soul canisters'); return; }
  if(GT-GLY.lastWrong<1) return; GLY.lastWrong=GT; qSound('clash',a.x,a.z,30); qEv('fx',{p:[a.x,qy(a)+1.2,a.z],t:'spark',n:12});
  for(const pl of questPlayers()) if(pl.m==='main'&&Math.hypot(pl.x-a.x,pl.z-a.z)<3&&qdy(pl,a)<2) hurtTarget(pl.id==='h'?{remote:false}:{remote:true,id:pl.id},20,{x:a.x,z:a.z});
  qEv('toast',{s:'The lid bites back with a jolt. Wrong numbers'}); for(let k=0;k<2;k++) questSpawn('walker',a.x,a.z,9,qy(a)); };
function glyphShoot(k){ if(GLY.open||Q.stage!=='glyphs'||GT-GLY.lastShot[k]<.25) return; GLY.lastShot[k]=GT; GLY.dials[k]=GLY.dials[k]%6+1; drawLockFace(); qSound('dial',QA.lockbox.x,QA.lockbox.z,25); }

/* ===== 4. soul canisters: kill the dead inside the chalk ward, three times ===== */
const SOUL={k:0,n:0,need:10,spots:[0,1,2],g:null};
{ const g=new THREE.Group(); g.visible=false; scene.add(g); SOUL.g=g;
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.3,4.55,48),M.add(0xbff3ff,.55)); ring.rotation.x=-Math.PI/2; ring.position.y=.06; g.add(ring); SOUL.ring=ring;
  const inner=new THREE.Mesh(new THREE.RingGeometry(1.2,1.3,24),M.add(0xbff3ff,.35)); inner.rotation.x=-Math.PI/2; inner.position.y=.06; g.add(inner); SOUL.inner=inner;
  const can=new THREE.Group(); can.position.set(4.9,0,0); g.add(can); box(.5,.12,.5,M.brass,0,.06,0,{parent:can}); box(.5,.12,.5,M.brass,0,1.06,0,{parent:can});
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.88,10,1,true),M.add(0x9fe6ff,.18)); glass.position.y=.56; can.add(glass);
  const fill=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,1,10),B({color:0x9af0ff})); fill.position.y=.12; fill.scale.y=.01; can.add(fill); SOUL.fill=fill; }
function soulStart(){ SOUL.k=0; SOUL.n=0; SOUL.need=10+2*(NP()-1); soulPlace(); }
function soulPlace(){ const a=QA.souls[SOUL.spots[SOUL.k]]; SOUL.g.position.set(a.x,qy(a),a.z); qPar(qy(a)).add(SOUL.g); SOUL.g.visible=Q.stage==='souls'; }
function soulKill(p){ if(Q.stage!=='souls'||SOUL.k>=3) return; const a=SOUL.g.position; if(Math.hypot(p.x-a.x,p.z-a.z)>4.5||Math.abs(p.y-a.y)>2) return;
  SOUL.n++; qSound('soul',a.x+4.9,a.z,40,SOUL.n/SOUL.need); qEv('fx',{p:[a.x+4.9,a.y+1.2,a.z],t:'relic',n:6});
  if(SOUL.n<SOUL.need) return; SOUL.k++; SOUL.n=0;
  if(SOUL.k<3){ soulPlace(); banner(`Canister sealed (${SOUL.k}/3)`,'The ward fades and is redrawn elsewhere'); qSound('relic'); return; }
  SOUL.g.visible=false; QI.add('lantern'); rite(); Q.stage='braziers'; banner('The Soul Lantern','Three canisters burn as one. Wind the music box in the ossuary and light its braziers in its order'); qSound('relic'); }

/* ===== 5. the brazier melody: wind the chapel music box, light the dig braziers in the order it plays ===== */
const BRZ_NOTES=[196,246.9,293.7,392], BRZ_SIZE=[1.4,1.2,1,.8];
const BRZ={list:[],notes:[0,1,2,3],order:[0,1,2,3],seq:0,lastWind:-9};
QA.braziers.forEach((a,i)=>{ const g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); qPar(qy(a)).add(g);
  const b=GB(); for(let k=0;k<3;k++){ const t=k/3*Math.PI*2; b.add(new THREE.CylinderGeometry(.035,.035,1.2,4),0x26272a,{p:[Math.cos(t)*.25,.55,Math.sin(t)*.25],r:[Math.sin(t)*.25,0,-Math.cos(t)*.25]}); }
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.42,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2),L({color:0x8a6a30,side:THREE.DoubleSide})); bowl.position.y=1.25; g.add(bowl);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.28,.8,7),M.add(0xffa040,.9)); fl.position.y=1.65; fl.visible=false; g.add(fl);
  qCol(a.x,a.z,.7,.7,qy(a)); const br={i,a,g,bowl,fl,lit:false,humT:i*.7};
  addInter({y:qy(a),x:a.x,z:a.z,r:1.7,prompt:()=>br.lit?null:Q.stage==='braziers'?'Light the brazier':'!A cold brazier. Its bowl rings when you come close',use:()=>qAct('brz',i)}); BRZ.list.push(br); });
const MBOX=canvasTex(256,96);
{ const a=QA.musicbox, g=new THREE.Group(); g.position.set(a.x,a.y!==undefined?a.y:1.16,a.z); g.rotation.y=-Math.PI/2; qPar(a.y).add(g); BRZ.mg=g; // marker y is the altar top
  box(.5,.22,.34,M.wood,0,.11,0,{parent:g}); const lid=new THREE.Group(); lid.position.set(0,.22,-.17); g.add(lid); lid.rotation.x=-1.1; BRZ.lid=lid;
  box(.5,.03,.34,M.wood,0,0,.17,{parent:lid}); const strip=new THREE.Mesh(new THREE.PlaneGeometry(.46,.17),B({map:MBOX.t})); strip.position.set(0,-.02,.17); strip.rotation.x=Math.PI/2; lid.add(strip);
  const crank=box(.03,.03,.14,M.brass,.27,.12,0,{parent:g}); BRZ.crank=crank;
  addInter({y:a.y!==undefined?Math.round(a.y-1.1):0,x:a.use.x,z:a.use.z,r:1.4,prompt:()=>Q.stage==='braziers'?'Wind the music box':'!A music box. The key will not turn',use:()=>qAct('wind')}); }
function drawMusicStrip(){ const g=MBOX.g; g.fillStyle='#d8c8a0'; g.fillRect(0,0,256,96); g.strokeStyle='#8a7050'; g.lineWidth=1; for(let k=0;k<5;k++){ g.beginPath(); g.moveTo(0,12+k*18); g.lineTo(256,12+k*18); g.stroke(); }
  g.fillStyle='#1a1410'; BRZ.order.forEach((bi,k)=>{ const note=BRZ.notes[bi], y=84-note*22; g.beginPath(); g.arc(40+k*58,y,8,0,7); g.fill(); }); MBOX.t.needsUpdate=true; }
QACT.wind=()=>{ if(Q.stage!=='braziers'||GT-BRZ.lastWind<4) return; BRZ.lastWind=GT; qEv('melody',{n:BRZ.order.map(bi=>BRZ_NOTES[BRZ.notes[bi]]),p:[QA.musicbox.x,QA.musicbox.z]}); };
QEV.melody=m=>{ BRZ.playT=3; m.n.forEach((f,k)=>setTimeout(()=>sfxAt('mbox',{x:m.p[0],z:m.p[1]},40,f),300+k*650)); };
QACT.brz=i=>{ if(Q.stage!=='braziers') return; const br=BRZ.list[i]; if(br.lit) return; const a=br.a;
  if(BRZ.order[BRZ.seq]===i){ br.lit=true; br.fl.visible=true; BRZ.seq++; qSound('brazier',a.x,a.z,40,BRZ_NOTES[BRZ.notes[i]]);
    if(BRZ.seq===4){ rite(); openDescent(); } return; }
  BRZ.list.forEach(b=>{ b.lit=false; b.fl.visible=false; }); BRZ.seq=0; qSound('clash',a.x,a.z,40); qEv('toast',{s:'The flames die together. Something climbs out of the pit'}); for(let k=0;k<3;k++) questSpawn('walker',a.x,a.z,7,qy(a)); };
function openDescent(){ Q.stage='descent'; Q.sink=1; lodeParts.shaft.visible=true; lodeParts.shaftBeam.visible=true; sfx.portal(); banner('The way below is open','Step into the light at the Lodestone'); }

/* ===== per-frame puzzle visuals (all machines) ===== */
function updatePuzzles(dt){
  VAL.needles.forEach((n,i)=>{ const t=needleAng(VAL.set[i]); n.rotation.z+=(t-n.rotation.z)*Math.min(1,dt*8); VAL.wheels[i].rotation.z+=((-VAL.set[i]*1.2)-VAL.wheels[i].rotation.z)*Math.min(1,dt*6); });
  VAL.lever.rotation.x=VAL.solved?.6:-.5;
  RAD.knob.rotation.y=RAD.dial*.6; if(RAD.labV!==RAD.dial){ RAD.labV=RAD.dial; RAD.lab.userData.draw(RADIO_DIAL[RAD.dial]+' kc'); } RAD.lamp.material.color.set(Q.stage==='radio'?(Math.sin(GT*6)>0?0x9ad06a:0x2a3a1a):0x3a2a1a);
  const d=RAD.drop; if(d){ DROP.g.visible=true; if(d.y>0&&NET.role!=='client') d.y=Math.max(0,d.y-dt*7); DROP.g.position.set(d.x,d.y,d.z); DROP.chute.visible=d.y>0; DROP.smoke.material.opacity=d.open?0:.12+Math.sin(GT*3)*.04; DROP.o.x=d.x; DROP.o.z=d.z; if(d.y>0&&Math.random()<dt*20) spawnParticles(new V3(d.x,.3,d.z),'ember',1); } else DROP.g.visible=false;
  const lit=Q.stage==='glyphs'; GLY.walls.forEach(w=>w.m.material.color.set(lit?0xffffff:0x6a6a6a));
  if(Q.stage==='souls'){ SOUL.ring.rotation.z+=dt*.3; SOUL.inner.rotation.z-=dt; SOUL.fill.scale.y=Math.max(.01,SOUL.n/SOUL.need)*.86; SOUL.fill.position.y=.12+SOUL.fill.scale.y*.5; SOUL.ring.material.opacity=.45+Math.sin(GT*3)*.15; }
  for(const br of BRZ.list){ if(br.lit){ br.fl.scale.set(1,.8+Math.random()*.5,1); if(Math.random()<dt*8) spawnParticles(new V3(br.a.x,qy(br.a)+1.8,br.a.z),'ember',1); }
    br.humT-=dt; if(br.humT<=0){ br.humT=3; if(mode==='main'&&Math.hypot(P.pos.x-br.a.x,P.pos.z-br.a.z)<3.5&&qdy(P.pos,br.a)<2) sfxAt('bowl',{x:br.a.x,z:br.a.z},12,BRZ_NOTES[BRZ.notes[br.i]]); } }
  if(BRZ.playT>0){ BRZ.playT-=dt; BRZ.crank.rotation.x+=dt*8; }
}
// radio stage: the Shriekers carry the tags (host keeps one walking until all three have dropped)
function updateRadioStage(dt){ if(Q.stage!=='radio'||RAD.dropped>=3||mode!=='main') return; if(zombies.some(z=>!z.dead&&z.kind==='shrieker')||QP.some(e=>e.key.startsWith('tag'))) return;
  RAD.spawnT-=dt; if(RAD.spawnT<=0&&aliveCount()<maxAlive()){ RAD.spawnT=10; spawnZombie('shrieker'); } }
function radioTagDrop(p){ if(Q.stage!=='radio'||RAD.dropped>=3) return false; const n=++RAD.dropped, f=RADIO_DIAL[RAD.freqs[n-1]];
  qDrop('tag'+n,p.x,p.z,`Take dog tag ${['I','II','III'][n-1]} (scratched: ${f} kc)`,0xc8c8b8); return true; }
['1','2','3'].forEach((n,i)=>{ QTAKE['tag'+n]=()=>{ QI.add('tag'+n); qSound('pup'); qEv('toast',{s:`Dog tag ${['I','II','III'][i]}: "${RADIO_DIAL[RAD.freqs[i]]} kc" scratched into the tin`}); }; });
