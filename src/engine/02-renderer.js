/* ================= renderer ================= */
// three.js WebGPURenderer: WebGPU where the browser has a real GPU adapter for it, otherwise three's WebGL 2 backend.
// Options → Graphics → Renderer picks Auto (default) / WebGPU / WebGL; the active backend shows in the F3 overlay
// and on the loading screen. Every material must work on both backends: built-in materials are converted to node
// materials by three; custom shading is written in TSL (three's node shading language), never raw GLSL.
// Colour: the game is authored display-referred (as with the original r128 renderer), so colour management is off and
// the canvas gets values as computed; the film look (tone curve, grade, bloom) is our own post pass below.
THREE.ColorManagement.enabled=false;
const canvas=$('c');
const RENDERER_PREF=['auto','webgpu','webgl'].includes(SETTINGS.renderer)?SETTINGS.renderer:'auto';
let renderer, RENDER_NOTE='';
// set when a WebGPU device was lost earlier in this browser session: stay on WebGL 2 until the tab is closed
let GPU_LOST=false; try{ GPU_LOST=sessionStorage.getItem('ashfall:gpulost')==='1'; }catch(e){}
// three r186 sends swizzle:'rgba' (identity) in every texture view; some Chromium builds (around 141) type that field
// differently and reject the call, losing the device. Leaving the identity swizzle out means exactly the same view.
if(typeof GPUTexture!=='undefined'){ const cv=GPUTexture.prototype.createView; GPUTexture.prototype.createView=function(d){ if(d&&d.swizzle==='rgba'){ const {swizzle,...rest}=d; return cv.call(this,rest); } return cv.call(this,d); }; }
try{
  let forceWebGL=RENDERER_PREF==='webgl'||GPU_LOST;
  // Auto: WebGPU only on a hardware adapter (a software/fallback WebGPU adapter is slower than WebGL 2)
  if(RENDERER_PREF==='auto'){ let ad=null; try{ ad=navigator.gpu?await navigator.gpu.requestAdapter({powerPreference:'high-performance'}):null; }catch(e){}
    if(!ad||(ad.info&&ad.info.isFallbackAdapter)||ad.isFallbackAdapter) forceWebGL=true; }
  renderer=new THREE.WebGPURenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance',forceWebGL});
  await renderer.init();
}catch(e){ console.error(e); $('loaderr').hidden=false; $('loaderr').textContent='This browser offers neither WebGPU nor WebGL 2, so the game cannot start.'; $('play').disabled=true; return; }
const BACKEND=renderer.backend&&renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2';
if(GPU_LOST&&RENDERER_PREF!=='webgl') RENDER_NOTE='WebGPU stopped responding earlier, using WebGL 2';
else if(RENDERER_PREF==='webgpu'&&BACKEND!=='WebGPU') RENDER_NOTE='WebGPU unavailable, using WebGL 2';
// a lost WebGPU device (driver reset, GPU process crash) would leave a blank screen: reload once on the WebGL 2 backend
if(BACKEND==='WebGPU') renderer.onDeviceLost=info=>{ renderer._onDeviceLost(info); try{ sessionStorage.setItem('ashfall:gpulost','1'); }catch(e){ return; } location.reload(); };
renderer.outputColorSpace=THREE.LinearSRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
renderer.autoClear=false;
// Instanced meshes: keep instance matrices in an instanced vertex attribute (as r128 did). Below the uniform-buffer limit
// three would bake each mesh's matrices into its own uniform array, compiling a separate shader per batch cell.
renderer.backend.capabilities.getUniformBufferLimit=()=>0;
// Light units: the game's light intensities, colours and falloffs are tuned for the classic (pre-physical) lighting
// model, so the light nodes below reproduce it on top of three's physically based lighting: punctual and ambient
// light is scaled by PI (three now divides diffuse/specular by PI) and point lights use the classic linear-to-cutoff
// falloff pow(1 - d/distance, decay) instead of inverse-square. Values set anywhere in the game keep their meaning.
{ const T=TSL, PI=Math.PI;
  class AshPointLightNode extends THREE.PointLightNode { static get type(){ return 'AshPointLightNode'; }
    update(f){ super.update(f); this.color.multiplyScalar(PI); }
    setupDirect(builder){ const lv=this.getLightVector(builder), d=lv.length(), cut=this.cutoffDistanceNode, dec=this.decayExponentNode;
      const att=cut.greaterThan(0).and(dec.greaterThan(0)).select(T.pow(d.div(cut).oneMinus().clamp(),dec),T.float(1));
      return {lightDirection:lv.normalize(),lightColor:this.colorNode.mul(att)}; } }
  class AshDirectionalLightNode extends THREE.DirectionalLightNode { static get type(){ return 'AshDirectionalLightNode'; } update(f){ super.update(f); this.color.multiplyScalar(PI); } }
  class AshHemisphereLightNode extends THREE.HemisphereLightNode { static get type(){ return 'AshHemisphereLightNode'; } update(f){ super.update(f); this.color.multiplyScalar(PI); this.groundColorNode.value.multiplyScalar(PI); } }
  const ln=renderer.library.lightNodes; ln.set(THREE.PointLight,AshPointLightNode); ln.set(THREE.DirectionalLight,AshDirectionalLightNode); ln.set(THREE.HemisphereLight,AshHemisphereLightNode); }
const QUAL=SETTINGS.scale<.6?0:SETTINGS.scale<.9?1:2;   // 0 low, 1 medium, 2 high
const ANISO=QUAL?Math.min(8,renderer.getMaxAnisotropy()):1;
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
if(QUAL===2){ renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap; sun.castShadow=true;
  const ms=2048; sun.shadow.mapSize.set(ms,ms); const sc=sun.shadow.camera; sc.left=-24; sc.right=24; sc.top=24; sc.bottom=-24; sc.near=5; sc.far=130; sc.updateProjectionMatrix();
  sun.shadow.bias=-.0008; sun.shadow.normalBias=.03; sun.shadow.radius=2; }
const vmScene=new THREE.Scene();
const vmCam=new THREE.PerspectiveCamera(58,1,0.01,10);
vmScene.add(vmCam);
const vmHemi=new THREE.HemisphereLight(0xc8c0b0,0x40352a,1.0); vmScene.add(vmHemi);
const vmSun=new THREE.DirectionalLight(0xffe2b8,0.6); vmSun.position.set(1,2,1); vmScene.add(vmSun);
const vmRoot=new THREE.Group(); vmCam.add(vmRoot);
// post (Medium/High): scene + viewmodel into an 8-bit target (MSAA on High), bright pass, separable blur at quarter
// resolution, then one composite pass: chromatic fringe, bloom, filmic tone curve, split grade, vignette and grain.
const POST={on:QUAL>0};
if(POST.on){ const T=TSL, {texture,uniform,uv,vec2,vec3,vec4,float,smoothstep,mix,max,dot,length,fract,sin}=T;
  POST.rt=new THREE.RenderTarget(4,4,{samples:QUAL===2?4:0,depthBuffer:true,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
  POST.a=new THREE.RenderTarget(4,4,{depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false}); POST.b=POST.a.clone();
  const mat=node=>{ const m=new THREE.NodeMaterial(); m.fragmentNode=node; m.depthTest=false; m.depthWrite=false; m.fog=false; m.lights=false; m.toneMapped=false; return new THREE.QuadMesh(m); };
  const sceneTex=texture(POST.rt.texture);
  POST.bright=mat((()=>{ const c=sceneTex.rgb, l=max(c.r,max(c.g,c.b)); return vec4(c.mul(smoothstep(.5,.92,l)).mul(smoothstep(.85,1,l).add(1)),1); })());
  const blur=(src,dir)=>{ const t=k=>texture(src.texture,uv().add(dir.mul(k))).rgb; return vec4(t(0).mul(.227).add(t(1.385).add(t(-1.385)).mul(.316)).add(t(3.231).add(t(-3.231)).mul(.07)),1); };
  POST.dirX=uniform(new THREE.Vector2()); POST.dirY=uniform(new THREE.Vector2());
  POST.blurX=mat(blur(POST.a,POST.dirX)); POST.blurY=mat(blur(POST.b,POST.dirY));
  POST.time=uniform(0); POST.res=uniform(new THREE.Vector2(1,1));
  POST.comp=mat(T.Fn(()=>{ const p=uv(), d=p.sub(.5), ca=dot(d,d).mul(.008);
    const c=vec3(texture(POST.rt.texture,p.add(d.mul(ca))).r,sceneTex.g,texture(POST.rt.texture,p.sub(d.mul(ca))).b).toVar();
    const b=texture(POST.a.texture).rgb; c.addAssign(b.mul(.9).add(b.mul(b).mul(.25)));
    const ac=c.mul(c.mul(2.51).add(.03)).div(c.mul(c.mul(2.43).add(.59)).add(.14)); c.assign(mix(c,ac,.55));
    c.assign(mix(c,c.mul(c).mul(c.mul(-2).add(3)),.22));
    const l=dot(c,vec3(.299,.587,.114)); c.assign(mix(c,c.mul(vec3(.9,1,1.08)),smoothstep(0,.4,l).oneMinus())); c.assign(mix(c,c.mul(vec3(1.07,1,.9)),smoothstep(.4,1,l))); c.assign(mix(vec3(l),c,1.12));
    c.mulAssign(mix(.6,1,smoothstep(.24,.92,length(d.mul(vec2(1,.85)))).oneMinus()));
    const hp=p.mul(POST.res).add(fract(POST.time)); c.addAssign(fract(sin(dot(hp,vec2(12.9898,78.233))).mul(43758.5453)).sub(.5).mul(.03));
    return vec4(c,1); })()); }
function postResize(){ if(!POST.on) return; const v=new THREE.Vector2(); renderer.getDrawingBufferSize(v); POST.rt.setSize(v.x,v.y); const qw=Math.max(1,v.x>>2), qh=Math.max(1,v.y>>2); POST.a.setSize(qw,qh); POST.b.setSize(qw,qh); POST.res.value.set(v.x,v.y); POST.texel=new THREE.Vector2(1/qw,1/qh); }
let FIRST_FRAME=true;
function renderFrame(withVM){
  if(FIRST_FRAME){ FIRST_FRAME=false; if(typeof flushBatches==='function') flushBatches(); if(typeof initShadowFlags==='function') initShadowFlags(); if(typeof initSurfaceGroup==='function') initSurfaceGroup(); }
  if(typeof FXT!=='undefined') FXT.value=performance.now()*.001%1000;
  if(!POST.on){ renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene,camera); if(withVM){ renderer.clearDepth(); renderer.render(vmScene,vmCam); } return; }
  renderer.setRenderTarget(POST.rt); renderer.clear(); renderer.render(scene,camera); if(withVM){ renderer.clearDepth(); renderer.render(vmScene,vmCam); }
  renderer.setRenderTarget(POST.a); POST.bright.render(renderer);
  for(let i=0;i<(QUAL===2?3:2);i++){ POST.dirX.value.set(POST.texel.x*(1+i),0); renderer.setRenderTarget(POST.b); POST.blurX.render(renderer);
    POST.dirY.value.set(0,POST.texel.y*(1+i)); renderer.setRenderTarget(POST.a); POST.blurY.render(renderer); }
  POST.time.value=performance.now()*.001; renderer.setRenderTarget(null); POST.comp.render(renderer); }

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setPixelRatio(SETTINGS.scale*Math.min(devicePixelRatio||1,1.5));
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.far=SETTINGS.scale<.6?75:100; camera.updateProjectionMatrix();
  vmCam.aspect=w/h; vmCam.updateProjectionMatrix();
  postResize();
}
addEventListener('resize',resize); resize();
// Options → Renderer (applies on reload, like a Graphics change) and the active backend in the loading screen fine print
{ const s=$('s-renderer'); if(s){ s.value=RENDERER_PREF; s.addEventListener('change',()=>{ SETTINGS.renderer=s.value; saveSettings();
    if(state==='menu'&&NET.role==='solo'){ try{ sessionStorage.setItem('ashfall:skipboot','1'); }catch(e){} location.reload(); } else toast('The new renderer applies the next time you load the game'); }); }
  const ld=$('loading'); if(ld){ const f=document.createElement('p'); f.id='ld-renderer'; f.textContent='Renderer: '+BACKEND+(RENDER_NOTE?' · '+RENDER_NOTE:'');
    f.style.cssText='position:absolute;right:16px;bottom:6px;margin:0;font-size:11px;letter-spacing:.06em;opacity:.55;pointer-events:none'; ld.appendChild(f); } }
