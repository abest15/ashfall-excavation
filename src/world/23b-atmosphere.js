/* ---------- atmosphere: night sky, clouds, stars, moon, volumetric light cones, ground fog, wet ground, shadows ---------- */
// sky dome recolour: blue-black zenith, smoky warm horizon with a low glow from distant fires
{ const pos=sky.geometry.attributes.position, col=sky.geometry.attributes.color, zen=new THREE.Color(0x07090f), mid=new THREE.Color(0x15151a), hor=new THREE.Color(FOG_MAIN), fire=new THREE.Color(0x5a2e16), c=new THREE.Color();
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i)/100, y=pos.getY(i)/100, z=pos.getZ(i)/100, h=clamp(y,0,1), az=Math.atan2(z,x);
    c.copy(hor).lerp(mid,clamp(h*3.2,0,1)).lerp(zen,clamp((h-.3)*1.6,0,1));
    const glow=Math.max(0,Math.sin(az*3+1.3))*Math.max(0,1-Math.abs(y-.02)*9)*.7; c.lerp(fire,glow);
    const md=Math.max(0,x*MOON_DIR.x+y*MOON_DIR.y+z*MOON_DIR.z); c.r+=Math.pow(md,12)*.06; c.g+=Math.pow(md,12)*.07; c.b+=Math.pow(md,12)*.09;
    col.setXYZ(i,c.r,c.g,c.b); } col.needsUpdate=true; }
const ATM={cones:[],shafts:[],fog:[],t:0};
// moon disc with craters and a soft halo (replaces the flat discs)
{ const moon=sky.children[0], halo=sky.children[1];
  const mt=makeTex(128,(g,s)=>{ const gr=g.createRadialGradient(s*.45,s*.42,s*.05,s/2,s/2,s*.5); gr.addColorStop(0,'#f4ecd6'); gr.addColorStop(.85,'#cfc4a8'); gr.addColorStop(1,'#a89c80'); g.fillStyle=gr; g.beginPath(); g.arc(s/2,s/2,s*.49,0,7); g.fill();
    for(let i=0;i<22;i++){ g.fillStyle=`rgba(120,110,90,${rand(.15,.4)})`; g.beginPath(); g.arc(s/2+rand(-.36,.36)*s,s/2+rand(-.36,.36)*s,rand(2,s*.1),0,7); g.fill(); } });
  mt.wrapS=mt.wrapT=THREE.ClampToEdgeWrapping; moon.material.map=mt; moon.material.transparent=true; moon.material.color.set(0xffffff); moon.material.needsUpdate=true;
  const hc=document.createElement('canvas'); hc.width=hc.height=128; const hg=hc.getContext('2d'), gr=hg.createRadialGradient(64,64,10,64,64,64); gr.addColorStop(0,'rgba(255,255,255,.9)'); gr.addColorStop(.3,'rgba(255,255,255,.25)'); gr.addColorStop(1,'rgba(255,255,255,0)'); hg.fillStyle=gr; hg.fillRect(0,0,128,128);
  halo.material.map=new THREE.CanvasTexture(hc); halo.material.color.set(0x6a6c80); halo.material.opacity=.5; halo.scale.setScalar(1.25); moon.scale.setScalar(.8); halo.material.needsUpdate=true;
  // stars, only through the cloud gaps
  const SN=QUAL?700:350, sp=new Float32Array(SN*3); for(let i=0;i<SN;i++){ const a=rand(0,6.28), e=Math.asin(rand(.12,1)); sp[i*3]=Math.cos(a)*Math.cos(e)*96; sp[i*3+1]=Math.sin(e)*96; sp[i*3+2]=Math.sin(a)*Math.cos(e)*96; }
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0x9aa0b8,size:QUAL?1.6:1.3,sizeAttenuation:false,fog:false,depthWrite:false,transparent:true,opacity:.75})); stars.renderOrder=-9; stars.frustumCulled=false; sky.add(stars);
  // drifting cloud deck, lit from the moon side
  const ct=(()=>{ const c=document.createElement('canvas'); c.width=QUAL?512:256; c.height=c.width/2; const g=c.getContext('2d'), w=c.width, h=c.height; g.fillStyle='#000'; g.fillRect(0,0,w,h);
    for(let o=0;o<4;o++){ const n=[18,40,90,180][o], r=[w*.16,w*.08,w*.04,w*.02][o]; for(let i=0;i<n;i++){ const x=rand(0,w), y=rand(h*.05,h), gr=g.createRadialGradient(x,y,0,x,y,r); const a=[.22,.18,.14,.1][o]; gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr;
      for(const dx of [-w,0,w]) g.fillRect(x-r+dx,y-r,r*2,r*2); } }
      const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping; return t; })();
  const cg=new THREE.SphereGeometry(94,QUAL?32:20,8,0,Math.PI*2,0,Math.PI*.47), cc=[], cp=cg.attributes.position; for(let i=0;i<cp.count;i++){ const v=new V3(cp.getX(i),cp.getY(i),cp.getZ(i)).normalize(); const md=Math.max(0,v.dot(MOON_DIR)); const k=.32+Math.pow(md,5)*.9, hz=clamp(v.y*4,0,1); cc.push(k*(.9+.2*(1-hz)),k*(.86+.1*(1-hz)),k*.95); }
  cg.setAttribute('color',new THREE.Float32BufferAttribute(cc,3));
  const clouds=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({map:ct,alphaMap:ct,vertexColors:true,color:0x6c6a72,transparent:true,opacity:.9,side:THREE.BackSide,fog:false,depthWrite:false})); clouds.renderOrder=-8; clouds.frustumCulled=false; sky.add(clouds); ATM.clouds=clouds; }
function glowTex(){ const cc=document.createElement('canvas'); cc.width=cc.height=64; const gg=cc.getContext('2d'), gr=gg.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,220,160,1)'); gr.addColorStop(.3,'rgba(255,140,60,.5)'); gr.addColorStop(1,'rgba(255,90,30,0)'); gg.fillStyle=gr; gg.fillRect(0,0,64,64); return new THREE.CanvasTexture(cc); }
// distant skyline (part of the sky, ignores fog): shattered tree trunks, a ruined farmhouse and a broken windmill on a low ridge,
// with artillery flashes flickering behind it
{ const W=QUAL?2048:1024, H=W/8, c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'), k=W/2048*2.2, base=H*.86;
  g.fillStyle='#1b1511'; g.beginPath(); g.moveTo(0,H); let y=base; for(let x=0;x<=W;x+=8*k){ y=clamp(y+rand(-2,2)*k,base-14*k,base+6*k); g.lineTo(x,y); } g.lineTo(W,H); g.closePath(); g.fill();
  const trunk=(x,h,w)=>{ g.beginPath(); g.moveTo(x-w,base+4); g.lineTo(x-w*.6,base-h); g.lineTo(x-w*.1,base-h-rand(2,8)*k); g.lineTo(x+w*.3,base-h+rand(0,6)*k); g.lineTo(x+w*.7,base-h*.9); g.lineTo(x+w,base+4); g.fill();
    if(Math.random()<.6){ g.lineWidth=w*.4; g.strokeStyle='#1b1511'; g.beginPath(); g.moveTo(x,base-h*.6); g.lineTo(x+rand(-1,1)*h*.4,base-h*.6-rand(4,16)*k); g.stroke(); } };
  for(let i=0;i<55;i++) trunk(rand(0,W),rand(10,44)*k,rand(1.2,3)*k);
  const house=(x)=>{ const w=70*k, h=34*k; g.fillRect(x,base-h,w,h+6); g.beginPath(); g.moveTo(x-4*k,base-h); g.lineTo(x+w*.35,base-h-24*k); g.lineTo(x+w*.5,base-h-14*k); g.lineTo(x+w*.62,base-h-20*k); g.lineTo(x+w*.7,base-h); g.fill();
    g.fillRect(x+w*.78,base-h-22*k,8*k,22*k); g.fillStyle='#3a2010'; for(let i=0;i<3;i++) g.fillRect(x+8*k+i*20*k,base-h+10*k,8*k,10*k); g.fillStyle='#1b1511'; };
  house(W*.18); house(W*.63);
  const mill=(x)=>{ g.beginPath(); g.moveTo(x-10*k,base); g.lineTo(x-6*k,base-50*k); g.lineTo(x+6*k,base-50*k); g.lineTo(x+10*k,base); g.fill(); g.lineWidth=3*k; g.strokeStyle='#1b1511';
    for(const a of [.4,2.0,3.5]){ g.beginPath(); g.moveTo(x,base-46*k); g.lineTo(x+Math.cos(a)*30*k,base-46*k+Math.sin(a)*30*k); g.stroke(); } };
  mill(W*.41); mill(W*.88);
  for(let x=0;x<W;x+=rand(10,30)*k){ g.fillRect(x,base-rand(4,9)*k,1.5*k,10*k); }
  // compose: warm glow band behind, silhouettes with a soft fire-lit rim, burning farmhouses
  const f=document.createElement('canvas'); f.width=W; f.height=H; const fg=f.getContext('2d');
  let gr=fg.createLinearGradient(0,base-70*k,0,base+4*k); gr.addColorStop(0,'rgba(120,60,28,0)'); gr.addColorStop(.65,'rgba(150,72,30,.32)'); gr.addColorStop(1,'rgba(190,96,40,.55)'); fg.fillStyle=gr; fg.fillRect(0,0,W,base+4*k);
  for(let i=0;i<9;i++){ const x=rand(0,W), rr_=rand(60,160)*k; const g2=fg.createRadialGradient(x,base,0,x,base,rr_); g2.addColorStop(0,'rgba(220,110,40,.35)'); g2.addColorStop(1,'rgba(220,110,40,0)'); fg.fillStyle=g2; fg.fillRect(x-rr_,base-rr_,rr_*2,rr_); }
  const FIRES=[W*.18+35*k,W*.63+20*k,W*.3,W*.77];
  for(const x of FIRES){ const g2=fg.createRadialGradient(x,base-6*k,0,x,base-6*k,45*k); g2.addColorStop(0,'rgba(255,170,80,.9)'); g2.addColorStop(.25,'rgba(255,110,40,.5)'); g2.addColorStop(1,'rgba(255,90,30,0)'); fg.fillStyle=g2; fg.fillRect(x-45*k,base-51*k,90*k,60*k); }
  fg.shadowColor='rgba(255,140,70,.75)'; fg.shadowBlur=5*k; fg.shadowOffsetY=-1.5*k; fg.drawImage(c,0,0); fg.shadowColor='transparent';
  for(const x of FIRES){ fg.fillStyle='rgba(255,190,90,.95)'; for(let i=0;i<6;i++){ fg.beginPath(); const fx=x+rand(-10,10)*k; fg.moveTo(fx-4*k,base); fg.quadraticCurveTo(fx+rand(-4,4)*k,base-rand(10,22)*k,fx+4*k,base); fg.fill(); } }
  const t=new THREE.CanvasTexture(f); t.wrapS=THREE.RepeatWrapping;
  ATM.fires=FIRES.map(x=>{ const th=x/W*Math.PI*2, sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xff9a50,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.7}));
    sp.position.set(Math.sin(th)*84,3.2+8-(base/H)*16+1.2,Math.cos(th)*84); sp.scale.set(9,6,1); sp.renderOrder=-6.5; sp.frustumCulled=false; sky.add(sp); return sp; });
  const sk=new THREE.Mesh(new THREE.CylinderGeometry(86,86,16,QUAL?48:28,1,true),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.BackSide,fog:false,depthWrite:false,color:0xffffff}));
  sk.position.y=3.2; sk.renderOrder=-7; sk.frustumCulled=false; sky.add(sk);
  ATM.boom=[]; for(let i=0;i<5;i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{ const cc=document.createElement('canvas'); cc.width=cc.height=64; const gg=cc.getContext('2d'), gr=gg.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,220,160,1)'); gr.addColorStop(.3,'rgba(255,140,60,.5)'); gr.addColorStop(1,'rgba(255,90,30,0)'); gg.fillStyle=gr; gg.fillRect(0,0,64,64); return new THREE.CanvasTexture(cc); })(),color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));
    sp.renderOrder=-7.5; sp.frustumCulled=false; sky.add(sp); ATM.boom.push({sp,t:0}); } }
// soft-edged additive volume (light cone / moon shaft): bright near the source, fading with distance and toward silhouette edges
const VOL_MAT=(col,op,shaft)=>{ const T=TSL, u={col:T.uniform(new THREE.Color(col)),op:T.uniform(op),sh:T.uniform(shaft?1:0)}, vH=T.uv().y, e=T.abs(T.dot(T.normalView,T.positionViewDirection));
  const a=u.op.mul(T.pow(e,1.6)).mul(T.mix(T.smoothstep(0,.55,vH).mul(vH.mul(.65).add(.35)),T.smoothstep(.55,1,vH).oneMinus().mul(vH.oneMinus().mul(.45).add(.55)),u.sh));
  return tslMat({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide },u,T.vec4(u.col.mul(a),1)); };
if(QUAL>=1){
  const coneG=new THREE.CylinderGeometry(.1,1.85,3.25,QUAL===2?20:12,1,true); coneG.translate(0,-1.625,0);
  const glowT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.25,'rgba(255,255,255,.35)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
  LAMPS.forEach((l,i)=>{ const m=new THREE.Mesh(coneG,VOL_MAT(0xffb860,.2)); m.position.set(l.position.x,3.3,l.position.z); m.visible=false; scene.add(m);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,color:0xffc070,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.55})); halo.scale.setScalar(1.1); halo.position.set(l.position.x,3.32,l.position.z); halo.visible=false; scene.add(halo);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(2.2,20),new THREE.MeshBasicMaterial({map:glowT,color:0x5a3a18,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); pool.rotation.x=-Math.PI/2; pool.position.set(l.position.x,.1,l.position.z); pool.visible=false; scene.add(pool);
    ATM.cones.push({l,m,halo,pool}); });
  // moonlight falling through the broken chapel roof
  const shG=new THREE.CylinderGeometry(.45,.8,12,QUAL===2?14:10,1,true); shG.translate(0,6,0); const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),MOON_DIR);
  for(const [x,z,r] of [[41.5,15,1],[48.5,20.5,.8],[53.5,12.5,1.1],[45,24.5,.7]]){ const m=new THREE.Mesh(shG,VOL_MAT(0x8fa6cc,.055,true)); m.position.set(x,0,z); m.quaternion.copy(q); m.scale.set(r,1,r); scene.add(m); ATM.shafts.push(m);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(1.4*r,18),new THREE.MeshBasicMaterial({map:glowT,color:0x2a3446,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); pool.rotation.x=-Math.PI/2; pool.scale.y=1.4; pool.position.set(x,.06,z); scene.add(pool); ATM.shafts.push(pool); }
  // low ground fog: noise layers sampled in world space, faded near the camera and with distance
  const nt=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,128,128);
    for(let i=0;i<60;i++){ const x=rand(0,128), y=rand(0,128), r=rand(10,34), gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,`rgba(255,255,255,${rand(.15,.4)})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr;
      for(const dx of [-128,0,128]) for(const dy of [-128,0,128]) g.fillRect(x-r+dx,y-r+dy,r*2,r*2); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; })();
  const fogG=new THREE.PlaneGeometry(130,130); fogG.rotateX(-Math.PI/2);
  const layers=QUAL===2?[[.18,.24],[.6,.15],[1.15,.08]]:[[.25,.24],[.8,.13]];
  layers.forEach(([y,op],i)=>{ const T=TSL, u={tex:T.texture(nt),time:T.uniform(0),op:T.uniform(op),col:T.uniform(new THREE.Color(0x6a6258)),cam:T.uniform(new V3()),seed:T.uniform(i*3.7)};
    const p=T.positionWorld.xz, n=T.texture(nt,p.mul(.021).add(T.vec2(u.time.mul(.004).add(u.seed),u.time.mul(.0015)))).r.mul(1.6).mul(T.texture(nt,p.mul(.057).sub(T.vec2(u.time.mul(.006),u.seed.add(u.time.mul(.003))))).r.mul(1.8));
    const d=T.distance(p,u.cam.xz), a=u.op.mul(n).mul(T.smoothstep(1.5,7,d)).mul(T.smoothstep(30,62,d).oneMinus());
    const mat=tslMat({ transparent:true, depthWrite:false },u,T.vec4(u.col,a.clamp(0,.8)));
    const m=new THREE.Mesh(fogG,mat); m.position.y=y; m.renderOrder=2; m.frustumCulled=false; scene.add(m); ATM.fog.push(m); }); }
// wet ground: glossy puddles reflecting a small night-sky cube map, and a damp sheen on the mud (Medium and High)
const ENV_CUBE=(()=>{ const face=(top,moon)=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createLinearGradient(0,0,0,64); gr.addColorStop(0,top?'#0a0c12':'#1b1a1f'); gr.addColorStop(top?1:.55,top?'#14151b':'#3a3028'); gr.addColorStop(1,top?'#14151b':'#18140f'); g.fillStyle=gr; g.fillRect(0,0,64,64);
    if(moon){ const r=g.createRadialGradient(moon[0],moon[1],0,moon[0],moon[1],14); r.addColorStop(0,'rgba(240,235,215,1)'); r.addColorStop(.35,'rgba(180,180,190,.4)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); } return c; };
  const t=new THREE.CubeTexture([face(),face(0,[40,22]),face(1),face(1),face(),face(0,[20,24])]); t.needsUpdate=true; return t; })();
if(QUAL>=1){ puddleM.color.set(0x111417); puddleM.specular=new THREE.Color(0x9a9a9a); puddleM.shininess=110; puddleM.envMap=ENV_CUBE; puddleM.reflectivity=.6; puddleM.combine=THREE.MixOperation;
  if(QUAL===2){ const rp=makeTex(128,(g,s)=>{ g.fillStyle='#808080'; g.fillRect(0,0,s,s); for(let i=0;i<40;i++){ const x=rand(0,s), y=rand(0,s), r=rand(3,14); g.strokeStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},128,.35)`; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,r,0,7); g.stroke(); } },3,3);
    puddleM.normalMap=NRM.get(rp.image)||null; if(puddleM.normalMap){ puddleM.normalMap.repeat.set(3,3); puddleM.normalScale=new THREE.Vector2(.25,.25); } ATM.ripple=puddleM.normalMap; }
  puddleM.needsUpdate=true;
  const spec=(()=>{ const src=mudTex.image, c=document.createElement('canvas'); c.width=src.width; c.height=src.height; const g=c.getContext('2d'); g.filter='invert(1) contrast(1.6) brightness(.8)'; g.drawImage(src,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.copy(mudTex.repeat); return t; })();
  M.mud.specularMap=spec; M.mud.specular=new THREE.Color(0x3a3a3c); M.mud.shininess=28; M.mud.needsUpdate=true; }
// shadow casters/receivers are flagged once, after every lane has built its meshes (first rendered frame)
function initShadowFlags(){ if(QUAL!==2) return; const bb=new THREE.Box3(), sz=new V3();
  scene.traverse(o=>{ if(!o.isMesh||o.isSprite) return; const m=o.material; if(!m||m.transparent||m.isShaderMaterial||m.isMeshBasicMaterial) return;
    o.receiveShadow=true; if(o.userData.batch) return; bb.setFromObject(o); bb.getSize(sz); if(sz.y>.25&&Math.max(sz.x,sz.z)<26&&sz.y<30) o.castShadow=true; });
  ground.castShadow=false; }
// Low only: small static props beyond the point where the fog has swallowed them (~92%) are moved to layer 1, so the
// camera skips them. Solids (bullet targets), zombies, the sky and big merged meshes are never touched.
const FC={list:null,t:0,lx:1e9,lz:1e9,rb:0};
function fogCull(dt){ if(QUAL) return; FC.t-=dt; FC.rb-=dt; const cp=camera.position, moved=Math.hypot(cp.x-FC.lx,cp.z-FC.lz)>1.5;
  if(!FC.list||FC.rb<=0){ FC.rb=6; FC.list=[]; const sol=new Set(solids), zg=new Set(zombies.map(z=>z.g));
    scene.traverse(o=>{ if(!(o.isMesh||o.isSprite)||o.isInstancedMesh||sol.has(o)||o.userData.z) return; for(let q=o.parent;q&&q!==scene;q=q.parent) if(q===sky||zg.has(q)||q===COL.g) return;
      const g=o.geometry; if(!g) return; if(!g.boundingSphere) g.computeBoundingSphere(); o.updateMatrixWorld(); if(g.boundingSphere.radius*o.matrixWorld.getMaxScaleOnAxis()>4) return; FC.list.push(o); }); FC.t=0; }
  if(FC.t>0&&!moved) return; FC.t=.25; FC.lx=cp.x; FC.lz=cp.z; const lim=1.6/Math.max(.008,scene.fog.density), l2=lim*lim;
  for(const o of FC.list){ const e=o.matrixWorld.elements, dx=e[12]-cp.x, dz=e[14]-cp.z; o.layers.set(dx*dx+dz*dz>l2?1:0); } }
// ---- underground: the surface is hidden (one group), sky lights dim, low warm fog, and a pool of real lamps
// (Medium/High) follows the camera through the Underworks so zombies and lit props pick up the lamp light
const UG={surf:null,on:false,pool:[]};
if(QUAL) for(let i=0;i<4;i++){ const l=new THREE.PointLight(0xffb060,0,10,1.6); l.position.set(0,-50,0); scene.add(l); UG.pool.push(l); }
function initSurfaceGroup(){ if(UG.surf) return; const S_=new THREE.Group(); S_.name='surface'; const keep=new Set([camera,sky,DECALS.m,CAS.m]); for(const q of LVIS.groups) if(q.under) keep.add(q.g); if(typeof UART!=='undefined') keep.add(UART);
  for(const b of BEAMS) keep.add(b.m); for(const z of zombies) keep.add(z.g); const bb=new THREE.Box3(), c=new V3();
  for(const o of scene.children.slice()){ if(keep.has(o)||o.isLight||o.isCamera||o.isSprite) continue; let lit=false; o.traverse(q=>{ if(q.isLight) lit=true; }); if(lit) continue;
    bb.setFromObject(o); if(!bb.isEmpty()){ bb.getCenter(c); if(bb.max.y<-1) continue; } S_.add(o); }
  scene.add(S_); UG.surf=S_;
  // world objects now live in the surface group: let scene.remove() keep working for them
  const rm=scene.remove.bind(scene); scene.remove=function(...objs){ for(const o of objs){ if(o&&o.parent===S_) S_.remove(o); else rm(o); } return scene; }; }
const UNDER_ENV=(()=>{ const f=()=>{ const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d'); g.fillStyle='#0a0806'; g.fillRect(0,0,32,32); for(let i=0;i<3;i++){ const x=rand(4,28), y=rand(4,20), gr=g.createRadialGradient(x,y,0,x,y,6); gr.addColorStop(0,'rgba(255,170,90,.8)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,32,32); } return c; };
  const t=new THREE.CubeTexture([f(),f(),f(),f(),f(),f()]); t.needsUpdate=true; return t; })();
if(QUAL&&typeof LVL!=='undefined'&&LVL.water){ LVL.water.material=new THREE.MeshPhongMaterial({color:0x061214,specular:0x5a6a70,shininess:90,envMap:UNDER_ENV,reflectivity:.5,combine:THREE.MixOperation,transparent:true,opacity:.9,depthWrite:false}); }
function updateUnder(dt){ if(!UG.surf) return; const c=camera.position, onStair=(c.x>-7&&c.x<9&&c.z>-25&&c.z<-19.4)||(c.x>-57.5&&c.x<-43.5&&c.z>-13.6&&c.z<-8.6);
  const under=mode==='main'&&!P.inCabin&&c.y<-1.6; UG.surf.visible=!(under&&!onStair);
  if(typeof UART!=='undefined') UART.visible=mode==='main'&&(c.y<-1.2||onStair);
  if(under){ hemi.color.set(0x6a5a48); hemi.groundColor.set(0x1a120c); hemi.intensity=.32; sun.intensity=0; scene.fog.color.set(0x0b0907); scene.fog.density=.045; scene.background.set(0x050403); sky.visible=onStair; }
  else if(UG.on&&mode==='main'&&!P.inCabin) setAtmosphere('main');
  UG.on=under;
  if(UG.pool.length){ if(under&&typeof LART!=='undefined'){ const L_=LART.ulamps.slice().sort((a,b)=>Math.hypot(a[0]-c.x,a[1]-c.y,a[2]-c.z)-Math.hypot(b[0]-c.x,b[1]-c.y,b[2]-c.z));
      UG.pool.forEach((l,i)=>{ const q=L_[i]; if(!q){ l.intensity=0; return; } l.position.set(q[0],q[1]-.25,q[2]); l.color.setHex(q[5]); l.distance=q[3]*.85; l.intensity=q[4]*.75*(.92+Math.random()*.08); }); }
    else for(const l of UG.pool) l.intensity=0; }
  if(typeof updateLevelArt==='function') updateLevelArt(dt); }
const _sc=new V3();
function updateAtmos(dt){ fogCull(dt); updateUnder(dt); ATM.t+=dt; const main=mode==='main'&&!P.inCabin;
  if(ATM.clouds) ATM.clouds.rotation.y+=dt*.003;
  for(const c of ATM.cones){ const on=main&&c.l.intensity>.05; c.m.visible=c.halo.visible=c.pool.visible=on; if(on){ const f=c.l.intensity/1.1; c.m.material.uniforms.op.value=.2*f; } }
  for(const s of ATM.shafts) s.visible=main;
  if(typeof CH_SHAFTS!=='undefined') for(const s of CH_SHAFTS) s.visible=main;
  if(ATM.fires) for(const f of ATM.fires){ f.visible=main; f.material.opacity=.5+Math.random()*.25; }
  if(ATM.boom) for(const b of ATM.boom){ if(b.t>0){ b.t-=dt; const f=Math.max(0,b.t/b.d); b.sp.material.opacity=main?f*(Math.random()<.3?.6:1):0; } else if(main&&Math.random()<dt*.12){ const a=rand(0,6.28), r=90; b.d=b.t=rand(.25,.7); b.sp.position.set(Math.cos(a)*r,rand(1.5,4),Math.sin(a)*r); b.sp.scale.set(rand(10,22),rand(6,12),1); } }
  for(const f of ATM.fog){ f.visible=mode!=='cabin'&&!P.inCabin; const u=f.material.uniforms; u.time.value=ATM.t; u.cam.value.copy(camera.position); f.position.x=camera.position.x; f.position.z=camera.position.z; u.col.value.set(mode==='hollow'?0x2a3456:0x4a453e); }
  if(ATM.ripple) ATM.ripple.offset.set(ATM.t*.013,ATM.t*.021);
  if(QUAL===2){ const fx=-Math.sin(camera.rotation.y), fz=-Math.cos(camera.rotation.y); const tx=1/(48/sun.shadow.mapSize.x); _sc.set(Math.round((camera.position.x+fx*10)*tx)/tx,0,Math.round((camera.position.z+fz*10)*tx)/tx);
    sun.target.position.copy(_sc); sun.position.copy(_sc).addScaledVector(MOON_DIR,70); } }
