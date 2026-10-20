/* ---------- special dead: the Shrieker (round 8+), the Sapper (round 10+), the Gravecaller (quest boss) ----------
   Shrieker: pale, quick; when it sees you it stops and screams, and the dead climb up around it. Kill it first.
   Sapper: a trench sapper in riveted plate (body shots do less than half; aim for the head). Lobs a ticking charge.
   Gravecaller: a giant Shrieker raised by the rite; it calls the dead and wards itself twice (shoot the grave lanterns).
   The bodies are the normal zombie rig, re-dressed here (specialInit runs from spawnZombie on the host and from the
   snapshot on clients). Behaviour runs on the host in updateSpecials. */
let SPM_=null;
function specialMats(){ if(SPM_) return SPM_; SPM_={
  shriek:swayMat(L({map:zGrime,vertexColors:true,color:0xd0d8e8,emissive:0x10202c})), shriekJaw:B({color:0xbff3ff}),
  sapper:swayMat(L({map:zGrime,vertexColors:true,color:0x8a9098})), plate:L({color:0x34373a,specular:0x2a2a2a,shininess:20}), charge:B({color:0xff5a2a}),
  grave:swayMat(L({map:zGrime,vertexColors:true,color:0x9a8ab8,emissive:0x1a0630})), graveEye:B({color:0xd08aff}),
  // shared geometries (specials spawn all game long; nothing here is created per zombie)
  gJaw:new THREE.ConeGeometry(.07,.16,6), gHelm:new THREE.CylinderGeometry(.2,.22,.12,10), gPlate:new THREE.BoxGeometry(.46,.5,.12), gPack:new THREE.BoxGeometry(.3,.3,.18), gStick:new THREE.CylinderGeometry(.04,.04,.12,6),
  gEye:new THREE.SphereGeometry(.05,6,4), gCrown:new THREE.TorusGeometry(.2,.03,4,10), gWard:new THREE.SphereGeometry(.85,14,8), ward:M.add(0xd08aff,.2) }; return SPM_; }
const SPECIAL_KINDS={shrieker:1,sapper:1,gravecaller:1};
function specialInit(z,kind,net){ if(!SPECIAL_KINDS[kind]) return; const S_=specialMats(), g=z.g;
  if(kind==='shrieker'){ g.scale.set(.92,1.1,.92); z.parts.forEach(p=>{ if(!p.userData.head) p.material=S_.shriek; });
    if(z.head){ const jaw=new THREE.Mesh(S_.gJaw,S_.shriekJaw); jaw.position.set(0,-.08,.13); jaw.rotation.x=Math.PI/2; z.head.add(jaw); z.head.material=S_.shriek; }
    if(!net){ z.hp*=.8; z.speed=rand(3,3.4); z.dmg=35; z.shriekCd=rand(2,4); z.shriekT=0; } }
  else if(kind==='sapper'){ z.parts.forEach(p=>{ if(!p.userData.head) p.material=S_.sapper; });
    if(z.head){ const h=new THREE.Mesh(S_.gHelm,S_.plate); h.position.y=.13; z.head.add(h); }
    if(z.chest){ const pl=new THREE.Mesh(S_.gPlate,S_.plate); pl.position.set(0,.2,.17); z.chest.add(pl); const bk=new THREE.Mesh(S_.gPack,M.cloth); bk.position.set(0,.2,-.2); z.chest.add(bk);
      for(const sx of [-1,1]){ const c=new THREE.Mesh(S_.gStick,S_.charge); c.position.set(sx*.1,.38,-.25); c.rotation.x=Math.PI/2; z.chest.add(c); } }
    z.armor=true; if(!net){ z.hp*=2.2; z.speed=rand(1.5,1.9); z.dmg=55; z.throwCd=rand(3,5); } }
  else if(kind==='gravecaller'){ g.scale.setScalar(1.85); z.parts.forEach(p=>p.material=S_.grave); z.boss=true; z.gravecaller=true;
    if(z.head){ const e=new THREE.Mesh(S_.gEye,S_.graveEye); e.position.set(0,.03,.15); z.head.add(e); const crown=new THREE.Mesh(S_.gCrown,S_.graveEye); crown.position.y=.2; crown.rotation.x=Math.PI/2; z.head.add(crown); }
    const sm=new THREE.Mesh(S_.gWard,S_.ward); sm.position.y=1; sm.visible=false; g.add(sm); z.shieldMesh=sm; z.wardMsg='Warded! Shoot the grave lanterns';
    if(!net){ z.hp=Math.max(9000,1500*R.n); z.speed=1.6; z.reach=2.1; z.dmg=60; z.fireCd=5; z.sumCd=6; z.ph1=false; z.ph2=false; } } }
// lobbed charges (host simulates; clients draw from the snapshot)
const CHG=[], CHG_GEO=new THREE.CylinderGeometry(.09,.09,.22,8), CHG_POOL=[];
function chgMesh(){ const m=CHG_POOL.pop()||new THREE.Mesh(CHG_GEO,B({color:0xff5a2a})); m.visible=true; scene.add(m); return m; }
function chgFree(m){ scene.remove(m); CHG_POOL.push(m); }
function throwCharge(z,tx,tz,ty=0){ const p=z.g.position, m=chgMesh(); const q={a:new V3(p.x,p.y+1.6,p.z),b:new V3(tx+rand(-1.2,1.2),ty+.1,tz+rand(-1.2,1.2)),t:0,dur:1.1,fuse:1.6,m,beep:0}; m.position.copy(q.a); CHG.push(q); qSound('toss',p.x,p.z,30); }
function updateCharges(dt){ for(let i=CHG.length-1;i>=0;i--){ const q=CHG[i];
  if(q.t<q.dur){ q.t+=dt; const k=Math.min(1,q.t/q.dur); q.m.position.lerpVectors(q.a,q.b,k); q.m.position.y+=Math.sin(k*Math.PI)*3.2; q.m.rotation.x+=dt*9; continue; }
  q.fuse-=dt; q.beep-=dt; if(q.beep<=0){ q.beep=q.fuse>.6?.3:.12; sfxAt('tick',q.b,25); } q.m.material.color.set(Math.sin(GT*30)>0?0xff5a2a:0x2a0a00);
  if(q.fuse<=0){ explode(new V3(q.b.x,q.b.y+.5,q.b.z),3.6,380,{player:42}); chgFree(q.m); CHG.splice(i,1); } } }
function clearCharges(){ CHG.forEach(q=>chgFree(q.m)); CHG.length=0; NCHG.forEach(m=>chgFree(m)); NCHG.length=0; }
const NCHG=[];
function applyCharges(arr){ while(NCHG.length<arr.length) NCHG.push(chgMesh()); while(NCHG.length>arr.length){ const m=NCHG.pop(); explodeFx(m.position.clone().setY(.6)); chgFree(m); }
  arr.forEach((a,i)=>{ NCHG[i].position.set(a[0],a[1],a[2]); NCHG[i].material.color.set(a[3]&&Math.sin(GT*30)>0?0xff5a2a:0x2a0a00); }); }
// round spawns: which special (if any) replaces the next walker
function pickSpecial(){ if(R.hound||mode!=='main') return null; let sh=0, sa=0; for(const z of zombies){ if(z.dead) continue; if(z.kind==='shrieker') sh++; else if(z.kind==='sapper') sa++; }
  if(R.n>=10&&sa<2&&Math.random()<Math.min(.1,.04+.004*(R.n-10))) return 'sapper';
  if(R.n>=8&&sh<(NP()>1?2:1)&&Math.random()<Math.min(.12,.05+.004*(R.n-8))) return 'shrieker';
  return null; }
function nearestTarget(p){ let best=null,bd=1e9; for(const q of questPlayers()){ if(q.m!==mode) continue; const d=Math.hypot(q.x-p.x,q.z-p.z)+Math.max(0,Math.abs((q.y||0)-p.y)-1)*4; if(d<bd){ bd=d; best=q; } } return best?{x:best.x,y:best.y||0,z:best.z,d:bd}:null; }
function updateSpecials(dt){
  if(NET.role==='client') return;
  updateCharges(dt);
  for(const z of zombies){ if(z.dead||z.rise>0||z.wstate||!SPECIAL_KINDS[z.kind]) continue; const p=z.g.position; const t=nearestTarget(p); if(!t) continue;
    if(z.kind==='shrieker'){ if(z.shriekT>0){ z.shriekT-=dt; z.speed=0; if(z.shriekT<=0) z.speed=z.baseSpd||3.2; continue; }
      z.shriekCd-=dt; if(z.shriekCd<=0&&t.d<20){ z.shriekT=1.4; z.baseSpd=z.speed; z.speed=0; z.shriekCd=rand(11,15); qSound('shriek',p.x,p.z,70); qEv('shriekfx',{p:[+p.x.toFixed(1),+p.z.toFixed(1)]});
        const n=R.n>=15?3:2; for(let k=0;k<n;k++) if(aliveCount()<maxAlive()) questSpawn('walker',p.x,p.z,4,z.fy||0); } }
    else if(z.kind==='sapper'){ z.throwCd-=dt; if(z.throwCd<=0&&t.d>5&&t.d<18){ z.throwCd=rand(6,9); throwCharge(z,t.x,t.z,t.y); } }
    else if(z.kind==='gravecaller'){ const f=z.hp/z.maxHp;
      if(!z.ph1&&f<.66){ z.ph1=true; z.hp=Math.max(z.hp,z.maxHp*.62); gcWard(z); } else if(!z.ph2&&f<.33){ z.ph2=true; z.hp=Math.max(z.hp,z.maxHp*.3); gcWard(z); }
      z.sumCd-=dt; if(z.sumCd<=0){ z.sumCd=z.shield?6:9; qSound('shriek',p.x,p.z,90); for(let k=0;k<3;k++) if(aliveCount()<maxAlive()) questSpawn(R.n>=10&&k===0&&Math.random()<.4?'sapper':'walker',p.x,p.z,6,z.fy||0); } } } }
QEV.shriekfx=m=>{ const d=Math.hypot(P.pos.x-m.p[0],P.pos.z-m.p[1]); if(d<14&&mode==='main'){ P.shake=Math.max(P.shake||0,.3*(1-d/14)); flashScreen('rgba(190,230,255,.22)'); } };
