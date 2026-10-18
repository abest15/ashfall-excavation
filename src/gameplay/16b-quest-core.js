/* ---------- quest core: host-routed actions, team items, shared pickups, replicated quest events ----------
   Co-op: every quest action goes through qAct(kind,arg). On the host (and solo) it runs QACT[kind](arg,who) at once;
   a client sends it to the host ({t:'q'}), which runs the same handler with who = that player's id. Quest state lives
   on the host and reaches clients in the snapshot (questVisX / applyQuestVisX in 19e-quest-sync.js). */
const QACT={}, QEV={}, QTAKE={};
const QI=new Set(); // team inventory (fuse, dog tags, record shards, vault key, soul lantern…)
const QI_NAMES={fuse:'Breaker fuse',tag1:'Dog tag I',tag2:'Dog tag II',tag3:'Dog tag III',shard1:'Record shard I',shard2:'Record shard II',shard3:'Record shard III',vkey:'Vault key',lantern:'Soul lantern'};
function qAct(k,a){ if(NET.role==='client'){ toHost({t:'q',k,a}); return; } const f=QACT[k]; if(f) f(a,'h'); }
function questHostMsg(id,m){ const f=QACT[m.k]; if(!f) return; NET.credit=id; try{ f(m.a,id); } finally{ NET.credit=null; } }
// an event every machine plays (sound, toast, local reward). Host: runs it and broadcasts; to:'id' sends to one player.
function qEv(k,o={},to){ const m=Object.assign({t:'qx',k},o); if(to&&to!=='h'){ sendTo(to,m); return; } if(!to) bcast(m); const f=QEV[k]; if(f) f(m); }
function questClientEvent(m){ const f=QEV[m.k]; if(f) f(m); }
QEV.snd=m=>{ if(m.p) sfxAt(m.s,{x:m.p[0],z:m.p[1]},m.d||40,m.a); else if(sfx[m.s]) sfx[m.s](m.a); };
QEV.toast=m=>toast(m.s);
function qSound(s,x,z,d,a){ qEv('snd',x===undefined?{s,a}:{s,p:[+x.toFixed(1),+z.toFixed(1)],d,a}); }
// shared pickups: host creates, everyone sees and can take (taking runs on the host)
const QP=[]; let QP_ID=0;
const QP_GEO={oct:new THREE.OctahedronGeometry(.2),box:new THREE.BoxGeometry(.3,.18,.3),disc:new THREE.CylinderGeometry(.24,.24,.03,16),tag:new THREE.BoxGeometry(.22,.04,.32),halo:new THREE.TorusGeometry(.42,.03,4,18)}, QP_MAT={};
const qpMat=(c,add)=>{ const k=c+(add?'a':''); return QP_MAT[k]||(QP_MAT[k]=add?M.add(c,.6):B({color:c})); };
function qPickVis(e){ const shape=e.key.startsWith('shard')?'disc':e.key.startsWith('tag')?'tag':e.key==='fuse'?'box':'oct';
  const m=new THREE.Mesh(QP_GEO[shape],qpMat(e.col)); if(shape==='oct') m.scale.y=1.6; m.position.set(e.x,(e.y||0)+1,e.z); scene.add(m);
  const halo=new THREE.Mesh(QP_GEO.halo,qpMat(e.col,true)); halo.rotation.x=Math.PI/2; m.add(halo);
  e.m=m; e.o=addInter({x:e.x,z:e.z,r:1.8,prompt:()=>e.label,use:()=>qAct('take',e.id)}); return e; }
function qPickFree(e){ if(e.m) scene.remove(e.m); const i=inter.indexOf(e.o); if(i>=0) inter.splice(i,1); e.m=null; e.o=null; }
function qDrop(key,x,z,label,col,y=0){ if(NET.role==='client') return null; const e=qPickVis({id:++QP_ID,key,x,z,y,label,col}); QP.push(e); return e; }
QACT.take=(id,who)=>{ const i=QP.findIndex(e=>e.id===id); if(i<0) return; const e=QP[i]; QP.splice(i,1); qPickFree(e);
  const f=QTAKE[e.key]; if(f) f(e,who); else { QI.add(e.key); qSound('pup'); qEv('toast',{s:`${QI_NAMES[e.key]||e.key} recovered`}); } };
function updateQPicks(dt){ for(const e of QP){ if(!e.m) continue; e.m.rotation.y+=dt*2; e.m.position.y=(e.y||0)+1+Math.sin(GT*3+e.id)*.15; } }
function clearQPicks(){ for(const e of QP) qPickFree(e); QP.length=0; }
// every live player position in the main map (host sees remote players through their state packets)
function questPlayers(){ const out=[]; if(!(P.dead||P.inCabin)) out.push({x:P.pos.x,z:P.pos.z,id:'h',m:mode});
  if(NET.role==='host') for(const id in NET.remotes){ const st=NET.remotes[id].st; if(st&&!st.dd&&!st.cab) out.push({x:st.x,z:st.z,id,m:st.m}); }
  return out; }
function nearestPlayerD(x,z){ let d=1e9; for(const p of questPlayers()) if(p.m===mode) d=Math.min(d,Math.hypot(p.x-x,p.z-z)); return d; }
// spawn a zombie for a quest event, near a point when given (it still rises from the ground)
function questSpawn(kind,x,z,spread=5){ const zz=spawnZombie(kind||'walker'); if(!zz) return null;
  if(x!==undefined){ for(let k=0;k<8;k++){ const a=Math.random()*6.283, r=spread*(.5+Math.random()*.5), px=x+Math.cos(a)*r, pz=z+Math.sin(a)*r;
      if(zoneOf(px,pz)&&Math.hypot(px-P.pos.x,pz-P.pos.z)>3){ zz.g.position.x=px; zz.g.position.z=pz; zz.win=null; zz.wstate=null; zz.tx=px; zz.tz=pz; zz.lx=px; zz.lz=pz; break; } } }
  return zz; }
