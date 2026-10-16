/* ================= materials ================= */
const L=(o)=>{ if(!QUAL) return new THREE.MeshLambertMaterial(o); const p=Object.assign({shininess:5,specular:0x0b0b0b},o); if(QUAL===2&&o.map&&NRM.has(o.map.image)){ p.normalMap=NRM.get(o.map.image); p.normalScale=new THREE.Vector2(.8,.8); } return new THREE.MeshPhongMaterial(p); };
const B=(o)=>new THREE.MeshBasicMaterial(o);
const M={
  mud:L({map:mudTex}), plank:L({map:plankTex}), sand:L({map:sandTex}), stone:L({map:stoneTex}), brick:L({map:brickTex}),
  metal:L({color:0x4b4e51}), dark:L({color:0x26272a}), brass:L({color:0xa8823f}), rust:L({color:0x6a3a24}),
  cloth:L({color:0x5c5644}), wood:L({color:0x5a3f28}), pitDark:L({color:0x1b1712}), wire:L({color:0x3a3a3a}),
  hill:L({color:0x2a241d}), tree:L({color:0x231c15}),
  glowAmber:B({color:0xf2cb78}), bulbOff:B({color:0x3a3326}), relic:B({color:0x74d9ea}),
  add:(c,o=1)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}),
};
