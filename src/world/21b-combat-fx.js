/* ---------- combat visuals: decals (blood, bullet marks), impacts, muzzle light, shell casings, surface lookup ---------- */
// Public API (all safe to call from any lane; guard with typeof when calling from files loaded earlier):
//   spawnDecal(point, normal|null, kind, scale)   kind: 'blood' | 'pool' | 'ichor' | 'hole' | 'scorch'   (normal null = ground)
//   spawnImpact(point, normal, object)            bullet hitting the world; if object is given, normal is its local face normal
//   fxZombieHit(z, how)                           blood spray onto nearby walls and the ground (called from hitZombie)
//   muzzleLight(pos)                              brief warm flash light at the muzzle
//   ejectCasing(pos, dir)                         a brass casing flicked out along dir (world space)
//   surfaceAt(x, z)                               'mud' | 'wood' | 'stone' | 'metal' | 'crystal'  (footstep sounds)
const DECAL_N=QUAL===0?40:QUAL===1?72:110;
const decalTex=(()=>{ const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d');
  const blob=(cx,cy,r,n,drops)=>{ g.fillStyle='#fff'; g.beginPath(); for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2, rr=r*(.7+Math.random()*.45); g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); } g.fill();
    for(let i=0;i<drops;i++){ const a=Math.random()*6.28, d=r*(1+Math.random()*1.2), s=Math.random()*r*.18+1.5; g.beginPath(); g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,s,0,7); g.fill();
      if(Math.random()<.4){ g.lineWidth=s*.8; g.strokeStyle='#fff'; g.beginPath(); g.moveTo(cx+Math.cos(a)*r*.7,cy+Math.sin(a)*r*.7); g.lineTo(cx+Math.cos(a)*d,cy+Math.sin(a)*d); g.stroke(); } } };
  // tiles 0..3 splats, 4 pool, 5 bullet hole, 6 scorch, 7 drips (128x128 each)
  for(let t=0;t<4;t++){ g.save(); g.translate(t*128,0); g.globalAlpha=.85; blob(64,64,18+t*4,14,10+t*3); g.globalAlpha=.5; blob(64+rand(-12,12),64+rand(-12,12),12,10,0); g.restore(); }
  g.save(); g.translate(0,128); g.globalAlpha=.9; blob(64,64,40,22,6); g.globalAlpha=.35; blob(60,66,26,16,0); g.restore();
  g.save(); g.translate(128,128); let gr=g.createRadialGradient(64,64,2,64,64,40); gr.addColorStop(0,'rgba(10,10,10,1)'); gr.addColorStop(.18,'rgba(25,22,20,1)'); gr.addColorStop(.35,'rgba(90,84,76,.8)'); gr.addColorStop(1,'rgba(90,84,76,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128);
    g.strokeStyle='rgba(20,18,16,.8)'; for(let i=0;i<6;i++){ const a=Math.random()*6.28; g.lineWidth=1.2; g.beginPath(); g.moveTo(64,64); g.lineTo(64+Math.cos(a)*rand(14,30),64+Math.sin(a)*rand(14,30)); g.stroke(); } g.restore();
  g.save(); g.translate(256,128); gr=g.createRadialGradient(64,64,4,64,64,60); gr.addColorStop(0,'rgba(12,10,8,.95)'); gr.addColorStop(.6,'rgba(30,24,18,.6)'); gr.addColorStop(1,'rgba(30,24,18,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); g.restore();
  g.save(); g.translate(384,128); g.globalAlpha=.85; blob(64,40,16,12,4); g.fillStyle='#fff'; for(let i=0;i<5;i++){ const x=50+Math.random()*28, l=30+Math.random()*50, w=2+Math.random()*3; g.fillRect(x,40,w,l); g.beginPath(); g.arc(x+w/2,40+l,w*.9,0,7); g.fill(); } g.restore();
  const t=new THREE.CanvasTexture(c); t.anisotropy=ANISO; return t; })();
const DECAL_KIND={blood:{tiles:[0,1,2,3],col:[.17,.014,.01],life:26},pool:{tiles:[4],col:[.13,.01,.008],life:30},ichor:{tiles:[0,1,2,3],col:[.18,.6,.72],life:20},
  hole:{tiles:[5],col:[1,1,1],life:16},scorch:{tiles:[6],col:[1,1,1],life:24},drip:{tiles:[7],col:[.15,.012,.01],life:26}};
const DECALS=(()=>{ const geo=new THREE.PlaneGeometry(1,1); const fade=new THREE.InstancedBufferAttribute(new Float32Array(DECAL_N),1), tile=new THREE.InstancedBufferAttribute(new Float32Array(DECAL_N),1), col=new THREE.InstancedBufferAttribute(new Float32Array(DECAL_N*3),3);
  fade.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aFade',fade); geo.setAttribute('aTile',tile); geo.setAttribute('aCol',col);
  const T=TSL, u={map:T.texture(decalTex),uLight:T.uniform(.62)}, aT=T.attribute('aTile','float'), tx=T.mod(aT,4), ty=T.floor(aT.div(4)), uv0=T.uv();
  const tc=T.texture(decalTex,T.vec2(uv0.x.add(tx).div(4),uv0.y.add(1).sub(ty).div(2)));
  const mat=tslMat({ fog:true, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4, alphaTest:.01 },u,T.vec4(tc.rgb.mul(T.attribute('aCol','vec3')).mul(u.uLight),tc.a.mul(T.attribute('aFade','float'))));
  mat.uniforms.map.value=decalTex;
  const m=new THREE.InstancedMesh(geo,mat,DECAL_N); m.frustumCulled=false; m.renderOrder=1; const z0=new THREE.Matrix4().makeScale(0,0,0); for(let i=0;i<DECAL_N;i++) m.setMatrixAt(i,z0); scene.add(m);
  return {m,fade,tile,col,life:new Float32Array(DECAL_N),max:new Float32Array(DECAL_N),i:0,active:0}; })();
const _dq=new THREE.Quaternion(), _dq2=new THREE.Quaternion(), _dz=new V3(0,0,1), _dn=new V3(), _dp=new V3(), _ds=new V3(), _dm=new THREE.Matrix4();
function groundY(x,z){ const s=surfaceAt(x,z); return s==='wood'?(x>-10&&x<10&&z>30&&z<50?.09:.085):s==='stone'?.045:s==='crystal'?.035:.03; }
function spawnDecal(point,normal,kind,scale){ const K=DECAL_KIND[kind]||DECAL_KIND.blood, D=DECALS, i=D.i++%DECAL_N;
  if(normal) _dn.copy(normal).normalize(); else _dn.set(0,1,0);
  _dp.copy(point); if(!normal) _dp.y=groundY(point.x,point.z); _dp.addScaledVector(_dn,.006+Math.random()*.006);
  _dq.setFromUnitVectors(_dz,_dn); _dq2.setFromAxisAngle(_dz,Math.random()*6.28); _dq.multiply(_dq2);
  const s=(scale||1)*(kind==='hole'?.16:kind==='pool'?1.3:kind==='scorch'?1:.75); _ds.set(s,s,s); _dm.compose(_dp,_dq,_ds); D.m.setMatrixAt(i,_dm); D.m.instanceMatrix.needsUpdate=true;
  D.tile.setX(i,pick(K.tiles)); D.tile.needsUpdate=true; D.col.setXYZ(i,K.col[0]*rand(.85,1.1),K.col[1],K.col[2]); D.col.needsUpdate=true;
  D.life[i]=K.life*rand(.8,1.1); D.max[i]=D.life[i]; D.fade.setX(i,1); D.fade.needsUpdate=true; }
const fxRay=new THREE.Raycaster();
const METALS=new Set([M.metal,M.dark,M.rust,M.wire,M.brass]);
function spawnImpact(point,normal,obj){ if(!point) return; _dn.set(0,1,0);
  if(normal){ _dn.copy(normal); if(obj){ obj.updateMatrixWorld(); _dn.transformDirection(obj.matrixWorld); } }
  const metal=obj&&(METALS.has(obj.material)||(typeof CM!=='undefined'&&(obj.material===CM.metal||obj.material===CM.dark||obj.material===CM.rust)));
  if(metal||Math.random()<(QUAL?.35:.15)) spawnParticles(point.clone().addScaledVector(_dn,.03),'spark',metal?4:1);
  if(obj&&!obj.visible) return; let o=obj; while(o){ if(o.visible===false) return; o=o.parent; }
  spawnDecal(point,_dn.clone(),'hole',rand(.8,1.25)); }
function fxZombieHit(z,how){ if(!z||!z.g||GT-(z._bt||-9)<.12) return; z._bt=GT; const kind=z.kind==='hollow'||z.prime?'ichor':'blood'; if(z.boss&&!z.prime){ spawnParticles(z.g.position.clone().setY(2.2),'spark',3); return; }
  const src=z.chest||z.parts[0]||z.g, p=new V3(); src.getWorldPosition(p); p.y+=rand(-.1,.25);
  const dir=new V3(p.x-camera.position.x,0,p.z-camera.position.z); if(dir.lengthSq()<1e-4) dir.set(0,0,1); dir.normalize();
  if(QUAL) spawnParticles(p,'blood',2);
  if(Math.random()<.6){ const d=dir.clone(); d.y=rand(-.35,.15); d.normalize(); fxRay.set(p,d); fxRay.far=3.2; const hs=fxRay.intersectObjects(solids,false);
    for(const h of hs){ if(!h.object.visible||!h.face) continue; const n=h.face.normal.clone().transformDirection(h.object.matrixWorld); if(n.y>.7) spawnDecal(h.point,null,kind,rand(.6,1));
      else { spawnDecal(h.point,n,kind,rand(.55,.95)); if(Math.random()<.5) spawnDecal(h.point.clone().setY(h.point.y-.12),n,'drip',rand(.5,.8)); } break; } }
  if(Math.random()<.7){ const k=rand(.3,1.5); spawnDecal(new V3(p.x+dir.x*k+rand(-.3,.3),0,p.z+dir.z*k+rand(-.3,.3)),null,kind,rand(.45,.85)); } }
function muzzleLight(pos){ if(!pos||boomLight.intensity>1.4) return; boomLight.color.set(0xffb468); boomLight.position.copy(pos); boomLight.intensity=QUAL?1.7:1.2; }
// ---- shell casings (one instanced mesh)
const CAS_N=QUAL?36:16;
const CAS=(()=>{ const geo=new THREE.CylinderGeometry(.0065,.0065,.034,QUAL?7:5); const m=new THREE.InstancedMesh(geo,L({color:0xc09440,specular:0x8a7040,shininess:60,emissive:0x1a1004}),CAS_N);
  m.frustumCulled=false; const z0=new THREE.Matrix4().makeScale(0,0,0); for(let i=0;i<CAS_N;i++) m.setMatrixAt(i,z0); scene.add(m);
  const a=[]; for(let i=0;i<CAS_N;i++) a.push({p:new V3(),v:new V3(),r:new THREE.Euler(),w:new V3(),life:0,b:0}); return {m,a,i:0,live:0}; })();
function ejectCasing(pos,dir){ if(!pos) return; const c=CAS.a[CAS.i++%CAS_N]; c.p.copy(pos); c.v.copy(dir||new V3(1,0,0)).multiplyScalar(rand(1.6,2.4)); c.v.y+=rand(1.4,2.2);
  c.r.set(rand(0,6),rand(0,6),rand(0,6)); c.w.set(rand(-25,25),rand(-25,25),rand(-25,25)); c.life=2.6; c.b=0; CAS.live=3; }
const _cm=new THREE.Matrix4(), _cq=new THREE.Quaternion(), _cs1=new V3(1,1,1), _cs0=new V3(0,0,0);
function updateCasings(dt){ if(CAS.live<=0) return; CAS.live-=dt; let any=false;
  for(let i=0;i<CAS_N;i++){ const c=CAS.a[i]; if(c.life<=0) continue; c.life-=dt; any=true;
    if(c.b<4){ c.v.y-=9.8*dt; c.p.addScaledVector(c.v,dt); c.r.x+=c.w.x*dt; c.r.y+=c.w.y*dt; c.r.z+=c.w.z*dt; const gy=groundY(c.p.x,c.p.z)+.006;
      if(c.p.y<gy){ c.p.y=gy; c.v.y=-c.v.y*.35; c.v.x*=.5; c.v.z*=.5; c.w.multiplyScalar(.5); c.b++; if(c.b===1&&typeof sfxAt==='function'&&sfx.casing) sfxAt('casing',c.p,14); if(c.b>=4){ c.r.x=Math.PI/2; c.r.z=0; } } }
    _cq.setFromEuler(c.r); _cm.compose(c.p,_cq,c.life>0?_cs1:_cs0); CAS.m.setMatrixAt(i,_cm); }
  CAS.m.instanceMatrix.needsUpdate=true; if(any) CAS.live=Math.max(CAS.live,.1); }
function updateDecals(dt){ const D=DECALS; let ch=false; for(let i=0;i<DECAL_N;i++){ if(D.life[i]<=0) continue; D.life[i]-=dt; const f=clamp(D.life[i]/4,0,1); if(D.life[i]<=0){ _dm.makeScale(0,0,0); D.m.setMatrixAt(i,_dm); D.m.instanceMatrix.needsUpdate=true; } D.fade.setX(i,f); ch=true; } if(ch) D.fade.needsUpdate=true; }
function clearDecals(){ const D=DECALS; _dm.makeScale(0,0,0); for(let i=0;i<DECAL_N;i++){ D.life[i]=0; D.m.setMatrixAt(i,_dm); } D.m.instanceMatrix.needsUpdate=true; }
function updateFx(dt){ updateDecals(dt); updateCasings(dt); DECALS.m.material.uniforms.uLight.value=mode==='hollow'?.75:P.inCabin?.5:.62; }
// ---- footstep surface lookup
const WOOD_RECTS=[[-10,10,30,50],[-.7,.7,6,29],[-19,27,15.8,17.2],[-22.6,-21.4,-27,3],[12,38,-9.6,-8.4],[-11.3,-8.7,20.7,23.3]];
function surfaceAt(x,z){ if(x>150) return 'crystal'; if(x<-150) return 'metal';
  for(const r of WOOD_RECTS) if(x>r[0]&&x<r[1]&&z>r[2]&&z<r[3]) return 'wood';
  if(x>30.6&&x<59.4&&z>5.6&&z<29.4) return 'stone';
  if(Math.hypot(x-70,z+12.5)<3.4&&Math.abs(x-70)<3.5) return 'metal';
  return 'mud'; }
