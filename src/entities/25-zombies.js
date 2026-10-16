/* ---------- zombies ---------- */
const zombies=[]; let zparts=[];
const ZG=(()=>{ const t=new THREE.CylinderGeometry(.27,.21,.72,12); t.scale(1,1,.6); const h=new THREE.SphereGeometry(.165,14,10); h.scale(1,1.12,1.05); const bl=new THREE.CylinderGeometry(.24,.24,.08,12); bl.scale(1,1,.62);
  return {torso:t,head:h,arm:new THREE.CylinderGeometry(.075,.055,.64,9),leg:new THREE.CylinderGeometry(.1,.072,.82,9),eye:new THREE.SphereGeometry(.027,6,4),belt:bl,cap:new THREE.CylinderGeometry(.17,.18,.09,12),
    hand:new THREE.SphereGeometry(.058,8,6),foot:new THREE.BoxGeometry(.12,.08,.24),jaw:new THREE.BoxGeometry(.15,.05,.12),neck:new THREE.CylinderGeometry(.06,.07,.14,8)}; })();
const clothTex=makeTex(128,(g,s)=>{ g.fillStyle='#cfcfcf'; g.fillRect(0,0,s,s); for(let y=0;y<s;y+=2){ g.fillStyle=`rgba(0,0,0,${rand(.03,.09)})`; g.fillRect(0,y,s,1); } speckle(g,s,500,['#8a8a8a','#e8e8e8','#9a9a9a'],1,3);
  for(let i=0;i<7;i++){ g.fillStyle=`rgba(50,32,16,${rand(.25,.5)})`; g.beginPath(); g.ellipse(rand(0,s),rand(0,s),rand(6,22),rand(4,14),rand(0,3),0,7); g.fill(); }
  for(let i=0;i<4;i++){ g.fillStyle=`rgba(110,12,8,${rand(.35,.6)})`; g.beginPath(); g.ellipse(rand(0,s),rand(0,s),rand(3,12),rand(5,16),rand(0,3),0,7); g.fill(); } });
const skinTex=makeTex(64,(g,s)=>{ g.fillStyle='#d6d6d6'; g.fillRect(0,0,s,s); speckle(g,s,400,['#a8a8a8','#f0f0f0','#9a8a8a'],1,3); for(let i=0;i<5;i++){ g.strokeStyle='rgba(70,20,34,.4)'; g.lineWidth=1; g.beginPath(); let x=rand(0,s),y=rand(0,s); g.moveTo(x,y); for(let k=0;k<4;k++){ x+=rand(-8,8); y+=rand(-8,8); g.lineTo(x,y);} g.stroke(); } });
const ZM={coat:[0x4b4f3c,0x44463a,0x51493a,0x3d4234].map(c=>L({color:c,map:clothTex})),pants:L({color:0x2f2b23,map:clothTex}),skin:L({color:0x8a937a,map:skinTex}),skin2:L({color:0x77806a,map:skinTex}),belt:L({color:0x2a2018}),
  eye:B({color:0xe0b95a}),eyeH:B({color:0x9af0ff}),skinH:L({color:0x9aa8c0,emissive:0x1a3a48,map:skinTex}),coatH:L({color:0x22243a,emissive:0x120f28,map:clothTex}),coatM:L({color:0x3c4a4a,emissive:0x15606e,map:clothTex}),
  armor:L({color:0x55585c}),armorDark:L({color:0x2c2e31}),visor:B({color:0xff4a2a}),visorP:B({color:0x8ae8ff}),flash:B({color:0xffffff})};
ZM.coatB=L({color:0x5e3a22,emissive:0x2e1000,map:clothTex});
const HG=(()=>{ const b=new THREE.SphereGeometry(.24,14,9); b.scale(.85,.75,2.1); const h=new THREE.SphereGeometry(.15,12,8); h.scale(.95,.85,1.25); const sn=new THREE.CylinderGeometry(.055,.08,.16,8); sn.rotateX(Math.PI/2); const tl=new THREE.CylinderGeometry(.03,.012,.42,6); tl.rotateX(Math.PI/2);
  return {body:b,head:h,jaw:new THREE.BoxGeometry(.15,.05,.22),leg:new THREE.CylinderGeometry(.055,.04,.56,8),ear:new THREE.ConeGeometry(.045,.14,5),tail:tl,spine:new THREE.BoxGeometry(.05,.07,.6),snout:sn}; })();
const HM={hide:L({color:0x2b231c,emissive:0x220800}),hideH:L({color:0x1e2236,emissive:0x0a1a30}),eye:B({color:0xff6a20}),ember:B({color:0xff8a3a})};
function part(g,geo,mat,x,y,z,z_,head){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); g.add(m); if(z_){ m.userData.z=z_; if(head) m.userData.head=true; z_.parts.push(m); } return m; }
function limb(g,geo,mat,x,y,len,z_){ const pv=new THREE.Group(); pv.position.set(x,y,0); g.add(pv); part(pv,geo,mat,0,-len/2,0,z_); return pv; }
function makeZombie(kind){
  const g=new THREE.Group(); const z={g,parts:[],kind,boss:false};
  const coat=kind==='hollow'?ZM.coatH:kind==='marked'?ZM.coatM:kind==='burster'?ZM.coatB:pick(ZM.coat), skin=kind==='hollow'?ZM.skinH:(Math.random()<.5?ZM.skin:ZM.skin2), eye=kind==='hollow'||kind==='marked'?ZM.eyeH:kind==='burster'?HM.eye:ZM.eye;
  const torso=part(g,ZG.torso,coat,0,1.27,0,z); part(g,ZG.belt,ZM.belt,0,.94,0);
  if(kind==='burster'){ torso.scale.set(1.45,1.15,2); for(let i=0;i<5;i++){ const b=part(torso,ZG.eye,HM.ember,rand(-.22,.22),rand(-.28,.28),.16); b.scale.set(1.6,3,1); } }
  const head=part(g,ZG.head,skin,0,1.82,.02,z,true); head.rotation.set(rand(-.15,.25),rand(-.3,.3),rand(-.25,.25)); z.head=head;
  part(head,ZG.eye,eye,-.065,.03,.162); part(head,ZG.eye,eye,.065,.03,.162); part(head,ZG.jaw,skin,0,-.15,.07).rotation.x=.3; if(Math.random()<.5) part(head,ZG.cap,coat,0,.2,0);
  z.armL=limb(g,ZG.arm,Math.random()<.3?skin:coat,-.36,1.58,.64,z); z.armR=limb(g,ZG.arm,coat,.36,1.58,.64,z);
  z.legL=limb(g,ZG.leg,ZM.pants,-.13,.86,.82,z); z.legR=limb(g,ZG.leg,ZM.pants,.13,.86,.82,z);
  part(z.armL,ZG.hand,skin,0,-.66,0); part(z.armR,ZG.hand,skin,0,-.66,0); part(z.legL,ZG.foot,ZM.belt,0,-.84,.05); part(z.legR,ZG.foot,ZM.belt,0,-.84,.05); part(g,ZG.neck,skin,0,1.66,0);
  return z;
}
function makeHound(hollow){ const g=new THREE.Group(); const z={g,parts:[],kind:'hound',boss:false}; const m=hollow?HM.hideH:HM.hide, e=hollow?ZM.eyeH:HM.eye;
  part(g,HG.body,m,0,.66,0,z); part(g,HG.spine,hollow?ZM.eyeH:HM.ember,0,.85,-.05);
  const head=part(g,HG.head,m,0,.82,.6,z,true); z.head=head; part(head,HG.snout,m,0,-.04,.2); part(head,HG.jaw,m,0,-.15,.05); part(head,ZG.eye,e,-.08,.04,.185); part(head,ZG.eye,e,.08,.04,.185); part(head,HG.ear,m,-.09,.18,-.08); part(head,HG.ear,m,.09,.18,-.08);
  const tail=part(g,HG.tail,m,0,.8,-.62); tail.rotation.x=.6;
  z.armL=limb(g,HG.leg,m,-.13,.56,.56,z); z.armR=limb(g,HG.leg,m,.13,.56,.56,z); z.armL.position.z=.34; z.armR.position.z=.34;
  z.legL=limb(g,HG.leg,m,-.13,.56,.56,z); z.legR=limb(g,HG.leg,m,.13,.56,.56,z); z.legL.position.z=-.34; z.legR.position.z=-.34;
  return z; }
function makeBoss(prime){
  const g=new THREE.Group(); const z={g,parts:[],kind:'boss',boss:true,prime};
  const ar=ZM.armor, ad=ZM.armorDark;
  part(g,new THREE.BoxGeometry(1,1.15,.7),ar,0,2.05,0,z); part(g,new THREE.BoxGeometry(1.06,.2,.74),ad,0,1.42,0,z);
  part(g,new THREE.BoxGeometry(.8,.5,.06),prime?ZM.visorP:ZM.visor,0,2.1,.36);
  const t1=part(g,new THREE.CylinderGeometry(.18,.18,.9,8),ad,-.25,2.2,-.48); const t2=part(g,new THREE.CylinderGeometry(.18,.18,.9,8),ad,.25,2.2,-.48);
  const head=part(g,new THREE.BoxGeometry(.56,.56,.56),ar,0,2.9,0,z,true); part(head,new THREE.BoxGeometry(.46,.1,.05),prime?ZM.visorP:ZM.visor,0,.03,.29);
  z.armL=limb(g,new THREE.BoxGeometry(.34,1,.34),ar,-.72,2.45,1,z); z.armR=limb(g,new THREE.BoxGeometry(.34,1,.34),ar,.72,2.45,1,z);
  const can=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,.6,8),ad); can.position.y=-1.1; z.armR.add(can);
  z.legL=limb(g,new THREE.BoxGeometry(.38,1.4,.38),ad,-.26,1.45,1.4,z); z.legR=limb(g,new THREE.BoxGeometry(.38,1.4,.38),ad,.26,1.45,1.4,z);
  if(prime){ g.scale.setScalar(1.25); const sm=new THREE.Mesh(new THREE.SphereGeometry(2,16,10),M.add(0x9af0ff,.22)); sm.position.y=2; sm.visible=false; g.add(sm); z.shieldMesh=sm; }
  return z;
}
const SPAWNS={E:[[34,27],[56,8],[56,27],[44,18]],G:[[45,-27],[97,-27],[97,2],[70,-28],[58,-2]],A:[[-7,47],[7,47],[-7,33]],B:[[-27,27],[27,26],[-27,8],[27,8],[3,9],[12,27]],C:[[-27,1],[-27,-27],[7,-27],[7,-1],[-15,-27]],D:[[37,1],[37,-27],[13,-27],[26,1],[13,-1]]};
function pickSpawn(kind){
  if(mode==='main'&&(kind==='walker'||kind==='marked'||kind==='burster')&&Math.random()<.8){
    const ws=WINDOWS.filter(w=>ZONES[w.zone]&&ZONES[w.zone].open).map(w=>({w,d:Math.hypot(w.x-P.pos.x,w.z-P.pos.z)})).filter(o=>o.d<45).sort((a,b)=>a.d-b.d).slice(0,4);
    if(ws.length){ const w=pick(ws).w; return {x:w.spX+rand(-.8,.8)*Math.abs(w.nz),z:w.spZ+rand(-.8,.8)*Math.abs(w.nx),win:w}; } }
  if(mode==='hollow'){ for(let k=0;k<12;k++){ const a=rand(0,6.28), x=HX+Math.cos(a)*21, z=HZ+Math.sin(a)*21; if(Math.hypot(x-P.pos.x,z-P.pos.z)>9) return {x,z}; } return {x:HX+21,z:HZ}; }
  const cands=[]; for(const k in SPAWNS){ if(!ZONES[k].open) continue; for(const s of SPAWNS[k]){ const d=Math.hypot(s[0]-P.pos.x,s[1]-P.pos.z); if(d>6) cands.push({x:s[0],z:s[1],d}); } }
  const near=cands.filter(c=>c.d<34); const c=pick(near.length?near:cands); return c||{x:-7,z:47};
}
function zHP(n){ return n<10?150+100*(n-1):Math.round(950*Math.pow(1.115,n-9)); }
function spawnZombie(kind){
  if(NET.role==='client') return null;
  const z=kind==='boss'||kind==='prime'?makeBoss(kind==='prime'):kind==='hound'?makeHound(mode==='hollow'):makeZombie(kind);
  const sp=pickSpawn(kind); z.win=sp.win||null; z.wstate=z.win?'approach':null; z.g.position.set(sp.x,-2.2,sp.z); z.g.rotation.y=Math.atan2(P.pos.x-sp.x,P.pos.z-sp.z); scene.add(z.g);
  const n=R.n;
  if(z.boss){ z.hp=z.prime?36000:Math.max(3000,1400*n); z.speed=z.prime?2.1:1.7; z.reach=2.3; z.dmg=z.prime?90:75; z.fireCd=3; }
  else if(kind==='hound'){ z.hp=Math.max(220,zHP(n)*.45); z.speed=rand(5.2,5.9); z.reach=1.25; z.dmg=30; }
  else if(kind==='burster'){ z.hp=zHP(n)*1.4; z.speed=rand(1.5,1.9); z.reach=1.5; z.dmg=0; }
  else if(kind==='hollow'){ z.hp=Math.max(zHP(n),900)*1.2; z.speed=rand(4.1,4.6); z.reach=1.3; z.dmg=55; }
  else { z.hp=zHP(n); const r=Math.random(); const run=clamp((n-3)*.16,0,.85), jog=clamp((n-1)*.22,0,.7);
    z.speed=kind==='marked'?2.8:r<run?rand(3.7,4.3):r<run+jog?rand(2.2,2.8):rand(1.15,1.7); z.reach=1.3; z.dmg=50; }
  z.hp*=DF().hp*(1+.3*(NP()-1)); z.speed*=DF().spd; z.maxHp=z.hp; z.rise=kind==='hound'?.45:1.2; z.swing=0; z.cd=0; z.phase=rand(0,6); z.tx=sp.x; z.tz=sp.z; z.stuckT=0; z.lx=sp.x; z.lz=sp.z; z.nudge=0; z.dead=false;
  z.id=++NET.zid; zombies.push(z); zparts=zparts.concat(z.parts); spawnParticles(new V3(sp.x,.2,sp.z),'dirt',8); if(kind==='hound'){ spawnParticles(new V3(sp.x,.6,sp.z),'ember',8); sfx.houndSpawn(); }
  if(z.boss){ sfx.boss(); banner(z.prime?'The Warden Prime':'An Iron Warden approaches',z.prime?'The keeper of the Hollow':'Aim for the visor'); }
  return z;
}
const aliveCount=()=>{ let c=0; for(const z of zombies) if(!z.dead) c++; return c; };
function route(a,b){ const prev={}; prev[a]=null; const q=[a];
  while(q.length){ const z=q.shift(); if(z===b) break; for(const d of DOORS){ if(!d.open) continue; const n=d.a===z?d.b:d.b===z?d.a:null; if(n&&!(n in prev)){ prev[n]={z,d}; q.push(n);} } }
  if(!(b in prev)) return null; let cur=b; while(prev[cur].z!==a) cur=prev[cur].z; return {door:prev[cur].d,next:cur}; }
function hitZombie(z,dmg,mult,how){
  if(z.dead) return;
  if(NET.role==='client'){ if(z.id) toHost({t:'hit',id:z.id,dmg,mult,how}); z.flash=.07; return; }
  if(z.shield){ if(GT-(HL.shMsg||-9)>3){ HL.shMsg=GT; toast('Warded! Shatter the glowing crystals'); } spawnParticles(z.g.position.clone().setY(2.6),'relic',2); return; }
  let d=dmg*mult; if(PU.insta>0&&!z.boss) d=z.hp+1;
  z.hp-=d; z.flash=.07; if(!z.boss||Math.random()<.5) addPts(10);
  if(z.prime){ const f=z.hp/z.maxHp;
    if(!z.ph1&&f<.66){ z.ph1=true; z.hp=z.maxHp*.65; shieldUp(z,pickN([0,1,2,3,4],3)); return; }
    if(!z.ph2&&f<.33){ z.ph2=true; z.hp=z.maxHp*.32; shieldUp(z,[0,1,2,3,4].filter(i=>HL.crystals[i].visible)); return; } }
  if(z.hp<=0) killZombie(z,how==='melee'?'melee':(mult>1.01?'head':'body'));
}
function shieldUp(z,idx){ z.shield=true; z.shieldMesh.visible=true; HL.lit=idx.slice(); idx.forEach(i=>HL.crystals[i].material=HL.litMat); sfx.boss(); banner('The Prime raises a ward','Shatter the glowing crystals'); for(let k=0;k<5;k++) spawnZombie('hollow'); }
function hitCrystal(i){ const L_=HL.lit; if(!L_||L_.indexOf(i)<0) return; const c=HL.crystals[i]; L_.splice(L_.indexOf(i),1); c.visible=false; removeSolid(c); c.userData.col.on=false;
  spawnParticles(new V3(HX+c.position.x,2.2,HZ+c.position.z),'relic',14); sfx.shatter();
  if(!L_.length){ const z=zombies.find(q=>q.prime&&!q.dead); if(z){ z.shield=false; z.shieldMesh.visible=false; } HL.lit=null; banner('The ward shatters','Hit it with everything'); }
  else toast(`Crystal shattered. ${L_.length} remain`); }
function killZombie(z,how,silent){
  if(NET.role==='client') return;
  z.headKill=how==='head'; z.dead=true; z.dt=0; zparts=zparts.filter(p=>p.userData.z!==z);
  if(z.kind==='burster'&&!silent) burst(z);
  if(!silent) zvoice(z,'death');
  if(!silent&&how!=='self'){ creditKill(how);
    if(how==='head'&&z.head&&!z.boss){ z.head.visible=false; const hp_=new V3(); z.head.getWorldPosition(hp_); spawnParticles(hp_,'blood',9); } addPts(z.boss?490:how==='melee'?120:how==='head'?90:50); sfx.kill(); hitMarker(true);
    const p=z.g.position;
    for(const st of Q.stones){ if(!st.fed&&Math.hypot(p.x-st.x,p.z-st.z)<7.5){ st.kills++; st.rm.color.setHSL(.1,.6,.15+st.kills/STONE_KILLS*.35); spawnParticles(new V3(st.x,2.3,st.z),'relic',4);
      if(st.kills>=STONE_KILLS){ st.fed=true; st.rm.color.set(0xf2cb78); sfx.ignite(); toast(`The ${st.name} is fed. Strike it with the Rod.`); } } }
    if(z.kind==='marked'&&!Q.frag.marked) spawnFrag('marked',p.x,p.z);
    if(z.kind==='hound') R.houndPos={x:p.x,z:p.z};
    if(z.boss){ dropPup(p.x,p.z,'ammo'); if(z.prime) primeDown(); if(z.wraithBound) wraithDone(); }
    else if(mode==='main'?(R.pups<4+Math.floor(R.n/6)&&Math.random()<.04):(HL.pups<3&&Math.random()<.03)){ dropPup(p.x,p.z); if(mode==='main') R.pups++; else HL.pups++; } }
}
const _v=new V3();
function updateWinZombie(z,dt){ const W=z.win, g=z.g, p=g.position, zs=z.speed*(PU.freeze>0?.35:1); let moving=false;
  const WT=zTarget(p), dP=WT.none?1e9:Math.hypot(WT.x-p.x,WT.z-p.z);
  if(z.wstate==='approach'){ const ahead=zombies.some(o=>o!==z&&!o.dead&&o.win===W&&(o.wstate==='tear'||o.wstate==='climb'));
    const back=1.3+(ahead?1.2:0), tx=W.x+W.nx*back+(ahead?rand(-.02,.02):0), tz=W.z+W.nz*back, dx=tx-p.x, dz=tz-p.z, d=Math.hypot(dx,dz);
    if(d>.15){ const st=Math.min(d,Math.max(1.3,zs)*dt); p.x+=dx/d*st; p.z+=dz/d*st; moving=true; } else if(!ahead){ z.wstate='tear'; z.cd=.5; } }
  else if(z.wstate==='tear'){
    if(z.kind==='burster'&&dP<2){ killZombie(z,'self'); return; }
    if(z.swing>0){ z.swing-=dt; if(!z.hitDone&&z.swing<.22){ z.hitDone=true; if(z.swingKind==='hit'){ if(dP<2.3) hurtTarget(WT,z.dmg||30,p); } else tearPlank(W); } }
    else if(dP<2.1&&z.cd<=0&&z.dmg>0){ z.swing=.45; z.hitDone=false; z.swingKind='hit'; z.cd=1; zvoice(z,'attack'); }
    else { z.cd-=dt; if(z.cd<=0){ if(W.count()>0){ z.swing=.6; z.hitDone=false; z.swingKind='tear'; z.cd=.85/DF().spd; } else { z.wstate='climb'; z.ct=0; } } } }
  else if(z.wstate==='climb'){ z.ct+=dt/.85; const k=Math.min(1,z.ct); p.x=W.outX+(W.inX-W.outX)*k; p.z=W.outZ+(W.inZ-W.outZ)*k; p.y=Math.sin(k*Math.PI)*.95; g.rotation.x=Math.sin(k*Math.PI)*.5; moving=true;
    if(k>=1){ z.wstate=null; p.y=0; g.rotation.x=0; z.tx=W.inX-W.nx*2; z.tz=W.inZ-W.nz*2; z.win=null; return; } }
  g.rotation.y=Math.atan2(-W.nx,-W.nz);
  z.phase+=dt*(moving?zs*3.2:1); const sw=Math.sin(z.phase)*(moving?.5:.05); z.legL.rotation.x=sw; z.legR.rotation.x=-sw;
  if(z.swing>0){ const k=Math.sin((1-z.swing/(z.swingKind==='tear'?.6:.45))*Math.PI); z.armL.rotation.x=-1.35-k*1.1; z.armR.rotation.x=-1.35-k*.6; }
  else { z.armL.rotation.x=-1.35+Math.sin(z.phase*.5)*.15; z.armR.rotation.x=-1.35-Math.sin(z.phase*.5+1)*.15; } }
// the player a zombie hunts (multiplayer adds remote players here)
function zTarget(p){ let best=null,bd=1e9; const cand=[]; if(!(P.downed||P.dead||P.inCabin)) cand.push({x:P.pos.x,z:P.pos.z,id:'h',remote:false});
  if(NET.role==='host') for(const id in NET.remotes){ const st=NET.remotes[id].st; if(st&&!st.dn&&!st.dd&&!st.cab&&st.m===mode) cand.push({x:st.x,z:st.z,id,remote:true}); }
  for(const c of cand){ const d=Math.hypot(c.x-p.x,c.z-p.z); if(d<bd){ bd=d; best=c; } } return best||{x:P.pos.x,z:P.pos.z,id:'h',remote:false,none:true}; }
function hurtTarget(t,d,src){ if(t.remote) sendTo(t.id,{t:'hurt',d,s:[+src.x.toFixed(1),+src.z.toFixed(1)]}); else hurtPlayer(d,src); }
function updateZombies(dt){
  const pz=zoneOf(P.pos.x,P.pos.z)||P.zone; P.zone=pz;
  for(const z of zombies){
    const g=z.g, p=g.position;
    if(z.dead){ z.dt+=dt; if(z.dt<.5){ g.rotation.x=-(z.dt/.5)*1.45; } else p.y-=dt*.5; if(z.dt>2.6){ scene.remove(g); z.gone=true; } continue; }
    if(z.flash>0){ z.flash-=dt; }
    if(z.rise>0){ z.rise-=dt; p.y=-2.2*Math.max(0,z.rise/1.2); if(Math.random()<.2) spawnParticles(new V3(p.x,.1,p.z),'dirt',1); continue; }
    p.y=0;
    if(P.inCabin) continue;
    if(z.wstate){ updateWinZombie(z,dt); continue; }
    // target
    const TG=zTarget(p);
    const lu=lureFor(p), tgx=lu?lu.p.x:TG.x, tgz=lu?lu.p.z:TG.z, tzone=lu?(zoneOf(lu.p.x,lu.p.z)||pz):(zoneOf(TG.x,TG.z)||pz);
    const zf=zoneOf(p.x,p.z); let tx=tgx, tz=tgz;
    if(zf&&tzone&&zf!==tzone){ const r=route(zf,tzone); if(r){ const d=r.door; const dd=Math.hypot(p.x-d.x,p.z-d.z); if(dd<2.6){ const nc=ZONES[r.next].c; const vx=nc.x-d.x, vz=nc.z-d.z, l=Math.hypot(vx,vz)||1; tx=d.x+vx/l*4; tz=d.z+vz/l*4; } else { tx=d.x; tz=d.z; } } z.tx=tx; z.tz=tz; }
    else if(!zf){ tx=z.tx; tz=z.tz; if(Math.hypot(tx-p.x,tz-p.z)<.5){ tx=tgx; tz=tgz; } }
    const dpx=TG.x-p.x, dpz=TG.z-p.z, dP=TG.none?1e9:Math.hypot(dpx,dpz);
    let dx=tx-p.x, dz=tz-p.z; let dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl;
    z.cd-=dt;
    // ranged (boss)
    if(z.boss){ z.fireCd-=dt; if(z.fireCd<=0&&dP>5&&dP<28){ z.fireCd=z.prime?2.2:3.4; fireProj(z); } }
    let moving=true;
    if(z.swing>0){ z.swing-=dt; moving=false; if(!z.hitDone&&z.swing<.22){ z.hitDone=true; if(z.kind==='burster'){ killZombie(z,'self'); continue; } if(dP<z.reach+.35) hurtTarget(TG,z.dmg,p); } }
    else if(dP<z.reach&&z.cd<=0&&(TG.remote||P.revive<=0)){ z.swing=.45; z.hitDone=false; z.cd=.95; moving=false; zvoice(z,'attack'); }
    else if(dP<z.reach*.8) moving=false;
    if(moving){ const zs=z.speed*(PU.freeze>0?.35:1);
      let sx=0,sz=0; for(const o of zombies){ if(o===z||o.dead||o.rise>0||o.wstate) continue; const ox=p.x-o.g.position.x, oz=p.z-o.g.position.z, od=ox*ox+oz*oz; const rr_=(z.boss||o.boss)?1.6:.7; if(od<rr_*rr_&&od>1e-4){ const k=(rr_-Math.sqrt(od))/rr_; sx+=ox*k*2; sz+=oz*k*2; } }
      if(z.nudge>0){ z.nudge-=dt; sx+=-dz*z.nside*1.2; sz+=dx*z.nside*1.2; }
      p.x+=(dx*zs+sx)*dt; p.z+=(dz*zs+sz)*dt;
      collide(p,z.boss?.7:.33);
      const pd=Math.hypot(P.pos.x-p.x,P.pos.z-p.z), minD=z.boss?1.2:.72; if(pd<minD&&pd>1e-3){ p.x-= (P.pos.x-p.x)/pd*(minD-pd); p.z-=(P.pos.z-p.z)/pd*(minD-pd); }
      z.stuckT+=dt; if(z.stuckT>.8){ const moved=Math.hypot(p.x-z.lx,p.z-z.lz); if(moved<zs*.8*.25){ z.nudge=.9; z.nside=Math.random()<.5?-1:1; } z.stuckT=0; z.lx=p.x; z.lz=p.z; }
    }
    const face=Math.atan2(dP<6?dpx:dx,dP<6?dpz:dz); let dr=face-g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); g.rotation.y+=dr*Math.min(1,dt*8);
    // animate
    z.phase+=dt*(moving?z.speed*(z.boss?2.2:3.2):1);
    const sw=Math.sin(z.phase)*(moving?(z.speed>3?.9:.5):.05);
    z.legL.rotation.x=sw; z.legR.rotation.x=-sw;
    if(z.kind==='hound'){ z.armL.rotation.x=-sw; z.armR.rotation.x=sw; g.rotation.x=z.swing>0?-.3*Math.sin((1-z.swing/.45)*Math.PI):0; continue; }
    const armBase=z.boss?-.3:-1.35;
    if(z.swing>0){ const k=Math.sin((1-z.swing/.45)*Math.PI); z.armL.rotation.x=armBase-k*.9; z.armR.rotation.x=armBase-k*1.1; }
    else { z.armL.rotation.x=armBase+Math.sin(z.phase*.5)*.15; z.armR.rotation.x=armBase-Math.sin(z.phase*.5+1)*.15; }
    if(z.speed>3&&moving) g.rotation.x=.18; else g.rotation.x=0;
  }
  for(let i=zombies.length-1;i>=0;i--) if(zombies[i].gone) zombies.splice(i,1);
}
