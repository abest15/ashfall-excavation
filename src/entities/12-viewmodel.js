/* ---------- viewmodel ---------- */
const VM={gun:null,flash:null,kick:0,flashT:0,melee:0};
const flashMat=M.add(0xffb050,1), flashMatRelic=M.add(0x8ae8ff,1);
function buildVM(){
  if(VM.gun){ vmRoot.remove(VM.gun); VM.gun=null; }
  const w=curW(); if(!w) return;
  const g=buildGun(w.id,w.up||w.id==='gatling'); vmRoot.add(g); VM.gun=g; addHands(g,w.id);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),w.id==='rod'?flashMatRelic:flashMat); f.position.copy(g.userData.muzzle.position); f.visible=false; g.add(f); VM.flash=f;
  if(w.id==='rod'){ g.rotation.set(.05,.08,0); }
}

const HANDM={};
function addHands(g,id){ if(id==='gauntlet') return; if(!HANDM.skin){ HANDM.skin=L({color:0xb59c80}); HANDM.sleeve=L({color:0x4b4f3c}); HANDM.hg=new THREE.SphereGeometry(.036,10,8); HANDM.hg.scale(1.15,1,1.55); const sg=new THREE.CylinderGeometry(.042,.05,.55,10); sg.rotateX(Math.PI/2); sg.translate(0,0,.275); HANDM.sg=sg; }
  const t=WD[id].type, pos={pistol:[[0,-.075,.04],[-.035,-.085,.06]],ion:[[0,-.08,.05],[-.035,-.09,.07]],rod:[[0,-.02,.18],[0,-.02,-.32]],gatling:[[0,-.12,.13],[-.13,-.02,.05]]}[t]||[[0,-.1,.12],[0,-.035,-.3]];
  pos.forEach((p,i)=>{ const h=new THREE.Mesh(HANDM.hg,HANDM.skin); h.position.set(p[0],p[1],p[2]); g.add(h); const sl=new THREE.Mesh(HANDM.sg,HANDM.sleeve); sl.position.set(p[0],p[1]-.01,p[2]+.02); sl.rotation.set(.35,i?-.55:.35,0); g.add(sl); }); }
