/* ---------- quest glue: per-game layout, reset, hooks from combat, the journal, and co-op replication ---------- */
const RITES_TOTAL=23;
const QUEST_STAGES=['frags','assembling','rodReady','stones','echoes','valves','candles','ember','colossus','gauntlet','radio','return','awakening','awakenReady','wraith','gravecaller','felling','strike','glyphs','souls','braziers','descent','vault','seals','furnace','escape','won'];
// everything random about the quest comes from one seed, so host and clients lay it out identically
function questLayout(seed){ Q.seed=seed; const r=qrng(seed);
  powerLayout(r);
  do{ VAL.tgt=[0,1,2].map(()=>1+Math.floor(r()*5)); } while(VAL.tgt.every(v=>v===1)); VAL.set=[1,1,1]; VAL.solved=false; drawChalk();
  RAD.freqs=qShuffle([0,1,2,3,4,5,6,7],r).slice(0,3); RAD.dial=0; RAD.seq=0; RAD.dropped=0; RAD.done=false; RAD.drop=null; RAD.spawnT=6;
  const ga=qShuffle(QA.glyphs,r).slice(0,4); GLY.tally=[0,1,2,3].map(()=>1+Math.floor(r()*6)); GLY.order=qShuffle([0,1,2,3],r); GLY.dials=[1,1,1,1]; GLY.open=false; GLY.lid.rotation.x=0;
  GLY.walls.forEach((w,j)=>{ const a=ga[j]; w.a=a; w.m.position.set(a.x+Math.sin(a.ry)*.02,2.1+qy(a),a.z+Math.cos(a.ry)*.02); w.m.rotation.y=a.ry; w.m.visible=true; drawGlyphWall(w,j,GLY.tally[j]); }); drawLockFace();
  SOUL.spots=qShuffle([0,1,2,3,4],r).slice(0,3); SOUL.k=0; SOUL.n=0; SOUL.g.visible=false;
  BRZ.notes=qShuffle([0,1,2,3],r); BRZ.order=qShuffle([0,1,2,3],r); BRZ.seq=0; BRZ.list.forEach((b,i)=>{ b.lit=false; b.fl.visible=false; const s=BRZ_SIZE[BRZ.notes[i]]; b.bowl.scale.setScalar(s); }); drawMusicStrip();
  const la=qShuffle(QA.lanterns,r).slice(0,3); GC.lan.forEach((l,i)=>{ l.a=la[i]; l.g.position.set(la[i].x,0,la[i].z); l.g.visible=false; l.lit=false; removeSolid(l.hit); });
  staffLayout(r); }
function questReset(){ QI.clear(); clearQPicks(); clearCharges(); P.drum=false; Q.tonicOpen=false; Q.seed=0; WAKE.k=0;
  GC.due=false; Object.assign(VSTATE,{hymnT:0,hymn:false,open:false,spT:0,hp:0,maxHp:1,rise:0,pulse:0,escT:0,half:false}); VT.door.position.y=0; VT.heart.position.y=-4; removeSolid(VT.hit); VT.seals.forEach(s=>{ s.p=0; s.done=false; });
  PWR.brk.forEach(b=>{ b.g.visible=false; b.col.on=false; removeSolid(b.hit); b.a=null; });
  skipEnding();
  if(NET.role==='client') return; // the host's seed arrives in the first snapshot
  const m=/[?&]seed=(\d+)/.exec(location.search); questLayout(m?+m[1]:(Math.random()*2147483647)|0); }
// hooks called from combat and zombies (host)
function questKill(z,how,p){ soulKill(p); staffKill(z,p); staffKillNear(p);
  if(z.kind==='shrieker') radioTagDrop(p);
  if(z.gravecaller) gravecallerDown();
  if(!POWER.on&&!QI.has('fuse')&&!QP.some(e=>e.key==='fuse')&&PWR.brk.some(b=>b.type==='fuse'&&b.found&&!b.fused)&&Math.random()<.04) qDrop('fuse',p.x,p.z,'Take the breaker fuse',0xd9a040); }
function questShoot(id,w){ if(NET.role==='client') return; if(typeof id!=='string') return;
  if(id.startsWith('gd')) glyphShoot(+id[2]); else if(id.startsWith('gl')) lanternShot(+id[2]); else if(id==='fh') heartShot(w); else if(id.startsWith('st_')) staffShoot(id); }
function questHoldsRound(){ return PWR.surge>0||Q.stage==='seals'||Q.stage==='furnace'||Q.stage==='escape'||VSTATE.hymnT>0; }
function updateQuestX(dt){ updatePower(dt); updatePuzzles(dt); updateQPicks(dt); updateSpecials(dt); updateGravecaller(dt); updateVault(dt); updateEmber(); updateStaffs(dt);
  if(NET.role!=='client') updateRadioStage(dt); }
// journal: new stages get their own page; the power hunt is listed under whatever the ritual is doing
function questJournal(j){ if(P.inCabin||mode==='hollow') return j; const s=Q.stage, rom=['I','II','III'];
  const pages={
    valves:()=>({t:'Balance the pressure manifold on the generator yard\'s west wall. Set wheels A, B and C to the gauges chalked on the bunker board, then pull the red lever.',l:[[POWER.on,'Power on (the manifold needs pressure)'],...VAL.set.map((v,i)=>[false,`Wheel ${'ABC'[i]} reads ${v}`]),[false,'Wrong readings scald, and the dead come']]}),
    radio:()=>({t:'Shriekers carry dog tags with frequencies scratched in them. Tune the bunker field radio to each tag in order (I, II, III) and transmit.',l:[0,1,2].map(i=>[RAD.seq>i,QI.has('tag'+(i+1))?`Tag ${rom[i]}: ${RADIO_DIAL[RAD.freqs[i]]} kc`:`Tag ${rom[i]}: not found`]).concat(RAD.done?[[!!(RAD.drop&&RAD.drop.open),'Open the supply drop']]:[])}),
    gravecaller:()=>({t:GC.due?'Something is climbing out of the dig…':'Kill the Gravecaller. When it wards itself, shoot the three grave lanterns around the pit.',l:[[false,`Lanterns burning: ${GC.lan.filter(l=>l.lit).length}`]]}),
    glyphs:()=>({t:'Four glyphs are scratched into the site\'s walls, each with tally marks. The strongbox in the dig has a dial under each glyph: shoot a dial to turn it until it matches its glyph\'s count, then try the lid.',l:GLY.dials.map((v,k)=>[false,`Dial ${k+1} (${['sun','moon','star','eye'][GLY.order[k]]}): ${v}`])}),
    souls:()=>({t:'Kill the dead inside the chalk ward to fill the soul canister. Three canisters; the ward moves after each.',l:[[SOUL.k>0,`Canisters ${SOUL.k}/3`],[false,`This canister: ${SOUL.n}/${SOUL.need}`]]}),
    braziers:()=>({t:'Wind the music box on the chapel altar and listen. Light the four braziers round the pit in the order it plays (bigger bowls ring deeper).',l:[[BRZ.seq>0,`Braziers lit in order: ${BRZ.seq}/4`],[false,'A wrong flame puts them all out']]}),
    vault:()=>({t:!VSTATE.hymn?'Play the Deep Hymn: set the three record shards on the gramophone by the vault door.':staffsPlaced()<4?'Set all four upgraded staffs in the vault door (solo: carry them in one at a time).':'Open the Deep Vault with the vault key and the soul lantern.',l:[[VSTATE.hymn,'The Deep Hymn'],[staffsPlaced()===4,`Staffs set: ${staffsPlaced()}/4`],[QI.has('vkey'),'Vault key'],[QI.has('lantern'),'Soul lantern']]}),
    seals:()=>({t:'Stand on each seal plate until it burns white. The dead pour in.',l:VT.seals.map((q,i)=>[q.done,`Seal ${i+1}: ${q.done?'burning':Math.floor(q.p/12*100)+'%'}`])}),
    furnace:()=>({t:'Destroy the Furnace Heart. Relic weapons bite deepest. Stay out of its pulse.',l:[[false,`Heart ${Math.ceil(VSTATE.hp/VSTATE.maxHp*100)}%`]]}),
    escape:()=>({t:'Get to the lift and ride it out!',l:[[false,`The dig is coming down: ${Math.ceil(VSTATE.escT)}s`]]}),
  };
  if(pages[s]) j=pages[s]();
  if(POWER.on&&!['seals','furnace','escape','won'].includes(s)) j={t:j.t,l:j.l.concat([[staffsUp(),staffJournalLine()]])};
  if(!POWER.on){ const f=brkFound(), t=brkThrown(); const l=[[t>=3,`Power: breakers found ${f}/3 · thrown ${t}/3`]];
    PWR.brk.forEach(b=>{ if(!b.a||b.thrown) return; if(!b.found) l.push([false,`A hum from ${ZONES[b.a.zone].name.toLowerCase()}…`]); else l.push([false,b.type==='jammed'?`Breaker ${b.a.hint}: rusted (knife it, ${b.whacks}/5)`:b.type==='fuse'?`Breaker ${b.a.hint}: ${b.fused?'fused, throw it':QI.has('fuse')?'seat the fuse':'needs a fuse (search the crates)'}`:`Breaker ${b.a.hint}: throwing it sounds the alarm`]); });
    if(t>=3) l.push([false,'Hold E at the generator to crank it']);
    j={t:j.t,l:j.l.concat(l)}; }
  return j; }
function journal(){ return questJournal(journalBase()); }
function questItemsHtml(){ return [...QI].map(k=>`<span class="item">${QI_NAMES[k]||k}</span>`).join('')+(P.drum?'<span class="item">Drum magazine</span>':''); }
// co-op: compact quest state in every snapshot
function questVisX(){ return {sd:Q.seed,st:Q.stage,ri:Q.rites||0,
  pw:PWR.brk.map(b=>(b.found?1:0)|(b.thrown?2:0)|(b.fused?4:0)|(b.whacks<<3)),cr:PWR.crates.map(c=>c.searched?1:0),qi:[...QI],
  qp:QP.map(e=>[e.id,e.key,+e.x.toFixed(2),+e.z.toFixed(2),e.label,e.col,e.y||0]),
  vs:VAL.set,vo:VAL.solved?1:0,rd:[RAD.dial,RAD.seq],dr:RAD.drop?[RAD.drop.x,+RAD.drop.y.toFixed(2),RAD.drop.z,RAD.drop.open?1:0]:0,
  gd:GLY.dials,go:GLY.open?1:0,so:[SOUL.g.visible?1:0,SOUL.k,SOUL.n,SOUL.need],bz:BRZ.list.map(b=>b.lit?1:0),gl:GC.lan.map(l=>l.lit?1:0),
  vt:[VSTATE.hymn?1:0,+VSTATE.hymnT.toFixed(1),VSTATE.open?1:0,VT.seals.map(q=>+q.p.toFixed(1)),+(VSTATE.hp/VSTATE.maxHp).toFixed(3),+VSTATE.rise.toFixed(2),+VSTATE.escT.toFixed(1)],
  st:staffVis(),ch:CHG.map(q=>[+q.m.position.x.toFixed(2),+q.m.position.y.toFixed(2),+q.m.position.z.toFixed(2),q.t>=q.dur?1:0]),tn:Q.tonicOpen?1:0}; }
function applyQuestVisX(v){ if(!v) return; if(v.sd&&v.sd!==Q.seed) questLayout(v.sd); Q.stage=v.st; Q.rites=v.ri; Q.tonicOpen=!!v.tn;
  PWR.brk.forEach((b,i)=>{ const f=v.pw[i]; b.found=!!(f&1); const th=!!(f&2); if(th&&!b.thrown) b.lever.rotation.x=.7; b.thrown=th; b.fused=!!(f&4); b.whacks=f>>3; });
  PWR.crates.forEach((c,i)=>{ c.searched=!!v.cr[i]; c.lid.rotation.x=c.searched?-1.9:0; });
  QI.clear(); v.qi.forEach(k=>QI.add(k));
  const seen=new Set(); for(const a of v.qp){ seen.add(a[0]); if(!QP.some(e=>e.id===a[0])) QP.push(qPickVis({id:a[0],key:a[1],x:a[2],z:a[3],label:a[4],col:a[5],y:a[6]})); }
  for(let i=QP.length-1;i>=0;i--) if(!seen.has(QP[i].id)){ qPickFree(QP[i]); QP.splice(i,1); }
  VAL.set=v.vs.slice(); VAL.solved=!!v.vo; RAD.dial=v.rd[0]; RAD.seq=v.rd[1]; RAD.drop=v.dr?{x:v.dr[0],y:v.dr[1],z:v.dr[2],open:!!v.dr[3]}:null;
  if(String(v.gd)!==String(GLY.dials)){ GLY.dials=v.gd.slice(); drawLockFace(); } if(!!v.go!==GLY.open){ GLY.open=!!v.go; GLY.lid.rotation.x=GLY.open?-1.4:0; }
  SOUL.g.visible=!!v.so[0]; if(SOUL.k!==v.so[1]){ SOUL.k=v.so[1]; if(SOUL.k<3) soulPlace(); SOUL.g.visible=!!v.so[0]; } SOUL.n=v.so[2]; SOUL.need=v.so[3];
  BRZ.list.forEach((b,i)=>{ b.lit=!!v.bz[i]; b.fl.visible=b.lit; }); GC.lan.forEach((l,i)=>{ l.lit=!!v.gl[i]; l.g.visible=Q.stage==='gravecaller'; });
  VSTATE.hymn=!!v.vt[0]; VSTATE.hymnT=v.vt[1]; VSTATE.open=!!v.vt[2]; VT.seals.forEach((q,i)=>{ q.p=v.vt[3][i]; q.done=q.p>=12; }); VSTATE.maxHp=1; VSTATE.hp=v.vt[4]; VSTATE.rise=v.vt[5]; VSTATE.escT=v.vt[6];
  applyCharges(v.ch); applyStaffVis(v.st); }
