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
// distant skyline (part of the sky, ignores fog): shattered tree trunks, a ruined farmhouse and a broken windmill on a low ridge,
// with artillery flashes flickering behind it
{ const W=QUAL?2048:1024, H=W/8, c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'), k=W/2048*2.2, base=H*.86;
  g.fillStyle='#0b0908'; g.beginPath(); g.moveTo(0,H); let y=base; for(let x=0;x<=W;x+=8*k){ y=clamp(y+rand(-2,2)*k,base-14*k,base+6*k); g.lineTo(x,y); } g.lineTo(W,H); g.closePath(); g.fill();
  const trunk=(x,h,w)=>{ g.beginPath(); g.moveTo(x-w,base+4); g.lineTo(x-w*.6,base-h); g.lineTo(x-w*.1,base-h-rand(2,8)*k); g.lineTo(x+w*.3,base-h+rand(0,6)*k); g.lineTo(x+w*.7,base-h*.9); g.lineTo(x+w,base+4); g.fill();
    if(Math.random()<.6){ g.lineWidth=w*.4; g.strokeStyle='#0b0908'; g.beginPath(); g.moveTo(x,base-h*.6); g.lineTo(x+rand(-1,1)*h*.4,base-h*.6-rand(4,16)*k); g.stroke(); } };
  for(let i=0;i<55;i++) trunk(rand(0,W),rand(10,44)*k,rand(1.2,3)*k);
  const house=(x)=>{ const w=70*k, h=34*k; g.fillRect(x,base-h,w,h+6); g.beginPath(); g.moveTo(x-4*k,base-h); g.lineTo(x+w*.35,base-h-24*k); g.lineTo(x+w*.5,base-h-14*k); g.lineTo(x+w*.62,base-h-20*k); g.lineTo(x+w*.7,base-h); g.fill();
    g.fillRect(x+w*.78,base-h-22*k,8*k,22*k); g.fillStyle='#1c120a'; for(let i=0;i<3;i++) g.fillRect(x+8*k+i*20*k,base-h+10*k,8*k,10*k); g.fillStyle='#0b0908'; };
  house(W*.18); house(W*.63);
  const mill=(x)=>{ g.beginPath(); g.moveTo(x-10*k,base); g.lineTo(x-6*k,base-50*k); g.lineTo(x+6*k,base-50*k); g.lineTo(x+10*k,base); g.fill(); g.lineWidth=3*k; g.strokeStyle='#0b0908';
    for(const a of [.4,2.0,3.5]){ g.beginPath(); g.moveTo(x,base-46*k); g.lineTo(x+Math.cos(a)*30*k,base-46*k+Math.sin(a)*30*k); g.stroke(); } };
  mill(W*.41); mill(W*.88);
  for(let x=0;x<W;x+=rand(10,30)*k){ g.fillRect(x,base-rand(4,9)*k,1.5*k,10*k); }
  const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping;
  const sk=new THREE.Mesh(new THREE.CylinderGeometry(86,86,16,QUAL?48:28,1,true),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.BackSide,fog:false,depthWrite:false,color:0xffffff}));
  sk.position.y=3.2; sk.renderOrder=-7; sk.frustumCulled=false; sky.add(sk);
  ATM.boom=[]; for(let i=0;i<5;i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{ const cc=document.createElement('canvas'); cc.width=cc.height=64; const gg=cc.getContext('2d'), gr=gg.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,220,160,1)'); gr.addColorStop(.3,'rgba(255,140,60,.5)'); gr.addColorStop(1,'rgba(255,90,30,0)'); gg.fillStyle=gr; gg.fillRect(0,0,64,64); return new THREE.CanvasTexture(cc); })(),color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));
    sp.renderOrder=-7.5; sp.frustumCulled=false; sky.add(sp); ATM.boom.push({sp,t:0}); } }
// soft-edged additive volume (light cone / moon shaft): bright near the source, fading with distance and toward silhouette edges
const VOL_MAT=(col,op,shaft)=>new THREE.ShaderMaterial({ uniforms:{col:{value:new THREE.Color(col)},op:{value:op},sh:{value:shaft?1:0}}, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
  vertexShader:'varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader:'uniform vec3 col; uniform float op,sh; varying float vH; varying vec3 vN; varying vec3 vV; void main(){ float e=abs(dot(normalize(vN),normalize(vV))); float a=op*pow(e,1.6)*mix(smoothstep(0.,.55,vH)*(.35+.65*vH),smoothstep(1.,.55,vH)*(.55+.45*(1.-vH)),sh); gl_FragColor=vec4(col*a,1.); }' });
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
  layers.forEach(([y,op],i)=>{ const mat=new THREE.ShaderMaterial({ uniforms:{tex:{value:nt},time:{value:0},op:{value:op},col:{value:new THREE.Color(0x6a6258)},cam:{value:new V3()},seed:{value:i*3.7}}, transparent:true, depthWrite:false,
      vertexShader:'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader:'uniform sampler2D tex; uniform float time,op,seed; uniform vec3 col,cam; varying vec3 vW; void main(){ vec2 p=vW.xz; float n=texture2D(tex,p*.021+vec2(time*.004+seed,time*.0015)).r*1.6; n*=texture2D(tex,p*.057-vec2(time*.006,seed+time*.003)).r*1.8; float d=distance(vW.xz,cam.xz); float a=op*n*smoothstep(1.5,7.,d)*smoothstep(62.,30.,d); gl_FragColor=vec4(col,clamp(a,0.,.8)); }' });
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
const _sc=new V3();
function updateAtmos(dt){ ATM.t+=dt; const main=mode==='main'&&!P.inCabin;
  if(ATM.clouds) ATM.clouds.rotation.y+=dt*.003;
  for(const c of ATM.cones){ const on=main&&c.l.intensity>.05; c.m.visible=c.halo.visible=c.pool.visible=on; if(on){ const f=c.l.intensity/1.1; c.m.material.uniforms.op.value=.2*f; } }
  for(const s of ATM.shafts) s.visible=main;
  if(typeof CH_SHAFTS!=='undefined') for(const s of CH_SHAFTS) s.visible=main;
  if(ATM.boom) for(const b of ATM.boom){ if(b.t>0){ b.t-=dt; const f=Math.max(0,b.t/b.d); b.sp.material.opacity=main?f*(Math.random()<.3?.6:1):0; } else if(main&&Math.random()<dt*.12){ const a=rand(0,6.28), r=90; b.d=b.t=rand(.25,.7); b.sp.position.set(Math.cos(a)*r,rand(1.5,4),Math.sin(a)*r); b.sp.scale.set(rand(10,22),rand(6,12),1); } }
  for(const f of ATM.fog){ f.visible=mode!=='cabin'&&!P.inCabin; const u=f.material.uniforms; u.time.value=ATM.t; u.cam.value.copy(camera.position); f.position.x=camera.position.x; f.position.z=camera.position.z; u.col.value.set(mode==='hollow'?0x2a3456:0x4a453e); }
  if(ATM.ripple) ATM.ripple.offset.set(ATM.t*.013,ATM.t*.021);
  if(QUAL===2){ const fx=-Math.sin(camera.rotation.y), fz=-Math.cos(camera.rotation.y); const tx=1/(48/sun.shadow.mapSize.x); _sc.set(Math.round((camera.position.x+fx*10)*tx)/tx,0,Math.round((camera.position.z+fz*10)*tx)/tx);
    sun.target.position.copy(_sc); sun.position.copy(_sc).addScaledVector(MOON_DIR,70); } }
