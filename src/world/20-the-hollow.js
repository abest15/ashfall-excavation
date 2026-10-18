/* ---------- the Hollow ---------- */
const HL={wave:0,toSpawn:0,spawnT:0,breakT:0,inBreak:true,gate:null,gateOpen:false,rocks:[],crystals:[],pups:0,lit:null};
{ const g=new THREE.Group(); g.position.set(HX,0,HZ); scene.add(g);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(30,40),L({map:crystalTex,color:0x8a86a8})); floor.rotation.x=-Math.PI/2; floor.position.y=.02; g.add(floor); addSolid(floor);
  for(let r=6;r<=18;r+=6){ const ring=new THREE.Mesh(new THREE.RingGeometry(r-.06,r+.06,48),M.add(0x74d9ea,.25)); ring.rotation.x=-Math.PI/2; ring.position.y=.05; g.add(ring); }
  const cmA=L({color:0x2a6a80,emissive:0x1b5c70}), cmB=L({color:0x4a3a80,emissive:0x2a1a60}); HL.litMat=B({color:0xe8fbff});
  for(let i=0;i<26;i++){ const a=i/26*Math.PI*2+rand(-.1,.1), r=rand(23,27); const c=new THREE.Mesh(new THREE.OctahedronGeometry(1.2),i%3?cmA:cmB); const h=rand(2.5,6);
    c.scale.set(rand(.8,1.4),h,rand(.8,1.4)); c.position.set(Math.cos(a)*r,h*.6,Math.sin(a)*r); c.rotation.set(rand(-.3,.3),rand(0,3),rand(-.3,.3)); g.add(c); }
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2+.9; const x=Math.cos(a)*12, z=Math.sin(a)*12; const c=new THREE.Mesh(new THREE.OctahedronGeometry(.9),cmA); c.scale.set(1,3,1); c.position.set(x,2.2,z); g.add(c); addSolid(c); c.userData.col=addCol(HX+x,HZ+z,1.4,1.4); c.userData.hcrystal=HL.crystals.length; c.userData.base=cmA; HL.crystals.push(c); }
  for(let i=0;i<14;i++){ const a=rand(0,6.28), r=rand(10,40); const m=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1,3.5)),M.stone); m.position.set(Math.cos(a)*r,rand(12,26),Math.sin(a)*r); g.add(m); HL.rocks.push({m,s:rand(-.3,.3)}); }
  for(let i=0;i<16;i++){ const a=i/16*Math.PI*2, r=rand(42,60), h=rand(14,40); box(rand(4,8),h,rand(4,8),M.dark,Math.cos(a)*r,h/2,Math.sin(a)*r,{parent:g}); box(.3,h*.7,.3,B({color:0x3aa0b8}),Math.cos(a)*(r-3),h*.4,Math.sin(a)*(r-3),{parent:g}); }
  const eye=new THREE.Mesh(new THREE.SphereGeometry(9,20,14),B({color:0x2a2050})); eye.position.set(0,58,-40); g.add(eye);
  const gate=new THREE.Group(); gate.visible=false; g.add(gate); HL.gate=gate;
  const t=new THREE.Mesh(new THREE.TorusGeometry(2.4,.18,8,32),B({color:0xe8fbff})); t.position.y=2.8; gate.add(t);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.3,32),M.add(0xbff3ff,.75)); disc.position.y=2.8; gate.add(disc); HL.disc=disc;
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.4,2.4,60,16,1,true),M.add(0xbff3ff,.12)); col.position.y=30; gate.add(col);
  addInter({x:HX,z:HZ+1,r:3,prompt:()=>HL.gateOpen?'Step into the light':null,use:()=>{ if(!HL.gateOpen) return; if(NET.role==='client') toHost({t:'shoot',k:'gate'}); else hollowGate(); }});
}
