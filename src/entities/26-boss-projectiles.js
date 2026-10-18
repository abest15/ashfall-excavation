/* ---------- boss projectiles ---------- */
const projs=[]; const projGeo=new THREE.SphereGeometry(.28,8,6);
function fireProj(z){ const p=z.g.position; const from=new V3(p.x,p.y+2.2*(z.prime?1.25:1),p.z); const T_=zTarget(p), to=new V3(T_.x,(T_.y||0)+1.2,T_.z);
  const v=to.sub(from).normalize().multiplyScalar(z.prime?14:11); const m=new THREE.Mesh(projGeo,M.add(z.prime?0x8ae8ff:0xff7a2a,1)); m.position.copy(from); scene.add(m);
  projs.push({m,v,life:5,dmg:z.prime?40:32}); sfx.fireball(); }
function updateProjs(dt){ for(let i=projs.length-1;i>=0;i--){ const q=projs[i]; q.life-=dt; q.m.position.addScaledVector(q.v,dt); const p=q.m.position; let boom=q.life<=0||p.y<floorAt(p.x,p.y,p.z);
  if(!boom&&Math.hypot(p.x-P.pos.x,p.z-P.pos.z)<.8&&Math.abs(p.y-(P.pos.y+1.1))<1){ hurtPlayer(q.dmg,p); boom=true; }
  if(!boom&&NET.role==='host') for(const id in NET.remotes){ const st=NET.remotes[id].st; if(st&&!st.dn&&st.m===mode&&Math.hypot(p.x-st.x,p.z-st.z)<.8&&Math.abs(p.y-(st.y+1.1))<1){ sendTo(id,{t:'hurt',d:q.dmg,s:[p.x,p.z]}); boom=true; break; } }
  if(!boom) for(const c of colliders){ if(c.on&&p.x>c.minX&&p.x<c.maxX&&p.z>c.minZ&&p.z<c.maxZ&&p.y<Math.min(3.6,colY1(c))&&p.y>colY0(c)){ boom=true; break; } }
  if(boom){ spawnParticles(p,'ember',8); scene.remove(q.m); projs.splice(i,1); } } }
