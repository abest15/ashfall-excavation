/* ---------- interaction & economy ---------- */
function spend(c){ if(P.points<c){ sfx.deny(); toast('Not enough points'); return false; } P.points-=c; sfx.buy(); return true; }
function addPts(n){ const v=n*(PU.double>0?2:1); if(NET.role==='host'&&NET.credit&&NET.credit!=='h'){ NET.pts[NET.credit]=(NET.pts[NET.credit]||0)+v; return; } P.points+=v; P.earned+=v; popPts(v); }
function giveWeapon(inst){
  const same=P.weapons.findIndex(w=>w.id===inst.id);
  if(same>=0){ P.weapons[same]=inst; P.cur=same; }
  else if(P.weapons.length<maxSlots()){ P.weapons.push(inst); P.cur=P.weapons.length-1; }
  else { P.weapons[P.cur]=inst; }
  P.swapT=.5; buildVM();
}

// wall buys
function wallBuy(id,x,z,ry){
  const d=WD[id]; const fx=Math.sin(ry), fz=Math.cos(ry);
  const board=box(2.4,1.1,.08,M.plank,x,1.6,z,{ry}); board.material=L({map:plankTex,color:0x8a7a68});
  const g=buildGun(id,false,GM.chalk); g.position.set(x+fx*.06,1.6,z+fz*.06); g.rotation.y=ry+Math.PI/2; g.scale.setScalar(1.6); scene.add(g);
  const lab=makeLabel(`${d.name} · ${d.cost}`,{sx:2.2,size:44,color:'#d8d2c2'}); lab.position.set(x+fx*.3,2.45,z+fz*.3); scene.add(lab);
  addInter({x:x+fx*1.1,z:z+fz*1.1,r:1.9,prompt:()=>{ const own=P.weapons.find(w=>w.id===id); if(own) return own.up?`Buy ${d.up} ammo [4500]`:`Buy ${d.name} ammo [${d.cost/2}]`; return `Buy ${d.name} [${d.cost}]`; },
    use:()=>{ const own=P.weapons.find(w=>w.id===id); if(own){ const c=own.up?4500:d.cost/2; const s=statsOf(own); if(own.res>=s.res){toast('Ammo is already full');return;} if(!spend(c))return; own.res=s.res; } else { if(!spend(d.cost))return; giveWeapon(mkInst(id)); } }});
}
wallBuy('carbine',9.35,40,-Math.PI/2);
wallBuy('smg',-29.35,19,Math.PI/2);
wallBuy('shotgun',-29.35,-6,Math.PI/2);
wallBuy('autorifle',44,5.65,0);
// clockwork lures (wall buy in the bunker)
function buildLure(ov){ const g=new THREE.Group(); const coat=ov||L({color:0x8a2a1e}), skin=ov||L({color:0xd8b890}), dk=ov||L({color:0x1e1a16}), br=ov||M.brass, wh=ov||L({color:0xe8e0cc});
  box(.14,.17,.1,coat,0,.2,0,{parent:g}); box(.05,.1,.05,dk,-.035,.06,0,{parent:g}); box(.05,.1,.05,dk,.035,.06,0,{parent:g});
  const hd=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),skin); hd.position.y=.33; g.add(hd); cyl(.045,.05,.08,dk,0,.4,0,8,g); cyl(.012,.012,.05,br,0,.46,.02,5,g);
  const drum=cyl(.075,.075,.07,wh,0,.13,.09,12,g); drum.rotation.x=Math.PI/2; for(const zz of [.055,.125]){ const r=new THREE.Mesh(new THREE.TorusGeometry(.075,.008,4,14),ov||L({color:0xa02a1e})); r.position.set(0,.13,zz); g.add(r); }
  const sticks=[]; for(const sx of [-1,1]){ const a=new THREE.Group(); a.position.set(sx*.08,.25,.02); g.add(a); box(.025,.1,.025,coat,0,-.05,0,{parent:a}); const st=box(.01,.01,.12,br,0,-.1,.06,{parent:a}); sticks.push(a); }
  const key=new THREE.Mesh(new THREE.TorusGeometry(.03,.008,4,10),br); key.position.set(0,.22,-.07); g.add(key); g.userData={sticks,key}; return g; }
{ const x=9.35,z=44.5,ry=-Math.PI/2, fx=Math.sin(ry), fz=Math.cos(ry);
  const board=box(2.4,1.1,.08,M.plank,x,1.6,z,{ry}); board.material=L({map:plankTex,color:0x8a7a68});
  const g=buildLure(GM.chalk); g.position.set(x+fx*.08,1.15,z+fz*.08); g.rotation.y=ry; g.scale.setScalar(2.6); scene.add(g);
  const lab=makeLabel('Clockwork Lure · 1500',{sx:2.2,size:44,color:'#d8d2c2'}); lab.position.set(x+fx*.3,2.45,z+fz*.3); scene.add(lab);
  addInter({x:x+fx*1.1,z:z+fz*1.1,r:1.9,prompt:()=>P.lures>=3?null:'Buy three Clockwork Lures [1500] · G to throw',use:()=>{ if(P.lures>=3) return; if(!spend(1500)) return; P.lures=3; P.lureOwned=true; toast('Clockwork Lures: press G (LB) to throw'); }}); }
const LURES=[];
function throwLure(){ if(state!=='play'||P.lures<=0||P.downed||P.dead||P.inCabin) return; P.lures--; camera.updateMatrixWorld(); const fwd=new V3(0,0,-1).applyQuaternion(camera.quaternion);
  const p=camera.position.clone().addScaledVector(fwd,.6), v=fwd.multiplyScalar(13); v.y+=4; sfx.toss(); if(NET.role==='client') toHost({t:'lure',p:[p.x,p.y,p.z],v:[v.x,v.y,v.z]}); else spawnLure(p,v); }
function spawnLure(p,v){ const g=buildLure(); g.position.copy(p); scene.add(g); const q={g,p:g.position,v:v.clone(),active:false,life:8,tick:0,id:++LURE_ID}; LURES.push(q); return q; }
let LURE_ID=0;
function lureFor(p){ for(const q of LURES){ if(!q.active||Math.hypot(q.p.x-p.x,q.p.z-p.z)+Math.abs(q.p.y-p.y)>=28) continue; const a=zoneOf(p.x,p.z,p.y), b=zoneOf(q.p.x,q.p.z,q.p.y); if(a&&b&&a!==b&&!route(a,b)) continue; return q; } return null; }
function updateLures(dt){ for(let i=LURES.length-1;i>=0;i--){ const q=LURES[i], p=q.p;
  if(!q.active){ q.v.y-=18*dt; p.addScaledVector(q.v,dt); collide(p,.15); q.g.rotation.x+=dt*8; const lf=floorAt(p.x,p.y-q.v.y*dt,p.z)+.02; if(p.y<=lf){ p.y=lf; q.fy=lf; q.v.y*=-.3; q.v.x*=.55; q.v.z*=.55; if(q.v.length()<1.2){ q.active=true; q.v.set(0,0,0); q.g.rotation.set(0,Math.random()*6,0); } } continue; }
  q.life-=dt; q.tick-=dt; const u=q.g.userData; u.key.rotation.z+=dt*6;
  if(q.tick<=0){ q.tick=.22; sfxAt('drum',p,40); if(Math.random()<.35) sfxAt('chime',p,40); u.sticks.forEach((a,k)=>a.rotation.x=(k?1:-1)*.7); spawnParticles(new V3(p.x,p.y+.5,p.z),'spark',1); } else u.sticks.forEach(a=>a.rotation.x*=.8);
  q.g.position.y=(q.fy===undefined?.02:q.fy)+Math.abs(Math.sin(q.life*14))*.03;
  if(q.life<=0){ if(NET.role!=='client') explode(new V3(p.x,p.y+.6,p.z),6,1e6,{lure:true}); else explodeFx(new V3(p.x,p.y+.6,p.z)); scene.remove(q.g); LURES.splice(i,1); } } }
function explodeFx(pos){ spawnParticles(pos,'ember',14); spawnParticles(pos,'dirt',6); boomLight.color.set(0xff8a3a); boomLight.position.set(pos.x,2,pos.z); boomLight.intensity=4; sfx.boom(); }
