/* ---------- particles, beams ---------- */
const DOT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d'), gr=g.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.45,'rgba(255,255,255,.75)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); })();
const SPM=(col,add)=>new THREE.SpriteMaterial({map:DOT,color:col,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
const PART=[];
const PMAT={ion:SPM(0x7aff8a,1),blood:SPM(0x6a1810),dirt:SPM(0x4b3b2a),spark:SPM(0xffc070,1),relic:SPM(0x8ae8ff,1),ember:SPM(0xff7a2a,1)};
for(let i=0;i<(QUAL?140:70);i++){ const m=new THREE.Sprite(PMAT.dirt); m.visible=false; scene.add(m); PART.push({m,v:new V3(),life:0,s:.1}); }
let partI=0;
function spawnParticles(p,type,n){ for(let i=0;i<n;i++){ const q=PART[partI++%PART.length]; q.m.material=PMAT[type]; q.m.position.copy(p); q.v.set(rand(-2,2),rand(1,4),rand(-2,2)); q.life=rand(.3,.6); q.s=rand(.07,.14)*(type==='dirt'?1.5:type==='blood'?1.3:1); q.m.scale.setScalar(q.s); q.m.visible=true; } }
function updateParticles(dt){ for(const q of PART){ if(q.life<=0) continue; q.life-=dt; q.v.y-=12*dt; q.m.position.addScaledVector(q.v,dt); q.m.scale.setScalar(q.s*(.45+q.life*1.3)); if(q.life<=0||q.m.position.y<0) { q.m.visible=false; q.life=0; } } }
const BEAMS=[]; const beamGeo=new THREE.BoxGeometry(.05,.05,1); beamGeo.translate(0,0,.5);
for(let i=0;i<80;i++){ const m=new THREE.Mesh(beamGeo,M.add(0x8ae8ff,1)); m.visible=false; scene.add(m); BEAMS.push({m,life:0}); }
let beamI=0;
function explode(pos,r,dmg,o={}){ spawnParticles(pos,o.ptype||'ember',14); if(!o.ptype) spawnParticles(pos,'dirt',6); boomLight.color.set(o.light||0xff8a3a); boomLight.position.set(pos.x,2,pos.z); boomLight.intensity=4; sfx[o.snd||'boom']();
  const dP=Math.hypot(P.pos.x-pos.x,P.pos.z-pos.z); P.shake=Math.max(P.shake,clamp(1-dP/22,0,1)*.35);
  if(o.player&&dP<r) hurtPlayer(o.player*(1-dP/r*.5),pos);
  if(o.player&&NET.role==='host') for(const id in NET.remotes){ const st=NET.remotes[id].st; if(!st) continue; const d2=Math.hypot(st.x-pos.x,st.z-pos.z); if(d2<r) sendTo(id,{t:'hurt',d:o.player*(1-d2/r*.5),s:[pos.x,pos.z]}); }
  for(const z of zombies){ if(z.dead||z.rise>0) continue; const d=Math.hypot(z.g.position.x-pos.x,z.g.position.z-pos.z); if(d<r) hitZombie(z,o.lure&&z.boss?3000:dmg*(1-d/r*.6),1,'gun'); } }
const BOLTS=[]; const boltGeo=new THREE.SphereGeometry(.09,8,6);
function launchBolt(a,b,s,pz){ const m=new THREE.Mesh(boltGeo,M.add(s.pcol,1)); m.scale.set(1,1,3.2); m.position.copy(a); m.lookAt(b); scene.add(m); const halo=new THREE.Mesh(boltGeo,M.add(s.pcol,.35)); halo.scale.setScalar(2.6); m.add(halo);
  BOLTS.push({m,a:a.clone(),b:b.clone(),t:0,dur:Math.max(.04,a.distanceTo(b)/75),s,pz}); }
function updateBolts(dt){ for(let i=BOLTS.length-1;i>=0;i--){ const q=BOLTS[i]; q.t+=dt; const k=Math.min(1,q.t/q.dur); q.m.position.lerpVectors(q.a,q.b,k);
  if(k>=1){ const s=q.s; if(q.pz&&!q.pz.z.dead) hitZombie(q.pz.z,s.dmg,q.pz.head?s.head:1,'gun'); explode(q.b,s.splash,s.dmg*.7,{ptype:s.pcol===0xff5a4a?'ember':'ion',snd:'ionHit',light:s.pcol});
    if(Math.hypot(q.b.x-P.pos.x,q.b.z-P.pos.z)<2.2&&Math.abs(q.b.y-P.pos.y)<2.5) hurtPlayer(18,q.b); scene.remove(q.m); BOLTS.splice(i,1); } } }
function chainJump(z0,s,up){ const col=up?0xff8a6a:0xcfe8ff, hit=new Set(), pos=z=>new V3(z.g.position.x,1.3,z.g.position.z); let cur=z0, n=0;
  while(cur&&n<=s.jump){ hit.add(cur); const cp=pos(cur); hitZombie(cur,cur.boss?2500:s.dmg,1,'gun'); spawnParticles(cp,'spark',4); n++;
    let best=null,bd=8; for(const z of zombies){ if(z.dead||hit.has(z)||z.rise>0) continue; const d=cp.distanceTo(pos(z)); if(d<bd){ bd=d; best=z; } }
    if(best) arc(cp,pos(best),1.2,col); cur=best; } }
function burst(z){ const p=z.g.position; explode(new V3(p.x,1,p.z),3.8,700,{player:45}); }
function beam(a,b,w=1,col=0x8ae8ff){ const q=BEAMS[beamI++%BEAMS.length]; q.m.position.copy(a); q.m.lookAt(b); q.m.scale.set(w,w,Math.max(.01,a.distanceTo(b))); q.m.visible=true; q.life=.14; q.m.material.opacity=1; q.m.material.color.set(col); }
function arc(a,b,w=1,col=0xffd27a){ const d=a.distanceTo(b)*.12, j=()=>new V3(rand(-d,d),rand(-d,d),rand(-d,d)); const m1=a.clone().lerp(b,.33).add(j()), m2=a.clone().lerp(b,.66).add(j()); beam(a,m1,w,col); beam(m1,m2,w,col); beam(m2,b,w,col); }
