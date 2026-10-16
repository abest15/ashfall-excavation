/* ================= lights (fixed count; intensity changes only) ================= */
const LAMPS=[[-3,3.3,36],[-6,3.3,18],[18,3.3,14],[-19,3.3,-20],[30,3.3,-10]].map((p,i)=>{ const l=new THREE.PointLight(0xffb560,i===0?1.1:0,24,1.4); l.position.set(p[0]+0.5,p[1],p[2]); scene.add(l); return l; });
bulbs[0].material.color.set(0xf2cb78);
const forgeLight=new THREE.PointLight(0xff7a2a,0,14,1.5); forgeLight.position.set(-24.5,1.8,-24.5); scene.add(forgeLight);
const boomLight=new THREE.PointLight(0xff8a3a,0,18,1.6); boomLight.position.set(0,-50,0); scene.add(boomLight);
