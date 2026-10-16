/* ---------- sky dome, moon, distant artillery ---------- */
const LT={t:14,f:0};
const sky=(()=>{ const R_=100, geo=new THREE.SphereGeometry(R_,24,12), pos=geo.attributes.position, cols=[], top=new THREE.Color(0x0e0c0a), hor=new THREE.Color(FOG_MAIN), c=new THREE.Color();
  for(let i=0;i<pos.count;i++){ c.copy(hor).lerp(top,clamp(pos.getY(i)/R_*1.8,0,1)); cols.push(c.r,c.g,c.b); }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false})); m.renderOrder=-10; m.frustumCulled=false; scene.add(m);
  const moon=new THREE.Mesh(new THREE.CircleGeometry(3.2,24),new THREE.MeshBasicMaterial({color:0xcfc4a8,fog:false,depthWrite:false})); moon.position.set(-40,48,-60); moon.lookAt(0,0,0); m.add(moon);
  const halo=new THREE.Mesh(new THREE.CircleGeometry(8.5,24),new THREE.MeshBasicMaterial({color:0x6a6050,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,fog:false,depthWrite:false})); halo.position.copy(moon.position).multiplyScalar(1.01); halo.lookAt(0,0,0); m.add(halo);
  m.userData.flashes=[]; for(let i=0;i<4;i++){ const f=new THREE.Mesh(new THREE.PlaneGeometry(22,8),new THREE.MeshBasicMaterial({color:0xff8a40,transparent:true,opacity:0,blending:THREE.AdditiveBlending,fog:false,depthWrite:false})); const a=rand(0,6.28); f.position.set(Math.cos(a)*92,4,Math.sin(a)*92); f.lookAt(0,4,0); m.add(f); m.userData.flashes.push({f,t:0}); }
  return m; })();
