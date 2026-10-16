/* ================= world containers ================= */
const colliders=[], solids=[], inter=[], labels=[];
function addSolid(m){ if(solids.indexOf(m)<0) solids.push(m); }
function removeSolid(m){ const i=solids.indexOf(m); if(i>=0) solids.splice(i,1); }
function addCol(x,z,w,d){ const c={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,on:true}; colliders.push(c); return c; }
function box(w,h,d,mat,x,y,z,o={}){
  const m=new THREE.Mesh(o.round&&QUAL?roundBox(w,h,d):new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z);
  if(o.ry) m.rotation.y=o.ry; if(o.rz) m.rotation.z=o.rz; if(o.rx) m.rotation.x=o.rx;
  (o.parent||scene).add(m);
  if(o.solid) addSolid(m);
  if(o.col){ let W=w,D=d; if(o.ry && Math.abs(Math.sin(o.ry))>0.7){W=d;D=w;} addCol(x,z,W,D); }
  return m;
}
function cyl(rt,rb,h,mat,x,y,z,seg=8,parent){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat); m.position.set(x,y,z); (parent||scene).add(m); return m; }
function addInter(o){ inter.push(o); return o; }

function makeLabel(text,opts={}){
  const c=document.createElement('canvas'); c.width=opts.w||512; c.height=opts.h||128;
  const tex=new THREE.CanvasTexture(c);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,fog:opts.fog!==false});
  const s=new THREE.Sprite(mat); const sx=opts.sx||2; s.scale.set(sx,sx*c.height/c.width,1);
  const st={text,color:opts.color||'#e7ddcc'};
  s.userData.draw=(t,col)=>{ if(t!==undefined) st.text=t; if(col) st.color=col; const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
    g.font=`${opts.size||60}px "Special Elite", "Courier New", monospace`; g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle='rgba(0,0,0,.7)'; g.fillText(st.text,c.width/2+3,c.height/2+3); g.fillStyle=st.color; g.fillText(st.text,c.width/2,c.height/2); tex.needsUpdate=true; };
  s.userData.draw(); labels.push(s); return s;
}
