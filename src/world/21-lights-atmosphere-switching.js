/* ---------- lights & atmosphere switching ---------- */
function setAtmosphere(m){
  if(m==='cabin'){ scene.background.set(0x0d0a08); scene.fog.color.set(0x0d0a08); scene.fog.density=.05; hemi.color.set(0x8a6a50); hemi.groundColor.set(0x1a1008); hemi.intensity=.7; sun.intensity=0; cabinLight.intensity=1.8; rain.visible=false; sky.visible=false; return; }
  cabinLight.intensity=0; rain.visible=true; sky.visible=m==='main';
  if(m==='hollow'){ scene.background.set(FOG_HOLLOW); scene.fog.color.set(FOG_HOLLOW); scene.fog.density=.022; hemi.color.set(0x7a86c0); hemi.groundColor.set(0x1a1030); hemi.intensity=.9; sun.intensity=.15;
    const ps=[[0,-14],[13,7],[-13,7],[0,14],[9,-9]]; LAMPS.forEach((l,i)=>{ l.color.set(0x74d9ea); l.intensity=1.4; l.distance=30; l.position.set(HX+ps[i][0],4,HZ+ps[i][1]); });
    rainMat.color.set(0x74d9ea); rainMat.opacity=.7; }
  else { scene.background.set(FOG_MAIN); scene.fog.color.set(FOG_MAIN); scene.fog.density=.03; hemi.color.set(0x9ea3aa); hemi.groundColor.set(0x3a2e21); hemi.intensity=.85; sun.intensity=.5;
    const ps=[[-3,3.3,36],[-6,3.3,18],[18,3.3,14],[-19,3.3,-20],[30,3.3,-10]]; LAMPS.forEach((l,i)=>{ l.color.set(0xffb560); l.distance=24; l.position.set(ps[i][0]+.5,ps[i][1],ps[i][2]); l.intensity=(i===0||POWER.on)?1.1:0; });
    rainMat.color.set(0x9a9a9a); rainMat.opacity=.45; }
}
// rain / motes
const RN=SETTINGS.scale<.6?700:1300, rainGeo=new THREE.BufferGeometry(), rainPos=new Float32Array(RN*3);
for(let i=0;i<RN;i++){ rainPos[i*3]=rand(-24,24); rainPos[i*3+1]=rand(0,18); rainPos[i*3+2]=rand(-24,24); }
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.PointsMaterial({color:0x9a9a9a,size:.07,transparent:true,opacity:.45,depthWrite:false});
const rain=new THREE.Points(rainGeo,rainMat); rain.frustumCulled=false; scene.add(rain);
function updateRain(dt){ const v=mode==='hollow'?-.7:15; for(let i=0;i<RN;i++){ let y=rainPos[i*3+1]-v*dt; if(y<0) y+=18; else if(y>18) y-=18; rainPos[i*3+1]=y; } rainGeo.attributes.position.needsUpdate=true; rain.position.set(camera.position.x,0,camera.position.z); sky.position.copy(camera.position); sky.scale.setScalar(camera.far*.82/100); }
