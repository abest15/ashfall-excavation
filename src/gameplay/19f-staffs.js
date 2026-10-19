/* ---------- the four elemental staffs: one per player (a full squad), each with its own parts, binding and trial ----------
   Cinder (molten slag), Brine (tidal pressure), Grave (soul-drain), Gale (glass-storm). Each staff has three parts:
   one carried by a special dead, one behind a small target puzzle, one earned in a defence. The parts are bound at the
   staff pedestals in the chapel (each binding has its own condition), then each staff is upgraded by its own trial.
   Staffs are claimed per player (host-tracked); a solo player can build all four but carries one at a time and swaps
   at the pedestals. All four upgraded staffs must be set in the Deep Vault door. Alt-fire: aim (right click / LT) and fire.
   Places come from QA.staffs (16a-quest-anchors.js); answers from the game seed. Solutions in docs/QUEST.md. */
const STAFF_IDS=['cinder','brine','grave','gale'];
Object.assign(WD,{
  cinder:{name:'Cinder Staff',up:'Cinder Staff · Forgeheart',type:'rod',staff:true,dmg:700,rate:.45,mag:10,res:60,rl:2.4,spread:0,head:1.2,pierce:2,beam:true,bcol:0xff7a2a,snd:'staffCinder',upStats:{dmg:1800,mag:16,res:120,rate:.38}},
  brine:{name:'Brine Staff',up:'Brine Staff · Fathom',type:'rod',staff:true,dmg:520,rate:.3,mag:16,res:96,rl:2.2,spread:0,head:1.2,pierce:6,beam:true,bcol:0x3ad0c0,snd:'staffBrine',upStats:{dmg:1400,mag:24,res:160,pierce:10,rate:.25}},
  grave:{name:'Grave Staff',up:'Grave Staff · Last Rites',type:'rod',staff:true,dmg:380,rate:.12,auto:true,mag:30,res:180,rl:2.4,spread:.004,head:1.2,pierce:1,beam:true,chain:true,chainN:2,chainMul:.6,bcol:0xb070ff,snd:'staffGrave',upStats:{dmg:1000,mag:45,res:270,chainN:4}},
  gale:{name:'Gale Staff',up:'Gale Staff · Glasswind',type:'rod',staff:true,dmg:260,rate:.6,mag:8,res:56,rl:2.2,spread:.06,head:1.5,pierce:2,pellets:6,beam:true,bcol:0xd8f0ff,snd:'staffGale',upStats:{dmg:700,mag:12,res:96,pellets:8,rate:.5}},
});
for(const k of STAFF_IDS){ HANDLING[k]=HANDLING.rod; VMC[k]=VMC.rod; }
const STAFF_COL={cinder:0xff7a2a,brine:0x3ad0c0,grave:0xb070ff,gale:0xd8f0ff};
const STAFF_CSS={cinder:'#ff8a3a',brine:'#4ad8c8',grave:'#c08aff',gale:'#e8f6ff'};
const STAFF_ALT={cinder:'Slag Geyser',brine:'Undertow',grave:'Soul Harvest',gale:'Glass Cyclone'};
// what each part is and where it comes from (journal / pedestal hints)
const STAFF_PARTS={
  cinder:[{n:'slag core',how:'drop',kind:'sapper',hint:'a Sapper carries it'},{n:'bellows grip',how:'seq',order:'size-up',hint:'shoot the embers round the Forge, smallest to largest'},{n:'quench ring',how:'zone',hint:'kill 8 dead in the burning fuel trench'}],
  brine:[{n:'tide gem',how:'drop',kind:'hound',hint:'an ash hound swallowed it'},{n:'barnacle haft',how:'seq',order:'size-down',hint:'shoot the brine jars in No Man\'s Land, largest to smallest'},{n:'pressure cap',how:'hold',hint:'hold the crater pump in No Man\'s Land for 8 s'}],
  grave:[{n:'bone finial',how:'drop',kind:'warden',hint:'an Iron Warden wears it'},{n:'mourning band',how:'seq',order:'height-up',hint:'shoot the chapel\'s skull lamps, lowest to highest'},{n:'vigil candle',how:'hold',hint:'keep vigil at the dig\'s gravestone for 8 s'}],
  gale:[{n:'glass eye',how:'drop',kind:'shrieker',hint:'a Shrieker keeps it'},{n:'chime spindle',how:'seq',order:'flash',hint:'shoot the trench wire chimes in the order they flash'},{n:'vane blade',how:'zone',hint:'kill 10 dead in the middle of the generator yard'}],
};
const STAFF_BIND={cinder:'needs power to heat the coil',brine:'needs the manifold\'s pressure (solve the manifold)',grave:'wants a soul: kill one of the dead within 12 m while it binds',gale:'stand within 3 m for 6 s while it spins'};
const STAFF_TRIAL={cinder:'Quench it: 12 of the dead must die in its slag',brine:'Turn the tide: push 20 of the dead with its Undertow',grave:'Lay the Grave Warden to rest (start it at the pedestal)',gale:'Charge it at the vane shrine in No Man\'s Land: 20 s during a live round'};
const STF={}; STAFF_IDS.forEach(k=>STF[k]={parts:[false,false,false],seq:[],seqOrder:[0,1,2],zone:0,hold:0,holding:false,built:false,bind:0,bindOk:false,owner:null,up:false,trial:0,trialOn:false,placed:false});
// ----- pedestals (shared workbench + swap point) in the chapel
const STAFF_MAT={}; STAFF_IDS.forEach(k=>STAFF_MAT[k]=L({color:STAFF_COL[k],emissive:STAFF_COL[k],emissiveIntensity:.25}));
const PED=[];
STAFF_IDS.forEach((k,i)=>{ const a=QA.staffs.pedestals[i], g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); scene.add(g);
  const b=GB(); b.add(new THREE.CylinderGeometry(.45,.55,.9,SEG(10,6)),0x5a554c,{p:[0,.45,0],grime:.3}); b.add(new THREE.CylinderGeometry(.5,.5,.08,SEG(10,6)),0xa8823f,{p:[0,.92,0]});
  for(let j=0;j<3;j++){ const t=j/3*Math.PI*2; b.add(new THREE.BoxGeometry(.1,.1,.1),0x26272a,{p:[Math.cos(t)*.32,1,Math.sin(t)*.32]}); }
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.1),B({color:STAFF_COL[k]})); gem.position.y=1.15; g.add(gem);
  const lab=makeLabel(WD[k].name.toUpperCase(),{sx:1.6,size:44,color:STAFF_CSS[k]}); lab.position.y=2.9; g.add(lab);
  const model=buildGun(k,false,STAFF_MAT[k]); model.rotation.x=-Math.PI/2; model.position.y=1.85; model.visible=false; g.add(model);
  const glow=new THREE.Mesh(new THREE.CylinderGeometry(.3,.45,1.4,10,1,true),M.add(STAFF_COL[k],0)); glow.position.y=1.7; g.add(glow);
  addCol(a.x,a.z,1,1); PED.push({k,g,gem,model,glow,a,o:addInter({x:a.x,z:a.z+(a.z<17.5?-1.2:1.2),r:1.2,prompt:()=>pedPrompt(k),use:()=>qAct('ped',[k,P.weapons.some(w=>w.id===k)?1:0])})}); });
// ----- part puzzles: three shootable targets per staff (sizes and heights are what the order rules read)
const SEQ_SIZES=[.11,.17,.25];
const STQ={};
STAFF_IDS.forEach(k=>{ STQ[k]=QA.staffs[k].seq.map((a,i)=>{ const geo=k==='brine'?new THREE.CylinderGeometry(.6,.6,1.3,8):k==='grave'?new THREE.SphereGeometry(.6,8,6):new THREE.OctahedronGeometry(.7);
  const m=new THREE.Mesh(geo,B({color:STAFF_COL[k]})); m.position.set(a.x,qy(a)+(a.h||2),a.z); scene.add(m);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.5,6,4),M.metal); hit.visible=false; hit.userData.qhit='st_'+k+'_'+i; m.add(hit); addSolid(hit); return {m,hit,a,size:1,lit:false,flash:0}; }); });
// ----- defences: hold points (Brine pump, Grave vigil) and kill zones (Cinder trench, Gale yard)
const SHOLD={};
['brine','grave'].forEach(k=>{ const a=QA.staffs[k].hold, g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); scene.add(g);
  const b=GB(); if(k==='brine'){ b.add(new THREE.BoxGeometry(.6,1.1,.6),0x4b4e51,{p:[0,.55,0],grime:.3}); b.add(new THREE.CylinderGeometry(.06,.06,1,6),0x6a3a24,{p:[.35,1.1,0],r:[0,0,1.2]}); b.add(new THREE.CylinderGeometry(.25,.25,.1,10),0x26272a,{p:[0,1.15,0]}); }
  else { b.add(new THREE.BoxGeometry(.7,1.2,.18),0x77736b,{p:[0,.6,0],grime:.35}); b.add(new THREE.BoxGeometry(.9,.15,.25),0x5a554c,{p:[0,.08,0]}); b.add(new THREE.BoxGeometry(.5,.08,.04),0x26272a,{p:[0,.95,.1]}); }
  g.add(new THREE.Mesh(b.done(),L({vertexColors:true}))); addCol(a.x,a.z,.8,.8);
  SHOLD[k]={a,g,o:addInter({hold:true,x:a.x,z:a.z+1.1,r:1.3,prompt:()=>sholdPrompt(k),use:()=>{}})}; });
function sholdPrompt(k){ const S=STF[k]; if(S.parts[2]||!POWER.on) return S.parts[2]?null:'!It is dead without power'; const p=Math.min(100,Math.round(S.hold/8*100));
  return k==='brine'?`Hold to work the crater pump${p?' · '+p+'%':''}`:`Hold to keep vigil at the grave${p?' · '+p+'%':''}`; }
// ----- the Gale vane shrine (upgrade trial)
const VANE={};
{ const a=QA.staffs.gale.shrine, g=new THREE.Group(); g.position.set(a.x,0,a.z); scene.add(g); VANE.g=g;
  const b=GB(); b.add(new THREE.CylinderGeometry(.08,.1,3.2,6),0x4b4e51,{p:[0,1.6,0]}); b.add(new THREE.CylinderGeometry(1.4,1.5,.1,16),0x5a554c,{p:[0,.05,0]}); g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const vane=new THREE.Group(); vane.position.y=3.2; g.add(vane); for(let i=0;i<4;i++){ const f=box(.9,.04,.25,B({color:0xd8f0ff}),.45,0,0,{parent:vane}); f.position.set(Math.cos(i*Math.PI/2)*.45,0,Math.sin(i*Math.PI/2)*.45); f.rotation.y=-i*Math.PI/2; } VANE.vane=vane;
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.2,2.4,24),M.add(0xd8f0ff,.2)); ring.rotation.x=-Math.PI/2; ring.position.y=.07; g.add(ring); VANE.ring=ring; addCol(a.x,a.z,.4,.4); }
// ----- elemental effects in the world (host simulates, clients draw from the snapshot): slag pools and glass cyclones
const SFX_POOL=[]; const SFX_LIVE=[];
function sfxMesh(kind){ let m=SFX_POOL.find(q=>!q.used&&q.kind===kind); if(!m){ const mesh=kind==='slag'?new THREE.Mesh(new THREE.CircleGeometry(1,16),M.add(0xff6a1a,.6)):new THREE.Mesh(new THREE.CylinderGeometry(1,.3,3,12,1,true),M.add(0xd8f0ff,.25));
  if(kind==='slag'){ mesh.rotation.x=-Math.PI/2; mesh.position.y=.06; } scene.add(mesh); m={kind,mesh,used:false}; SFX_POOL.push(m); } m.used=true; m.mesh.visible=true; return m; }
function sfxFree(m){ m.used=false; m.mesh.visible=false; }
function staffArea(kind,x,z,r,life,dps,who,staff){ if(NET.role==='client') return; const m=sfxMesh(kind); SFX_LIVE.push({kind,x,z,r,life,dps,who,staff,m,t:0}); }
// ----- per-game reset and seeded layout
function staffLayout(r){ STAFF_IDS.forEach(k=>{ const S=STF[k]; Object.assign(S,{parts:[false,false,false],seq:[],zone:0,hold:0,holding:false,built:false,bind:0,bindOk:false,owner:null,up:false,trial:0,trialOn:false,placed:false});
    const perm=qShuffle([0,1,2],r); STQ[k].forEach((t,i)=>{ t.size=perm[i]; t.lit=false; t.m.scale.setScalar(k==='cinder'?SEQ_SIZES[t.size]/.7*1.4:k==='brine'?SEQ_SIZES[t.size]/.6*1.6:k==='grave'?.3:.28); });
    // the order each puzzle wants (indices into STQ[k])
    const idx=[0,1,2]; if(k==='cinder') S.seqOrder=idx.slice().sort((a,b)=>STQ[k][a].size-STQ[k][b].size);
    else if(k==='brine') S.seqOrder=idx.slice().sort((a,b)=>STQ[k][b].size-STQ[k][a].size);
    else if(k==='grave') S.seqOrder=idx.slice().sort((a,b)=>(STQ[k][a].a.h||2)-(STQ[k][b].a.h||2));
    else S.seqOrder=qShuffle(idx,r); });
  SFX_LIVE.forEach(e=>sfxFree(e.m)); SFX_LIVE.length=0; }
const staffParts=k=>STF[k].parts.filter(Boolean).length;
const myStaff=()=>STAFF_IDS.find(k=>P.weapons.some(w=>w.id===k));
function ownerName(id){ if(id==='h') return NET.role==='solo'?'You':(NET.roster.find(p=>p.id==='h')||{name:'The host'}).name; const r=NET.remotes[id]; return r?r.name:'Someone'; }
// ----- pedestal: craft (binding), claim, swap, return, Grave trial
function pedPrompt(k){ const S=STF[k], name=WD[k].name, me=NET.myId||'h';
  if(!S.built){ if(S.bind>0) return `!The ${name} is binding… ${STAFF_BIND[k]}`; const n=staffParts(k);
    if(n<3) return `!${name} · parts ${n}/3: `+STAFF_PARTS[k].map((p,i)=>(S.parts[i]?'✓ ':'✗ ')+p.n).join(', ');
    return `Bind the ${name} (${STAFF_BIND[k]})`; }
  if(S.placed) return '!Its socket is empty. The staff waits in the vault door';
  if(S.owner&&S.owner!==me) return `!${ownerName(S.owner)} carries the ${name}`;
  const holding=P.weapons.some(w=>w.id===k);
  if(S.owner===me&&holding){ if(k==='grave'&&!S.up&&!S.trialOn) return 'Wake the Grave Warden (upgrade trial)'; return `Return the ${name}`; }
  const other=myStaff(); return other&&other!==k?`Swap your ${WD[other].name} for the ${name}`:`Take the ${name}${S.up?' (upgraded)':''}`; }
QACT.ped=(arg,who)=>{ const [k,holding]=Array.isArray(arg)?arg:[arg,0], S=STF[k]; if(!S||S.placed) return; who=who||'h';
  if(!S.built){ if(S.bind>0||staffParts(k)<3) return; if(k==='cinder'&&!POWER.on){ qEv('toast',{s:'The binding coil is cold. It needs power'},who); return; }
    if(k==='brine'&&!VAL.solved){ qEv('toast',{s:'The Brine Staff wants pressure. Balance the manifold first'},who); return; }
    S.bind=k==='gale'?6:k==='grave'?20:4; S.bindOk=false; S.binder=who; qSound('relic',QA.staffs.pedestals[STAFF_IDS.indexOf(k)].x,QA.staffs.pedestals[STAFF_IDS.indexOf(k)].z,40); banner(`Binding the ${WD[k].name}`,STAFF_BIND[k]); return; }
  const cur=STAFF_IDS.find(q=>STF[q].owner===who&&q!==k);
  if(S.owner===who){ if(!holding){ qEv('staffTake',{s:k,up:S.up?1:0},who); return; } if(k==='grave'&&!S.up&&!S.trialOn){ graveTrialStart(); return; } S.owner=null; qEv('staffTake',{s:k,rm:1},who); return; }
  if(S.owner&&(S.owner==='h'||NET.remotes[S.owner])) return; // claimed by someone still in the game
  if(cur){ STF[cur].owner=null; qEv('staffTake',{s:cur,rm:1},who); }
  S.owner=who; qEv('staffTake',{s:k,up:S.up?1:0},who); qSound('relic'); };
QEV.staffTake=m=>{ const i=P.weapons.findIndex(w=>w.id===m.s); if(m.rm){ if(i>=0){ P.weapons.splice(i,1); if(!P.weapons.length) P.weapons.push(mkInst('pistol')); P.cur=Math.min(P.cur,P.weapons.length-1); buildVM(); } return; }
  for(const k of STAFF_IDS){ if(k===m.s) continue; const j=P.weapons.findIndex(w=>w.id===k); if(j>=0){ P.weapons.splice(j,1); P.cur=0; } }
  giveWeapon(mkInst(m.s,!!m.up)); toast(`${statsOf({id:m.s,up:!!m.up}).name} · alt-fire: aim and fire for ${STAFF_ALT[m.s]}`); };
function staffBuilt(k){ const S=STF[k]; S.bind=0; S.built=true; S.owner=null; qSound('forge'); banner(`The ${WD[k].name}`,`Bound. Take it from its pedestal. Upgrade: ${STAFF_TRIAL[k]}`); }
function staffUpgrade(k){ const S=STF[k]; if(S.up) return; S.up=true; S.trialOn=false; qSound('portal'); banner(`${WD[k].up}`,'The staff answers. It is stronger now');
  if(S.owner) qEv('staffTake',{s:k,up:1},S.owner); }
// ----- the Grave trial: a Grave Warden rises in the dig
function graveTrialStart(){ const S=STF.grave; if(S.trialOn||S.up) return; S.trialOn=true; const a=QA.staffs.grave.trial; const z=questSpawn('boss',a.x,a.z,2); if(z){ z.graveTrial=true; z.hp*=.8; z.maxHp=z.hp; } banner('The Grave Warden','Lay it to rest. The Grave Staff drinks its death'); }
// ----- part tasks
function staffPartFound(k,i,x,z){ if(STF[k].parts[i]||QP.some(e=>e.key==='sp_'+k+i)) return; qDrop('sp_'+k+i,x,z,`Take the ${WD[k].name.split(' ')[0]} ${STAFF_PARTS[k][i].n}`,STAFF_COL[k]); }
STAFF_IDS.forEach(k=>[0,1,2].forEach(i=>{ QTAKE['sp_'+k+i]=()=>{ STF[k].parts[i]=true; qSound('pup'); qEv('toast',{s:`${WD[k].name} part: ${STAFF_PARTS[k][i].n} (${staffParts(k)}/3)`}); }; }));
function staffKill(z,p){ if(!POWER.on) return;
  // drops
  const kind=z.boss&&!z.prime&&!z.gravecaller&&!z.wraithBound?'warden':z.kind;
  for(const k of STAFF_IDS){ const d=STAFF_PARTS[k][0]; if(d.kind===kind&&!STF[k].parts[0]&&(kind!=='hound'||Math.random()<.35)) staffPartFound(k,0,p.x,p.z); }
  // kill zones
  if(!STF.cinder.parts[2]&&TRAP.t>0&&p.x>TRAP.x0&&p.x<TRAP.x1&&p.z>TRAP.z0-.6&&p.z<TRAP.z1+.6){ STF.cinder.zone++; if(STF.cinder.zone>=8) staffPartFound('cinder',2,TRAP.x1+1,18.4); }
  const gz=QA.staffs.gale.zone; if(!STF.gale.parts[2]&&Math.hypot(p.x-gz.x,p.z-gz.z)<6){ STF.gale.zone++; qEv('fx',{p:[p.x,1.2,p.z],t:'spark',n:4}); if(STF.gale.zone>=10) staffPartFound('gale',2,gz.x,gz.z); }
  // trials
  if(z.graveTrial&&!STF.grave.up) staffUpgrade('grave'); }
function staffShoot(id){ const m=/^st_(\w+)_(\d)$/.exec(id); if(!m) return; const k=m[1], i=+m[2], S=STF[k], t=STQ[k][i]; if(S.parts[1]||!POWER.on||t.lit) return;
  if(S.seqOrder[S.seq.length]===i){ S.seq.push(i); t.lit=true; qSound('chime',t.a.x,t.a.z,40); if(S.seq.length===3){ const a=QA.staffs[k].seqDrop; staffPartFound(k,1,a.x,a.z); qEv('toast',{s:`Something drops loose (${WD[k].name})`}); } }
  else { S.seq=[]; STQ[k].forEach(q=>q.lit=false); qSound('clash',t.a.x,t.a.z,40); qEv('toast',{s:'Wrong order. They go dark'}); for(let n=0;n<2;n++) questSpawn('walker',t.a.x,t.a.z,8); } }
QACT.sholdStart=k=>{ const S=STF[k]; if(!S||S.parts[2]||S.holdSurge||!POWER.on) return; S.holdSurge=true; PWR.surge+=4+2*NP(); PWR.surgeT=1; qSound('alarm',QA.staffs[k].hold.x,QA.staffs[k].hold.z,80); };
QACT.shold=k=>{ const S=STF[k]; if(!S||S.parts[2]||!POWER.on) return; const a=QA.staffs[k].hold; staffPartFound(k,2,a.x,a.z+1.6); };
// ----- firing: primary impact effects and the alt-fire (aim + fire)
function staffImpact(w,s,e,seen){ const k=w.id; if(!STF[k]) return; const ids=[...seen].map(z=>z.id).filter(Boolean);
  if(k==='grave'&&seen.size) P.hp=Math.min(P.maxHp,P.hp+1.5*seen.size);
  if(k==='gale') spawnParticles(e,'spark',2);
  if(k==='cinder'||k==='brine') qAct('stfx',[k,w.up?1:0,0,+e.x.toFixed(2),+e.z.toFixed(2),ids,+P.pos.x.toFixed(2),+P.pos.z.toFixed(2)]); }
function staffAlt(w){ if(w.mag<3){ sfx.dry(); return true; } w.mag-=3; w.next=GT+1.1; NET.shots++; camera.updateMatrixWorld();
  const o=camera.position.clone(), d=new V3(0,0,-1).applyQuaternion(camera.quaternion); ray.set(o,d); ray.far=40; const h=ray.intersectObjects(solids,false)[0]; const e=h?h.point:o.clone().addScaledVector(d,30);
  const muz=camera.localToWorld(new V3(.2,-.18,-.8)); beam(muz,e,w.up?3:2,STAFF_COL[w.id]); spawnParticles(e,w.id==='cinder'?'ember':w.id==='grave'?'relic':'spark',10); VM.rodFlare=1; sfx[WD[w.id].snd](true);
  qAct('stfx',[w.id,w.up?1:0,1,+e.x.toFixed(2),+e.z.toFixed(2),[],+P.pos.x.toFixed(2),+P.pos.z.toFixed(2)]); return true; }
function pushZ(z,fx,fz,d){ if(z.wstate||z.boss) return; const p=z.g.position; p.x+=fx*d; p.z+=fz*d; collide(p,.33); }
QACT.stfx=(a,who)=>{ const [k,up,alt,x,z,ids,sx,sz]=a; if(!STF[k]) return; const s=statsOf({id:k,up:!!up}); who=who||'h'; const src=sx!==undefined?{x:sx,z:sz}:who==='h'?{x:P.pos.x,z:P.pos.z}:(NET.remotes[who]&&NET.remotes[who].st)||{x,z}; // the shooter's own position travels with the shot
  if(!alt){ if(k==='cinder') staffArea('slag',x,z,up?2.8:2,up?5:3,s.dmg*.8,who,k);
    if(k==='brine') for(const id of ids){ const zz=zombies.find(q=>q.id===id); if(!zz||zz.dead) continue; const dx=zz.g.position.x-src.x, dz=zz.g.position.z-src.z, l=Math.hypot(dx,dz)||1; pushZ(zz,dx/l,dz/l,up?2.2:1.5); }
    return; }
  qEv('altfx',{k,p:[x,z],up});
  if(k==='cinder'){ const n=up?3:1, dx=x-src.x, dz=z-src.z, l=Math.hypot(dx,dz)||1; for(let i=0;i<n;i++){ const px=x+dx/l*i*3, pz=z+dz/l*i*3; for(const q of zombies){ if(q.dead||q.rise>0) continue; const d=Math.hypot(q.g.position.x-px,q.g.position.z-pz); if(d<4) hitZombie(q,s.dmg*3*(1-d/8),1,'gun'); } staffArea('slag',px,pz,3.2,up?6:4,s.dmg,who,k); } }
  else if(k==='brine'){ let n=0; for(const q of zombies){ if(q.dead||q.rise>0) continue; const dx=q.g.position.x-src.x, dz=q.g.position.z-src.z, d=Math.hypot(dx,dz); if(d<7&&d>.01){ hitZombie(q,s.dmg*1.5,1,'gun'); pushZ(q,dx/d,dz/d,up?5:4); n++; } }
    const S=STF.brine; if(!S.up&&S.owner===who&&n){ S.trial+=n; if(S.trial>=20) staffUpgrade('brine'); } }
  else if(k==='grave'){ let kills=0; for(const q of zombies){ if(q.dead||q.rise>0) continue; const d=Math.hypot(q.g.position.x-x,q.g.position.z-z); if(d<6){ hitZombie(q,s.dmg*3,1,'gun'); if(q.dead) kills++; } } if(kills) qEv('heal',{n:kills},who); }
  else if(k==='gale') staffArea('cyclone',x,z,7,4,s.dmg*.8,who,k); };
QEV.altfx=m=>{ const p=new V3(m.p[0],1,m.p[1]); spawnParticles(p,m.k==='cinder'?'ember':m.k==='grave'?'relic':'spark',16); sfxAt('staffAlt',{x:m.p[0],z:m.p[1]},60,m.k); if(m.k==='cinder') explodeFx(p); };
QEV.heal=m=>{ P.hp=Math.min(P.maxHp,P.hp+10*m.n); const w=P.weapons.find(q=>q.id==='grave'); if(w) w.mag=Math.min(statsOf(w).mag,w.mag+m.n); };
// ----- per frame
function updateStaffs(dt){ const host=NET.role!=='client', me=NET.myId||'h';
  PED.forEach(pd=>{ const S=STF[pd.k]; pd.model.visible=S.built&&!S.owner&&!S.placed; pd.model.rotation.z+=dt*.6; pd.gem.material.color.set(S.built||staffParts(pd.k)===3?STAFF_COL[pd.k]:0x2a2620); pd.glow.visible=S.bind>0; pd.glow.material.opacity=.3+Math.sin(GT*8)*.15;
    if(S.bind>0&&Math.random()<dt*12) spawnParticles(new V3(pd.a.x+rand(-.3,.3),1.6,pd.a.z+rand(-.3,.3)),pd.k==='cinder'?'ember':pd.k==='grave'?'relic':'spark',1); });
  for(const k of STAFF_IDS) STQ[k].forEach((t,i)=>{ t.m.visible=!STF[k].parts[1]; t.m.rotation.y+=dt; let c=t.lit?0xffffff:STAFF_COL[k];
    if(k==='gale'&&!t.lit){ const ord=STF.gale.seqOrder, ph=(GT%6)/6; const at=ord.indexOf(i); if(ph>at*.15+.1&&ph<at*.15+.22) c=0xffffff; } t.m.material.color.set(c); });
  VANE.vane.rotation.y+=dt*(STF.gale.trial>0?4:.6); VANE.ring.material.opacity=STF.gale.built&&!STF.gale.up?.25+Math.sin(GT*3)*.1:.08;
  // effects in the world (host: damage; everyone: visuals)
  for(let i=SFX_LIVE.length-1;i>=0;i--){ const e=SFX_LIVE[i]; e.life-=dt; e.t+=dt; const m=e.m.mesh; m.position.x=e.x; m.position.z=e.z;
    if(e.kind==='slag'){ m.scale.setScalar(e.r); m.material.opacity=.45+Math.sin(GT*7+i)*.1; if(Math.random()<dt*6) spawnParticles(new V3(e.x+rand(-e.r,e.r)*.6,.2,e.z+rand(-e.r,e.r)*.6),'ember',1); }
    else { m.scale.set(e.r*.6,1,e.r*.6); m.position.y=1.5; m.rotation.y+=dt*9; if(Math.random()<dt*14) spawnParticles(new V3(e.x+rand(-2,2),rand(.3,2.6),e.z+rand(-2,2)),'spark',1); }
    if(host){ NET.credit=e.who==='h'?null:e.who; for(const z of zombies){ if(z.dead||z.rise>0) continue; const p=z.g.position, dx=e.x-p.x, dz=e.z-p.z, d=Math.hypot(dx,dz); if(d>e.r) continue;
        if(e.kind==='cyclone'&&!z.boss&&!z.wstate&&d>.6){ p.x+=dx/d*dt*3; p.z+=dz/d*dt*3; collide(p,.33); }
        hitZombie(z,e.dps*dt,1,'gun'); if(z.dead&&e.kind==='slag'&&e.who===STF.cinder.owner&&!STF.cinder.up){ STF.cinder.trial++; if(STF.cinder.trial>=12) staffUpgrade('cinder'); } } NET.credit=null; }
    if(e.life<=0){ sfxFree(e.m); SFX_LIVE.splice(i,1); } }
  // holds (local progress; the host gets the start and the finish)
  for(const k of ['brine','grave']){ const S=STF[k], H=SHOLD[k]; const can=POWER.on&&!S.parts[2]&&curInter&&curInter.o===H.o&&!P.downed&&!P.dead;
    if(can&&(keys.KeyE||PAD.useHeld)){ if(S.hold===0) qAct('sholdStart',k); S.hold+=dt; if(Math.random()<dt*8) spawnParticles(new V3(H.a.x,1.2,H.a.z),k==='brine'?'spark':'relic',1); if(S.hold>=8){ S.hold=0; qAct('shold',k); } }
    else S.hold=Math.max(0,S.hold-dt*2); }
  if(!host) return;
  // binding
  for(const k of STAFF_IDS){ const S=STF[k]; if(!(S.bind>0)) continue; const a=QA.staffs.pedestals[STAFF_IDS.indexOf(k)];
    if(k==='gale'){ const near=questPlayers().some(p=>p.m==='main'&&Math.hypot(p.x-a.x,p.z-a.z)<3); if(near) S.bind-=dt; else S.bind=Math.min(6,S.bind+dt*.5); if(S.bind<=0) staffBuilt(k); }
    else if(k==='grave'){ S.bind-=dt; if(S.bindOk) staffBuilt(k); else if(S.bind<=0){ S.bind=0; qEv('toast',{s:'The Grave Staff found no soul. Bind it again, and kill near it'}); } }
    else { S.bind-=dt; if(S.bind<=0) staffBuilt(k); } }
  // Gale trial: its owner stands at the vane shrine during a live round
  const G=STF.gale; if(G.built&&!G.up&&G.owner&&!R.inBreak&&mode==='main'){ const sh=QA.staffs.gale.shrine, pl=questPlayers().find(p=>p.id===G.owner); if(pl&&pl.m==='main'&&Math.hypot(pl.x-sh.x,pl.z-sh.z)<2.4){ G.trial+=dt; if(G.trial>=20) staffUpgrade('gale'); } }
}
function staffKillNear(p){ const S=STF.grave; if(S.bind>0){ const a=QA.staffs.pedestals[2]; if(Math.hypot(p.x-a.x,p.z-a.z)<12) S.bindOk=true; } }
// ----- the vault door sockets
const staffsUp=()=>STAFF_IDS.every(k=>STF[k].up), staffsPlaced=()=>STAFF_IDS.filter(k=>STF[k].placed).length;
QACT.splace=(a,who)=>{ who=who||'h'; const k=STAFF_IDS.find(q=>STF[q].owner===who&&STF[q].up&&!STF[q].placed); if(!k||Q.stage!=='vault'||!VSTATE.hymn) return; const S=STF[k];
  S.placed=true; S.placer=who; S.owner=null; qEv('staffTake',{s:k,rm:1},who); qSound('clank',QA.vault.door.x,QA.vault.door.z,40); const n=staffsPlaced();
  if(n<4) banner(`The ${WD[k].name} is set in the door (${n}/4)`,'Bring every upgraded staff'); else { rite(); banner('The four staffs answer','Now the vault key and the soul lantern'); } };
function staffsReturn(){ let last=null; for(const k of STAFF_IDS){ const S=STF[k]; if(!S.placed) continue; S.placed=false; if(S.placer&&S.placer!=='h'&&NET.remotes[S.placer]){ S.owner=S.placer; qEv('staffTake',{s:k,up:1},S.placer); } else last=k; }
  if(last&&!STAFF_IDS.some(k=>STF[k].owner==='h')){ STF[last].owner='h'; qEv('staffTake',{s:last,up:1},'h'); } }
function staffJournalLine(){ return 'Staffs: '+STAFF_IDS.map(k=>{ const S=STF[k]; return WD[k].name.split(' ')[0]+' '+(S.placed?'set':S.up?'upgraded':S.built?(S.owner?'carried':'on its pedestal'):staffParts(k)+'/3'); }).join(' · '); }
// co-op state
function staffVis(){ return {s:STAFF_IDS.map(k=>{ const S=STF[k]; return [S.parts.map(b=>b?1:0),S.seq.slice(),S.built?1:0,+S.bind.toFixed(1),S.owner||'',S.up?1:0,+S.trial.toFixed(1),S.placed?1:0,S.zone]; }),fx:SFX_LIVE.map(e=>[e.kind==='slag'?0:1,+e.x.toFixed(1),+e.z.toFixed(1),+e.r.toFixed(1)])}; }
function applyStaffVis(v){ if(!v) return; STAFF_IDS.forEach((k,i)=>{ const a=v.s[i], S=STF[k]; S.parts=a[0].map(Boolean); S.seq=a[1]; STQ[k].forEach((t,j)=>t.lit=S.seq.includes(j)); S.built=!!a[2]; S.bind=a[3]; S.owner=a[4]||null; S.up=!!a[5]; S.trial=a[6]; S.placed=!!a[7]; S.zone=a[8]; });
  while(SFX_LIVE.length>v.fx.length){ sfxFree(SFX_LIVE.pop().m); } v.fx.forEach((f,i)=>{ let e=SFX_LIVE[i]; const kind=f[0]?'cyclone':'slag'; if(!e||e.kind!==kind){ if(e) sfxFree(e.m); e=SFX_LIVE[i]={kind,m:sfxMesh(kind),life:1,t:0}; } e.x=f[1]; e.z=f[2]; e.r=f[3]; e.life=1; }); }
// colours and a head ornament per staff on the shared staff model (called from buildGun)
function dressStaff(g,id,up,override){ if(override) return; const ud=g.userData, c=STAFF_COL[id], head=ud.crystal&&ud.crystal.parent; if(!head) return;
  ud.crystal.material=B({color:c}); if(ud.glow) ud.glow.material.color.set(c); if(ud.rings) ud.rings.forEach(r=>r.material.color.set(c)); if(ud.orb) ud.orb.children.forEach(o=>o.material.color.set(c)); if(ud.plume) ud.plume.material.color.set(c);
  const om=B({color:c});
  if(id==='cinder') for(let i=0;i<5;i++){ const s=new THREE.Mesh(new THREE.ConeGeometry(.012,.07,4),om), a=i/5*Math.PI*2; s.position.set(Math.cos(a)*.07,Math.sin(a)*.07,-.1); s.rotation.x=-Math.PI/2; head.add(s); }
  else if(id==='brine') for(let i=0;i<3;i++){ const s=new THREE.Mesh(new THREE.SphereGeometry(.018,6,4),om), a=i/3*Math.PI*2; s.position.set(Math.cos(a)*.09,Math.sin(a)*.09,-.02); s.scale.z=1.6; head.add(s); }
  else if(id==='grave'){ const s=new THREE.Mesh(new THREE.SphereGeometry(.032,8,6),L({color:0xd8d0c0})); s.position.set(0,.07,.02); head.add(s); for(const sx of [-1,1]){ const e=new THREE.Mesh(new THREE.SphereGeometry(.008,4,3),om); e.position.set(sx*.012,.072,-.008); head.add(e); } }
  else for(let i=0;i<6;i++){ const s=new THREE.Mesh(new THREE.TetrahedronGeometry(.02),M.add(c,.8)), a=i/6*Math.PI*2; s.position.set(Math.cos(a)*.13,Math.sin(a)*.13,-.06); s.rotation.set(a,a*2,0); head.add(s); } }
