/* ---------- gun models (shared by viewmodel, wall chalk, crate) ----------
   Guns point down -Z, origin near the trigger. Every part takes `override` when given (chalk outlines, displays).
   userData hooks: muzzle, crystal, spin, bulb, glow, rings, orb, plume (used by other systems) and, for the viewmodel,
   sight {y,z}, rh/lh hand anchors, mag, bolt, pump, cyl/crane, hammer, cover, barrel, eject, style. */
const GM={
  metal:L({color:0x3d3f42}), wood:L({color:0x6b4426}), accent:L({color:0x8c7040}),
  upMetal:L({color:0x2a2420,emissive:0x5a1e06}), upWood:L({color:0x3a1810,emissive:0x2a0c04}), upAccent:B({color:0xff8a2a}),
  rodWood:L({color:0x2e2218}), rodBand:L({color:0xb08a44}), chalk:B({color:0xd8d2c2,transparent:true,opacity:.8}),
  dark:L({color:0x222326}), steel:L({color:0x74777b}), poly:L({color:0x3a3d33}), brass:L({color:0xb8924a}), shell:L({color:0x8a2a1e}),
  upDark:L({color:0x1a1411,emissive:0x3a1204}), upSteel:L({color:0x5a4438,emissive:0x5a2008}),
  lens:L({color:0x2a4a5a,transparent:true,opacity:.12,depthWrite:false}), bore:B({color:0x0a0806}),
};
const RB=new Map();
function roundBox(w,h,d){ const k=w+'|'+h+'|'+d; let geo=RB.get(k); if(geo) return geo; const b=Math.min(w,h,d)*.12, w2=w-2*b, h2=h-2*b, rr=Math.min(w2,h2)*.18, sh=new THREE.Shape();
  sh.moveTo(-w2/2+rr,-h2/2); sh.lineTo(w2/2-rr,-h2/2); sh.quadraticCurveTo(w2/2,-h2/2,w2/2,-h2/2+rr); sh.lineTo(w2/2,h2/2-rr); sh.quadraticCurveTo(w2/2,h2/2,w2/2-rr,h2/2);
  sh.lineTo(-w2/2+rr,h2/2); sh.quadraticCurveTo(-w2/2,h2/2,-w2/2,h2/2-rr); sh.lineTo(-w2/2,-h2/2+rr); sh.quadraticCurveTo(-w2/2,-h2/2,-w2/2+rr,-h2/2);
  geo=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.0005,d-2*b),bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2,curveSegments:2}); geo.center(); RB.set(k,geo); return geo; }
const GGEO=new Map(); function gGeo(k,fn){ let g=GGEO.get(k); if(!g){ g=fn(); GGEO.set(k,g); } return g; }
function gm(g,geo,m,x,y,z,rx=0,ry=0,rz=0){ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(rx,ry,rz); g.add(o); return o; }
// box (rounded on Medium/High)
function gb(g,w,h,d,m,x,y,z,rx=0,ry=0,rz=0){ return gm(g,QUAL&&Math.min(w,h,d)>.006?roundBox(w,h,d):gGeo('b'+w+'|'+h+'|'+d,()=>new THREE.BoxGeometry(w,h,d)),m,x,y,z,rx,ry,rz); }
// cylinder along Z; r = front radius, r2 = back radius
function gc(g,r,len,m,x,y,z,seg=8,r2){ return gm(g,gGeo('c'+r+'|'+len+'|'+seg+'|'+r2,()=>{ const c=new THREE.CylinderGeometry(r2===undefined?r:r2,r,len,seg); c.rotateX(Math.PI/2); return c; }),m,x,y,z); }
// vertical cylinder
function gv(g,r,h,m,x,y,z,seg=8){ return gm(g,gGeo('v'+r+'|'+h+'|'+seg,()=>new THREE.CylinderGeometry(r,r,h,seg)),m,x,y,z); }
function gs(g,r,m,x,y,z){ return gm(g,gGeo('s'+r,()=>new THREE.SphereGeometry(r,8,6)),m,x,y,z); }
// side profile [[z,y],...] extruded across X (thickness th), for stocks, grips and curved magazines
function gp(g,pts,th,m,x=0,y=0,z=0){ const sh=new THREE.Shape(); sh.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0],pts[i][1]); sh.closePath();
  const b=QUAL?Math.min(.005,th*.25):0, dd=Math.max(.001,th-2*b);
  const geo=new THREE.ExtrudeGeometry(sh,{depth:dd,bevelEnabled:b>0,bevelSize:b,bevelThickness:b,bevelSegments:1,curveSegments:2}); geo.translate(0,0,-dd/2); geo.rotateY(-Math.PI/2);
  return gm(g,geo,m,x,y,z); }
// U-shaped trigger guard under the trigger
function gtg(g,r,t,m,x,y,z,sz=1.25){ const o=gm(g,gGeo('tg'+r+'|'+t,()=>{ const q=new THREE.TorusGeometry(r,t,4,10,Math.PI); q.rotateX(Math.PI); q.rotateY(Math.PI/2); return q; }),m,x,y,z); o.scale.z=sz; return o; }
function gring(g,r,t,m,x,y,z){ return gm(g,gGeo('r'+r+'|'+t,()=>new THREE.TorusGeometry(r,t,4,14)),m,x,y,z); }
function gcircle(g,r,m,x,y,z){ return gm(g,gGeo('ci'+r,()=>new THREE.CircleGeometry(r,14)),m,x,y,z); }
// a single cartridge (case + tip) along Z or vertical
function round_(g,m1,m2,x,y,z,len=.03,r=.005,vert=false){ const c=vert?gv(g,r,len,m1,x,y,z,6):gc(g,r,len,m1,x,y,z,6); const t=vert?gv(g,r*.75,len*.3,m2,x,y+len*.6,z,6):gc(g,r*.7,len*.3,m2,x,y,z-len*.6,6); return [c,t]; }
const bez=(a,b,c,n)=>{ const o=[]; for(let i=0;i<=n;i++){ const t=i/n, u=1-t; o.push([u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1]]); } return o; };

function buildGun(id,up,override){
  const g=new THREE.Group(); const t=WD[id].type, ud=g.userData;
  const me=override||(up?GM.upMetal:GM.metal), wo=override||(up?GM.upWood:GM.wood), ac=override||(up?GM.upAccent:GM.accent);
  const dk=override||(up?GM.upDark:GM.dark), st=override||(up?GM.upSteel:GM.steel), po=override||(up?GM.upDark:GM.poly), br=override||GM.brass, ln=override||GM.lens;
  const glow=c=>override||B({color:c}), bore=override||GM.bore;
  let mz=-0.3, my=.03;
  const grp=(x,y,z,parent=g)=>{ const o=new THREE.Group(); o.position.set(x,y,z); parent.add(o); return o; };
  if(id==='pistol'){
    // slide (cycles on fire, locks back on empty)
    const sl=grp(0,.036,0); ud.bolt=sl; ud.boltTravel=.04;
    gb(sl,.032,.034,.22,me,0,0,-.03); gb(sl,.024,.01,.2,me,0,.018,-.035);
    for(let i=0;i<6;i++) for(const sx of [-1,1]) gb(sl,.003,.024,.004,dk,sx*.0165,-.002,.068-i*.007);
    gb(sl,.004,.013,.042,dk,.0165,.007,-.018); // ejection port
    gb(sl,.006,.011,.008,dk,0,.024,-.128); gb(sl,.003,.003,.002,glow(0xd8ffb0),0,.026,-.1325);
    for(const sx of [-1,1]){ gb(sl,.007,.011,.009,dk,sx*.0075,.024,.068); gb(sl,.0028,.0028,.002,glow(0xd8ffb0),sx*.0075,.025,.0728); }
    gc(sl,.0072,.014,st,0,-.004,-.144,10); gcircle(sl,.0045,bore,0,-.004,-.1515).rotation.y=Math.PI;
    // frame, rail, guard, trigger
    gb(g,.03,.022,.205,me,0,.008,-.034); gb(g,.024,.012,.075,dk,0,-.006,-.09);
    for(let i=0;i<3;i++) gb(g,.026,.003,.006,dk,0,-.013,-.065-i*.018);
    gtg(g,.02,.0035,me,0,-.008,-.02); gb(g,.005,.02,.006,st,0,-.008,-.014,.35);
    gb(g,.003,.006,.034,dk,-.0165,.017,-.03); gb(g,.004,.01,.01,dk,-.0165,.01,-.012); // slide stop, takedown
    // hammer and beavertail grip
    const hm=grp(0,.03,.086); ud.hammer=hm; gb(hm,.009,.018,.009,dk,0,.006,0,-.3);
    gp(g,[[-.004,0],[.064,0],[.088,.01],[.092,-.003],[.072,-.018],[.088,-.118],[.03,-.126],[.01,-.104],[.008,-.034],[-.004,-.022]],.033,dk);
    gp(g,[[.016,-.03],[.066,-.03],[.08,-.108],[.034,-.114],[.022,-.07]],.037,wo);
    for(let i=0;i<3;i++) gb(g,.038,.003,.03,dk,0,-.045-i*.02,.05+i*.004,0);
    // magazine (drops out of the grip)
    const mg=grp(0,-.07,.044); mg.rotation.x=-.2; ud.mag=mg; gb(mg,.022,.105,.034,dk,0,.012,0); gb(mg,.031,.012,.046,dk,0,-.046,.003); round_(mg,br,br,0,.068,-.004,.022,.0045);
    ud.sight={y:.067,z:.07}; ud.rh=[.002,-.062,.05]; ud.lh=[-.026,-.075,.046]; ud.style='pistol'; ud.eject=[.02,.05,-.02]; mz=-.155; my=.032;
  }
  else if(id==='revolver'){
    gb(g,.034,.064,.11,me,0,.012,-.008); gb(g,.022,.012,.12,me,0,.048,-.006); gb(g,.03,.02,.04,me,0,-.008,.05);
    const cr=grp(-.006,-.016,-.008); ud.crane=cr; const cy=grp(.006,.031,0,cr); ud.cyl=cy; ud.chamber=[0,0,.05];
    gc(cy,.03,.072,st,0,0,0,14); for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+Math.PI/6; gb(cy,.009,.004,.05,dk,Math.cos(a)*.029,Math.sin(a)*.029,0,0,0,a+Math.PI/2);
      const a2=i/6*Math.PI*2; gc(cy,.0065,.003,bore,Math.cos(a2)*.017,Math.sin(a2)*.017,-.036,6); gc(cy,.0062,.003,br,Math.cos(a2)*.017,Math.sin(a2)*.017,.036,6); }
    gc(cy,.008,.08,dk,0,0,0,8);
    gc(g,.0125,.2,me,0,.034,-.165,12); gb(g,.011,.009,.2,me,0,.048,-.165); gb(g,.016,.022,.17,me,0,.019,-.15);
    gc(g,.004,.17,st,-.008,.004,-.15,6); gcircle(g,.007,bore,0,.034,-.2655).rotation.y=Math.PI;
    gb(g,.004,.017,.032,dk,0,.058,-.25); gb(g,.0035,.005,.006,glow(0xff7040),0,.064,-.236);
    for(const sx of [-1,1]) gb(g,.006,.009,.008,dk,sx*.0065,.058,.042);
    const hm=grp(0,.04,.052); ud.hammer=hm; gb(hm,.01,.028,.014,dk,0,.012,.006,-.5); gb(hm,.012,.006,.018,dk,0,.026,.018,-.2);
    gtg(g,.019,.0035,me,0,-.018,.016); gb(g,.005,.022,.006,st,0,-.014,.02,.35);
    gp(g,[[.03,-.008],[.074,.004],[.092,-.016],[.098,-.06],[.112,-.11],[.096,-.134],[.048,-.128],[.042,-.084],[.032,-.042]],.036,wo);
    gb(g,.039,.01,.052,me,0,-.13,.074,.12); gb(g,.038,.006,.006,dk,0,-.07,.07);
    // speedloader (shown only while reloading)
    const sp=grp(0,0,0); sp.visible=false; ud.mag=sp; for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; round_(sp,br,br,Math.cos(a)*.017,Math.sin(a)*.017,-.012,.026,.0058); }
    gc(sp,.024,.012,dk,0,0,.006,10); gc(sp,.008,.025,st,0,0,.022,8);
    ud.sight={y:.065,z:.042}; ud.rh=[.002,-.062,.068]; ud.lh=[-.026,-.075,.062]; ud.style='revolver'; mz=-.27; my=.034;
  }
  else if(id==='carbine'){
    // one-piece wooden stock with straight wrist
    gp(g,[[.42,.012],[.25,-.004],[.135,-.02],[.08,-.002],[-.44,-.002],[-.47,-.016],[-.45,-.04],[-.06,-.044],[.02,-.05],[.075,-.078],[.125,-.072],[.42,-.122]],.05,wo);
    gb(g,.053,.138,.012,dk,0,-.055,.426,-.08); gb(g,.03,.016,.31,wo,0,.022,-.27);
    gc(g,.019,.21,me,0,.012,-.02,12); gc(g,.011,.72,dk,0,.014,-.48,10); gc(g,.016,.03,me,0,.014,-.84,10);
    gcircle(g,.007,bore,0,.014,-.8551).rotation.y=Math.PI;
    for(const z of [-.2,-.43]) gb(g,.056,.07,.014,me,0,-.008,z);
    gb(g,.006,.012,.006,dk,0,.03,-.83); for(const sx of [-1,1]) gb(g,.003,.022,.014,dk,sx*.009,.03,-.83);
    gb(g,.024,.008,.05,dk,0,.03,-.17); for(const sx of [-1,1]) gb(g,.006,.012,.008,dk,sx*.006,.036,-.155);
    gb(g,.006,.012,.006,dk,0,.035,-.83);
    // bolt: lifts (rotation z) then slides back
    const bo=grp(0,.012,0); ud.bolt=bo; ud.boltTravel=.075; ud.boltLift=1.2;
    gc(bo,.0125,.13,st,0,0,.04,10); gc(bo,.015,.04,me,0,0,.115,10);
    gb(bo,.05,.009,.009,st,.026,0,.065); gs(bo,.012,st,.052,-.004,.068);
    gtg(g,.022,.004,me,0,-.045,.04); gb(g,.005,.022,.006,st,0,-.045,.044,.35); gb(g,.032,.008,.07,st,0,-.048,-.03);
    // stripper clip (only shown while loading)
    const cl=grp(0,.05,-.03); cl.visible=false; ud.mag=cl; gb(cl,.012,.006,.06,st,0,-.002,0); for(let i=0;i<5;i++) round_(cl,br,br,0,.012,-.024+i*.012,.03,.0055,true);
    ud.sight={y:.042,z:-.155}; ud.rh=[.002,-.05,.1]; ud.lh=[0,-.05,-.3]; ud.style='bolt'; ud.eject=[.03,.03,-.03]; mz=-.86; my=.014;
  }
  else if(id==='marksman'){
    gb(g,.044,.06,.3,me,0,.01,-.05); gb(g,.04,.035,.16,dk,0,-.03,-.02); gb(g,.004,.016,.06,dk,.022,.02,-.04);
    gp(g,[[.1,.03],[.42,.03],[.445,.02],[.445,-.1],[.4,-.112],[.24,-.06],[.16,-.06],[.14,-.03],[.1,-.03]],.046,po);
    gb(g,.032,.022,.15,po,0,.04,.28); gb(g,.05,.145,.022,dk,0,-.035,.455);
    gp(g,[[.04,-.04],[.082,-.04],[.112,-.135],[.072,-.146],[.036,-.064]],.034,po);
    gtg(g,.022,.004,dk,0,-.046,.02);
    gb(g,.052,.052,.3,po,0,.012,-.35); for(let i=0;i<4;i++) for(const sx of [-1,1]) gb(g,.004,.014,.032,dk,sx*.026,.012,-.25-i*.06);
    gc(g,.011,.34,dk,0,.014,-.66,10); gb(g,.03,.03,.055,dk,0,.014,-.84);
    for(const sx of [-1,1]) for(let i=0;i<2;i++) gb(g,.004,.016,.01,bore,sx*.0155,.014,-.83-i*.02);
    const mg=grp(0,-.07,-.09); ud.mag=mg; gb(mg,.03,.11,.06,dk,0,0,0,.05); gb(mg,.036,.01,.068,dk,0,-.058,.003);
    // scope with lens and fine reticle
    for(const z of [.0,-.12]){ gb(g,.03,.03,.014,dk,0,.05,z); gb(g,.012,.01,.02,dk,0,.04,z); }
    const tube=(r,len,z,r2)=>gm(g,gGeo('o'+r+'|'+len+'|'+r2,()=>{ const c=new THREE.CylinderGeometry(r2||r,r,len,14,1,true); c.rotateX(Math.PI/2); return c; }),dk,0,.075,z); tube(.016,.22,-.06); tube(.024,.06,-.19,.016); tube(.021,.05,.07,.016);
    gv(g,.01,.02,dk,0,.098,-.06,10); const tu=gv(g,.009,.02,dk,.022,.075,-.06,10); tu.rotation.z=Math.PI/2;
    gcircle(g,.02,ln,0,.075,.096); const fl=gcircle(g,.022,ln,0,.075,-.221); fl.rotation.y=Math.PI;
    const rt=override||B({color:0x050505}); gb(g,.034,.0025,.001,rt,0,.075,-.15); gb(g,.0025,.034,.001,rt,0,.075,-.15); gb(g,.004,.004,.001,glow(0xff3a20),0,.075,-.1495); gm(g,gGeo('rr',()=>new THREE.RingGeometry(.0158,.019,24)),rt,0,.075,.09);
    const bo=grp(0,0,0); ud.bolt=bo; ud.boltTravel=.05; gb(bo,.022,.012,.012,st,.032,.022,.05);
    ud.sight={y:.075,z:.1,scope:true}; ud.rh=[.002,-.075,.08]; ud.lh=[0,-.03,-.33]; ud.style='mag'; ud.eject=[.024,.03,-.03]; mz=-.87; my=.014;
  }
  else if(id==='smg'){
    gc(g,.024,.34,me,0,.02,-.06,12); gc(g,.024,.02,dk,0,.02,.115,12); gc(g,.022,.2,me,0,.02,-.33,12);
    for(let i=0;i<5;i++) for(const a of [-.8,0,.8]) gb(g,.008,.008,.016,bore,Math.sin(a)*.0215,.02+Math.cos(a)*.0215,-.26-i*.035,-0,0,-a);
    gc(g,.009,.05,dk,0,.02,-.45,8); gb(g,.024,.024,.036,dk,0,.02,-.47); gb(g,.008,.004,.02,bore,0,.032,-.47);
    gb(g,.034,.036,.15,me,0,-.012,.02); gtg(g,.02,.004,me,0,-.034,.04); gb(g,.005,.02,.006,st,0,-.034,.044,.35);
    gp(g,[[.024,-.028],[.068,-.028],[.092,-.135],[.052,-.142],[.032,-.06]],.034,wo);
    gb(g,.03,.044,.048,me,0,-.02,-.12);
    const mg=grp(0,-.1,-.12); ud.mag=mg; gb(mg,.022,.16,.034,dk,0,0,0); gb(mg,.028,.012,.04,dk,0,-.084,0); for(const sx of [-1,1]) gb(mg,.002,.12,.006,me,sx*.0115,0,0);
    // folding wire stock
    for(const sx of [-1,1]) gb(g,.006,.006,.3,st,sx*.017,.004,.26); gb(g,.006,.006,.27,st,0,-.05,.25,-.24); gb(g,.042,.11,.012,dk,0,-.035,.41);
    gring(g,.008,.0025,dk,0,.058,.085); gb(g,.006,.02,.008,dk,0,.042,.085);
    gb(g,.026,.008,.02,dk,0,.044,-.36); gb(g,.003,.016,.003,dk,0,.054,-.36); for(const sx of [-1,1]) gb(g,.003,.018,.012,dk,sx*.01,.054,-.36);
    gb(g,.003,.008,.12,bore,-.025,.022,-.05);
    const bo=grp(0,0,0); ud.bolt=bo; ud.boltTravel=.05; gb(bo,.018,.01,.01,st,-.033,.022,-.01);
    ud.sight={y:.058,z:.085}; ud.rh=[.002,-.07,.06]; ud.lh=[0,-.012,-.3]; ud.style='mag'; ud.eject=[.026,.035,-.06]; mz=-.49; my=.02;
  }
  else if(id==='autorifle'){
    gb(g,.04,.045,.27,me,0,.022,-.03); gb(g,.024,.008,.27,dk,0,.048,-.04); for(let i=0;i<9;i++) gb(g,.027,.004,.006,dk,0,.054,.085-i*.03);
    gb(g,.036,.04,.18,me,0,-.016,0); gb(g,.034,.042,.05,me,0,-.04,-.07); gb(g,.004,.015,.05,dk,.021,.025,-.02);
    gb(g,.048,.05,.3,po,0,.018,-.31); for(let i=0;i<5;i++) for(const sx of [-1,1]) gb(g,.004,.014,.028,dk,sx*.024,.022,-.2-i*.055); gb(g,.02,.006,.28,dk,0,.046,-.31);
    gc(g,.01,.2,dk,0,.022,-.55,8); gb(g,.02,.03,.022,dk,0,.03,-.49); gc(g,.016,.06,dk,0,.022,-.68,8);
    for(const sx of [-1,1]) gb(g,.003,.006,.03,bore,sx*.016,.022,-.68);
    const mg=grp(0,-.05,-.07); ud.mag=mg; const fr=bez([-.026,0],[-.03,-.09],[-.08,-.17],5), rr=bez([.026,0],[.024,-.1],[-.024,-.185],5);
    gp(mg,fr.concat(rr.reverse()),.026,dk); gb(mg,.03,.012,.05,dk,0,-.18,-.05,-.55);
    gp(g,[[.04,-.03],[.086,-.03],[.116,-.14],[.076,-.152],[.05,-.07]],.034,po); gb(g,.01,.006,.075,dk,0,-.045,.012); gb(g,.005,.02,.006,st,0,-.033,.022,.35);
    gc(g,.014,.17,dk,0,.006,.18,10); gp(g,[[.18,.032],[.42,.032],[.435,.02],[.435,-.1],[.4,-.112],[.3,-.04],[.2,-.022]],.042,po); gb(g,.046,.13,.02,dk,0,-.036,.44);
    const bo=grp(0,0,0); ud.bolt=bo; ud.boltTravel=.04; gb(bo,.04,.008,.014,st,0,.04,.118);
    // reflex sight with a red dot
    gb(g,.03,.012,.05,dk,0,.062,-.02); for(const sx of [-1,1]) gb(g,.004,.036,.012,dk,sx*.018,.084,-.035); gb(g,.04,.006,.012,dk,0,.103,-.035);
    gm(g,gGeo('pl.032.034',()=>new THREE.PlaneGeometry(.032,.034)),ln,0,.084,-.035); gcircle(g,.0016,glow(0xff2a18),0,.084,-.034);
    ud.sight={y:.084,z:-.03}; ud.rh=[.002,-.078,.064]; ud.lh=[0,-.014,-.31]; ud.style='mag'; ud.eject=[.024,.03,-.03]; mz=-.71; my=.022;
  }
  else if(id==='shotgun'){
    gb(g,.044,.07,.2,me,0,.012,0); gb(g,.003,.022,.06,dk,.022,.02,-.02); gb(g,.022,.004,.06,bore,0,-.024,-.03);
    gc(g,.014,.66,me,0,.03,-.43,12); gb(g,.008,.003,.63,dk,0,.048,-.44); for(let i=0;i<8;i++) gb(g,.004,.006,.004,dk,0,.044,-.13-i*.08);
    gs(g,.0042,br,0,.0535,-.755); gs(g,.003,br,0,.051,-.4); gcircle(g,.009,bore,0,.03,-.7605).rotation.y=Math.PI;
    gc(g,.012,.5,me,0,-.001,-.35,10); gc(g,.0135,.02,st,0,-.001,-.61,10); gb(g,.012,.03,.014,me,0,.015,-.6);
    const pu=grp(0,0,-.29); ud.pump=pu; ud.pumpTravel=.08; gc(pu,.022,.2,wo,0,-.003,0,12); for(let i=0;i<6;i++) gc(pu,.0232,.007,dk,0,-.003,-.08+i*.032,12);
    gp(g,[[.1,.034],[.25,.018],[.43,.03],[.445,.016],[.445,-.116],[.4,-.122],[.18,-.066],[.12,-.06],[.09,-.03]],.046,wo); gb(g,.05,.152,.02,dk,0,-.045,.452);
    gtg(g,.02,.004,me,0,-.028,.03); gb(g,.005,.02,.006,st,0,-.026,.034,.35);
    gb(g,.006,.04,.1,dk,-.025,.012,0); for(let i=0;i<4;i++){ gv(g,.0085,.04,override||GM.shell,-.032,.016,.033-i*.022,8); gv(g,.009,.01,br,-.032,-.008,.033-i*.022,8); }
    const sh=grp(0,0,0); sh.visible=false; ud.mag=sh; gc(sh,.0085,.05,override||GM.shell,0,0,0,8); gc(sh,.009,.012,br,0,0,.026,8);
    ud.sight={y:.057,z:.09}; ud.rh=[.002,-.05,.12]; ud.lh=[0,-.026,-.29]; ud.style='shell'; ud.eject=[.026,.02,-.02]; mz=-.77; my=.03;
  }
  else if(id==='lmg'){
    gb(g,.06,.08,.36,me,0,.015,-.04); gb(g,.004,.03,.08,dk,.031,.015,-.06);
    const cv=grp(0,.058,-.2); ud.cover=cv; gb(cv,.058,.02,.27,dk,0,0,.135); for(const sx of [-1,1]) gb(cv,.006,.012,.012,dk,sx*.008,.02,.25);
    gb(g,.012,.012,.15,st,0,.1,-.27); gb(g,.012,.044,.012,st,0,.08,-.2); gb(g,.012,.044,.012,st,0,.08,-.34);
    gc(g,.03,.38,me,0,.02,-.42,12); for(let i=0;i<6;i++) for(const a of [-1.1,0,1.1]) gb(g,.01,.008,.03,bore,Math.sin(a)*.0295,.02+Math.cos(a)*.0295,-.27-i*.055,0,0,-a);
    gc(g,.013,.2,dk,0,.02,-.7,10); gc(g,.02,.06,dk,0,.02,-.83,6); gcircle(g,.01,bore,0,.02,-.8605).rotation.y=Math.PI;
    for(const sx of [-1,1]) gb(g,.008,.008,.3,st,sx*.02,-.022,-.46); gb(g,.05,.02,.03,dk,0,-.01,-.6);
    gp(g,[[.04,-.025],[.09,-.025],[.122,-.14],[.082,-.152],[.05,-.07]],.036,wo); gtg(g,.022,.004,me,0,-.03,.05);
    gp(g,[[.14,.042],[.44,.032],[.455,-.11],[.42,-.122],[.3,-.06],[.2,-.05],[.14,-.02]],.045,po); gb(g,.05,.15,.02,dk,0,-.04,.458);
    gb(g,.02,.03,.08,dk,-.038,.02,-.04);
    const mg=grp(-.07,-.02,-.05); ud.mag=mg; gb(mg,.07,.13,.15,ac,0,-.04,0); gb(mg,.074,.014,.154,dk,0,.024,0); gb(mg,.012,.05,.02,dk,-.038,-.04,0);
    for(let i=0;i<4;i++) round_(mg,br,br,.03+i*.008,.04,0,.045,.006);
    gb(g,.022,.012,.022,dk,0,.062,.11); gb(g,.006,.04,.008,dk,0,.084,.11); gring(g,.0095,.0028,dk,0,.118,.11); gb(g,.016,.01,.022,dk,0,.052,-.6); gb(g,.004,.064,.005,dk,0,.086,-.6); for(const sx of [-1,1]) gb(g,.003,.05,.012,dk,sx*.0095,.092,-.6);
    const bo=grp(0,0,0); ud.bolt=bo; ud.boltTravel=.06; gb(bo,.026,.012,.016,st,.042,.02,-.12);
    ud.sight={y:.118,z:.11}; ud.rh=[.002,-.078,.08]; ud.lh=[0,-.024,-.36]; ud.style='box'; ud.eject=[0,-.03,-.05]; mz=-.87; my=.02;
  }
  else if(t==='rod'){ const wood=override||GM.rodWood, band=override||GM.rodBand, glowC=up?0xc8f6ff:0x74d9ea;
    gc(g,.022,1.1,wood,0,0,-.12,7); gc(g,.03,.1,band,0,0,.42,8); const pom=new THREE.Mesh(new THREE.SphereGeometry(.04,8,6),band); pom.position.z=.48; g.add(pom);
    const pts=[]; for(let i=0;i<=60;i++){ const k=i/60, a=k*Math.PI*14; pts.push(new V3(Math.cos(a)*.027,Math.sin(a)*.027,.3-k*.75)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.005,4,false),band));
    for(const z of [-.42,-.05,.22]) gc(g,.034,.035,band,0,0,z,8);
    gc(g,.045,.06,band,0,0,-.66,8); const head=new THREE.Group(); head.position.z=-.78; g.add(head);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+Math.PI/4, c=new THREE.Mesh(new THREE.BoxGeometry(.014,.014,.16),band); c.position.set(Math.cos(a)*.06,Math.sin(a)*.06,-.02); c.rotation.set(-Math.sin(a)*.5,Math.cos(a)*.5,0); head.add(c); }
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(up?.075:.06),override||B({color:glowC})); cr.scale.set(1,1,1.8); cr.position.z=-.06; head.add(cr); ud.crystal=cr;
    if(!override){ const core=new THREE.Mesh(new THREE.OctahedronGeometry(up?.035:.028),B({color:0xffffff})); cr.add(core);
      const glw=new THREE.Mesh(new THREE.SphereGeometry(up?.085:.065,10,8),M.add(glowC,up?.35:.25)); glw.position.z=-.06; head.add(glw); ud.glow=glw;
      const rings=[]; for(let i=0;i<2;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(up?.12:.1,.006,4,24),M.add(glowC,.8)); r.position.z=-.06; r.rotation.set(i?1.2:.3,i?.4:1.1,0); head.add(r); rings.push(r); } ud.rings=rings;
      const wisps=new THREE.Group(); wisps.position.z=-.06; head.add(wisps); for(let i=0;i<3;i++){ const w=new THREE.Mesh(new THREE.TetrahedronGeometry(.012),M.add(glowC,1)), a=i/3*Math.PI*2; w.position.set(Math.cos(a)*.16,Math.sin(a)*.16,0); wisps.add(w); } ud.orb=wisps;
      if(up){ const plume=new THREE.Mesh(new THREE.ConeGeometry(.05,.22,8,1,true),M.add(0xe8fbff,.4)); plume.rotation.x=-Math.PI/2; plume.position.z=-.2; head.add(plume); ud.plume=plume; } }
    ud.style='rod'; mz=-.86; my=0; }
  else if(t==='ion'){ const cop=override||(up?L({color:0x7a2a20,emissive:0x3a0804}):L({color:0x9a6a3a})), glowC=up?0xff5a4a:0x6aff7a;
    gp(g,[[.02,-.02],[.062,-.02],[.09,-.128],[.05,-.138],[.026,-.06]],.034,wo); gtg(g,.019,.0035,dk,0,-.022,.02); gb(g,.005,.02,.006,st,0,-.02,.024,.35);
    gc(g,.032,.16,cop,0,.02,-.04,14); gc(g,.036,.03,dk,0,.02,.05,14); gc(g,.03,.1,dk,0,.02,-.17,12,.026);
    for(let i=0;i<4;i++){ const r=.043-i*.005; gc(g,r,.008,cop,0,.012,.0-i*.042,16); }
    const dish=new THREE.Mesh(new THREE.ConeGeometry(.042,.05,14,1,true),dk); dish.rotation.x=Math.PI/2; dish.position.set(0,.02,-.25); g.add(dish);
    gs(g,.012,glow(glowC),0,.02,-.235); gb(g,.012,.04,.05,dk,0,.068,.0);
    ud.crystal=gc(g,.011,.15,glow(glowC),0,.064,-.07,8); gc(g,.016,.008,cop,0,.064,.005,10); gc(g,.016,.008,cop,0,.064,-.145,10);
    gring(g,.012,.0022,glow(glowC),0,.128,-.13); gb(g,.004,.05,.006,dk,0,.1,-.13); gb(g,.012,.034,.012,dk,0,.1,.03); for(const sx of [-1,1]) gb(g,.004,.012,.008,dk,sx*.006,.123,.03);
    const cell=grp(0,-.004,.085); ud.mag=cell; gc(cell,.02,.06,dk,0,0,0,10); gc(cell,.021,.012,glow(glowC),0,0,-.012,10); gc(cell,.014,.008,st,0,0,.034,8);
    ud.sight={y:.128,z:.03}; ud.rh=[.002,-.064,.044]; ud.lh=[-.026,-.075,.044]; ud.style='cell'; mz=-.27; my=.02; }
  else if(t==='dynamo'){ const wo2=override||(up?GM.upWood:GM.wood), cop=override||L({color:0xb07a40}), glowC=up?0xff8a6a:0xcfe8ff;
    gp(g,[[.1,.03],[.4,.016],[.42,.0],[.42,-.11],[.38,-.12],[.2,-.06],[.1,-.04]],.05,wo2); gb(g,.054,.14,.016,dk,0,-.05,.425);
    gb(g,.07,.09,.3,dk,0,.02,-.08); gb(g,.074,.02,.24,dk,0,.07,-.08); for(const sx of [-1,1]) gb(g,.006,.022,.24,cop,sx*.036,.07,-.08);
    gp(g,[[.03,-.025],[.075,-.025],[.105,-.14],[.065,-.15],[.04,-.07]],.036,wo2); gtg(g,.021,.004,dk,0,-.03,.03);
    for(const sx of [-1,1]) gc(g,.012,.42,cop,sx*.035,.03,-.38,6); for(let i=0;i<4;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.045,.008,5,14),cop); r.position.set(0,.03,-.26-i*.07); g.add(r); }
    gc(g,.016,.08,dk,0,.03,-.6,8);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.036,12,10),override||M.add(glowC,.75)); bulb.position.set(0,.085,-.3); g.add(bulb); if(!override) ud.bulb=bulb; bulb.add(new THREE.Mesh(new THREE.OctahedronGeometry(.012),override||B({color:0xffffff})));
    gc(g,.018,.03,dk,0,.055,-.3,8);
    gb(g,.006,.07,.006,dk,0,.12,.02); gring(g,.009,.0025,dk,0,.16,.02); gb(g,.006,.09,.006,dk,0,.12,-.5); gb(g,.003,.012,.003,dk,0,.164,-.5);
    const cell=grp(.05,.0,-.08); ud.mag=cell; gb(cell,.03,.07,.12,cop,0,0,0); for(let i=0;i<3;i++) gb(cell,.034,.006,.1,dk,0,-.022+i*.022,0);
    const crk=grp(-.04,.02,-.02); gb(crk,.008,.04,.008,st,-.004,-.02,0); gs(crk,.008,dk,-.004,-.042,0);
    ud.sight={y:.17,z:.02}; ud.rh=[.002,-.075,.07]; ud.lh=[0,-.02,-.36]; ud.style='cell'; mz=-.64; my=.03; }
  else if(t==='gauntlet'){ const cu=override||L({color:0x8a5a30,emissive:0x2a1000}); gb(g,.11,.1,.3,me,0,-.02,.12); gb(g,.13,.12,.13,cu,0,-.01,-.06); for(const sx of [-1,1]) gc(g,.02,.18,ac,sx*.065,.055,.02,6);
    for(let i=0;i<4;i++) gb(g,.026,.03,.06,cu,-.045+i*.03,-.03,-.15,.3);
    for(let i=0;i<3;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.068,.012,5,14),override||B({color:0xffc060})); r.position.set(0,-.01,.03+i*.07); g.add(r); }
    for(const sx of [-1,1]) for(let i=0;i<3;i++) gb(g,.006,.03,.03,dk,sx*.058,.0,.18+i*.04);
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.045),override||B({color:0xfff0b0})); core.position.set(0,.07,-.06); g.add(core); ud.crystal=core; ud.style='gauntlet'; mz=-.14; }
  else if(t==='cannon'){
    const ba=grp(0,-.03,-.06); ud.barrel=ba; gc(ba,.06,.5,me,0,.07,-.19,14); gc(ba,.068,.04,ac,0,.07,-.39,14); gc(ba,.068,.03,ac,0,.07,-.02,14);
    gc(ba,.072,.05,dk,0,.07,-.45,14,.062); gcircle(ba,.044,bore,0,.07,-.4755).rotation.y=Math.PI; for(let i=0;i<4;i++) gc(ba,.066,.012,dk,0,.07,-.12-i*.05,14);
    gb(ba,.014,.012,.022,dk,-.064,.1,-.42); gb(ba,.005,.06,.006,dk,-.066,.13,-.42); gb(ba,.004,.004,.004,glow(0xffd070),-.066,.162,-.42); gb(ba,.03,.03,.04,dk,0,.012,-.02);
    const sh=grp(0,.04,-.015); ud.mag=sh; ud.chamber=[0,.07,.045]; gc(sh,.05,.03,br,0,0,0,12); gc(sh,.052,.006,br,0,0,.016,12);
    gb(g,.1,.11,.12,me,0,.035,.02); gb(g,.104,.03,.06,dk,0,.075,.04);
    gb(g,.02,.03,.024,dk,-.06,.1,.06); for(const sx of [-1,1]) gb(g,.005,.05,.008,dk,-.066+sx*.009,.125,.06); gb(g,.024,.006,.008,dk,-.066,.11,.06);
    gp(g,[[.03,-.02],[.08,-.02],[.11,-.15],[.07,-.16],[.04,-.08]],.04,wo); gtg(g,.022,.004,dk,0,-.03,.03); gb(g,.006,.022,.006,st,0,-.03,.034,.35);
    gp(g,[[.075,.05],[.36,.025],[.375,-.1],[.335,-.112],[.2,-.06],[.08,-.03]],.052,wo); gb(g,.056,.13,.016,dk,0,-.04,.375);
    gb(g,.014,.012,.05,ac,0,.096,.09);
    ud.sight={x:-.066,y:.132,z:.06}; ud.rh=[.002,-.08,.06]; ud.lh=[0,-.03,-.3]; ud.style='break'; mz=-.5; my=.04; }
  else if(t==='gatling'){ const sp=new THREE.Group(); sp.position.set(0,.03,-.32); g.add(sp); for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; gc(sp,.016,.62,me,Math.cos(a)*.045,Math.sin(a)*.045,0,6); }
    gc(sp,.062,.05,ac,0,0,-.28,10); gc(sp,.062,.05,ac,0,0,.1,10); gc(sp,.066,.03,dk,0,0,-.1,10); gc(sp,.02,.66,dk,0,0,-.02,8);
    gb(g,.13,.14,.3,me,0,.02,.06); gb(g,.135,.03,.28,dk,0,.08,.06); gb(g,.05,.16,.07,wo,0,-.12,.12,.2); gb(g,.16,.12,.18,ac,-.12,0,.08); gb(g,.012,.07,.012,st,0,.13,-.02); gb(g,.012,.012,.18,st,0,.165,.05);
    for(let i=0;i<5;i++) round_(g,br,br,-.05+i*.012,.07,.0,.05,.007);
    ud.spin=sp; ud.style='none'; mz=-.66; }
  const muzzle=new THREE.Object3D(); muzzle.position.set(0,my,mz); g.add(muzzle); ud.muzzle=muzzle;
  if(override) mergeOneMaterial(g,override);
  return g;
}
// single-material builds (chalk outlines, displays) collapse into one mesh: one draw call instead of ~80
function mergeOneMaterial(g,mat){ g.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(g.matrixWorld).invert(), pos=[], nor=[], m4=new THREE.Matrix4(), nm=new THREE.Matrix3(), v=new V3(), drop=[];
  g.traverse(o=>{ if(!o.isMesh||!o.visible) return; let p_=o.parent, vis=true; while(p_&&p_!==g){ if(!p_.visible) vis=false; p_=p_.parent; } if(!vis) return;
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry, P_=geo.attributes.position, N_=geo.attributes.normal; m4.multiplyMatrices(inv,o.matrixWorld); nm.getNormalMatrix(m4);
    for(let i=0;i<P_.count;i++){ v.fromBufferAttribute(P_,i).applyMatrix4(m4); pos.push(v.x,v.y,v.z); if(N_){ v.fromBufferAttribute(N_,i).applyMatrix3(nm).normalize(); nor.push(v.x,v.y,v.z); } else nor.push(0,1,0); }
    if(geo!==o.geometry) geo.dispose(); drop.push(o); });
  for(const o of drop) o.parent.remove(o);
  const mg=new THREE.BufferGeometry(); mg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); mg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); g.add(new THREE.Mesh(mg,mat)); }
