/* ---------- generator / power ---------- */
const GEN={lever:null};
{ const g=new THREE.Group(); g.position.set(35.5,0,-14); scene.add(g);
  const body=box(2.2,1.6,3,M.metal,0,.8,0,{parent:g}); addSolid(body); box(2.4,.15,3.2,M.rust,0,1.65,0,{parent:g});
  const fw=cyl(.75,.75,.2,M.dark,-1.2,1,-.6,14,g); fw.rotation.z=Math.PI/2; cyl(.12,.15,2.4,M.rust,.5,2.8,1,6,g);
  const lb=box(.3,.6,.3,M.dark,-1.25,1,1,{parent:g}); const lever=new THREE.Group(); lever.position.set(-1.45,1.05,1); g.add(lever);
  box(.06,.7,.06,M.metal,0,.3,0,{parent:lever}); box(.14,.14,.14,M.rust,0,.65,0,{parent:lever}); lever.rotation.z=.6; GEN.lever=lever;
  addCol(35.5,-14,2.4,3.2);
  const lab=makeLabel('GENERATOR',{sx:2.2,size:50,color:'#c9a35a'}); lab.position.set(0,2.6,0); g.add(lab);
  addInter({x:33.6,z:-13,r:2,prompt:()=>POWER.on?null:'Throw the generator lever',use:()=>{ if(!POWER.on){ if(NET.role==='client') toHost({t:'power'}); else { powerOn(); bcast({t:'power'}); } } }});
}
function powerOn(){ POWER.on=true; GEN.lever.rotation.z=-.6; LAMPS.forEach(l=>l.intensity=1.1); bulbs.forEach(b=>b.material.color.set(0xf2cb78)); tonicPanels.forEach(t=>t.pm.emissiveIntensity=.9); forgeLight.intensity=1.6; FORGE.mouth.material.color.set(0xff7a2a); sfx.power(); banner('Power restored','The site hums back to life'); }
