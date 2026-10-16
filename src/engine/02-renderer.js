/* ================= renderer ================= */
const canvas=$('c');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'}); }
catch(e){ $('loaderr').hidden=false; $('loaderr').textContent='WebGL is unavailable in this browser, so the game cannot start.'; $('play').disabled=true; return; }
renderer.autoClear=false;
const QUAL=SETTINGS.scale<.6?0:SETTINGS.scale<.9?1:2;   // 0 low, 1 medium, 2 high
const ANISO=QUAL?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
const scene=new THREE.Scene();
const FOG_MAIN=0x2a2520, FOG_HOLLOW=0x0e0b1c;
scene.background=new THREE.Color(FOG_MAIN);
scene.fog=new THREE.FogExp2(FOG_MAIN,0.03);
const camera=new THREE.PerspectiveCamera(SETTINGS.fov,1,0.05,120);
camera.rotation.order='YXZ';
scene.add(camera);
const hemi=new THREE.HemisphereLight(0x9ea3aa,0x3a2e21,0.85); scene.add(hemi);
// the moon: one directional light; on High it casts real shadows from a small shadow camera that follows the player
const MOON_DIR=new THREE.Vector3(-40,48,-60).normalize();
const sun=new THREE.DirectionalLight(0xc4cbe0,0.55); sun.position.copy(MOON_DIR).multiplyScalar(60); scene.add(sun); scene.add(sun.target);
if(QUAL===2){ renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=true; sun.castShadow=true;
  const ms=renderer.capabilities.isWebGL2?2048:1024; sun.shadow.mapSize.set(ms,ms); const sc=sun.shadow.camera; sc.left=-24; sc.right=24; sc.top=24; sc.bottom=-24; sc.near=5; sc.far=130; sc.updateProjectionMatrix();
  sun.shadow.bias=-.0008; if('normalBias' in sun.shadow) sun.shadow.normalBias=.03; }
const vmScene=new THREE.Scene();
const vmCam=new THREE.PerspectiveCamera(58,1,0.01,10);
vmScene.add(vmCam);
const vmHemi=new THREE.HemisphereLight(0xc8c0b0,0x40352a,1.0); vmScene.add(vmHemi);
const vmSun=new THREE.DirectionalLight(0xffe2b8,0.6); vmSun.position.set(1,2,1); vmScene.add(vmSun);
const vmRoot=new THREE.Group(); vmCam.add(vmRoot);
const POST={on:QUAL>0};
if(POST.on){ const RT=(QUAL===2&&renderer.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget)?THREE.WebGLMultisampleRenderTarget:THREE.WebGLRenderTarget;
  POST.rt=new RT(4,4,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:true});
  POST.a=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false}); POST.b=POST.a.clone();
  POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1); POST.scene=new THREE.Scene(); POST.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)); POST.quad.frustumCulled=false; POST.scene.add(POST.quad);
  const vs='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', sm=(u,fs)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,depthTest:false,depthWrite:false});
  POST.bright=sm({t:{value:null}},'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(.5,.92,l)*(1.+smoothstep(.85,1.,l)),1.); }');
  POST.blur=sm({t:{value:null},dir:{value:new THREE.Vector2()}},'uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*.227; c+=texture2D(t,vUv+dir*1.385).rgb*.316; c+=texture2D(t,vUv-dir*1.385).rgb*.316; c+=texture2D(t,vUv+dir*3.231).rgb*.07; c+=texture2D(t,vUv-dir*3.231).rgb*.07; gl_FragColor=vec4(c,1.); }');
  POST.comp=sm({t:{value:null},bl:{value:null},time:{value:0},res:{value:new THREE.Vector2(1,1)}},`uniform sampler2D t,bl; uniform float time; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d=vUv-.5; float ca=dot(d,d)*.008; vec3 c=vec3(texture2D(t,vUv+d*ca).r,texture2D(t,vUv).g,texture2D(t,vUv-d*ca).b);
      vec3 b=texture2D(bl,vUv).rgb; c+=b*.9+b*b*.25;
      vec3 ac=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14); c=mix(c,ac,.55);
      c=mix(c,c*c*(3.-2.*c),.22);
      float l=dot(c,vec3(.299,.587,.114)); c=mix(c,c*vec3(.9,1.,1.08),1.-smoothstep(0.,.4,l)); c=mix(c,c*vec3(1.07,1.,.9),smoothstep(.4,1.,l)); c=mix(vec3(l),c,1.12);
      c*=mix(.6,1.,smoothstep(.92,.24,length(d*vec2(1.,.85))));
      c+=(hash(vUv*res+fract(time))-.5)*.03;
      gl_FragColor=vec4(c,1.); }`); }
function postResize(){ if(!POST.on) return; const v=new THREE.Vector2(); renderer.getDrawingBufferSize(v); POST.rt.setSize(v.x,v.y); const qw=Math.max(1,v.x>>2), qh=Math.max(1,v.y>>2); POST.a.setSize(qw,qh); POST.b.setSize(qw,qh); POST.comp.uniforms.res.value.set(v.x,v.y); POST.texel=new THREE.Vector2(1/qw,1/qh); }
let FIRST_FRAME=true;
function renderFrame(withVM){
  if(FIRST_FRAME){ FIRST_FRAME=false; if(typeof flushBatches==='function') flushBatches(); if(typeof initShadowFlags==='function') initShadowFlags(); }
  if(typeof FXT!=='undefined') FXT.value=performance.now()*.001%1000;
  if(!POST.on){ renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene,camera); if(withVM){ renderer.clearDepth(); renderer.render(vmScene,vmCam); } return; }
  renderer.setRenderTarget(POST.rt); renderer.clear(); renderer.render(scene,camera); if(withVM){ renderer.clearDepth(); renderer.render(vmScene,vmCam); }
  const q=POST.quad, bu=POST.blur.uniforms; q.material=POST.bright; POST.bright.uniforms.t.value=POST.rt.texture; renderer.setRenderTarget(POST.a); renderer.render(POST.scene,POST.cam);
  for(let i=0;i<(QUAL===2?3:2);i++){ q.material=POST.blur; bu.t.value=POST.a.texture; bu.dir.value.set(POST.texel.x*(1+i),0); renderer.setRenderTarget(POST.b); renderer.render(POST.scene,POST.cam);
    bu.t.value=POST.b.texture; bu.dir.value.set(0,POST.texel.y*(1+i)); renderer.setRenderTarget(POST.a); renderer.render(POST.scene,POST.cam); }
  q.material=POST.comp; const cu=POST.comp.uniforms; cu.t.value=POST.rt.texture; cu.bl.value=POST.a.texture; cu.time.value=performance.now()*.001; renderer.setRenderTarget(null); renderer.render(POST.scene,POST.cam); }

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setPixelRatio(SETTINGS.scale*Math.min(devicePixelRatio||1,1.5));
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.far=SETTINGS.scale<.6?75:100; camera.updateProjectionMatrix();
  vmCam.aspect=w/h; vmCam.updateProjectionMatrix();
  postResize();
}
addEventListener('resize',resize); resize();
