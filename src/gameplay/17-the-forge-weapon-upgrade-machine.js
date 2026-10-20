/* ---------- the forge (weapon upgrade machine) ---------- */
const FORGE={state:'idle',inst:null,t:0,mouth:null,model:null};
{ const g=new THREE.Group(); g.position.set(-25.5,0,-25.5); g.rotation.y=Math.PI/4; scene.add(g);
  const body=box(3.4,2.6,2.2,M.brick,0,1.3,0,{parent:g}); addSolid(body); box(3.6,.2,2.4,M.stone,0,2.7,0,{parent:g}); box(.9,2.6,.9,M.brick,-.9,4,-.4,{parent:g});
  const mouth=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),B({color:0x3a1a0c})); mouth.position.set(0,1.2,1.11); g.add(mouth); FORGE.mouth=mouth;
  box(1.9,.15,.25,M.stone,0,.7,1.2,{parent:g});
  const anvil=new THREE.Group(); anvil.position.set(1.6,0,2.2); g.add(anvil); box(.5,.6,.4,M.dark,0,.3,0,{parent:anvil}); box(.9,.25,.4,M.dark,0,.72,0,{parent:anvil});
  const lab=makeLabel('THE FORGE',{sx:2.6,size:54,color:'#ff9a4a'}); lab.position.set(0,3.4,1.2); g.add(lab);
  addCol(-25.5,-25.5,3.4,3.4);
  addInter({x:-23.6,z:-23.6,r:2.4,prompt:()=>{ if(!POWER.on) return '!The Forge is cold. Requires power';
      if(FORGE.state==='working') return '!The Forge is working…'; if(FORGE.state==='ready') return `Take ${statsOf(FORGE.inst).name}`;
      const w=curW(); if(!w) return '!Hold a weapon to forge it'; if(w.id==='rod'||w.id==='gauntlet'||WD[w.id].staff) return '!The Forge refuses the relic'; if(w.id==='gatling') return '!The Forge will not take a borrowed gun';
      if(w.up) return `Re-forge ${WD[w.id].up} for ammo [2500]`; return `Forge ${WD[w.id].name} [5000]`; },
    use:()=>{ if(!POWER.on) return;
      if(FORGE.state==='ready'){ const inst=FORGE.inst; FORGE.state='idle'; FORGE.inst=null; if(FORGE.model){scene.remove(FORGE.model);FORGE.model=null;} giveWeapon(inst); return; }
      if(FORGE.state!=='idle') return; const w=curW(); if(!w||w.id==='rod'||w.id==='gatling'||w.id==='gauntlet'||WD[w.id].staff) return;
      if(w.up){ const s=statsOf(w); if(!spend(2500)) return; w.res=s.res; w.mag=s.mag; sfx.forge(); return; }
      if(!spend(5000)) return; P.weapons.splice(P.cur,1); P.cur=0; buildVM();
      FORGE.state='working'; FORGE.t=3.6; FORGE.inst=mkInst(w.id,true); sfx.forge(); }});
}
