/* ================= geometry building: merged meshes, vertex paint, instancing, shared shader patches ================= */
// GB(): collect primitives (each with a transform and a colour) and merge them into ONE indexed BufferGeometry
// with position/normal/uv/color and a 'sway' weight (0 = rigid, 1 = loose cloth). One mesh = one draw call.
const DET=QUAL;                                   // detail level for procedural models (0 low, 1 medium, 2 high)
const SEG=(n,lo)=>QUAL?n:Math.max(lo||4,Math.round(n*.55));
function hash3(x,y,z){ const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453; return s-Math.floor(s); }
const _gbM=new THREE.Matrix4(), _gbQ=new THREE.Quaternion(), _gbE=new THREE.Euler(), _gbS=new V3(), _gbP=new V3(), _gbC=new THREE.Color(), _gbC2=new THREE.Color(), _gbV=new V3(), _gbN=new THREE.Matrix3();
function GB(){ const parts=[];
  return {
    // o: p [x,y,z], r [x,y,z] (euler), s number|[x,y,z], pre fn(geo) (runs before s/r/p), sway number|fn(x,y,z) (local, pre-transform),
    //    jit displacement amount, paint fn(c,x,y,z) adjusts the THREE.Color in merged space, grime 0..1 per-vertex darkening
    add(geo,col,o={}){ let g=geo.clone(); if(o.pre) o.pre(g);
      const pos=g.attributes.position, n=pos.count, sw=new Float32Array(n);
      for(let i=0;i<n;i++){ const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i); sw[i]=typeof o.sway==='function'?o.sway(x,y,z):(o.sway||0); }
      if(o.jit){ const j=o.jit; for(let i=0;i<n;i++){ const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i); pos.setXYZ(i,x+(hash3(x,y,z)-.5)*j,y+(hash3(y,z,x)-.5)*j,z+(hash3(z,x,y)-.5)*j); } g.computeVertexNormals(); }
      const s=o.s===undefined?1:o.s; if(typeof s==='number') _gbS.set(s,s,s); else _gbS.set(s[0],s[1],s[2]);
      _gbE.set(...(o.r||[0,0,0])); _gbQ.setFromEuler(_gbE); _gbP.set(...(o.p||[0,0,0])); _gbM.compose(_gbP,_gbQ,_gbS); g.applyMatrix4(_gbM);
      g.setAttribute('sway',new THREE.BufferAttribute(sw,1));
      const cols=new Float32Array(n*3); _gbC.set(col);
      for(let i=0;i<n;i++){ _gbC2.copy(_gbC); const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        if(o.grime) _gbC2.multiplyScalar(1-hash3(x*3.1,y*3.1,z*3.1)*o.grime);
        if(o.paint) o.paint(_gbC2,x,y,z);
        cols[i*3]=_gbC2.r; cols[i*3+1]=_gbC2.g; cols[i*3+2]=_gbC2.b; }
      g.setAttribute('color',new THREE.BufferAttribute(cols,3));
      parts.push(g); return this; },
    done(){ return mergeGeos(parts); } };
}
function mergeGeos(list){ let nv=0, ni=0; for(const g of list){ nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; }
  const P_=new Float32Array(nv*3), N_=new Float32Array(nv*3), U_=new Float32Array(nv*2), C_=new Float32Array(nv*3), S_=new Float32Array(nv), I_=nv>65535?new Uint32Array(ni):new Uint16Array(ni);
  let vo=0, io=0;
  for(const g of list){ const a=g.attributes, n=a.position.count;
    P_.set(a.position.array,vo*3); if(a.normal) N_.set(a.normal.array,vo*3); if(a.uv) U_.set(a.uv.array,vo*2);
    if(a.color) C_.set(a.color.array,vo*3); else C_.fill(1,vo*3,(vo+n)*3); if(a.sway) S_.set(a.sway.array,vo);
    if(g.index){ const ix=g.index.array; for(let i=0;i<ix.length;i++) I_[io++]=ix[i]+vo; } else for(let i=0;i<n;i++) I_[io++]=i+vo;
    vo+=n; g.dispose(); }
  const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.BufferAttribute(P_,3)); out.setAttribute('normal',new THREE.BufferAttribute(N_,3)); out.setAttribute('uv',new THREE.BufferAttribute(U_,2));
  out.setAttribute('color',new THREE.BufferAttribute(C_,3)); out.setAttribute('sway',new THREE.BufferAttribute(S_,1)); out.setIndex(new THREE.BufferAttribute(I_,1)); out.computeBoundingSphere(); return out; }
// a partial horizontal arc (rib, strap, wrap) of radius r around the Y axis, starting at angle a0 (0 = +z front) for 'arc' radians toward +x
function arcGeo(r,tube,arc,a0,rs,ts){ const t=new THREE.TorusGeometry(r,tube,rs||4,ts||SEG(8,4),arc); t.rotateX(-Math.PI/2); t.rotateY(-Math.PI/2+a0); return t; }

// shared time uniform for cloth sway and other animated shaders (advanced in renderFrame); a TSL uniform node (.value)
const FXT=TSL.uniform(0);
// make a lit material's vertices with a 'sway' weight flutter like loose cloth (no extra draw calls); TSL position node
function swayMat(m){ const T=TSL, sw=T.attribute('sway','float'), pg=T.positionGeometry, wo=T.modelWorldMatrix.element(3).xyz;
  const ph=FXT.mul(3.3).add(wo.x.mul(1.9)).add(wo.z.mul(1.37)).add(pg.x.mul(11)).add(pg.z.mul(7));
  m.positionNode=T.positionLocal.add(T.vec3(T.sin(ph).mul(sw).mul(.035),T.abs(T.sin(ph.mul(.7))).mul(sw).mul(.01),T.sin(ph.mul(1.31).add(1.7)).mul(.6).sub(.25).mul(sw).mul(.05)));
  return m; }

// TSL stand-in for the old ShaderMaterial: a NodeMaterial whose output is `out` (a vec4 node, built from `u`), with
// m.uniforms = u (TSL uniform/texture nodes, each with .value like ShaderMaterial uniforms). Unlit, no fog unless
// o.fog is true (then `out` becomes the colour of a basic material so scene fog applies). Works on WebGPU and WebGL 2.
function tslMat(o,u,out){ const fog=!!o.fog, m=fog?new THREE.MeshBasicNodeMaterial():new THREE.NodeMaterial(); const p=Object.assign({},o); delete p.fog;
  Object.assign(m,p); m.fog=fog; m.lights=false; if(fog) m.colorNode=out; else m.fragmentNode=out; m.uniforms=u; return m; }

// ---- instanced batches: many copies of one shape -> a few draw calls, split into grid cells so off-screen cells are culled
const BATCHES=[];
function batch(geo,mat,o={}){ const b={geo,mat,items:[],cell:o.cell||36,shadow:!!o.shadow}; BATCHES.push(b); return b; }
const _bm=new THREE.Matrix4(), _bq=new THREE.Quaternion(), _be=new THREE.Euler(), _bs=new V3(), _bp=new V3();
function batchAdd(b,x,y,z,ry,s,col,rx,rz){ _bp.set(x,y,z); _be.set(rx||0,ry||0,rz||0); _bq.setFromEuler(_be); if(typeof s==='number') _bs.set(s,s,s); else if(s) _bs.set(s[0],s[1],s[2]); else _bs.set(1,1,1);
  b.items.push({m:new THREE.Matrix4().compose(_bp,_bq,_bs),c:col===undefined?null:new THREE.Color(col),x,z}); }
function flushBatches(){ for(const b of BATCHES){ if(!b.items.length) continue; const cells=new Map();
    for(const it of b.items){ const k=Math.floor(it.x/b.cell)+','+Math.floor(it.z/b.cell); if(!cells.has(k)) cells.set(k,[]); cells.get(k).push(it); }
    if(!b.geo.boundingSphere) b.geo.computeBoundingSphere(); const gr=b.geo.boundingSphere.radius;
    for(const list of cells.values()){ const g=new THREE.BufferGeometry(); for(const k in b.geo.attributes) g.setAttribute(k,b.geo.attributes[k]); if(b.geo.index) g.setIndex(b.geo.index);
      const im=new THREE.InstancedMesh(g,b.mat,list.length), bb=new THREE.Box3(), v=new V3(); let maxS=1;
      list.forEach((it,i)=>{ im.setMatrixAt(i,it.m); if(it.c) im.setColorAt(i,it.c); v.setFromMatrixPosition(it.m); bb.expandByPoint(v); const e=it.m.elements; maxS=Math.max(maxS,Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10])); });
      const sp=new THREE.Sphere(); bb.getBoundingSphere(sp); sp.radius+=gr*maxS; g.boundingSphere=sp;
      if(b.shadow){ im.castShadow=true; } im.receiveShadow=QUAL===2; im.userData.batch=true; scene.add(im); }
    b.items.length=0; } }
