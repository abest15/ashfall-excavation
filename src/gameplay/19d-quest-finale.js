/* ---------- quest: the Gravecaller (mid-quest boss), the Emberwake Draught, and the Deep Vault finale ----------
   The vault belongs in the Underworks; until docs/MAP.md gives it an anchor it sits at QA.vault (the dig pit). */
// ----- the Gravecaller and its grave lanterns
const GC={due:false,t:0,lan:[],z:null};
for(let i=0;i<3;i++){ const g=new THREE.Group(); g.visible=false; scene.add(g);
  const b=GB(); b.add(new THREE.CylinderGeometry(.06,.08,1.6,5),0x26272a,{p:[0,.8,0]}); b.add(new THREE.BoxGeometry(.5,.06,.06),0x26272a,{p:[.2,1.6,0]}); g.add(new THREE.Mesh(b.done(),L({vertexColors:true})));
  const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(.18),B({color:0x4a2a5a})); lamp.position.set(.42,1.35,0); lamp.scale.y=1.4; g.add(lamp);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),M.add(0xd08aff,0)); lamp.add(halo);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.45,6,4),M.metal); hit.position.copy(lamp.position); hit.visible=false; hit.userData.qhit='gl'+i; g.add(hit);
  GC.lan.push({g,lamp,halo,hit,lit:false,a:null}); }
function startGravecaller(){ Q.stage='gravecaller'; GC.due=true; GC.t=8; GC.lan.forEach(l=>{ l.g.visible=true; }); }
function gcWard(z){ z.shield=true; if(z.shieldMesh) z.shieldMesh.visible=true; GC.lan.forEach(l=>{ l.lit=true; addSolid(l.hit); }); qSound('boss'); banner('The Gravecaller wards itself','Shoot the three grave lanterns around the pit'); }
function lanternShot(i){ const l=GC.lan[i]; if(!l||!l.lit) return; l.lit=false; removeSolid(l.hit); const a=l.a; qSound('shatter',a.x,a.z,50); qEv('fx',{p:[a.x+.4,1.4,a.z],t:'relic',n:12});
  const left=GC.lan.filter(q=>q.lit).length; if(left){ qEv('toast',{s:`A grave lantern gutters out. ${left} left`}); return; }
  const z=zombies.find(q=>q.gravecaller&&!q.dead); if(z){ z.shield=false; if(z.shieldMesh) z.shieldMesh.visible=false; } banner('The ward breaks','Hit the Gravecaller with everything'); }
function gravecallerDown(){ if(Q.stage!=='gravecaller') return; GC.lan.forEach(l=>{ l.lit=false; l.g.visible=false; removeSolid(l.hit); }); rite(); Q.stage='felling'; Q.tonicOpen=true; setValves(true);
  banner('The Gravecaller falls','Its black wax melts off the sealed machine in the dig. Now bring down the Colossus'); }
function updateGravecaller(dt){ if(Q.stage!=='gravecaller'||mode!=='main') return;
  for(const l of GC.lan){ l.lamp.material.color.set(l.lit?0xe8b8ff:0x4a2a5a); l.halo.material.opacity=l.lit?.25+Math.sin(GT*6)*.1:0; }
  if(NET.role==='client') return;
  if(GC.due){ GC.t-=dt; if(GC.t<=0){ GC.due=false; const a=QA.gravecaller; const z=questSpawn('gravecaller',a.x,a.z,1.5); if(z){ banner('The Gravecaller rises','It calls the dead to it. Put it back in the ground'); qSound('shriek',a.x,a.z,150); } else GC.due=true; } }
  else if(!zombies.some(z=>z.gravecaller&&!z.dead)){ GC.due=true; GC.t=10; } }
// ----- the Emberwake Draught: a sealed tonic machine; the Gravecaller's death unseals it. Kills feed your magazine.
TONICS.wake={name:'Emberwake Draught',cost:3500,hex:0xe0602a,color:'#f07a3a',letter:'E',desc:'every kill feeds your magazine and mends you a little',quest:true};
tonicMachine('wake',QA.tonic.x,QA.tonic.z,QA.tonic.ry,qy(QA.tonic));
const WAKE={k:0};
function updateEmber(){ if(P.kills<WAKE.k) WAKE.k=P.kills; if(P.kills===WAKE.k) return; const n=P.kills-WAKE.k; WAKE.k=P.kills; if(!P.perks.has('wake')) return;
  const w=P.weapons[P.cur]; if(w&&w.id!=='gatling'){ const s=statsOf(w); w.mag=Math.min(s.mag,w.mag+n); } P.hp=Math.min(P.maxHp,P.hp+4*n); }
// ----- the Deep Vault
const VT={door:null,seals:[],heart:null};
{ const V=QA.vault, d=V.door, g=new THREE.Group(); g.position.set(d.x,qy(d),d.z); g.visible=false; qPar(qy(d)).add(g); VT.door=g; // the round hatch: only used when the map has no vault door of its own
  const b=GB(), S=SEG; b.add(new THREE.CylinderGeometry(2.6,2.7,.35,S(24,12)),0x3a3430,{p:[0,.18,0],grime:.35}); b.add(new THREE.TorusGeometry(2.2,.12,5,S(24,12)),0xa8823f,{p:[0,.38,0],r:[Math.PI/2,0,0]});
  for(let k=0;k<8;k++){ const t=k/8*Math.PI*2; b.add(new THREE.BoxGeometry(.5,.18,.22),0x26272a,{p:[Math.cos(t)*2.45,.42,Math.sin(t)*2.45],r:[0,-t,0]}); }
  b.add(new THREE.CylinderGeometry(.5,.5,.2,S(12,8)),0x6a3a24,{p:[0,.45,0]}); for(const r of [0,Math.PI/2]) b.add(new THREE.BoxGeometry(3.6,.12,.2),0x6a3a24,{p:[0,.5,0],r:[0,r,0]});
  const lid=new THREE.Mesh(b.done(),L({vertexColors:true})); g.add(lid); VT.lid=lid;
  const glow=new THREE.Mesh(new THREE.CircleGeometry(2.4,24),M.add(0xff7a2a,0)); glow.rotation.x=-Math.PI/2; glow.position.y=.08; g.add(glow); VT.glow=glow;
  VT.doorO=addInter({y:qy(d),x:d.use?d.use.x:d.x,z:d.use?d.use.z:d.z+3.4,r:2.2,prompt:vaultDoorPrompt,use:()=>vaultDoorUse()});
  // the gramophone
  const gp=V.gramophone, gg=new THREE.Group(); gg.position.set(gp.x,qy(gp),gp.z); gg.visible=false; qPar(qy(gp)).add(gg); VT.gram=gg;
  box(.8,.8,.6,M.wood,0,.4,0,{parent:gg}); const disc=cyl(.28,.28,.02,B({color:0x1a1410}),0,.82,0,16,gg); VT.disc=disc;
  const horn=new THREE.Mesh(new THREE.ConeGeometry(.42,.9,12,1,true),L({color:0xa8823f,side:THREE.DoubleSide})); horn.position.set(.15,1.35,-.15); horn.rotation.set(-.9,0,-.4); gg.add(horn);
  VT.gramO=addInter({y:qy(gp),x:gp.x,z:gp.z+1.1,r:1.6,prompt:gramPrompt,use:()=>qAct('gram')});
  // the three seal plates
  V.seals.forEach((a,i)=>{ const sg=new THREE.Group(); sg.position.set(a.x,qy(a),a.z); sg.visible=false; qPar(qy(a)).add(sg);
    const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.6,.12,20),M.stone); plate.position.y=.06; sg.add(plate);
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.2,1.5,24),M.add(0xff9a3a,.3)); ring.rotation.x=-Math.PI/2; ring.position.y=.14; sg.add(ring);
    const fill=new THREE.Mesh(new THREE.CircleGeometry(1.15,24),M.add(0xffd27a,0)); fill.rotation.x=-Math.PI/2; fill.position.y=.13; sg.add(fill);
    VT.seals.push({g:sg,ring,fill,a,p:0,done:false}); });
  // the Furnace Heart
  const hg=new THREE.Group(); hg.position.set(V.heart.x,qy(V.heart)-4,V.heart.z); hg.visible=false; qPar(qy(V.heart)).add(hg); VT.heart=hg;
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.1,1),B({color:0xff8a3a})); core.scale.y=1.4; hg.add(core); VT.core=core;
  const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7,0),M.add(0xff5a2a,.2)); hg.add(shell); VT.shell=shell;
  VT.rings=[0,1,2].map(k=>{ const r=new THREE.Mesh(new THREE.TorusGeometry(2.1+k*.35,.09,5,24),M.rust); r.rotation.set(k*.9,k*.5,0); hg.add(r); return r; });
  const hit=new THREE.Mesh(new THREE.SphereGeometry(1.8,8,6),M.metal); hit.visible=false; hit.userData.qhit='fh'; hg.add(hit); VT.hit=hit;
  // the lift out
  const ex=V.exit, lg=new THREE.Group(); lg.position.set(ex.x,qy(ex),ex.z); lg.visible=false; qPar(qy(ex)).add(lg); VT.lift=lg;
  const lb=GB(); for(const [x,z] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]]) lb.add(new THREE.BoxGeometry(.18,6,.18),0x4b4e51,{p:[x,3,z]}); lb.add(new THREE.BoxGeometry(2.6,.15,2.6),0x5a3f28,{p:[0,.08,0]}); lb.add(new THREE.BoxGeometry(2.8,.2,2.8),0x26272a,{p:[0,6,0]});
  lg.add(new THREE.Mesh(lb.done(),L({vertexColors:true}))); const beacon=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),B({color:0x9ad06a})); beacon.position.y=6.3; lg.add(beacon); VT.beacon=beacon;
  const lab=makeLabel('THE LIFT',{sx:2,size:50,color:'#9ad06a'}); lab.position.y=7; lg.add(lab);
  VT.liftO=addInter({y:qy(ex),x:ex.x,z:ex.z,r:2,prompt:()=>Q.stage==='escape'?'Ride the lift out of the dig':null,use:()=>qAct('escape')}); }
const VSTATE={hymnT:0,hymn:false,open:false,spT:0,hp:0,maxHp:1,rise:0,pulse:0,escT:0,half:false};
function gramPrompt(){ if(Q.stage!=='vault') return null; if(VSTATE.hymn) return null; if(VSTATE.hymnT>0) return '!The Deep Hymn is playing…';
  const n=['shard1','shard2','shard3'].filter(k=>QI.has(k)).length; return n<3?`!The gramophone needs its record. Shards ${n}/3`:'Set the three record shards on the gramophone'; }
function vaultDoorPrompt(){ if(Q.stage!=='vault') return null; if(!VSTATE.hymn) return '!The Deep Vault is sealed. Something must be played to it';
  if(staffsPlaced()<4){ const k=STAFF_IDS.find(q=>STF[q].up&&!STF[q].placed&&P.weapons.some(w=>w.id===q)); return k?`Set the ${WD[k].name} in the vault door`:`!Four staff sockets (${staffsPlaced()}/4). Bring every upgraded staff`; }
  if(!QI.has('vkey')||!QI.has('lantern')) return `!The door wants the vault key and the soul lantern (${QI.has('vkey')?'key ✓':'no key'}, ${QI.has('lantern')?'lantern ✓':'no lantern'})`;
  return 'Unlock the Deep Vault'; }
function vaultDoorUse(){ if(VSTATE.hymn&&staffsPlaced()<4) qAct('splace'); else qAct('vdoor'); }
QACT.gram=()=>{ if(Q.stage!=='vault'||VSTATE.hymn||VSTATE.hymnT>0) return; if(!['shard1','shard2','shard3'].every(k=>QI.has(k))) return;
  ['shard1','shard2','shard3'].forEach(k=>QI.delete(k)); VSTATE.hymnT=7; qEv('hymn',{p:[QA.vault.gramophone.x,QA.vault.gramophone.z]}); banner('The Deep Hymn','Hold them off while the record plays'); };
QEV.hymn=m=>{ const f=[220,261.6,329.6,293.7,246.9,220,196,220]; f.forEach((x,k)=>setTimeout(()=>sfxAt('hymn',{x:m.p[0],z:m.p[1]},60,x),k*800)); };
QACT.vdoor=()=>{ if(Q.stage!=='vault'||!VSTATE.hymn||VSTATE.open||staffsPlaced()<4||!QI.has('vkey')||!QI.has('lantern')) return; VSTATE.open=true; QI.delete('vkey'); QI.delete('lantern'); staffsReturn();
  const md=vaultMapDoor(); if(md){ md.locked=false; if(!md.open){ openDoor(md); bcast({t:'door',i:DOORS.indexOf(md)}); } }
  Q.stage='seals'; VT.seals.forEach(s=>{ s.p=0; s.done=false; }); VSTATE.spT=2; const d=QA.vault.door; qSound('vaultOpen',d.x,d.z,120); banner('The Deep Vault opens','Stand on the three seal plates until they burn white. The dead will pour in'); };
QACT.escape=()=>{ if(Q.stage!=='escape') return; Q.stage='won'; victory(); };
// the gate out of the Hollow brings everyone back up into the vault
function hollowGate(){ if(!HL.gateOpen||NET.role==='client') return; HL.gateOpen=false; HL.gate.visible=false; for(const z of zombies) scene.remove(z.g); zombies.length=0; zparts=[];
  Q.stage='vault'; bcast({t:'qx',k:'vault'}); vaultArrive(); R.inBreak=true; R.breakT=8; }
function vaultArrive(){ mode='main'; if(NET.role==='client'){ for(const z of zombies) scene.remove(z.g); zombies.length=0; NZ.clear(); zparts=[]; }
  projs.forEach(q=>scene.remove(q.m)); projs.length=0; const s=QA.vault.spawn; P.pos.set(s.x+rand(-2,2),qy(s),s.z+rand(-1,1)); for(const k of ['U2','U3']) if(ZONES[k]) ZONES[k].open=true; P.yaw=Math.PI; P.pitch=0; P.vy=0;
  setAtmosphere('main'); ambienceMode('main'); flashScreen('#ffd9a0'); setRoundHud(String(R.n),false); banner('The Deep Vault','The light spat you out at the bottom of the dig. The vault door waits',true); }
QEV.vault=()=>{ if(NET.role==='client') vaultArrive(); };
function heartShot(w){ if(Q.stage!=='furnace'||VSTATE.rise>0||VSTATE.hp<=0) return; let d=Math.min(2500,statsOf(w).dmg*(w.id==='rod'||w.id==='gauntlet'?2.5:1));
  VSTATE.hp-=d; addPts(10); VT.core.material.color.set(0xffffff); VSTATE.flash=.06;
  if(!VSTATE.half&&VSTATE.hp<VSTATE.maxHp*.5){ VSTATE.half=true; const h=QA.vault.heart; questSpawn('sapper',h.x,h.z,8,qy(h)-.4); questSpawn('shrieker',h.x,h.z,8,qy(h)-.4); banner('The Heart screams','Its keepers climb out of the vault'); }
  if(VSTATE.hp<=0){ VSTATE.hp=0; const h=QA.vault.heart; qEv('fx',{p:[h.x,qy(h)+2.5,h.z],t:'ember',n:24}); qSound('boom'); qSound('portal'); rite(); Q.stage='escape'; VSTATE.escT=60; removeSolid(VT.hit);
    for(const z of zombies) if(!z.dead&&!z.boss&&Math.hypot(z.g.position.x-h.x,z.g.position.z-h.z)<10) killZombie(z,'body');
    banner('The Furnace Heart breaks','Get to the lift before the dig comes down!'); } }
function updateVault(dt){ const host=NET.role!=='client', st=Q.stage, inV=['vault','seals','furnace','escape','won'].includes(st);
  VT.door.visible=inV&&!vaultMapDoor(); VT.gram.visible=inV; VT.seals.forEach(s=>s.g.visible=st==='seals'||st==='furnace'); VT.heart.visible=st==='furnace'||(st==='escape'&&VT.heart.position.y>qy(QA.vault.heart)-3.9); VT.lift.visible=st==='escape'||st==='won';
  if(!inV) return;
  VT.door.position.y=VSTATE.open?Math.max(VT.door.position.y-dt*.6,-.33):0; VT.glow.material.opacity=VSTATE.open?.5+Math.sin(GT*4)*.2:0;
  if(VSTATE.hymnT>0){ VT.disc.rotation.y+=dt*6; if(host){ VSTATE.hymnT-=dt; if(Math.random()<dt*2&&aliveCount()<maxAlive()) spawnZombie('walker'); if(VSTATE.hymnT<=0){ VSTATE.hymn=true; rite(); banner('The vault door unseals','Bring the vault key and the soul lantern to the door'); } } }
  for(const s of VT.seals){ s.fill.material.opacity=s.done?.7:(s.p/12)*.5; s.ring.material.color.set(s.done?0xffffff:0xff9a3a); s.ring.rotation.z+=dt*(s.done?2:.5); }
  if(st==='seals'&&host){ for(const s of VT.seals){ if(s.done) continue; const on=questPlayers().some(p=>p.m==='main'&&Math.hypot(p.x-s.a.x,p.z-s.a.z)<1.6&&qdy(p,s.a)<1.5); if(on){ s.p+=dt; if(Math.random()<dt*6) spawnParticles(new V3(s.a.x+rand(-1,1),qy(s.a)+.3,s.a.z+rand(-1,1)),'ember',1); }
      if(s.p>=12){ s.done=true; qSound('ignite',s.a.x,s.a.z,60); const n=VT.seals.filter(q=>q.done).length; if(n<3) qEv('toast',{s:`A seal burns white (${n}/3)`}); } }
    if(VT.seals.every(s=>s.done)){ rite(); Q.stage='furnace'; VSTATE.maxHp=VSTATE.hp=30000*(1+.6*(NP()-1)); VSTATE.rise=3; VSTATE.pulse=7; VSTATE.half=false; VT.heart.position.y=qy(QA.vault.heart)-4; addSolid(VT.hit); qSound('boss'); banner('The Furnace Heart','The thing under Dig Site 7. Break it'); } }
  if(st==='furnace'||st==='escape'){ VT.core.rotation.y+=dt; VT.shell.rotation.y-=dt*.5; VT.rings.forEach((r,k)=>{ r.rotation.x+=dt*(.4+k*.2); r.rotation.y+=dt*.3; });
    if(VSTATE.flash>0){ VSTATE.flash-=dt; if(VSTATE.flash<=0) VT.core.material.color.set(0xff8a3a); }
    if(st==='furnace'){ if(VSTATE.rise>0){ if(host) VSTATE.rise=Math.max(0,VSTATE.rise-dt); } VT.heart.position.y=qy(QA.vault.heart)+2.6-(VSTATE.rise/3)*6.6;
      if(host&&VSTATE.rise<=0){ VSTATE.pulse-=dt; if(VSTATE.pulse<=0){ VSTATE.pulse=7; const h=QA.vault.heart; qEv('pulse',{p:[h.x,h.z],y:qy(h)});
          for(const pl of questPlayers()) if(pl.m==='main'&&Math.hypot(pl.x-h.x,pl.z-h.z)<6.5&&qdy(pl,h)<3) hurtTarget(pl.id==='h'?{remote:false}:{remote:true,id:pl.id},30,{x:h.x,z:h.z}); } } }
    else VT.heart.position.y=Math.max(qy(QA.vault.heart)-4,VT.heart.position.y-dt*1.2); }
  if(st==='escape'){ VT.beacon.material.color.set(Math.sin(GT*8)>0?0x9ad06a:0x1a3a1a); if(host) VSTATE.escT=Math.max(0,VSTATE.escT-dt); }
  // the dead pour in while the seals burn, while the heart beats and during the escape
  if(host&&(st==='seals'||st==='furnace'||st==='escape')){ VSTATE.spT-=dt; if(VSTATE.spT<=0&&aliveCount()<maxAlive()){ VSTATE.spT=st==='escape'?.5:Math.max(.7,1.3-R.n*.02); const sk=pickSpecial(); spawnZombie(sk||(R.n>=8&&Math.random()<.12?'burster':'walker')); } } }
QEV.pulse=m=>{ spawnParticles(new V3(m.p[0],(m.y||0)+1,m.p[1]),'ember',20); if(Math.abs(P.pos.y-(m.y||0))>3) return; sfxAt('boom',{x:m.p[0],z:m.p[1]},60); const d=Math.hypot(P.pos.x-m.p[0],P.pos.z-m.p[1]); if(d<12) P.shake=Math.max(P.shake||0,.3); if(d<6.5) flashScreen('rgba(255,140,60,.35)'); };
function questBossBar(){ if(Q.stage==='furnace'&&VSTATE.rise<=0&&VSTATE.hp>0) return {f:VSTATE.hp/VSTATE.maxHp,name:'The Furnace Heart'}; return null; }
// ----- the ending
const ENDING_LINES=['The Furnace Heart split like a struck bell, and the hum under Dig Site 7 stopped.','The lift groaned up through four hundred feet of black rock. Nobody spoke.',
  'Above, the rain had turned to snow. The Colossus lay where it fell, already rusting.','Somewhere below, in the dark, the Lodestone held a single note. Patient. Waiting.',
  'Field report, 11 November 1918: "Dig Site 7 collapsed. No survivors recovered."','You walked away anyway.'];
let endingT=null;
function playEnding(){ skipEnding(); const ov=document.createElement('div'); ov.id='ending'; ov.setAttribute('role','dialog');
  ov.style.cssText='position:fixed;inset:0;z-index:60;background:#050403;color:#e8dcc0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;font-family:"Special Elite","Courier New",monospace;text-align:center;transition:opacity 1.2s;cursor:pointer';
  const lines=ENDING_LINES.map(t=>{ const p=document.createElement('p'); p.textContent=t; p.style.cssText='margin:0;max-width:760px;font-size:clamp(15px,2.2vw,22px);line-height:1.5;opacity:0;transition:opacity 1.4s'; ov.append(p); return p; });
  const tt=document.createElement('h2'); tt.textContent='THE DEEP VAULT IS SEALED'; tt.style.cssText='margin:18px 0 0;letter-spacing:.3em;font-size:clamp(18px,3vw,30px);color:#ffb050;opacity:0;transition:opacity 2s'; ov.append(tt);
  const hint=document.createElement('small'); hint.textContent='Click or press any key to continue'; hint.style.cssText='position:absolute;bottom:18px;opacity:.5'; ov.append(hint);
  document.body.append(ov); let k=0; const step=()=>{ if(k<lines.length){ lines[k++].style.opacity=1; endingT=setTimeout(step,2600); } else if(k===lines.length){ k++; tt.style.opacity=1; endingT=setTimeout(skipEnding,5000); } };
  endingT=setTimeout(step,600); const done=()=>skipEnding(); ov.addEventListener('click',done); setTimeout(()=>addEventListener('keydown',endKey),400); }
function endKey(){ skipEnding(); }
function skipEnding(){ clearTimeout(endingT); removeEventListener('keydown',endKey); const ov=document.getElementById('ending'); if(ov){ ov.style.opacity=0; setTimeout(()=>ov.remove(),1200); ov.id='ending-out'; } }
// the levels map's own sealed vault door (docs/MAP.md: LVL.doors.vault, locked until the staffs, the key and the lantern open it)
function vaultMapDoor(){ return typeof LVL!=='undefined'&&LVL.doors&&LVL.doors.vault||null; }
function vaultDoorReset(){ const md=vaultMapDoor(); if(md) md.locked=true; }
