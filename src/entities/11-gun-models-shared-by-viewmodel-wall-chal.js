/* ---------- gun models (shared by viewmodel, wall chalk, crate) ---------- */
const GM={
  metal:L({color:0x3d3f42}), wood:L({color:0x6b4426}), accent:L({color:0x8c7040}),
  upMetal:L({color:0x2a2420,emissive:0x5a1e06}), upWood:L({color:0x3a1810,emissive:0x2a0c04}), upAccent:B({color:0xff8a2a}),
  rodWood:L({color:0x2e2218}), rodBand:L({color:0xb08a44}), chalk:B({color:0xd8d2c2,transparent:true,opacity:.8}),
};
const RB=new Map();
function roundBox(w,h,d){ const k=w+'|'+h+'|'+d; let geo=RB.get(k); if(geo) return geo; const b=Math.min(w,h,d)*.12, w2=w-2*b, h2=h-2*b, rr=Math.min(w2,h2)*.18, sh=new THREE.Shape();
  sh.moveTo(-w2/2+rr,-h2/2); sh.lineTo(w2/2-rr,-h2/2); sh.quadraticCurveTo(w2/2,-h2/2,w2/2,-h2/2+rr); sh.lineTo(w2/2,h2/2-rr); sh.quadraticCurveTo(w2/2,h2/2,w2/2-rr,h2/2);
  sh.lineTo(-w2/2+rr,h2/2); sh.quadraticCurveTo(-w2/2,h2/2,-w2/2,h2/2-rr); sh.lineTo(-w2/2,-h2/2+rr); sh.quadraticCurveTo(-w2/2,-h2/2,-w2/2+rr,-h2/2);
  geo=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.0005,d-2*b),bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2,curveSegments:2}); geo.center(); RB.set(k,geo); return geo; }
function gb(g,w,h,d,m,x,y,z,rx=0){ const b=new THREE.Mesh(QUAL?roundBox(w,h,d):new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); b.rotation.x=rx; g.add(b); return b; }
function gc(g,r,len,m,x,y,z,seg=8){ const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,seg),m); c.rotation.x=Math.PI/2; c.position.set(x,y,z); g.add(c); return c; }
function buildGun(id,up,override){
  const g=new THREE.Group(); const t=WD[id].type;
  const me=override||(up?GM.upMetal:GM.metal), wo=override||(up?GM.upWood:GM.wood), ac=override||(up?GM.upAccent:GM.accent);
  let mz=-0.3;
  if(t==='pistol'){ gb(g,.06,.075,.28,me,0,.04,-.08); gb(g,.055,.15,.075,wo,0,-.05,.04,.25); gb(g,.02,.02,.1,ac,0,.085,-.08); if(id==='revolver'){ gc(g,.045,.09,me,0,.03,-.02,8); gc(g,.022,.16,me,0,.045,-.28); mz=-.38;} else mz=-.24; }
  else if(t==='rifle'){ gb(g,.065,.11,.32,wo,0,-.01,.25); gb(g,.07,.085,.42,me,0,.02,-.1); gb(g,.07,.06,.36,wo,0,-.005,-.38); gc(g,.018,.5,me,0,.03,-.58); gb(g,.02,.04,.05,ac,.05,.05,0);
    if(id==='marksman'){ gc(g,.03,.26,me,0,.1,-.1); } mz=-.84; }
  else if(t==='smg'){ gb(g,.07,.1,.42,me,0,.02,-.08); gc(g,.035,.26,me,0,.03,-.4); gb(g,.045,.22,.06,me,0,-.14,-.1,.15); gb(g,.05,.08,.26,wo,0,0,.24); gb(g,.05,.13,.06,wo,0,-.07,.06,.2); gb(g,.02,.02,.2,ac,.04,.06,-.08); mz=-.55; }
  else if(t==='shotgun'){ gb(g,.07,.1,.24,me,0,.02,0); gc(g,.022,.7,me,0,.045,-.42); gc(g,.02,.56,me,0,-.005,-.36); gb(g,.07,.07,.2,wo,0,-.005,-.38); gb(g,.06,.12,.34,wo,0,-.02,.27); gb(g,.074,.02,.1,ac,0,.075,0); mz=-.8; }
  else if(t==='lmg'){ gb(g,.11,.13,.48,me,0,.02,-.05); gc(g,.05,.5,me,0,.03,-.5); gc(g,.016,.2,me,0,.03,-.82); gb(g,.13,.1,.15,ac,-.09,.0,-.05); gb(g,.07,.12,.3,wo,0,-.02,.33); gb(g,.012,.25,.012,me,.04,-.12,-.66,.5); gb(g,.012,.25,.012,me,-.04,-.12,-.66,.5); mz=-.95; }
  else if(t==='rod'){ const wood=override||GM.rodWood, band=override||GM.rodBand, glowC=up?0xc8f6ff:0x74d9ea;
    gc(g,.022,1.1,wood,0,0,-.12,7); gc(g,.03,.1,band,0,0,.42,8); const pom=new THREE.Mesh(new THREE.SphereGeometry(.04,8,6),band); pom.position.z=.48; g.add(pom);
    const pts=[]; for(let i=0;i<=60;i++){ const k=i/60, a=k*Math.PI*14; pts.push(new V3(Math.cos(a)*.027,Math.sin(a)*.027,.3-k*.75)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.005,4,false),band));
    for(const z of [-.42,-.05,.22]) gc(g,.034,.035,band,0,0,z,8);
    gc(g,.045,.06,band,0,0,-.66,8); const head=new THREE.Group(); head.position.z=-.78; g.add(head);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+Math.PI/4, c=new THREE.Mesh(new THREE.BoxGeometry(.014,.014,.16),band); c.position.set(Math.cos(a)*.06,Math.sin(a)*.06,-.02); c.rotation.set(-Math.sin(a)*.5,Math.cos(a)*.5,0); head.add(c); }
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(up?.075:.06),override||B({color:glowC})); cr.scale.set(1,1,1.8); cr.position.z=-.06; head.add(cr); g.userData.crystal=cr;
    if(!override){ const core=new THREE.Mesh(new THREE.OctahedronGeometry(up?.035:.028),B({color:0xffffff})); cr.add(core);
      const glow=new THREE.Mesh(new THREE.SphereGeometry(up?.085:.065,10,8),M.add(glowC,up?.35:.25)); glow.position.z=-.06; head.add(glow); g.userData.glow=glow;
      const rings=[]; for(let i=0;i<2;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(up?.12:.1,.006,4,24),M.add(glowC,.8)); r.position.z=-.06; r.rotation.set(i?1.2:.3,i?.4:1.1,0); head.add(r); rings.push(r); } g.userData.rings=rings;
      const wisps=new THREE.Group(); wisps.position.z=-.06; head.add(wisps); for(let i=0;i<3;i++){ const w=new THREE.Mesh(new THREE.TetrahedronGeometry(.012),M.add(glowC,1)), a=i/3*Math.PI*2; w.position.set(Math.cos(a)*.16,Math.sin(a)*.16,0); wisps.add(w); } g.userData.orb=wisps;
      if(up){ const plume=new THREE.Mesh(new THREE.ConeGeometry(.05,.22,8,1,true),M.add(0xe8fbff,.4)); plume.rotation.x=-Math.PI/2; plume.position.z=-.2; head.add(plume); g.userData.plume=plume; } }
    mz=-.86; }
  else if(t==='ion'){ const cop=override||(up?L({color:0x7a2a20,emissive:0x3a0804}):L({color:0x9a6a3a})), dk=override||GM.metal, glowC=up?0xff5a4a:0x6aff7a;
    gb(g,.045,.13,.06,override||GM.wood,0,-.07,.05,.3); gc(g,.038,.2,cop,0,.02,-.06,12); gc(g,.035,.1,dk,0,.02,-.2,10);
    for(let i=0;i<3;i++){ const r=.056-i*.008, f=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.01,14),cop); f.rotation.x=Math.PI/2; f.position.set(0,.02,-.02-i*.05); g.add(f); }
    const dish=new THREE.Mesh(new THREE.ConeGeometry(.04,.045,12,1,true),dk); dish.rotation.x=Math.PI/2; dish.position.set(0,.02,-.27); g.add(dish);
    g.userData.crystal=gc(g,.012,.15,override||B({color:glowC}),0,.07,-.07,8); mz=-.3; }
  else if(t==='dynamo'){ const wo2=override||(up?GM.upWood:GM.wood), dk=override||GM.metal, cop=override||L({color:0xb07a40}), glowC=up?0xff8a6a:0xcfe8ff;
    gb(g,.065,.11,.34,wo2,0,-.01,.25); gb(g,.07,.09,.3,dk,0,.02,-.08); gb(g,.05,.14,.06,wo2,0,-.1,.02,.25);
    for(const sx of [-1,1]) gc(g,.012,.42,cop,sx*.035,.03,-.38,6); for(let i=0;i<4;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.045,.008,5,14),cop); r.position.set(0,.03,-.26-i*.07); g.add(r); }
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.036,12,10),override||M.add(glowC,.75)); bulb.position.set(0,.085,-.3); g.add(bulb); if(!override) g.userData.bulb=bulb; bulb.add(new THREE.Mesh(new THREE.OctahedronGeometry(.012),override||B({color:0xffffff})));
    gc(g,.018,.03,dk,0,.055,-.3,8); mz=-.62; }
  else if(t==='gauntlet'){ const cu=L({color:0x8a5a30,emissive:0x2a1000}); gb(g,.11,.1,.3,me,0,-.02,.12); gb(g,.13,.12,.13,cu,0,-.01,-.06); for(const sx of [-1,1]) gc(g,.02,.18,ac,sx*.065,.055,.02,6);
    for(let i=0;i<3;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.068,.012,5,14),B({color:0xffc060})); r.position.set(0,-.01,.03+i*.07); g.add(r); }
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.045),B({color:0xfff0b0})); core.position.set(0,.07,-.06); g.add(core); g.userData.crystal=core; mz=-.14; }
  else if(t==='cannon'){ gc(g,.075,.62,me,0,.04,-.18,10); gc(g,.09,.09,ac,0,.04,-.5,10); gc(g,.09,.06,ac,0,.04,.08,10); gb(g,.06,.16,.07,wo,0,-.1,.02,.2); gb(g,.07,.1,.28,wo,0,-.02,.3); gb(g,.03,.05,.12,ac,0,.13,-.12); mz=-.56; }
  else if(t==='gatling'){ const sp=new THREE.Group(); sp.position.set(0,.03,-.32); g.add(sp); for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; gc(sp,.016,.62,me,Math.cos(a)*.045,Math.sin(a)*.045,0,6); }
    gc(sp,.062,.05,ac,0,0,-.28,10); gc(sp,.062,.05,ac,0,0,.1,10); gb(g,.13,.14,.3,me,0,.02,.06); gb(g,.05,.16,.07,wo,0,-.12,.12,.2); gb(g,.16,.12,.18,ac,-.12,0,.08); g.userData.spin=sp; mz=-.66; }
  const muzzle=new THREE.Object3D(); muzzle.position.set(0,.03,mz); g.add(muzzle); g.userData.muzzle=muzzle;
  return g;
}
