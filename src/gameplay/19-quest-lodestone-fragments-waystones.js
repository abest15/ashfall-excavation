/* ---------- quest: Lodestone, fragments, waystones ---------- */
const Q={frag:{dig:false,locker:false,marked:false},stage:'frags',t:0,stones:[]};
const fragCount=()=>(Q.frag.dig?1:0)+(Q.frag.locker?1:0)+(Q.frag.marked?1:0);
const lodeParts={};
{ const g=new THREE.Group(); g.position.set(LODE.x,0,LODE.z); scene.add(g); lodeParts.g=g;
  const ob=new THREE.Mesh(new THREE.CylinderGeometry(.55,1.15,5,6),L({map:stoneTex,color:0x6a6a70})); ob.position.y=2.5; g.add(ob); ob.userData.lodestone=true; addSolid(ob); lodeParts.ob=ob;
  const vein=new THREE.Mesh(new THREE.CylinderGeometry(.57,1.17,4.2,6,1,true),M.add(0x74d9ea,.12)); vein.position.y=2.3; g.add(vein); lodeParts.vein=vein;
  const cap=new THREE.Mesh(new THREE.OctahedronGeometry(.6),B({color:0x2a5a66})); cap.position.y=5.5; cap.scale.y=1.6; g.add(cap); lodeParts.cap=cap;
  const ped=box(1.4,.9,.9,M.stone,0,.45,1.6,{parent:g}); addSolid(ped);
  const slots=[]; for(let i=0;i<3;i++){ const s=new THREE.Mesh(new THREE.OctahedronGeometry(.13),B({color:0x74d9ea})); s.position.set(-.4+i*.4,1.05,1.6); s.scale.y=1.6; s.visible=false; g.add(s); slots.push(s); } lodeParts.slots=slots;
  const rodShow=buildGun('rod',false); rodShow.position.set(0,1.7,1.6); rodShow.rotation.x=Math.PI/2; rodShow.visible=false; g.add(rodShow); lodeParts.rodShow=rodShow;
  const rodShowUp=buildGun('rod',true); rodShowUp.position.set(0,1.7,1.6); rodShowUp.rotation.x=Math.PI/2; rodShowUp.visible=false; g.add(rodShowUp); lodeParts.rodShowUp=rodShowUp;
  const shaft=new THREE.Mesh(new THREE.CircleGeometry(2.2,24),M.add(0x74d9ea,.85)); shaft.rotation.x=-Math.PI/2; shaft.position.y=.06; shaft.visible=false; g.add(shaft); lodeParts.shaft=shaft;
  const shaftBeam=new THREE.Mesh(new THREE.CylinderGeometry(2,2.2,30,16,1,true),M.add(0x74d9ea,.18)); shaftBeam.position.y=15; shaftBeam.visible=false; g.add(shaftBeam); lodeParts.shaftBeam=shaftBeam;
  addCol(LODE.x,LODE.z,2.2,2.2); addCol(LODE.x,LODE.z+1.6,1.4,.9);
  addInter({quest:true,x:LODE.x,z:LODE.z+2.9,r:2.3,prompt:lodePrompt,use:lodeUse});
}
const hasRod=(up)=>P.weapons.some(w=>w.id==='rod'&&w.up===up);
const ROD_STAGES={stones:'!The Rod is restless. Wake the three waystones',echoes:'!Something rings out across the site. Find the resonators',valves:'!The chapel bell is chained. Balance the manifold in the pump room below',candles:'!The chapel bell waits to be rung',radio:'!The Gauntlet crackles. Listen to the field radio',ember:"!The Saint's Ember waits on the chapel altar",colossus:'!The Colossus carries what you need. Ride it',gauntlet:'!Take the Ember and the Heart to the chapel workbench'};
function lodePrompt(){
  const s=Q.stage;
  if(s==='frags') return fragCount()===3?'Set the three fragments into the Lodestone':`!The Lodestone hums. Fragments ${fragCount()}/3`;
  if(s==='assembling') return '!The Lodestone is binding the Rod…';
  if(s==='rodReady') return 'Take the Lodestone Rod';
  if(ROD_STAGES[s]) return hasRod(false)?ROD_STAGES[s]:'Reclaim the Lodestone Rod';
  if(s==='return') return hasRod(false)?(POWER.on?'Return the Rod to the Lodestone':'!The Lodestone needs power to awaken the Rod'):'Reclaim the Lodestone Rod';
  if(s==='awakening') return '!The Rod is awakening. Stay close and hold the dig!';
  if(s==='awakenReady') return 'Take the Awakened Rod';
  if(s==='wraith') return hasRod(true)?'!A wraith stalks the site. Wound it with the Awakened Rod':'Reclaim the Awakened Rod';
  if(s==='felling') return hasRod(true)?'!Bring down the Colossus. Breach its glowing valves':'Reclaim the Awakened Rod';
  if(ROD_UP_STAGES[s]) return hasRod(true)?ROD_UP_STAGES[s]:'Reclaim the Awakened Rod';
  if(s==='strike') return hasRod(true)?'!Strike the Lodestone with the Awakened Rod':'Reclaim the Awakened Rod';
  if(s==='descent') return 'Descend into the Hollow';
  return null;
}
function lodeUse(){
  const s=Q.stage;
  if(s==='frags'&&fragCount()===3){ Q.stage='assembling'; Q.t=6; lodeParts.slots.forEach(x=>x.visible=true); sfx.relic(); toast('The fragments fuse in the stone'); rite(); }
  else if(s==='rodReady'){ Q.stage='stones'; lodeParts.rodShow.visible=false; giveWeapon(mkInst('rod')); sfx.relic(); toast('The Rod pulls toward the waystones'); }
  else if((ROD_STAGES[s]||s==='return')&&!hasRod(false)){ giveWeapon(mkInst('rod')); sfx.relic(); }
  else if(s==='return'&&hasRod(false)&&POWER.on){ const i=P.weapons.findIndex(w=>w.id==='rod'); P.weapons.splice(i,1); P.cur=0; buildVM(); Q.stage='awakening'; Q.t=45; Q.spawnT=0; Q.warden=false; lodeParts.rodShow.visible=true; sfx.boss(); banner('The Rod awakens','Stay near the Lodestone for forty-five seconds'); }
  else if(s==='awakenReady'){ Q.stage='wraith'; lodeParts.rodShowUp.visible=false; giveWeapon(mkInst('rod',true)); sfx.relic(); startWraith(); }
  else if((s==='wraith'||s==='felling'||s==='strike'||ROD_UP_STAGES[s])&&!hasRod(true)){ giveWeapon(mkInst('rod',true)); sfx.relic(); }
  else if(s==='descent'){ enterHollow(); }
}
// chapel cipher: ring the bell, read the glass, light the candelabras in its order
function muralLit(on){ CH.panes.forEach(p=>p.m.material.color.set(on?0xffffff:0x262626)); }
function chapelReset(){ CH.order=pickN([0,1,2,3],4); CH.seq=0; CH.solved=false; CH.mural=0; CH.swing=0;
  CH.panes.forEach((p,k)=>{ drawSym(p.c.getContext('2d'),128,CH.order[k],['#5a1830','#183060','#24501c','#5a4010'][k]); p.tex.needsUpdate=true; }); muralLit(false);
  CH.cands.forEach(c=>{ c.lit=false; c.flames.forEach(f=>f.visible=false); }); }
function ringBell(){ if(GT-CH.bellT<1.2) return; CH.bellT=GT; CH.swing=1; sfx.bell(); if(Q.stage==='candles'&&!CH.solved){ CH.mural=14; muralLit(true); toast('The glass blazes behind the altar. Read it quickly.'); } }
function lightCandle(i){ const c=CH.cands[i]; if(c.lit) return; if(Q.stage!=='candles'){ toast('The wicks are damp. Not yet.'); return; }
  if(CH.order[CH.seq]===i){ c.lit=true; c.flames.forEach(f=>f.visible=true); CH.seq++; sfx.candle(); if(CH.seq===4) candlesDone(); }
  else { CH.cands.forEach(x=>{ x.lit=false; x.flames.forEach(f=>f.visible=false); }); CH.seq=0; sfx.clash(); toast('The flames gutter out. Something stirs.'); if(mode==='main') for(let k=0;k<3;k++) spawnZombie('walker'); } }
function candlesDone(){ CH.solved=true; muralLit(true); rite(); sfx.relic(); Q.stage='ember';
  spawnItem('ember',57.6,17.5,"Take the Saint's Ember",0xffb050,()=>{ P.items.add('ember'); Q.stage='colossus'; banner("The Saint's Ember",'It pulls toward the Colossus. Ride it: stand where its glowing foot will land'); },1.7);
  banner('The candles hold','Something waits on the altar'); }
// world pickups (parts and relics) and the workbench
function spawnItem(key,x,z,label,col,take,y=1){ const m=new THREE.Mesh(key==='ember'?new THREE.OctahedronGeometry(.22):new THREE.BoxGeometry(.34,.22,.34),B({color:col})); if(key==='ember') m.scale.y=1.6; m.position.set(x,y,z); scene.add(m);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.45,.03,4,18),M.add(col,.6)); halo.rotation.x=Math.PI/2; m.add(halo); pickups.push({m,key,x,z,label,take,y}); }
const AEGIS=['strap','plate','rivets'], AEGIS_NAMES={strap:'leather strap',plate:'iron plate',rivets:'bag of rivets'};
const AEGIS_SPOTS={strap:[[-24,-8],[-6,-24],[14,-24]],plate:[[70,-26.5],[94,-4],[58,-12]],rivets:[[34,10],[57,27],[-7,46]]};
function spawnAegisParts(){ for(const k of AEGIS){ const [x,z]=pick(AEGIS_SPOTS[k]); spawnItem(k,x,z,`Pick up the ${AEGIS_NAMES[k]}`,0xd9b26a,()=>{ P.items.add(k); sfx.pup(); toast(`Aegis part: ${AEGIS_NAMES[k]} (${AEGIS.filter(q=>P.items.has(q)).length}/3)`); },.55); } }
const ITEM_NAMES={ember:"Saint's Ember",heart:'Colossus Heart',strap:'Aegis strap',plate:'Aegis plate',rivets:'Aegis rivets'};
function benchPrompt(){ if(Q.stage==='gauntlet'&&P.items.has('ember')&&P.items.has('heart')) return POWER.on?'Build the Tempest Gauntlet':'!The bench tools need power';
  if(Q.gauntlet&&!P.weapons.some(w=>w.id==='gauntlet')) return 'Take back the Tempest Gauntlet';
  if(!P.aegis&&AEGIS.every(k=>P.items.has(k))) return 'Build the Iron Aegis shield';
  if(P.aegis) return null; return `!Workbench · Iron Aegis parts ${AEGIS.filter(k=>P.items.has(k)).length}/3`; }
function benchUse(){
  if(Q.stage==='gauntlet'&&P.items.has('ember')&&P.items.has('heart')&&POWER.on){ P.items.delete('ember'); P.items.delete('heart'); Q.gauntlet=true; giveWeapon(mkInst('gauntlet')); rite(); Q.stage='radio'; RAD.spawnT=6; sfx.forge(); banner('The Tempest Gauntlet','A storm in your fist. It crackles with a signal: the Shriekers carry the frequencies'); return; }
  if(Q.gauntlet&&!P.weapons.some(w=>w.id==='gauntlet')){ giveWeapon(mkInst('gauntlet')); sfx.relic(); return; }
  if(!P.aegis&&AEGIS.every(k=>P.items.has(k))){ AEGIS.forEach(k=>P.items.delete(k)); P.aegis=true; sfx.forge(); banner('Iron Aegis','Strapped to your back. Hits from behind glance off',true); } }
function rite(){ Q.rites=(Q.rites||0)+1; }
const BLESS={stone:{name:'Stoneskin Blessing: take 25% less damage',letter:'S'},knife:{name:'Resonant Knife: your knife cleaves and kills',letter:'K'},talisman:{name:'Ashen Talisman: every tonic, free',letter:'T'}};
function grantBless(k){ P.bless.add(k); sfx.relic();
  if(k==='knife') updateKnifeLook();
  if(k==='talisman'){ for(const t in TONICS) if(!TONICS[t].quest||Q.tonicOpen) P.perks.add(t); P.maxHp=175; P.hp=175; } }
function strikeLodestone(w){ if(w.up&&Q.stage==='strike'){ Q.stage='glyphs'; sfx.portal(); rite(); banner('The Lodestone cracks','Four glyphs burn on the walls of the site. The officers\' strongbox upstairs in the Château answers to them'); } }
const ROD_UP_STAGES={gravecaller:'!The Gravecaller walks. Put it down',glyphs:'!Read the glyphs on the walls. Open the strongbox',souls:'!The soul canisters are empty. Fill them in the ward',braziers:'!Light the braziers in the music box\'s order'};
// waystones
function waystone(x,z,name){ const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const p=box(.9,3.2,.9,L({map:stoneTex,color:0x7a7a74}),0,1.6,0,{parent:g}); p.userData.waystone=Q.stones.length; addSolid(p);
  box(1.3,.3,1.3,M.stone,0,.15,0,{parent:g}); const top=new THREE.Mesh(new THREE.ConeGeometry(.65,.6,4),M.stone); top.position.y=3.5; top.rotation.y=Math.PI/4; g.add(top);
  const rm=B({color:0x2a2620}); const band=new THREE.Mesh(new THREE.BoxGeometry(.94,.25,.94),rm); band.position.y=2.3; g.add(band);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,.04,4,24),M.add(0x74d9ea,0)); ring.rotation.x=Math.PI/2; ring.position.y=.12; g.add(ring);
  addCol(x,z,1.3,1.3); Q.stones.push({x,z,name,kills:0,fed:false,lit:false,rm,ring,g});
}
waystone(14,22,'trench waystone'); waystone(-22,-3,'dig waystone'); waystone(24,-6,'yard waystone');
const STONE_KILLS=12;
function strikeStone(i){ const st=Q.stones[i]; if(Q.stage!=='stones'||st.lit) return;
  if(!st.fed){ if(GT-(Q.lastHungry||-9)>3){ Q.lastHungry=GT; toast('The waystone is hungry. Kill the dead near it.'); } return; }
  st.lit=true; st.rm.color.set(0x74d9ea); st.ring.material.opacity=.7; sfx.ignite(); toast(`The ${st.name} blazes`);
  if(Q.stones.every(s=>s.lit)){ Q.stage='echoes'; rite(); grantBless('stone'); startEchoes(); banner('Stoneskin','The waystones harden your skin. Now listen: something rings'); } }
// resonators: tuning forks; strike in pitch order (bigger = deeper), twice
const RES_SPOTS=[[-4,12],[22,20],[-21,-17],[2,-21],[32,-2],[-18,14],[18,-21],[-16,-4]];
const RES_DEF=[{s:1.35,f:196},{s:1,f:294},{s:.7,f:440}];
const RESON=[];
RES_DEF.forEach((d,i)=>{ const g=new THREE.Group(); g.visible=false; scene.add(g); const h=2.2*d.s;
  box(.9*d.s+.2,.25,.7,M.stone,0,.12,0,{parent:g});
  for(const sx of [-1,1]) box(.12,h,.12,M.metal,sx*.26*d.s,.25+h/2,0,{parent:g});
  box(.52*d.s+.12,.1,.14,M.metal,0,.25,0,{parent:g}); box(.08,.5,.08,M.brass,0,.25+h+.25,0,{parent:g});
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.16),B({color:0x24414a})); gem.position.y=.25+h+.62; gem.scale.y=1.5; g.add(gem);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.5*d.s+.3,.03,4,20),M.add(0x74d9ea,0)); ring.rotation.x=Math.PI/2; ring.position.y=.3+h*.5; g.add(ring);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(.9*d.s+.3,h+1,.6),M.metal); hit.position.y=(h+1)/2; hit.visible=false; hit.userData.reson=i; g.add(hit);
  const col={minX:0,maxX:0,minZ:0,maxZ:0,on:false}; colliders.push(col);
  RESON.push({g,gem,ring,hit,col,f:d.f,last:-9,flash:0}); });
function placeResonators(){ const spots=pickN(RES_SPOTS,3); RESON.forEach((r,i)=>{ const [x,z]=spots[i]; r.g.position.set(x,0,z); r.g.rotation.y=rand(0,6.28); r.g.visible=true;
  Object.assign(r.col,{minX:x-.6,maxX:x+.6,minZ:z-.6,maxZ:z+.6,on:true}); addSolid(r.hit); r.gem.material.color.set(0x24414a); }); }
function hideResonators(){ RESON.forEach(r=>{ r.g.visible=false; r.col.on=false; removeSolid(r.hit); }); }
function startEchoes(){ Q.echo={verse:1,seq:[],order:[0,1,2],moveT:0}; placeResonators(); }
function hitReson(i){ const E=Q.echo; if(Q.stage!=='echoes'||!E||E.moveT>0) return; const r=RESON[i]; if(GT-r.last<.35) return; r.last=GT; r.flash=1; sfx.tone(r.f);
  if(E.order[E.seq.length]===i){ E.seq.push(i); r.gem.material.color.set(0x9af0ff);
    if(E.seq.length===3){ if(E.verse===1){ E.verse=2; E.seq=[]; E.order=[2,1,0]; E.moveT=2.2; sfx.relic(); toast('The echoes shift and scatter. Listen again.'); }
      else { hideResonators(); Q.stage='valves'; rite(); grantBless('knife'); banner('The Resonant Knife','Your blade sings. The chapel bell is chained: balance the pressure manifold in the pump room below the yard'); } } }
  else { E.seq=[]; RESON.forEach(x=>x.gem.material.color.set(0x24414a)); setTimeout(()=>sfx.clash(),120); toast('The tones clash. The dead answer.');
    if(mode==='main') for(let k=0;k<2;k++) spawnZombie(R.n>=8&&Math.random()<.4?'burster':'walker'); } }
// the wraith: wound it three times with the Awakened Rod, then destroy the Warden it possesses
const WRAITH_PTS=[[2,20],[30,-21],[-21,-21]];
const WR={g:null,hit:null};
{ const g=new THREE.Group(); g.visible=false; scene.add(g); WR.g=g;
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.42),B({color:0xdffbff})); core.scale.y=1.6; g.add(core);
  const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(.95,0),M.add(0x74d9ea,.28)); g.add(halo); WR.halo=halo;
  const veil=new THREE.Mesh(new THREE.ConeGeometry(.75,2.2,8,1,true),M.add(0x8ae8ff,.18)); veil.position.y=-1.1; veil.rotation.x=Math.PI; g.add(veil);
  for(const sx of [-1,1]){ const e=new THREE.Mesh(new THREE.BoxGeometry(.1,.04,.02),B({color:0x0a1a20})); e.position.set(sx*.13,.15,.37); g.add(e); }
  const beamM=new THREE.Mesh(new THREE.CylinderGeometry(.25,.5,40,8,1,true),M.add(0x74d9ea,.06)); beamM.position.y=18; g.add(beamM);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(1.1,8,6),M.metal); hit.visible=false; hit.userData.wraith=true; g.add(hit); WR.hit=hit; }
function startWraith(){ Q.wr={hits:0,moving:0,from:new V3(),to:new V3(),lastMsg:-9,touch:-9,bound:false}; const p=WRAITH_PTS[0]; WR.g.position.set(p[0],2.6,p[1]); WR.g.visible=true; addSolid(WR.hit); sfx.wraith(); banner('A wraith rises','Wound it three times with the Awakened Rod'); }
function hitWraith(w){ const W=Q.wr; if(Q.stage!=='wraith'||!W||W.moving>0||W.bound) return;
  if(!(w.id==='rod'&&w.up)){ if(GT-W.lastMsg>3){ W.lastMsg=GT; toast('Bullets pass through it. Only the Awakened Rod can wound it'); } return; }
  W.hits++; sfx.wraith(); spawnParticles(WR.g.position,'relic',14); flashScreen('rgba(160,240,255,.35)');
  if(W.hits<3){ W.from.copy(WR.g.position); const p=WRAITH_PTS[W.hits]; W.to.set(p[0],2.6,p[1]); W.moving=2.4; toast(`The wraith flees, shrieking (${W.hits}/3)`);
    const n=4+W.hits*2; for(let k=0;k<n;k++) setTimeout(()=>{ if(state==='play'&&mode==='main') spawnZombie(R.n>=8&&Math.random()<.3?'burster':'walker'); },k*350); }
  else { W.bound=true; WR.g.visible=false; removeSolid(WR.hit); const z=spawnZombie('boss'); z.wraithBound=true; z.hp*=1.3; z.maxHp=z.hp; banner('The wraith takes a body','Destroy the bound Warden'); } }
function wraithDone(){ rite(); grantBless('talisman'); startGravecaller(); banner('The Ashen Talisman','Every tonic burns in you. Something answers from the dig…'); }
// fragments in world
const pickups=[];
function spawnFrag(key,x,z){ const m=new THREE.Mesh(new THREE.OctahedronGeometry(.22),B({color:0x74d9ea})); m.scale.y=1.7; m.position.set(x,1,z); scene.add(m);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.45,.03,4,18),M.add(0x74d9ea,.6)); halo.rotation.x=Math.PI/2; m.add(halo); pickups.push({m,key,x,z}); }
function takeFrag(key){ Q.frag[key]=true; sfx.relic(); toast(`Rod fragment recovered (${fragCount()}/3)`); if(fragCount()===3) banner('Three fragments','Set them into the Lodestone at the dig'); }
// dig mounds
const MOUNDS=[];
function mound(x,z,frag){ const m=new THREE.Mesh(new THREE.ConeGeometry(1.1,.55,8),M.mud); m.position.set(x,.27,z); scene.add(m);
  const stake=box(.08,.9,.08,M.wood,x+.6,.45,z+.3,{rz:.2}); const md={x,z,frag,dug:false,m,stake}; MOUNDS.push(md);
  addInter({x,z,r:1.8,prompt:()=>md.dug?null:'Dig through the disturbed earth',use:()=>{ if(md.dug) return; md.dug=true; m.scale.y=.25; sfx.dig(); spawnParticles(new V3(x,.5,z),'dirt',10);
    if(md.frag&&!Q.frag.dig&&NET.role!=='client'){ spawnFrag('dig',x,z); toast('Something glints in the mud'); return; }
    const r=Math.random(); if(r<.4){ addPts(100); toast('Buried coins: +100'); } else if(r<.6){ dropPup(x,z); } else toast('Nothing but mud'); }});
}
mound(-22,20,true); mound(22,12); mound(-4,24); mound(-24,-12); mound(4,-14); mound(31,-22);
// locker
const LOCKER={door:null,open:false};
{ const g=new THREE.Group(); g.position.set(38.6,0,-26); g.rotation.y=-Math.PI/2; scene.add(g);
  const b=box(1,2.1,.7,M.metal,0,1.05,0,{parent:g}); addSolid(b); const d=new THREE.Group(); d.position.set(-.5,0,.36); g.add(d); box(1,2,.05,M.rust,.5,1.05,0,{parent:d}); LOCKER.door=d;
  box(.9,.04,.04,M.wire,0,1.2,.4,{parent:g});
  addCol(38.6,-26,.7,1);
  addInter({quest:true,x:37.3,z:-26,r:1.8,prompt:()=>{ if(LOCKER.open) return null; return POWER.on?'Pry open the field locker':'!The locker is bolted shut. Its lock runs on power'; },
    use:()=>{ if(!POWER.on||LOCKER.open) return; LOCKER.open=true; LOCKER.door.rotation.y=-1.6; sfx.door(); spawnFrag('locker',36.8,-26); }});
}
