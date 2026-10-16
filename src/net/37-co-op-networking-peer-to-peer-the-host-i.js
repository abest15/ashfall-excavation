/* ================= co-op networking (peer-to-peer; the host is authoritative) ================= */
Object.assign(NET,{peer:null,conns:{},host:null,myId:'h',myColor:0,name:'Digger',code:'',sendT:0,shots:0,started:false,credit:null,pts:{},kills:{},zid:0,pupId:0,lastSnap:null,jr:null,np:1,roster:[]});
const AVC=[0x4a5a3a,0x6a4a2a,0x3a4a6a,0x6a2e2a], AVCSS=['#c9b56a','#e08a3a','#6aa8ff','#e05a4a'], KINDS=['walker','marked','burster','hollow','hound','boss','prime'];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function NP(){ return NET.role==='host'?1+Object.values(NET.remotes).filter(r=>r.st).length:NET.role==='client'?(NET.np||1):1; }
const LOCALNET=/[?&]net=local/.test(location.search);
// local bundled copy first (multi-file web build + desktop app), CDN as fallback (single-file build)
function loadPeer(){ const srcs=['assets/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  return new Promise((res,rej)=>{ if(window.Peer) return res(); let i=0;
    const next=()=>{ if(i>=srcs.length) return rej(new Error('blocked')); const sc=document.createElement('script'); sc.src=srcs[i++];
      sc.onload=()=>window.Peer?res():next(); sc.onerror=()=>{ sc.remove(); next(); }; document.head.appendChild(sc); };
    next(); }); }
// stand-in for PeerJS over BroadcastChannel, so two tabs on one machine can be tested together (?net=local)
function localPeer(id){ const bc=new BroadcastChannel('ashfall-local'), me=id||('c'+Math.random().toString(36).slice(2,8)); const pr={id:me,h:{},conns:{},on(ev,fn){ this.h[ev]=fn; },connect(to){ const c=mk(to); bc.postMessage({k:'open',from:me,to}); setTimeout(()=>c._f('open'),60); return c; },destroy(){ for(const k in pr.conns) bc.postMessage({k:'close',from:me,to:k}); bc.close(); }};
  function mk(peer){ const c={peer,h:{},on(ev,fn){ this.h[ev]=fn; },send(d){ bc.postMessage({k:'data',from:me,to:peer,d}); },close(){ bc.postMessage({k:'close',from:me,to:peer}); },_f(ev,a){ this.h[ev]&&this.h[ev](a); }}; pr.conns[peer]=c; return c; }
  bc.onmessage=e=>{ const m=e.data; if(m.to!==me) return; if(m.k==='open'){ const c=mk(m.from); pr.h.connection&&pr.h.connection(c); setTimeout(()=>c._f('open'),20); } else if(m.k==='data'){ const c=pr.conns[m.from]; c&&c._f('data',m.d); } else if(m.k==='close'){ const c=pr.conns[m.from]; c&&c._f('close'); } };
  setTimeout(()=>pr.h.open&&pr.h.open(me),40); return pr; }
function setStatus(t){ $('mp-status').textContent=t; }
function myName(){ const n=($('mp-name').value||'').trim().slice(0,14)||'Digger'; try{ localStorage.setItem('ashfall:name',n); }catch(e){} return n; }
try{ $('mp-name').value=localStorage.getItem('ashfall:name')||''; }catch(e){}
function genCode(){ const A='ABCDEFGHJKMNPQRSTUVWXYZ'; let c=''; for(let i=0;i<5;i++) c+=A[(Math.random()*A.length)|0]; return c; }
async function netHost(){ if(NET.role!=='solo') netLeave(); NET.name=myName(); setStatus('Opening a room…'); try{ if(!LOCALNET) await loadPeer(); }catch(e){ setStatus('Could not load the co-op library. Check your internet connection.'); return; }
  NET.code=genCode(); const pid='ashfall-dig-'+NET.code.toLowerCase(); const peer=LOCALNET?localPeer(pid):new Peer(pid,{debug:0}); NET.peer=peer; NET.role='host'; NET.myId='h'; NET.myColor=0; NET.remotes={}; NET.started=false;
  peer.on('open',()=>{ $('mp-lobby').hidden=false; $('mp-roomcode').textContent=NET.code; $('mp-start').hidden=false; setStatus('Room open. Share the code and wait for friends, then start.'); rosterSend(); });
  peer.on('connection',c=>{ c.on('data',d=>hostMsg(c,d)); c.on('close',()=>hostDrop(c)); });
  peer.on('error',e=>{ const t=e&&e.type; if(t==='unavailable-id'){ netLeave(); netHost(); } else if(t!=='peer-unavailable') setStatus('Network problem: '+(t||e)); }); }
async function netJoin(){ const code=$('mp-code').value.trim().toUpperCase(); if(code.length<4){ setStatus('Enter the room code your host shared.'); return; } if(NET.role!=='solo') netLeave(); NET.name=myName(); setStatus('Connecting…');
  try{ if(!LOCALNET) await loadPeer(); }catch(e){ setStatus('Could not load the co-op library. Check your internet connection.'); return; }
  const peer=LOCALNET?localPeer():new Peer({debug:0}); NET.peer=peer; NET.role='client'; NET.remotes={}; NET.started=false;
  peer.on('open',()=>{ const c=peer.connect('ashfall-dig-'+code.toLowerCase(),{reliable:true,serialization:'json'}); NET.host=c;
    c.on('open',()=>{ c.send({t:'hello',name:NET.name}); setStatus('Connected. Waiting for the host to start…'); $('mp-lobby').hidden=false; $('mp-roomcode').textContent=code; $('mp-start').hidden=true; });
    c.on('data',clientMsg); c.on('close',()=>{ if(NET.role==='client'){ const inGame=state!=='menu'; netLeave(); setStatus('Disconnected from the host.'); if(inGame){ toTitle(); toast('Lost connection to the host'); } } }); });
  peer.on('error',e=>{ const t=e&&e.type; setStatus(t==='peer-unavailable'?'No game found with that code.':'Network problem: '+(t||e)); netLeave(); }); }
function netLeave(){ const p=NET.peer; NET.peer=null; if(NET.role==='host') bcast({t:'bye'}); for(const k in NET.conns){ try{ NET.conns[k].c.close(); }catch(e){} } NET.conns={}; try{ NET.host&&NET.host.close(); }catch(e){} NET.host=null;
  for(const id in NET.remotes) dropAvatar(id); NET.remotes={}; NET.roster=[]; NET.role='solo'; NET.started=false; try{ p&&p.destroy(); }catch(e){} $('mp-lobby').hidden=true; lobbyList(); netResetLocal(); }
window.netLeave=netLeave;
$('mp-host').addEventListener('click',netHost); $('mp-join').addEventListener('click',netJoin);
$('mp-code').addEventListener('keydown',e=>{ if(e.key==='Enter') netJoin(); e.stopPropagation(); }); $('mp-name').addEventListener('keydown',e=>e.stopPropagation());
$('mp-leave').addEventListener('click',()=>{ netLeave(); setStatus('You left the room.'); });
$('mp-copy').addEventListener('click',()=>{ try{ navigator.clipboard.writeText(NET.code); setStatus('Code copied. Send it to your friends.'); }catch(e){} });
$('mp-start').addEventListener('click',()=>{ if(NET.role!=='host') return; NET.started=true; bcast({t:'start'}); newGame(); startPlay(); });
function sendTo(id,m){ if(NET.role!=='host') return; for(const k in NET.conns){ const cn=NET.conns[k]; if(cn.id===id){ try{ cn.c.send(m); }catch(e){} } } }
function bcast(m){ if(NET.role!=='host') return; for(const k in NET.conns){ try{ NET.conns[k].c.send(m); }catch(e){} } }
function toHost(m){ if(NET.role==='client'&&NET.host){ try{ NET.host.send(m); }catch(e){} } }
function rosterSend(){ NET.roster=[{id:'h',name:NET.name,color:0}].concat(Object.values(NET.remotes).map(r=>({id:r.id,name:r.name,color:r.color}))); bcast({t:'roster',list:NET.roster}); lobbyList(); }
function lobbyList(){ const ul=$('mp-players'); ul.innerHTML=''; if(NET.role==='solo') return; for(const p of NET.roster||[]){ const li=document.createElement('li'); li.textContent=p.name+(p.id==='h'?' · host':'')+(p.id===NET.myId?' · you':''); li.style.borderColor=AVCSS[p.color]; ul.append(li); } }
function hostMsg(c,m){ let cn=NET.conns[c.peer];
  if(m.t==='hello'){ const used=new Set(Object.values(NET.conns).map(x=>x.id)); let id=null; for(const k of ['p2','p3','p4']) if(!used.has(k)){ id=k; break; }
    if(!id){ try{ c.send({t:'full'}); }catch(e){} return; }
    cn=NET.conns[c.peer]={c,id}; const color=+id[1]-1; NET.remotes[id]={id,name:String(m.name||'Digger').slice(0,14),color,st:null};
    c.send({t:'welcome',id,color,diff:SETTINGS.diff}); rosterSend(); toast(`${NET.remotes[id].name} joined`); if(NET.started) c.send({t:'start'}); return; }
  if(!cn) return; const id=cn.id, rp=NET.remotes[id]; if(!rp) return;
  switch(m.t){
    case 'st': rp.st=m; break;
    case 'hit': { const z=zombies.find(q=>q.id===m.id); if(z){ NET.credit=id; hitZombie(z,m.dmg,m.mult,m.how); NET.credit=null; } break; }
    case 'door': { const d=DOORS[m.i]; if(d&&!d.open){ openDoor(d); bcast({t:'door',i:m.i}); } break; }
    case 'power': if(!POWER.on){ powerOn(); bcast({t:'power'}); } break;
    case 'plank': { const W=WINDOWS[m.w]; if(W){ NET.credit=id; rebuildPlank(W); NET.credit=null; } break; }
    case 'trap': if(POWER.on&&TRAP.t<=0&&TRAP.cd<=0){ TRAP.t=22; sfx.fire(); bcast({t:'trap'}); } break;
    case 'grab': { const i=PUPS.findIndex(q=>q.id===m.id); if(i>=0){ const q=PUPS[i]; scene.remove(q.g); PUPS.splice(i,1); pupShared(q.type,id); } break; }
    case 'lure': spawnLure(new V3(m.p[0],m.p[1],m.p[2]),new V3(m.v[0],m.v[1],m.v[2])); break;
    case 'shoot': { const w={id:m.w,up:!!m.up}; if(m.k==='bell') ringBell(); else if(m.k==='reson') hitReson(m.i); else if(m.k==='crystal') hitCrystal(m.i); else if(m.k==='valve') hitValve(m.i,w); else if(m.k==='wraith') hitWraith(w); else if(m.k==='gate'&&HL.gateOpen) victory(); break; }
    case 'revive': if(m.target==='h') gotRevived(rp.name); else sendTo(m.target,{t:'revived',by:rp.name}); break; } }
function hostDrop(c){ const cn=NET.conns[c.peer]; if(!cn) return; delete NET.conns[c.peer]; const rp=NET.remotes[cn.id]; if(rp){ toast(`${rp.name} left`); dropAvatar(cn.id); delete NET.remotes[cn.id]; } rosterSend(); }
function clientMsg(m){ switch(m.t){
  case 'welcome': NET.myId=m.id; NET.myColor=m.color; SETTINGS.diff=m.diff||SETTINGS.diff; lobbyList(); break;
  case 'full': setStatus('That game is full (4 players).'); netLeave(); break;
  case 'bye': break;
  case 'roster': NET.roster=m.list; lobbyList(); for(const p of m.list){ if(p.id!==NET.myId&&!NET.remotes[p.id]) NET.remotes[p.id]={id:p.id,name:p.name,color:p.color,st:null}; } for(const id in NET.remotes) if(!m.list.some(p=>p.id===id)){ dropAvatar(id); delete NET.remotes[id]; } break;
  case 'start': NET.started=true; newGame(); startPlay(); break;
  case 'snap': applySnap(m); break;
  case 'pts': P.points+=m.n; P.earned+=m.n; popPts(m.n); if(m.k){ P.kills+=m.k; P.heads+=m.hd||0; hitMarker(true); sfx.kill(); } break;
  case 'hurt': hurtPlayer(m.d,m.s?{x:m.s[0],z:m.s[1]}:null); break;
  case 'door': { const d=DOORS[m.i]; if(d&&!d.open) openDoor(d); break; }
  case 'power': if(!POWER.on) powerOn(); break;
  case 'trap': TRAP.t=22; sfx.fire(); break;
  case 'pupfx': if(m.type!=='gatling'||m.by===NET.myId) applyPup(m.type); break;
  case 'ev': if(m.k==='banner') banner(m.a,m.b,true); else if(m.k==='round'){ setRoundHud(m.n,true); sfx.roundStart(); if(P.dead) respawn(); } else if(m.k==='roundEnd') sfx.roundEnd(); break;
  case 'mode': if(m.m==='hollow') clientEnterHollow(); break;
  case 'over': if(state==='play'||state==='paused') gameOver(); break;
  case 'victory': if(state==='play'||state==='paused') victory(); break;
  case 'revived': gotRevived(m.by); break; } }
function creditKill(how){ if(NET.role==='host'&&NET.credit&&NET.credit!=='h'){ const c=NET.kills[NET.credit]||(NET.kills[NET.credit]={k:0,h:0}); c.k++; if(how==='head') c.h++; } else { P.kills++; if(how==='head') P.heads++; } }
function pupShared(t,by){ if(t!=='gatling'||by==='h') applyPup(t); bcast({t:'pupfx',type:t,by}); }
function netDoor(d){ const i=DOORS.indexOf(d); if(NET.role==='client') toHost({t:'door',i}); else { openDoor(d); bcast({t:'door',i}); } }
function netPlank(W){ if(NET.role!=='client') return rebuildPlank(W); if(W.count()<5&&GT-W.last>.45){ W.last=GT; toHost({t:'plank',w:WINDOWS.indexOf(W)}); sfx.board(); } }
function goDown(){ P.downed=true; P.bleed=35; P.hp=1; P.perks.clear(); P.maxHp=100; if(P.weapons.length>2){ P.weapons.length=2; if(P.cur>1) P.cur=0; buildVM(); } $('reviving').hidden=false; sfx.hurt(); toast('You are down. Hold on for a teammate'); }
function gotRevived(by){ if(!P.downed) return; P.downed=false; P.hp=P.maxHp*.5; P.invuln=1.5; $('reviving').hidden=true; sfx.relic(); toast('Revived by '+by); }
function respawn(){ P.dead=false; P.downed=false; P.maxHp=100; P.hp=100; P.perks.clear(); P.weapons=[mkInst('pistol')]; P.cur=0; buildVM(); if(mode==='hollow') P.pos.set(HX+rand(-3,3),0,HZ+17); else P.pos.set(rand(-3,3),0,44); $('reviving').hidden=true; toast('Back in the fight'); }
function clientEnterHollow(){ mode='hollow'; for(const z of zombies) scene.remove(z.g); zombies.length=0; NZ.clear(); zparts=[]; P.pos.set(HX+rand(-3,3),0,HZ+17); P.yaw=0; P.pitch=0; setAtmosphere('hollow'); ambienceMode('hollow'); flashScreen('#bff3ff'); setRoundHud('—',false); }
function myState(){ const w=curW(); return {t:'st',x:+P.pos.x.toFixed(2),y:+P.pos.y.toFixed(2),z:+P.pos.z.toFixed(2),yaw:+P.yaw.toFixed(3),pitch:+P.pitch.toFixed(3),w:w?w.id:'',up:w&&w.up?1:0,sh:NET.shots,hp:Math.round(P.hp),mh:P.maxHp,dn:P.downed?1:0,dd:P.dead?1:0,pts:P.points,er:P.earned,k:P.kills,hs:P.heads,m:mode,cab:P.inCabin?1:0}; }
function questVis(){ return {res:RESON.map(r=>r.g.visible?[+r.g.position.x.toFixed(1),+r.g.position.z.toFixed(1),+r.g.rotation.y.toFixed(2)]:0), wr:WR.g.visible?[+WR.g.position.x.toFixed(1),+WR.g.position.y.toFixed(1),+WR.g.position.z.toFixed(1)]:0,
  vb:COL.vBurst.slice(), vo:COL.vOn?1:0, cand:CH.cands.map(c=>c.lit?1:0), mur:(CH.mural>0||CH.solved)?1:0, sh:lodeParts.shaft.visible?1:0, ob:+lodeParts.ob.position.y.toFixed(2), cr:HL.crystals.map(c=>c.visible?1:0), lit:HL.lit||0, gate:HL.gateOpen?1:0}; }
function makeSnap(){ const z=[]; for(const q of zombies){ if(q.gone) continue; const p=q.g.position; let fl=0; if(q.dead) fl|=1; if(q.headKill) fl|=2; if(q.shield) fl|=4; if(q.wraithBound) fl|=8; if(q.swing>0) fl|=16;
    z.push([q.id,KINDS.indexOf(q.prime?'prime':q.boss?'boss':q.kind),+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2),+q.g.rotation.y.toFixed(2),+q.g.rotation.x.toFixed(2),fl,+(Math.max(0,q.hp)/q.maxHp).toFixed(3)]); }
  const pl={h:Object.assign(myState(),{name:NET.name,color:0})}; for(const id in NET.remotes){ const r=NET.remotes[id]; if(r.st) pl[id]=Object.assign({},r.st,{name:r.name,color:r.color}); }
  const ic=P.inCabin; P.inCabin=false; const jr=journal(); P.inCabin=ic;
  return {t:'snap',z,pl,r:R.n,m:mode,pw:POWER.on?1:0,d:DOORS.map(d=>d.open?1:0),w:WINDOWS.map(W=>W.count()),col:[+COL.s.toFixed(2),+COL.t.toFixed(2),COL.felled?1:0,+COL.fall.toFixed(2)],
    pu:PUPS.map(q=>[q.id,q.type,+q.g.position.x.toFixed(1),+q.g.position.z.toFixed(1)]),lu:LURES.map(q=>[q.id,+q.p.x.toFixed(2),+q.p.y.toFixed(2),+q.p.z.toFixed(2),q.active?1:0]),
    pr:projs.map(q=>[+q.m.position.x.toFixed(1),+q.m.position.y.toFixed(1),+q.m.position.z.toFixed(1)]),jr,fx:[PU.double>0?Math.ceil(PU.double):0,PU.insta>0?Math.ceil(PU.insta):0,PU.freeze>0?Math.ceil(PU.freeze):0],qv:questVis(),np:NP()}; }
const NZ=new Map(), NPU=new Map(), NLU=new Map(), NPR=[];
function applySnap(m){ NET.lastSnap=m; NET.jr=m.jr; NET.np=m.np; R.n=m.r;
  if(m.pw&&!POWER.on) powerOn(); m.d.forEach((o,i)=>{ if(o&&!DOORS[i].open) openDoor(DOORS[i]); });
  m.w.forEach((n,i)=>{ const W=WINDOWS[i]; while(W.count()>n) tearPlank(W); while(W.count()<n){ const pl=W.planks.find(p=>!p.on); pl.on=true; pl.anim=0; pl.m.visible=true; pl.m.position.copy(pl.p0); pl.m.rotation.copy(pl.r0); } });
  COL.s=m.col[0]; COL.t=m.col[1]; if(m.col[2]&&!COL.felled){ COL.felled=true; COL.fall=m.col[3]; }
  PU.double=m.fx[0]; PU.insta=m.fx[1]; PU.freeze=m.fx[2];
  syncNetZombies(m.z); applyQuestVis(m.qv);
  while(NPR.length<m.pr.length){ const pm=new THREE.Mesh(projGeo,M.add(0xff7a2a,1)); scene.add(pm); NPR.push(pm); } NPR.forEach((pm,i)=>{ const a=m.pr[i]; pm.visible=!!a; if(a) pm.position.set(a[0],a[1],a[2]); });
  for(const id in m.pl){ if(id===NET.myId) continue; let r=NET.remotes[id]; if(!r) r=NET.remotes[id]={id,name:m.pl[id].name,color:m.pl[id].color}; r.st=m.pl[id]; } }
function syncNetZombies(arr){ const seen=new Set();
  for(const a of arr){ const [id,ki,x,y,zz,ry,rx,fl,hpf]=a, kind=KINDS[ki]; seen.add(id); let z=NZ.get(id);
    if(!z){ if(fl&1) continue; z=kind==='boss'||kind==='prime'?makeBoss(kind==='prime'):kind==='hound'?makeHound(mode==='hollow'):makeZombie(kind); Object.assign(z,{id,net:true,rise:0,dead:false,hp:1,maxHp:1,speed:0,phase:rand(0,6),netSwing:0}); z.g.position.set(x,y,zz); z.g.rotation.y=ry; scene.add(z.g); zombies.push(z); zparts=zparts.concat(z.parts); NZ.set(id,z); }
    z.nx=x; z.ny=y; z.nz=zz; z.nry=ry; z.nrx=rx; z.hp=hpf; z.shield=!!(fl&4); if(z.shieldMesh) z.shieldMesh.visible=z.shield; z.wraithBound=!!(fl&8);
    if((fl&16)&&z.netSwing<=0){ z.netSwing=.45; zvoice(z,'attack'); }
    if((fl&1)&&!z.dead) netKill(z,!!(fl&2)); }
  for(const [id,z] of NZ) if(!seen.has(id)&&!z.dead) netKill(z,false); }
function netKill(z,head){ z.dead=true; z.dt=0; zparts=zparts.filter(p=>p.userData.z!==z); zvoice(z,'death'); if(head&&z.head&&!z.boss) zHeadOff(z); }
function updateNetZombies(dt){ for(const z of zombies){ const g=z.g, p=g.position;
    if(z.dead){ if(zDeathUpdate(z,dt)){ scene.remove(g); z.gone=true; NZ.delete(z.id); } continue; }
    const ox=p.x, oz=p.z, k=Math.min(1,dt*10); p.x+=(z.nx-p.x)*k; p.y+=(z.ny-p.y)*k; p.z+=(z.nz-p.z)*k; let dr=z.nry-g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); g.rotation.y+=dr*k; g.rotation.x+=(z.nrx-g.rotation.x)*k;
    const sp=Math.hypot(p.x-ox,p.z-oz)/Math.max(dt,1e-3); z.speed=sp; const moving=sp>.3; if(z.netSwing>0) z.netSwing-=dt; const swT=z.netSwing>0?1-z.netSwing/.45:-1;
    if(z.kind==='hound') animHound(z,dt,moving,sp,swT); else if(z.nrx>.05&&z.hips) animWindow(z,dt,'climb',clamp(z.nrx/.5,0,1)*.5,true); else animZombie(z,dt,moving,sp,swT); }
  for(let i=zombies.length-1;i>=0;i--) if(zombies[i].gone) zombies.splice(i,1); }
function updateNetPups(dt){ const arr=(NET.lastSnap&&NET.lastSnap.pu)||[], seen=new Set();
  for(const [id,type,x,z] of arr){ seen.add(id); let q=NPU.get(id); if(!q){ q={g:pupVisual(type,x,z),asked:false}; NPU.set(id,q); } q.g.rotation.y+=dt*2; q.g.position.y=1+Math.sin(GT*3+id)*.15;
    if(!q.asked&&!P.downed&&!P.dead&&Math.hypot(x-P.pos.x,z-P.pos.z)<1.5){ q.asked=true; toHost({t:'grab',id}); } }
  for(const [id,q] of NPU) if(!seen.has(id)){ scene.remove(q.g); NPU.delete(id); }
  if(PU.sale>0) PU.sale-=dt; if(PU.gatling>0){ PU.gatling-=dt; if(PU.gatling<=0){ PU.gat=null; P.swapT=.4; buildVM(); toast('The Gatling burns out'); } } }
function updateNetLures(dt){ const arr=(NET.lastSnap&&NET.lastSnap.lu)||[], seen=new Set();
  for(const [id,x,y,z,act] of arr){ seen.add(id); let q=NLU.get(id); if(!q){ q={g:buildLure(),tick:0,last:new V3(x,y,z)}; q.g.position.set(x,y,z); scene.add(q.g); NLU.set(id,q); } const g=q.g, k=Math.min(1,dt*12); g.position.x+=(x-g.position.x)*k; g.position.y+=(y-g.position.y)*k; g.position.z+=(z-g.position.z)*k; q.last.copy(g.position);
    if(act){ q.tick-=dt; g.userData.key.rotation.z+=dt*6; if(q.tick<=0){ q.tick=.22; sfxAt('drum',g.position,40); g.userData.sticks.forEach((a,i)=>a.rotation.x=(i?1:-1)*.7); } else g.userData.sticks.forEach(a=>a.rotation.x*=.8); } }
  for(const [id,q] of NLU) if(!seen.has(id)){ explodeFx(q.last.clone().setY(.6)); scene.remove(q.g); NLU.delete(id); } }
function applyQuestVis(v){ if(!v) return;
  RESON.forEach((r,i)=>{ const a=v.res[i]; r.g.visible=!!a; if(a){ r.g.position.set(a[0],0,a[1]); r.g.rotation.y=a[2]; addSolid(r.hit); r.col.on=true; Object.assign(r.col,{minX:a[0]-.6,maxX:a[0]+.6,minZ:a[1]-.6,maxZ:a[1]+.6}); } else { removeSolid(r.hit); r.col.on=false; } });
  if(v.wr){ WR.g.visible=true; WR.g.position.set(v.wr[0],v.wr[1],v.wr[2]); WR.halo.rotation.z+=.1; addSolid(WR.hit); } else { WR.g.visible=false; removeSolid(WR.hit); }
  if(!!v.vo!==COL.vOn||String(v.vb)!==String(COL.vBurst)){ COL.vBurst=v.vb.slice(); setValves(!!v.vo); }
  CH.cands.forEach((c,i)=>{ c.lit=!!v.cand[i]; c.flames.forEach(f=>f.visible=c.lit); }); muralLit(!!v.mur);
  lodeParts.shaft.visible=lodeParts.shaftBeam.visible=!!v.sh; lodeParts.ob.position.y=v.ob;
  HL.crystals.forEach((c,i)=>{ const vis=!!v.cr[i]; if(c.visible!==vis){ c.visible=vis; if(vis) addSolid(c); else removeSolid(c); } c.material=(v.lit&&v.lit.indexOf(i)>=0)?HL.litMat:c.userData.base; });
  HL.gateOpen=!!v.gate; HL.gate.visible=HL.gateOpen; HL.lit=v.lit||null; }
function netResetLocal(){ NZ.clear(); NPU.forEach(q=>scene.remove(q.g)); NPU.clear(); NLU.forEach(q=>scene.remove(q.g)); NLU.clear(); NPR.forEach(m=>m.visible=false); P.downed=false; P.dead=false; P.revProg=0; NET.lastSnap=null; NET.jr=null; NET.pts={}; NET.kills={}; }
// teammates: soldiers in team colours with name tags
function makeAvatar(r){ const g=new THREE.Group(); const coat=L({color:AVC[r.color]}), skin=L({color:0xc8a888}), dk=L({color:0x2a2620}), helm=L({color:0x4a4a3e});
  const legL=limb(g,ZG.leg,dk,-.13,.86,.82), legR=limb(g,ZG.leg,dk,.13,.86,.82); part(g,ZG.torso,coat,0,1.27,0); part(g,ZG.belt,dk,0,.94,0);
  const head=part(g,ZG.head,skin,0,1.82,0); const h1=new THREE.Mesh(new THREE.CylinderGeometry(.27,.3,.04,12),helm); h1.position.y=.17; head.add(h1); const h2=new THREE.Mesh(new THREE.SphereGeometry(.19,10,6,0,Math.PI*2,0,Math.PI/2),helm); h2.position.y=.16; head.add(h2);
  const armL=limb(g,ZG.arm,coat,-.36,1.58,.64), armR=limb(g,ZG.arm,coat,.36,1.58,.64); armL.rotation.x=-1.25; armL.rotation.z=.35; armR.rotation.x=-1.35;
  const band=new THREE.Mesh(new THREE.BoxGeometry(.16,.1,.16),B({color:parseInt(AVCSS[r.color].slice(1),16)})); band.position.y=-.15; armL.children[0].add(band);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(.07,.6,.1),M.metal); gun.position.set(0,-.8,0); armR.add(gun);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),M.add(0xffb050,1)); fl.position.set(0,-1.15,0); fl.rotation.x=Math.PI/2; fl.visible=false; armR.add(fl);
  const lab=makeLabel(r.name,{sx:1.5,size:44,color:AVCSS[r.color],fog:false}); lab.position.y=2.4; g.add(lab);
  scene.add(g); return {g,legL,legR,armL,armR,fl,ph:0,shots:-1,flashT:0}; }
function dropAvatar(id){ const r=NET.remotes[id]; if(r&&r.av){ scene.remove(r.av.g); r.av=null; } }
function updateAvatars(dt){ for(const id in NET.remotes){ const r=NET.remotes[id], st=r.st; if(!st) continue; if(!r.av) r.av=makeAvatar(r); const a=r.av, g=a.g;
    g.visible=st.m===mode&&!st.cab; if(!g.visible) continue; const ox=g.position.x, oz=g.position.z, k=Math.min(1,dt*12);
    g.position.x+=(st.x-g.position.x)*k; g.position.z+=(st.z-g.position.z)*k; g.position.y=st.dn||st.dd?.15:st.y; let dr=st.yaw+Math.PI-g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); g.rotation.y+=dr*k; g.rotation.x=st.dn||st.dd?-1.45:0;
    const sp=Math.hypot(g.position.x-ox,g.position.z-oz)/Math.max(dt,1e-3); a.ph+=dt*sp*2.6; const sw=Math.sin(a.ph)*Math.min(.7,sp*.15); a.legL.rotation.x=sw; a.legR.rotation.x=-sw; a.armR.rotation.x=-1.35-st.pitch*.8;
    if(a.shots<0) a.shots=st.sh; if(st.sh>a.shots){ a.shots=st.sh; a.flashT=.06; const W_=WD[st.w]; if(W_&&sfx[W_.snd]) sfxAt(W_.snd,g.position,60,!!st.up); }
    a.flashT-=dt; a.fl.visible=a.flashT>0; } }
function netTick(dt){ if(NET.role==='solo') return; NET.sendT-=dt;
  if(NET.role==='client'){ if(NET.sendT<=0){ NET.sendT=1/15; toHost(myState()); } }
  else { if(NET.sendT<=0){ NET.sendT=1/12; bcast(makeSnap()); for(const id in NET.pts){ const kk=NET.kills[id]||{k:0,h:0}; sendTo(id,{t:'pts',n:NET.pts[id],k:kk.k,hd:kk.h}); } NET.pts={}; NET.kills={}; }
    if(state==='play'||state==='paused'){ const ups=[!(P.downed||P.dead)]; for(const id in NET.remotes){ const st=NET.remotes[id].st; if(st) ups.push(!(st.dn||st.dd)); } if(!ups.some(Boolean)) gameOver(); } }
  updateAvatars(dt); }
