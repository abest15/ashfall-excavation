/* ---------- knife viewmodel: wrist + trench knife, sleeve anchored to a right shoulder, slash trail ---------- */
const KN={root:new THREE.Group(),blade:null,glow:null,trail:null,sleeve:null,cuff:null,T:.42,shoulder:new V3(.62,-.8,.2)};
{ const k=KN.root; k.visible=false; vmCam.add(k); k.scale.setScalar(1.25);
  const skin=L({color:0xb59c80});
  gb(k,.1,.09,.12,skin,0,-.005,.03); gb(k,.035,.05,.09,skin,-.055,.02,.015);
  gc(k,.024,.13,GM.wood,0,.01,-.05,8); for(const z of [-.015,-.05,-.085]) gc(k,.026,.008,GM.metal,0,.01,z,8);
  gb(k,.1,.022,.032,GM.accent,0,.01,-.12); gc(k,.028,.02,GM.accent,0,.01,.02,8);
  const sh=new THREE.Shape(); sh.moveTo(0,-.022); sh.lineTo(.27,-.022); sh.lineTo(.35,.006); sh.lineTo(.25,.026); sh.lineTo(0,.026); sh.closePath();
  const bg=new THREE.ExtrudeGeometry(sh,{depth:.008,bevelEnabled:false}); bg.translate(0,0,-.004);
  KN.steel=L({color:0xd0d4d8,emissive:0x202020}); KN.relicSteel=B({color:0xbff6ff});
  const bl=new THREE.Mesh(bg,KN.steel); bl.rotation.y=Math.PI/2; bl.position.set(0,.01,-.13); k.add(bl); KN.blade=bl;
  const gl=new THREE.Mesh(bg,M.add(0x74d9ea,.5)); gl.rotation.y=Math.PI/2; gl.position.copy(bl.position); gl.scale.set(1.12,1.7,3); gl.visible=false; k.add(gl); KN.glow=gl;
  const sg=new THREE.BoxGeometry(.13,.13,1); sg.translate(0,0,.5);
  KN.sleeve=new THREE.Mesh(sg,L({color:0x4b4f3c})); KN.sleeve.visible=false; vmCam.add(KN.sleeve);
  KN.cuff=new THREE.Mesh(new THREE.BoxGeometry(.14,.14,.06),L({color:0x3a3a2c})); KN.cuff.visible=false; vmCam.add(KN.cuff);
  const tr=new THREE.Mesh(new THREE.RingGeometry(.3,.33,24,1,0,1.1),M.add(0xe7ddcc,0)); tr.position.set(.04,-.38,-.62); tr.visible=false; vmCam.add(tr); KN.trail=tr; }
function updateKnifeLook(){ const r=P.bless.has('knife'); KN.blade.material=r?KN.relicSteel:KN.steel; KN.glow.visible=r; KN.trail.material.color.set(r?0x74d9ea:0xe7ddcc); }
// keyframes [t, wrist position, wrist rotation]: ready low right, wind up high right, slash across to low left, follow through, recover
const KF=[[0,[.36,-.46,-.44],[.3,-.2,-.3]],[.22,[.3,-.14,-.52],[.8,-.35,-.7]],[.5,[-.2,-.3,-.56],[-.25,.95,-1.25]],[.72,[-.12,-.36,-.52],[-.3,.8,-1.05]],[1,[.4,-.58,-.42],[.3,-.1,-.3]]];
const _kv=new V3();
function updateKnife(dt){ const r=KN.root;
  if(VM.melee<=0){ r.visible=KN.sleeve.visible=KN.cuff.visible=KN.trail.visible=false; return; }
  VM.melee-=dt; const k=clamp(1-VM.melee/KN.T,0,1); const on=VM.melee>0; r.visible=KN.sleeve.visible=KN.cuff.visible=on;
  let i=0; while(i<KF.length-2&&k>KF[i+1][0]) i++; const a=KF[i], b=KF[i+1]; let t=clamp((k-a[0])/(b[0]-a[0]),0,1); t=t*t*(3-2*t);
  r.position.set(a[1][0]+(b[1][0]-a[1][0])*t,a[1][1]+(b[1][1]-a[1][1])*t,a[1][2]+(b[1][2]-a[1][2])*t);
  r.rotation.set(a[2][0]+(b[2][0]-a[2][0])*t,a[2][1]+(b[2][1]-a[2][1])*t,a[2][2]+(b[2][2]-a[2][2])*t);
  // sleeve runs from just behind the wrist back to the shoulder
  _kv.set(0,0,.1).applyEuler(r.rotation).multiplyScalar(r.scale.x).add(r.position);
  KN.sleeve.position.copy(_kv); KN.sleeve.lookAt(KN.shoulder); KN.sleeve.scale.z=_kv.distanceTo(KN.shoulder)+.2;
  KN.cuff.position.copy(_kv); KN.cuff.quaternion.copy(KN.sleeve.quaternion);
  const tk=(k-.26)/.3; KN.trail.visible=on&&tk>0&&tk<1; if(KN.trail.visible){ KN.trail.material.opacity=Math.sin(tk*Math.PI)*.38; KN.trail.rotation.z=.1+tk*1.9; }
  if(P.meleePending&&k>=.4){ P.meleePending=false; meleeHit(); } }
