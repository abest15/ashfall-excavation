/* ---------- relic crate (random weapon) ---------- */
const crateCost=()=>PU.sale>0?10:950;
const RARE={cannon:.06,ion:.06,dynamo:.045};
function pickBox(pool){ const norm=pool.filter(id=>!RARE[id]); const r=Math.random(); let acc=0; for(const id in RARE){ if(pool.indexOf(id)<0) continue; acc+=RARE[id]; if(r<acc) return id; } return norm.length?pick(norm):pick(pool); }
const CRATE={locs:[{x:-26.6,z:10,ry:Math.PI/2},{x:0,z:-26.6,ry:0},{x:37.4,z:-4,ry:-Math.PI/2}],li:0,state:'idle',t:0,result:null,uses:0,g:null,lid:null,beam:null,models:{},label:null,cycleT:0,col:null,hit:null};
{ const g=new THREE.Group(); scene.add(g); CRATE.g=g;
  const base=box(1.9,.85,.95,M.plank,0,.43,0,{parent:g}); CRATE.hit=base;
  box(2,.08,1.05,M.brass,0,.08,0,{parent:g}); box(2,.08,1.05,M.brass,0,.8,0,{parent:g});
  const lid=new THREE.Group(); lid.position.set(0,.86,-.47); g.add(lid); box(1.92,.14,.97,M.plank,0,.07,.47,{parent:lid}); box(.3,.06,.06,M.brass,0,.08,.97,{parent:lid}); CRATE.lid=lid;
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.8),M.add(0xf2cb78,.8)); glow.rotation.x=-Math.PI/2; glow.position.y=.84; g.add(glow); glow.visible=false; CRATE.glow=glow;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,40,10,1,true),M.add(0xf2cb78,.07)); beam.position.y=20; g.add(beam); CRATE.beam=beam;
  const lab=makeLabel('',{sx:2.4,size:50,color:'#f2cb78',fog:false}); lab.position.y=2.25; g.add(lab); CRATE.label=lab;
  BOX_POOL.forEach(id=>{ const m=buildGun(id,false); m.position.y=1.55; m.rotation.y=Math.PI/2; m.scale.setScalar(1.5); m.visible=false; g.add(m); CRATE.models[id]=m; });
  CRATE.col={minX:0,maxX:0,minZ:0,maxZ:0,on:true}; colliders.push(CRATE.col);
  addInter({get x(){return CRATE.g.position.x+Math.sin(CRATE.g.rotation.y)*1.2;},get z(){return CRATE.g.position.z+Math.cos(CRATE.g.rotation.y)*1.2;},r:2.2,
    prompt:()=>{ if(CRATE.state==='idle') return `Open the relic crate for a random weapon [${crateCost()}]`; if(CRATE.state==='ready'&&CRATE.result!=='flee') return `Take ${WD[CRATE.result].name}`; return null; },
    use:()=>{ if(CRATE.state==='idle'){ const cc=crateCost(); if(!spend(cc))return; CRATE.paid=cc; CRATE.state='rolling'; CRATE.t=3.6; CRATE.uses++; CRATE.glow.visible=true; sfx.crate(); }
      else if(CRATE.state==='ready'&&CRATE.result!=='flee'){ giveWeapon(mkInst(CRATE.result)); closeCrate(); } }});
}
function placeCrate(i){ const L_=CRATE.locs[i]; CRATE.li=i; CRATE.g.position.set(L_.x,0,L_.z); CRATE.g.rotation.y=L_.ry; const horiz=Math.abs(Math.sin(L_.ry))<.5; const w=horiz?2:1, d=horiz?1:2;
  Object.assign(CRATE.col,{minX:L_.x-w/2,maxX:L_.x+w/2,minZ:L_.z-d/2,maxZ:L_.z+d/2}); CRATE.g.visible=true; CRATE.col.on=true; addSolid(CRATE.hit); }
function closeCrate(){ CRATE.state='idle'; CRATE.result=null; CRATE.glow.visible=false; CRATE.lid.rotation.x=0; Object.values(CRATE.models).forEach(m=>m.visible=false); CRATE.label.userData.draw(''); }
function updateCrate(dt){
  if(CRATE.state==='rolling'){ CRATE.t-=dt; CRATE.lid.rotation.x=Math.max(-1.6,CRATE.lid.rotation.x-dt*4); CRATE.cycleT-=dt;
    if(CRATE.cycleT<=0){ CRATE.cycleT=.12+(3.6-CRATE.t)*.04; Object.values(CRATE.models).forEach(m=>m.visible=false); const id=pick(BOX_POOL); CRATE.models[id].visible=true; CRATE.label.userData.draw(WD[id].name); }
    const lift=Math.min(1,(3.6-CRATE.t)/1.2); Object.values(CRATE.models).forEach(m=>m.position.y=.9+lift*.7);
    if(CRATE.t<=0){ Object.values(CRATE.models).forEach(m=>m.visible=false);
      if(CRATE.uses>=4&&PU.sale<=0&&Math.random()<.15){ CRATE.result='flee'; CRATE.label.userData.draw('The crate sinks…','#b0482d'); P.points+=CRATE.paid||950; toast('The relic crate sank into the mud. Points refunded.'); sfx.flee(); CRATE.state='ready'; CRATE.t=3.5; }
      else { const owned=P.weapons.map(w=>w.id); const pool=BOX_POOL.filter(id=>owned.indexOf(id)<0); CRATE.result=pickBox(pool.length?pool:BOX_POOL); CRATE.models[CRATE.result].visible=true; CRATE.label.userData.draw(WD[CRATE.result].name); CRATE.state='ready'; CRATE.t=10; } } }
  else if(CRATE.state==='ready'){ CRATE.t-=dt; if(CRATE.result!=='flee'){ const m=CRATE.models[CRATE.result]; m.position.y=1.6-Math.max(0,(3-CRATE.t))*.2; }
    if(CRATE.t<=0){ if(CRATE.result==='flee'){ closeCrate(); CRATE.state='moving'; CRATE.t=2.5; CRATE.g.visible=false; CRATE.col.on=false; removeSolid(CRATE.hit); } else closeCrate(); } }
  else if(CRATE.state==='moving'){ CRATE.t-=dt; if(CRATE.t<=0){ let ni; do{ ni=(Math.random()*3)|0; }while(ni===CRATE.li); placeCrate(ni); CRATE.uses=0; CRATE.state='idle'; } }
  CRATE.beam.material.opacity=.05+Math.sin(GT*2)*.02;
}
