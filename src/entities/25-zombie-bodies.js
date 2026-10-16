/* ---------- zombie bodies: procedural rotting soldiers and hounds, built from merged vertex-painted parts ---------- */
// Every body segment is ONE mesh (merged primitives, vertex colours, cloth sway in the vertex shader), so a full soldier
// costs about a dozen draw calls. Geometries are cached per variant so spawning is cheap after the first few of a kind.
const zGrime=makeTex(QUAL===2?256:128,(g,s)=>{ g.fillStyle='#dcdcdc'; g.fillRect(0,0,s,s);
  for(let y=0;y<s;y+=2){ g.fillStyle=`rgba(0,0,0,${rand(.02,.08)})`; g.fillRect(0,y,s,1); }
  for(let x=0;x<s;x+=3){ g.fillStyle=`rgba(0,0,0,${rand(.01,.05)})`; g.fillRect(x,0,1,s); }
  speckle(g,s,s*6,['#9a9a9a','#f2f2f2','#a8a29a','#7a7068'],1,3);
  for(let i=0;i<10;i++){ g.fillStyle=`rgba(60,40,22,${rand(.15,.35)})`; g.beginPath(); g.ellipse(rand(0,s),rand(0,s),rand(5,s*.16),rand(4,s*.1),rand(0,3),0,7); g.fill(); }
  for(let i=0;i<6;i++){ g.fillStyle=`rgba(96,10,6,${rand(.25,.5)})`; const x=rand(0,s), y=rand(0,s); g.beginPath(); g.ellipse(x,y,rand(3,10),rand(4,12),rand(0,3),0,7); g.fill(); for(let k=0;k<3;k++) g.fillRect(x+rand(-4,4),y,rand(1,2),rand(6,18)); }
  g.strokeStyle='rgba(30,22,16,.35)'; for(let i=0;i<14;i++){ g.lineWidth=rand(.5,1.5); g.beginPath(); let x=rand(0,s),y=rand(0,s); g.moveTo(x,y); for(let k=0;k<3;k++){ x+=rand(-10,10); y+=rand(-10,10); g.lineTo(x,y);} g.stroke(); } });
const ZC={ coats:[0x56583f,0x5e5442,0x4f524b,0x4f5865,0x4a3f32,0x5c5b4a,0x45493a], skins:[0x8f947d,0x9e9484,0x7f786c,0x8c7e6e,0x88917f,0x968a7a],
  trousers:[0x3b362c,0x363b34,0x423b31,0x3a3e44], leather:0x2f2519, brass:0x7d6638, steel:0x505650, bone:0xcbbf9c, gore:0x4d0f0b, wound:0x260706,
  linen:0x787058, bandage:0xb9ae94, puttee:0x4f4f3b, boot:0x241d16, dark:0x15120f, hood:[0x6a6650,0x5b5a48,0x726752], rubber:0x1c1b19 };
const ZMAT={ walker:swayMat(L({map:zGrime,vertexColors:true})), hollow:swayMat(L({map:zGrime,vertexColors:true,color:0x9aa8d0,emissive:0x0a1c2c})),
  marked:swayMat(L({map:zGrime,vertexColors:true,color:0xa8c6c6,emissive:0x0a3640})), burster:swayMat(L({map:zGrime,vertexColors:true,color:0xd8a284,emissive:0x260a00})),
  hound:L({map:zGrime,vertexColors:true,emissive:0x140500}), houndH:L({map:zGrime,vertexColors:true,color:0x8a96c0,emissive:0x081830}) };
ZM.eyeZ=B({color:0xb8701e}); ZM.gore=L({color:0x4a0906}); ZM.lens=B({color:0x5a1a08});
const ZPRIM=new Map();
const PR=(k,f)=>{ let g=ZPRIM.get(k); if(!g){ g=f(); ZPRIM.set(k,g); } return g; };
const SPH=(w,h)=>PR('s'+w+'_'+h,()=>new THREE.SphereGeometry(1,w,h));
const HEMI=(w,h)=>PR('h'+w+'_'+h,()=>new THREE.SphereGeometry(1,w,h,0,Math.PI*2,0,Math.PI/2));
const CYL=(a,b,h,n,open)=>new THREE.CylinderGeometry(a,b,h,n,1,!!open);
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const TOR=(r,t,a,b,arc)=>new THREE.TorusGeometry(r,t,a,b,arc);
const hangSway=(top,len,k=1)=>(x,y)=>clamp((top-y)/len,0,1)*k;
// torso profile (radius by height above the waist pivot)
const ZPROF=[[.001,-.15],[.16,-.14],[.185,-.08],[.19,0],[.186,.1],[.205,.24],[.228,.38],[.222,.47],[.18,.55],[.1,.6],[.001,.625]];
const zR=y=>{ for(let i=1;i<ZPROF.length;i++){ const a=ZPROF[i-1], b=ZPROF[i]; if(y<=b[1]) return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]); } return 0; };
function bloodSpots(n,seed,area){ const pts=[]; for(let i=0;i<n;i++){ const h=hash3(seed+i*7.3,i*1.7,seed*.37); pts.push([area[0]+(hash3(i,seed,1)-.5)*area[1],area[2]+hash3(seed,i,2)*area[3],(hash3(i,2,seed)<.6?1:-1)*.14,.05+h*.06]); } return pts; }
const GOREC=new THREE.Color(ZC.gore);
function paintBlood(spots){ return (c,x,y,z)=>{ for(const s of spots){ const d=Math.hypot(x-s[0],y-s[1],(z-s[2])*.6); if(d<s[3]) c.lerp(GOREC,(1-d/s[3])*.85); } }; }

function zVariant(kind){ const v={ coat:pick(ZC.coats), skin:pick(ZC.skins), trou:pick(ZC.trousers), style:pick(['coat','coat','tunic','tunic','torn']),
    head:pick(['helmet','helmet','cap','bandage','hood','bare']), bareL:Math.random()<.3, bareR:Math.random()<.16, pack:Math.random()<.5, seed:(Math.random()*4)|0, jaw:rand(.2,.6) };
  if(kind==='burster') v.style='bloat';
  if(kind==='hollow'){ v.head=pick(['bare','hood']); v.style=pick(['torn','coat']); }
  if(kind==='marked') v.head=pick(['bare','bandage','cap']);
  return v; }
const ZGEO=new Map();
function zGeo(type,v,a,b){ const key=type+'|'+(type==='torso'?[v.style,v.coat,v.skin,v.trou,v.pack,v.seed]:type==='head'?[v.head,v.skin,v.coat,v.seed]:type==='eyes'?[v.head]:type==='uarm'||type==='farm'?[v.style,v.coat,v.skin,a,b,v.seed&1]:type==='thigh'||type==='shin'?[v.trou,v.seed&1]:type==='pust'?[v.seed]:[]).join(',');
  let g=ZGEO.get(key); if(g) return g;
  g=type==='torso'?zTorso(v):type==='head'?zHead(v):type==='eyes'?zEyes(v):type==='uarm'?zUpperArm(v,a,b):type==='farm'?zForeArm(v,a,b):type==='thigh'?zThigh(v):type==='shin'?zShin(v):zPust(v);
  ZGEO.set(key,g); return g; }

function zTorso(v){ const b=GB(), S=SEG, torn=v.style==='torn', c=torn?ZC.linen:v.coat, sd=v.seed*13+v.coat%97;
  const blood=paintBlood(bloodSpots(torn?1:2+(v.seed&1),sd,[0,.3,-.05,.5]));
  // pelvis + trousers seat
  b.add(SPH(S(12),S(8)),v.trou,{p:[0,-.14,0],s:[.19,.13,.135],grime:.25});
  // sculpted torso shell
  const lathe=new THREE.LatheGeometry(ZPROF.map(a=>new THREE.Vector2(a[0],a[1])),S(16,8));
  const cav=torn?(c2,x,y,z)=>{ if(z>.06&&Math.abs(x)<.11&&y>.12&&y<.46) c2.lerp(new THREE.Color(ZC.wound),.9); }:null;
  b.add(lathe,c,{s:[1,1,.64],jit:QUAL?.014:0,grime:.3,paint:(c2,x,y,z)=>{ blood(c2,x,y,z); if(cav) cav(c2,x,y,z); if(y<.02) c2.multiplyScalar(.85); }});
  // shoulders, neck
  for(const sx of [-1,1]) b.add(SPH(S(10),S(7)),c,{p:[sx*.212,.5,0],s:[.1,.088,.096],grime:.2});
  b.add(CYL(.05,.062,.16,S(9)),v.skin,{p:[0,.63,0],grime:.25,paint:(c2,x,y,z)=>{ if(z>.03&&y<.62) c2.multiplyScalar(.7); }});
  // belt + buckle
  b.add(CYL(.197,.197,.05,S(16,8)),ZC.leather,{p:[0,-.04,0],s:[1,1,.66]});
  b.add(BOX(.05,.04,.015),ZC.brass,{p:[0,-.04,.132]});
  if(v.style==='coat'||v.style==='bloat'){
    b.add(TOR(.072,.03,S(5,3),S(12,6)),c,{p:[0,.585,0],r:[Math.PI/2,0,0],s:[1.05,1,1],grime:.3});           // collar
    if(QUAL) for(const sx of [-1,1]) for(let i=0;i<4;i++) b.add(SPH(5,4),ZC.brass,{p:[sx*.06,.08+i*.12,zR(.08+i*.12)*.64+.004],s:.013});
    for(const sx of [-1,1]) b.add(BOX(.07,.02,.13),c,{p:[sx*.215,.585,0],r:[0,0,sx*-.25]});                // shoulder straps
    const n=QUAL?10:6;                                                                                      // hanging coat skirt, torn into strips
    for(let i=0;i<n;i++){ const a=(i/n)*Math.PI*2+.31, len=.24+hash3(i,sd,3)*.24, w=.1+hash3(sd,i,4)*.05, cx=Math.sin(a)*.2, cz=Math.cos(a)*.2*.68;
      if(Math.abs(Math.sin(a))<.2&&Math.cos(a)>0) continue;                                                   // open at the front
      b.add(BOX(w,len,.016),c,{p:[cx,-.05-len/2,cz],r:[Math.cos(a)*.14,a,-Math.sin(a)*.12],sway:hangSway(len/2,len,1.2),grime:.35,paint:(c2,x,y)=>{ if(y<-.05-len*.7) c2.multiplyScalar(.72); }}); } }
  if(v.style==='tunic'){
    for(const sx of [-1,1]){ b.add(BOX(.085,.08,.02),c,{p:[sx*.085,.32,zR(.32)*.64+.004],r:[-.12,0,0],grime:.2}); b.add(BOX(.092,.03,.026),c,{p:[sx*.085,.365,zR(.36)*.64+.008],r:[-.12,0,0]}); }
    for(const sx of [-1,1]){ b.add(BOX(.036,.56,.012),ZC.leather,{p:[sx*.1,.24,zR(.26)*.64+.012],r:[-.06,0,sx*-.12]}); b.add(BOX(.036,.56,.012),ZC.leather,{p:[sx*.06,.24,-zR(.26)*.64-.012],r:[.08,0,sx*.35]}); }
    for(const sx of [-1,1]) for(const k of [.06,.15]){ b.add(BOX(.07,.075,.05),ZC.leather,{p:[sx*k,-.01,.142],grime:.2}); b.add(BOX(.074,.025,.054),0x3a2e20,{p:[sx*k,.03,.144]}); }
    b.add(CYL(.05,.05,.12,S(10)),0x3f4436,{p:[.2,-.1,-.04],s:[1,1,.62],r:[0,.3,0]});                     // canteen
    if(v.pack){ b.add(BOX(.24,.24,.09),0x524a38,{p:[0,.33,-.165],grime:.3}); b.add(CYL(.045,.045,.28,S(8)),0x4a4232,{p:[0,.48,-.165],r:[0,0,Math.PI/2]}); }
    for(let i=0;i<3;i++){ const a=Math.PI*.75+i*.5, len=.18+hash3(i,sd,9)*.16; b.add(BOX(.07,len,.012),c,{p:[Math.sin(a)*.2,-.06-len/2,Math.cos(a)*.13],r:[0,a,0],sway:hangSway(len/2,len,1.2),grime:.4}); } }
  if(torn){
    b.add(SPH(S(10),S(8)),ZC.wound,{p:[0,.29,.1],s:[.1,.15,.05]});
    for(let i=0;i<4;i++){ const y=.2+i*.072, r=zR(y)+.006; for(const side of [1,-1]) b.add(arcGeo(r,.011,.95-i*.08,side>0?.2:-.2-(.95-i*.08),3,S(8,4)),ZC.bone,{p:[0,y,0],s:[1,1,.64],grime:.15}); }
    b.add(BOX(.03,.26,.02),ZC.bone,{p:[0,.31,zR(.31)*.64]});
    for(const sx of [-1,1]) b.add(BOX(.032,.6,.012),ZC.leather,{p:[sx*.095,.27,zR(.27)*.64+.01],r:[-.05,0,sx*.05]});   // braces
    for(let i=0;i<4;i++){ const sx=i<2?-1:1, len=.12+hash3(i,sd,5)*.14; b.add(BOX(.06,len,.01),c,{p:[sx*(.12+(i%2)*.05),.14-len/2,zR(.12)*.64+.004],r:[0,sx*.3,0],sway:hangSway(len/2,len,1),grime:.4}); }
    b.add(TOR(.04,.016,4,S(8,5),Math.PI*1.4),ZC.gore,{p:[.03,.04,.13],r:[0,.3,1.2],sway:(x,y)=>clamp(-y*8,0,1)*.6}); }
  if(v.style==='bloat'){ b.add(SPH(S(14),S(10)),c,{p:[0,.2,.05],s:[.27,.31,.25],jit:.02,grime:.3,paint:(c2,x,y,z)=>{ if(z>.18&&y<.15) c2.lerp(new THREE.Color(0x6a3a2a),.6); }});
    for(const sx of [-1,1]) b.add(BOX(.035,.5,.012),ZC.leather,{p:[sx*.1,.22,.29],r:[-.2,0,sx*-.1]}); }
  return b.done(); }

function zHead(v){ const b=GB(), S=SEG, sk=v.skin, sd=v.seed*7+v.skin%53, hood=v.head==='hood';
  const skull=(c,x,y,z)=>{ const ex=Math.abs(Math.abs(x)-.047), ey=y-.02; if(z>.07&&ex<.032&&Math.abs(ey)<.028) c.multiplyScalar(.18+ex*6);
    if(z>.08&&y<-.04&&y>-.09&&Math.abs(x)<.045) c.lerp(GOREC,.7); if(y<-.02&&Math.abs(x)>.08) c.multiplyScalar(.82); if(y>.08&&hash3(x*9,y*9,z*9)>.7) c.multiplyScalar(.75); };
  if(!hood){
    b.add(SPH(S(14),S(10)),sk,{s:[.128,.15,.14],jit:QUAL?.008:0,grime:.2,paint:skull,pre:g=>{ const p=g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i),y=p.getY(i); if(Math.abs(x)>.45&&y<.1&&y>-.7) p.setX(i,x*.86); } g.computeVertexNormals(); }});
    b.add(SPH(S(10),S(6)),sk,{p:[0,.048,.098],s:[.108,.032,.05],grime:.3});                                   // brow ridge
    if(v.seed!==3) b.add(new THREE.ConeGeometry(.02,.05,4),sk,{p:[0,-.005,.138],r:[Math.PI/2+.25,0,0]}); else b.add(SPH(6,4),ZC.wound,{p:[0,-.005,.13],s:[.022,.025,.012]});
    for(const sx of [-1,1]) if(!(v.seed===1&&sx>0)) b.add(SPH(6,5),sk,{p:[sx*.126,0,-.005],s:[.018,.038,.028]});
    b.add(SPH(S(10),S(6)),sk,{p:[0,-.088,.03],s:[.088,.05,.085]});                                             // under-jaw
    b.add(BOX(.096,.032,.09),sk,{p:[0,-.118,.06],r:[v.jaw,0,0],grime:.3,paint:(c,x,y,z)=>{ if(y>-.115) c.lerp(GOREC,.6); }});   // hanging jaw
    if(QUAL){ b.add(BOX(.07,.016,.012),0xb3a684,{p:[0,-.07,.124]}); b.add(BOX(.064,.014,.012),0xa89a76,{p:[0,-.105-Math.sin(v.jaw)*.03,.1+Math.cos(v.jaw)*.01],r:[v.jaw,0,0]}); } }
  if(v.head==='helmet'){ const tx=(hash3(sd,1,1)-.5)*.3, tz=(hash3(sd,2,2)-.5)*.35, r=[tx-.05,0,tz];
    const steel=(c,x,y,z)=>{ if(hash3(x*14,y*14,z*14)>.8) c.lerp(new THREE.Color(0x5a3a22),.6); };
    b.add(HEMI(S(14),S(6)),ZC.steel,{p:[0,.04,0],r,s:[.163,.125,.182],jit:QUAL?.008:0,grime:.25,paint:steel});
    b.add(CYL(.205,.218,.014,S(16,8)),ZC.steel,{p:[0,.042,0],r,s:[1,1,1.06],grime:.2,paint:steel});
    b.add(BOX(.02,.02,.24),0x41463f,{p:[0,.16,0],r});
    b.add(TOR(.142,.006,3,S(16,8)),ZC.leather,{p:[0,-.02,.025],r:[.25,0,0]}); }
  else if(v.head==='cap'){ const r=[-.1,0,(hash3(sd,3,3)-.5)*.2];
    b.add(CYL(.14,.134,.07,S(14)),v.coat,{p:[0,.11,-.005],r,grime:.25}); b.add(CYL(.135,.135,.026,S(14)),0x2b2a22,{p:[0,.09,-.002],r});
    b.add(CYL(.165,.15,.03,S(14)),v.coat,{p:[0,.152,-.015],r:[-.2,0,r[2]],s:[1,1,1.08],grime:.25});
    b.add(new THREE.CylinderGeometry(.115,.115,.01,S(10,6),1,false,-Math.PI/2,Math.PI),0x1d1a15,{p:[0,.08,.07],r:[.32,0,0],s:[1,1,.62]}); }
  else if(v.head==='bandage'){ const bl=(c,x,y,z)=>{ if(hash3(Math.round(x*40),Math.round(y*40),Math.round(z*40))>.84) c.lerp(GOREC,.75); };
    b.add(TOR(.134,.02,4,S(16,8)),ZC.bandage,{p:[0,.06,0],r:[Math.PI/2+.15,0,.08],grime:.25,paint:bl});
    b.add(TOR(.13,.02,4,S(16,8)),ZC.bandage,{p:[0,.015,.005],r:[Math.PI/2-.35,.0,-.12],grime:.25,paint:bl});
    b.add(TOR(.14,.018,4,S(16,8)),ZC.bandage,{p:[0,.0,0],r:[0,Math.PI/2,0],s:[1,1.08,1],grime:.25,paint:bl});
    b.add(TOR(.135,.02,4,S(16,8)),ZC.bandage,{p:[0,.02,.01],r:[Math.PI/2+.75,.0,.55],grime:.25,paint:bl}); }
  else if(v.head==='hood'){ const hc=ZC.hood[v.seed%3];
    b.add(SPH(S(14),S(10)),hc,{p:[0,.01,0],s:[.142,.168,.152],jit:QUAL?.014:0,grime:.3,paint:(c,x,y,z)=>{ if(y<-.06&&z>.05) c.multiplyScalar(.8); }});
    b.add(CYL(.12,.175,.13,S(12),true),hc,{p:[0,-.17,-.005],sway:(x,y)=>clamp(-y*8+.5,0,1)*.9,grime:.3});
    for(const sx of [-1,1]){ b.add(TOR(.034,.009,4,S(10,6)),0x2a2824,{p:[sx*.052,.03,.142]}); b.add(CYL(.029,.029,.01,S(10,6)),0x0a0b0b,{p:[sx*.052,.03,.142],r:[Math.PI/2,0,0]}); }
    b.add(CYL(.028,.04,.06,S(9,6)),0x2c2c28,{p:[0,-.06,.158],r:[Math.PI/2,0,0]});
    for(let i=0;i<3;i++) b.add(CYL(.016,.016,.09,S(6,4)),ZC.rubber,{p:[0,-.1-i*.08,.16-i*.012],r:[.15,0,0],sway:.25+i*.3});
    if(QUAL) for(let i=0;i<8;i++) b.add(TOR(.018,.004,3,6),0x2a2a26,{p:[0,-.07-i*.03,.162-i*.004],r:[Math.PI/2+.15,0,0]}); }
  else if(v.head==='bare'){ b.add(SPH(S(8),S(6)),ZC.bone,{p:[.05,.1,-.03],s:[.065,.05,.06],paint:(c,x,y,z)=>{ if(hash3(x*30,y*30,z*30)>.7) c.lerp(GOREC,.5); }});
    for(let i=0;i<(QUAL?10:5);i++){ const a=hash3(i,sd,6)*6.28, e=.3+hash3(sd,i,7)*1.1; b.add(BOX(.03,.018,.04),0x1d1914,{p:[Math.cos(a)*Math.cos(e)*.13,Math.sin(e)*.15,Math.sin(a)*Math.cos(e)*.14],r:[hash3(i,1,sd)*3,a,0]}); } }
  return b.done(); }
function zEyes(v){ const b=GB(); const z_=v.head==='hood'?.153:.125, y=v.head==='hood'?.03:.022, x=v.head==='hood'?.052:.047, r=v.head==='hood'?.017:.019;
  for(const sx of [-1,1]){ if(v.head==='bandage'&&sx>0) continue; b.add(SPH(6,5),0xffffff,{p:[sx*x,y,z_],s:[r,r*.8,r*.6]}); } return b.done(); }
function zUpperArm(v,bare,sx){ const b=GB(), S=SEG, c=v.style==='torn'?ZC.linen:v.coat;
  if(!bare){ b.add(CYL(.062,.053,.3,S(9,6)),c,{p:[0,-.15,0],jit:QUAL?.006:0,grime:.3});
    if(v.seed&1) b.add(BOX(.04,.18,.01),c,{p:[sx*.03,-.24,-.05],r:[0,.4*sx,0],sway:hangSway(-.15,.18,1.3),grime:.4}); }
  else { b.add(CYL(.064,.06,.12,S(9,6)),c,{p:[0,-.06,0],grime:.3}); b.add(CYL(.066,.062,.03,S(9,6)),c,{p:[0,-.125,0],jit:.03});
    b.add(CYL(.044,.038,.2,S(8,5)),v.skin,{p:[0,-.2,0],grime:.35,paint:(c2,x,y,z)=>{ if(y>-.16) c2.lerp(GOREC,.5); }}); }
  b.add(SPH(S(8,5),S(6,4)),bare?v.skin:c,{p:[0,-.3,0],s:bare?.042:.052});
  return b.done(); }
function zForeArm(v,bare,sx){ const b=GB(), S=SEG, c=v.style==='torn'?ZC.linen:v.coat, sk=v.skin;
  if(!bare){ b.add(CYL(.052,.042,.24,S(9,6)),c,{p:[0,-.12,0],grime:.3}); if(v.style!=='torn') b.add(CYL(.057,.055,.05,S(9,6)),c,{p:[0,-.2,0],grime:.2,paint:(c2)=>c2.multiplyScalar(.8)});
    b.add(CYL(.034,.031,.06,S(7,5)),sk,{p:[0,-.255,0]}); }
  else { b.add(CYL(.037,.03,.26,S(8,5)),sk,{p:[0,-.13,0],grime:.35,jit:QUAL?.006:0});
    b.add(TOR(.034,.012,4,S(8,5)),ZC.wound,{p:[0,-.12,0],r:[Math.PI/2,0,0]}); b.add(CYL(.011,.009,.12,5),ZC.bone,{p:[sx*.018,-.1,.022],r:[.2,0,sx*.15]}); }
  b.add(BOX(.064,.078,.03),sk,{p:[0,-.31,.004],grime:.3});
  if(QUAL){ for(let i=0;i<4;i++) b.add(CYL(.0095,.007,.075,4),sk,{p:[-.024+i*.016,-.375,.02],r:[-.55-hash3(i,v.seed,sx)*.5,0,0],grime:.3});
    b.add(CYL(.01,.008,.06,4),sk,{p:[sx*-.036,-.31,.02],r:[-.4,0,sx*.6]}); }
  else b.add(BOX(.06,.06,.024),sk,{p:[0,-.37,.02],r:[-.6,0,0]});
  return b.done(); }
function zThigh(v){ const b=GB(), S=SEG; b.add(CYL(.086,.066,.44,S(10,6)),v.trou,{p:[0,-.22,0],jit:QUAL?.008:0,grime:.3});
  b.add(SPH(S(8,5),S(6,4)),v.trou,{p:[0,-.44,.005],s:.063,paint:(c,x,y,z)=>{ if(z>.03) c.multiplyScalar(.7); }}); return b.done(); }
function zShin(v){ const b=GB(), S=SEG; b.add(CYL(.06,.047,.37,S(9,6)),ZC.puttee,{p:[0,-.19,0],grime:.3});
  if(QUAL) for(let i=0;i<6;i++) b.add(TOR(.06-i*.0024,.007,3,S(10,6)),ZC.puttee,{p:[0,-.07-i*.052,0],r:[Math.PI/2+.22,0,0],grime:.3});
  b.add(CYL(.05,.056,.07,S(8,5)),ZC.boot,{p:[0,-.41,0]}); b.add(SPH(S(8,5),S(6,4)),ZC.boot,{p:[0,-.455,.045],s:[.058,.045,.12],grime:.2});
  b.add(BOX(.1,.022,.23),ZC.dark,{p:[0,-.495,.04]}); return b.done(); }
function zPust(v){ const b=GB(); for(let i=0;i<9;i++){ const a=hash3(i,v.seed,8)*6.28, y=.05+hash3(v.seed,i,9)*.35; b.add(SPH(6,5),0xffffff,{p:[Math.sin(a)*.25,y,.05+Math.cos(a)*.22],s:.025+hash3(i,i,v.seed)*.025}); } return b.done(); }
const ZSTUMP=new THREE.CylinderGeometry(.058,.062,.025,8);

function makeZombie(kind){
  const g=new THREE.Group(); g.rotation.order='YXZ'; const z={g,parts:[],kind,boss:false};
  const v=zVariant(kind), mat=ZMAT[kind]||ZMAT.walker, eye=kind==='hollow'||kind==='marked'?ZM.eyeH:kind==='burster'?HM.eye:ZM.eyeZ;
  z.v=v; g.scale.setScalar(rand(.93,1.04));
  const hips=new THREE.Group(); hips.position.y=.95; g.add(hips); z.hips=hips;
  const chest=new THREE.Group(); chest.position.y=.08; hips.add(chest); z.chest=chest;
  part(chest,zGeo('torso',v),mat,0,0,0,z);
  if(kind==='burster') part(chest,zGeo('pust',v),HM.ember,0,0,0);
  const neck=new THREE.Group(); neck.position.set(0,.6,.01); chest.add(neck); z.neck=neck;
  const head=part(neck,zGeo('head',v),mat,0,.17,.02,z,true); z.head=head;
  part(head,zGeo('eyes',v),eye,0,0,0);
  const st=new THREE.Mesh(ZSTUMP,ZM.gore); st.position.set(0,.66,.01); st.visible=false; chest.add(st); z.stump=st;
  const arm=(sx,bare)=>{ const sh=new THREE.Group(); sh.position.set(sx*.232,.5,0); chest.add(sh); part(sh,zGeo('uarm',v,bare,sx),mat,0,0,0,z);
    const el=new THREE.Group(); el.position.y=-.3; sh.add(el); part(el,zGeo('farm',v,bare,sx),mat,0,0,0,z); return [sh,el]; };
  [z.armL,z.foreL]=arm(-1,v.bareL); [z.armR,z.foreR]=arm(1,v.bareR);
  const leg=sx=>{ const hp=new THREE.Group(); hp.position.set(sx*.1,0,0); hips.add(hp); part(hp,zGeo('thigh',v),mat,0,0,0,z);
    const kn=new THREE.Group(); kn.position.y=-.44; hp.add(kn); part(kn,zGeo('shin',v),mat,0,0,0,z); return [hp,kn]; };
  [z.legL,z.kneeL]=leg(-1); [z.legR,z.kneeR]=leg(1);
  z.gait={ limp:Math.random()<.32?(Math.random()<.5?-1:1):0, arms:pick(['reach','reach','reach','one','hang','low']), runArms:pick(['pump','pump','reach']),
    lean:rand(.1,.3), tilt:(Math.random()<.35?rand(-.4,.4):rand(-.1,.1)), twist:rand(-.15,.15), spread:rand(.04,.2), side:Math.random()<.5?-1:1 };
  z.hitK=0; z.twitch=0;
  animZombie(z,0,false,0,-1);
  return z;
}

// ---- hounds: emaciated, burning hounds with exposed ribs
const HGEO=new Map();
function houndGeo(type){ let g=HGEO.get(type); if(g) return g; const b=GB(), S=SEG, hide=0x3a2d22, hide2=0x2a2018, bone=ZC.bone;
  const mange=(c,x,y,z)=>{ if(hash3(Math.round(x*30),Math.round(y*30),Math.round(z*30))>.72) c.lerp(new THREE.Color(0x6a2a1c),.6); if(y<0) c.multiplyScalar(.8); };
  if(type==='body'){
    b.add(SPH(S(14),S(10)),hide,{p:[0,.68,.1],s:[.16,.19,.3],jit:QUAL?.015:0,grime:.3,paint:(c,x,y,z)=>{ mange(c,x,y,z); if(Math.abs(x)>.08&&((z*14)%1+1)%1<.35) c.multiplyScalar(.6); }});
    b.add(SPH(S(12),S(8)),hide2,{p:[0,.66,-.3],s:[.14,.16,.19],jit:QUAL?.012:0,grime:.3,paint:mange});
    b.add(CYL(.06,.1,.32,S(10,6)),hide,{p:[0,.82,.44],r:[1.05,0,0],grime:.3,paint:mange});
    if(QUAL) for(let i=0;i<5;i++){ const zz=.28-i*.09; for(const side of [1,-1]) b.add(TOR(.165,.011,3,S(8,5),1.5),bone,{p:[0,.68,zz],r:[0,0,side>0?-1.2:Math.PI-.3],s:[.95,1.08,1]}); }
    for(let i=0;i<9;i++) b.add(new THREE.ConeGeometry(.022,.08,4),bone,{p:[0,.86-Math.abs(i-3)*.012,.32-i*.09],r:[-.5,0,0]});
    for(let i=0;i<4;i++){ const len=.08+hash3(i,3,3)*.06; b.add(BOX(.03,len,.008),hide2,{p:[(i%2?.05:-.05),.82-i*.02,.2-i*.15],r:[.3,0,(i%2?.4:-.4)],sway:hangSway(len/2,len,.8)}); }
    for(let i=0;i<4;i++) b.add(new THREE.ConeGeometry(.04-i*.008,.16,S(6,4)),hide2,{p:[0,.74-i*.06,-.5-i*.12],r:[-2.2+i*.2,0,0],sway:.2+i*.25}); }
  else if(type==='head'){
    b.add(SPH(S(12),S(8)),hide,{s:[.1,.092,.125],jit:QUAL?.01:0,grime:.3,paint:mange});
    b.add(CYL(.042,.062,.17,S(9,6)),hide2,{p:[0,-.03,.15],r:[Math.PI/2,0,0],grime:.3});
    b.add(SPH(6,5),0x111010,{p:[0,-.01,.24],s:[.03,.025,.025]});
    b.add(BOX(.075,.022,.17),hide2,{p:[0,-.1,.1],r:[.38,0,0],paint:(c,x,y)=>{ if(y>-.09) c.lerp(GOREC,.7); }});
    if(QUAL) for(const sx of [-1,1]) for(let i=0;i<3;i++){ b.add(new THREE.ConeGeometry(.008,.04,4),0xc8bc98,{p:[sx*(.03-i*.004),-.075,.22-i*.03],r:[Math.PI,0,0]}); b.add(new THREE.ConeGeometry(.007,.035,4),0xc8bc98,{p:[sx*(.026-i*.004),-.105,.17-i*.03],r:[.4,0,0]}); }
    b.add(new THREE.ConeGeometry(.04,.14,4),hide2,{p:[-.07,.09,-.04],r:[-.35,0,.35]}); b.add(new THREE.ConeGeometry(.04,.08,4),hide2,{p:[.07,.07,-.04],r:[-.5,0,-.4]});
    b.add(SPH(S(8),S(5)),hide,{p:[0,.05,.07],s:[.085,.03,.05]}); }
  else if(type==='eyes'){ for(const sx of [-1,1]) b.add(SPH(6,5),0xffffff,{p:[sx*.058,.025,.1],s:[.018,.014,.012]}); }
  else if(type==='embers'){ for(let i=0;i<7;i++) b.add(BOX(.035,.05,.06),0xffffff,{p:[0,.85-Math.abs(i-3)*.01,.27-i*.1],r:[-.2,0,0]}); for(let i=0;i<6;i++){ const a=hash3(i,5,5)*6.28; b.add(SPH(5,4),0xffffff,{p:[Math.sin(a)*.15,.66+Math.cos(a)*.15,.25-i*.11],s:.016}); } }
  else if(type==='uleg'||type==='uback'){ const back=type==='uback', L_=back?.32:.28; b.add(SPH(S(8),S(6)),hide,{p:[0,-.04,0],s:back?[.07,.13,.1]:[.065,.1,.08],grime:.3,paint:mange}); b.add(CYL(.042,.032,L_,S(7,5)),hide2,{p:[0,-L_/2,0],grime:.3}); }
  else if(type==='lleg'||type==='lback'){ const L_=type==='lback'?.31:.27; b.add(CYL(.03,.022,L_,S(7,5)),hide2,{p:[0,-L_/2,0],grime:.3}); b.add(SPH(S(7),S(5)),hide2,{p:[0,-L_,.02],s:[.034,.022,.055]});
    if(QUAL) for(const sx of [-1,0,1]) b.add(new THREE.ConeGeometry(.007,.03,4),0xa89a7a,{p:[sx*.015,-L_-.01,.07],r:[Math.PI/2+.4,0,0]}); }
  g=b.done(); HGEO.set(type,g); return g; }
function makeHound(hollow){ const g=new THREE.Group(); g.rotation.order='YXZ'; const z={g,parts:[],kind:'hound',boss:false}; const m=hollow?ZMAT.houndH:ZMAT.hound, e=hollow?ZM.eyeH:HM.eye;
  part(g,houndGeo('body'),m,0,0,0,z); part(g,houndGeo('embers'),hollow?ZM.eyeH:HM.ember,0,0,0);
  const head=part(g,houndGeo('head'),m,0,.86,.64,z,true); z.head=head; part(head,houndGeo('eyes'),e,0,0,0);
  const leg=(x,y,zz,back)=>{ const pv=new THREE.Group(); pv.position.set(x,y,zz); g.add(pv); part(pv,houndGeo(back?'uback':'uleg'),m,0,0,0,z);
    const lo=new THREE.Group(); lo.position.y=back?-.32:-.28; pv.add(lo); part(lo,houndGeo(back?'lback':'lleg'),m,0,0,0,z); return [pv,lo]; };
  [z.armL,z.lowAL]=leg(-.1,.6,.32,false); [z.armR,z.lowAR]=leg(.1,.6,.32,false); [z.legL,z.lowLL]=leg(-.1,.66,-.32,true); [z.legR,z.lowLR]=leg(.1,.66,-.32,true);
  z.hitK=0; animHound(z,0,false,0,-1); return z; }

// ---- animation (shared by the host simulation and co-op clients)
const _e01=t=>{ t=clamp(t,0,1); return t*t*(3-2*t); };
function zFlinch(z,dt){ if(z.flash>0&&!z._fl){ z.hitK=1; } z._fl=z.flash>0; z.hitK=Math.max(0,(z.hitK||0)-dt*5); return z.hitK*z.hitK; }
// z.phase advances with distance travelled; swingT is 0..1 through an attack, or -1
function animZombie(z,dt,moving,spd,swingT){ if(!z.hips) return animLegacy(z,dt,moving,spd,swingT);
  const G=z.gait, run=moving&&spd>3;
  z.phase+=dt*(moving?(run?spd*2.3:Math.max(2.4,spd*3.4)):1.3);
  let ph=z.phase; if(G.limp&&moving) ph+=.38*Math.sin(ph);
  const sL=Math.sin(ph), sR=-sL, cL=Math.cos(ph), cR=-cL, mv=moving?1:0;
  let aL=moving?(run?.85:.46):.03, aR=aL, kL=moving?(run?1.55:.75):.05, kR=kL;
  if(G.limp===-1){ aL*=.45; kL*=.12; } else if(G.limp===1){ aR*=.45; kR*=.12; }
  z.legL.rotation.x=-sL*aL-(run?.2:0); z.legR.rotation.x=-sR*aR-(run?.2:0);
  z.kneeL.rotation.x=.06+kL*Math.max(0,cL)+(run?.25:0); z.kneeR.rotation.x=.06+kR*Math.max(0,cR)+(run?.25:0);
  z.legL.rotation.z=.03; z.legR.rotation.z=-.03;
  const bob=moving?(run?.07:.035):.008, dip=G.limp&&moving?.055*Math.max(0,G.limp===-1?-sL:-sR):0;
  z.hips.position.y=.95-bob+bob*Math.abs(cL)-dip-(run?.05:0);
  z.hips.rotation.z=(.07*sL+(G.limp?G.limp*.05:0))*mv+.015*Math.sin(z.phase*.5)*(1-mv);
  z.hips.rotation.y=.1*sL*mv;
  const fk=zFlinch(z,dt);
  let lean=G.lean+(run?.38:0), ch=z.chest;
  ch.rotation.x=lean+.035*Math.abs(cL)*mv-.38*fk; ch.rotation.y=-.15*sL*mv+G.twist+.05*Math.sin(z.phase*.4)*(1-mv); ch.rotation.z=(-.05*sL-(G.limp||0)*.04)*mv;
  if(z.twitch>0) z.twitch-=dt; else if(Math.random()<dt*.25){ z.twitch=.18; z.twd=rand(-.5,.5); }
  const tw=z.twitch>0?z.twd*Math.sin(z.twitch/.18*Math.PI):0;
  z.neck.rotation.x=-lean*.75+.05*Math.sin(ph*2)*mv-.3*fk; z.neck.rotation.z=G.tilt+.06*Math.sin(ph+.5)+tw*.5; z.neck.rotation.y=tw;
  let al,ar,el,er,zl=G.spread,zr=-G.spread;
  switch(run?G.runArms:G.arms){
    case 'pump': al=-.3+.95*sL; ar=-.3+.95*sR; el=-1.45; er=-1.45; zl=.12; zr=-.12; break;
    case 'one': if(G.side<0){ al=-1.35+.1*Math.sin(ph); el=-.2; ar=.3*sR*mv+.05; er=-.12; zr=-.06; } else { ar=-1.35+.1*Math.sin(ph); er=-.2; al=.3*sL*mv+.05; el=-.12; zl=.06; } break;
    case 'hang': al=.38*sL*mv+.05; ar=.38*sR*mv+.05; el=-.28; er=-.32; zl=.08; zr=-.08; break;
    case 'low': al=-.75+.22*sL; ar=-.8+.22*sR; el=-.55; er=-.5; break;
    default: al=-1.3+.12*Math.sin(ph); ar=-1.24-.12*Math.sin(ph+.8); el=-.22; er=-.14;
  }
  if(!run){ al-=lean*.5; ar-=lean*.5; }
  if(swingT>=0){ const t=swingT, w=t<.42?_e01(t/.42):1-_e01((t-.42)/.58), sl=t<.42?0:_e01((t-.42)/.58);
    const A=-1.3-1.35*w+.5*sl; al=A; ar=A+.12*Math.sin(t*Math.PI*2); el=-.9*w-.08; er=-.8*w-.15; zl=.25*w; zr=-.25*w;
    ch.rotation.x+=-.22*w+.45*sl*(1-sl)*2; z.neck.rotation.x+=.2*w; }
  z.armL.rotation.set(al-fk*.5,0,zl); z.armR.rotation.set(ar-fk*.5,0,zr); z.foreL.rotation.x=el; z.foreR.rotation.x=er; }
function animLegacy(z,dt,moving,spd,swingT){ z.phase+=dt*(moving?spd*(z.boss?2.2:3.2):1); const sw=Math.sin(z.phase)*(moving?(spd>3?.9:.5):.05);
  z.legL.rotation.x=sw; z.legR.rotation.x=-sw; const ab=z.boss?-.3:-1.35;
  if(swingT>=0){ const k=Math.sin(swingT*Math.PI); z.armL.rotation.x=ab-k*.9; z.armR.rotation.x=ab-k*1.1; }
  else { z.armL.rotation.x=ab+Math.sin(z.phase*.5)*.15; z.armR.rotation.x=ab-Math.sin(z.phase*.5+1)*.15; } }
function animHound(z,dt,moving,spd,swingT){ z.phase+=dt*(moving?Math.max(4,spd*2.1):1.6); const ph=z.phase, a=moving?.72:.04;
  const f1=Math.sin(ph), f2=Math.sin(ph+.55), b1=Math.sin(ph+Math.PI), b2=Math.sin(ph+Math.PI+.55);
  z.armL.rotation.x=-f1*a; z.armR.rotation.x=-f2*a; z.legL.rotation.x=-.25-b1*a; z.legR.rotation.x=-.25-b2*a;
  z.lowAL.rotation.x=.15+(moving?1.1:0)*Math.max(0,Math.cos(ph)); z.lowAR.rotation.x=.15+(moving?1.1:0)*Math.max(0,Math.cos(ph+.55));
  z.lowLL.rotation.x=.5+(moving?.7:0)*Math.max(0,-Math.cos(ph)); z.lowLR.rotation.x=.5+(moving?.7:0)*Math.max(0,-Math.cos(ph+.55));
  const fk=zFlinch(z,dt); z.head.rotation.x=.08*Math.sin(ph*2)*(moving?1:.3)-fk*.4+(swingT>=0?-.5*Math.sin(swingT*Math.PI):0); z.head.rotation.y=moving?0:.25*Math.sin(z.phase*.35);
  z.g.position.y=moving?.04*Math.abs(Math.sin(ph)):0; }
// window poses: tearing planks (t 0..1 of a pull) and climbing through (k 0..1)
function animWindow(z,dt,state,t,moving){ if(!z.hips) return;
  if(state==='climb'){ const s=Math.sin(t*Math.PI); z.hips.position.y=.95-.12*s; z.chest.rotation.set(.35+.35*s,0,0); z.neck.rotation.set(-.4,0,z.gait.tilt);
    z.armL.rotation.set(-2.3+1.2*t,0,.25); z.armR.rotation.set(-2.2+1.1*t,0,-.25); z.foreL.rotation.x=-.3-.6*s; z.foreR.rotation.x=-.3-.6*s;
    const s2=Math.sin(Math.min(1,t*1.4)*Math.PI), s3=Math.sin(Math.max(0,t*1.4-.4)*Math.PI);
    z.legL.rotation.x=-1.5*s2; z.kneeL.rotation.x=.2+1.9*s2; z.legR.rotation.x=-1.2*s3+.3*s2; z.kneeR.rotation.x=.2+1.6*s3; return; }
  animZombie(z,dt,moving,moving?z.speed:0,-1);
  if(state==='tear'&&t>=0){ const p=Math.sin(t*Math.PI), q=Math.sin(t*Math.PI*2);
    z.armL.rotation.set(-1.75+.85*p,0,.15); z.armR.rotation.set(-1.7+.8*p-.15*q,0,-.15); z.foreL.rotation.x=-.2-1.1*p; z.foreR.rotation.x=-.25-1.2*p; z.chest.rotation.x=.4-.35*p; }
  else if(state==='tear'){ z.armL.rotation.x=-1.6+.1*Math.sin(z.phase*2); z.armR.rotation.x=-1.55-.1*Math.sin(z.phase*2+1); z.chest.rotation.x=.38; } }
// death: crumple, fall forward, fall back, spin and drop; then sink. Returns true when the body should be removed
function zDeathUpdate(z,dt){ const g=z.g, p=g.position; z.dt+=dt; const t=z.dt;
  if(!z.dtype){ z.dtype=z.kind==='hound'?'side':z.boss?'forward':z.headKill?pick(['back','crumple','back','forward']):pick(['forward','back','crumple','crumple','spin']);
    z.dside=Math.random()<.5?-1:1; z.dspin=rand(3,6)*z.dside; z.rx0=g.rotation.x; z.pooled=false; if(z.hips){ z.armL.rotation.z+=rand(-.3,.3); } }
  const fall=(a,b)=>{ const k=clamp((t-a)/(b-a),0,1); return k*k; }, sm=(a,b)=>_e01((t-a)/(b-a));
  const H=z.hips, ty=z.dtype;
  if(ty==='forward'){ g.rotation.x=z.rx0+(1.48-z.rx0)*fall(0,z.boss?.9:.55); if(H){ const k=sm(0,.4); z.armL.rotation.x=-1.3-1.4*k; z.armR.rotation.x=-1.1-1.5*k; z.neck.rotation.x=.3*k; z.kneeL.rotation.x=.1; z.kneeR.rotation.x=.3*k; } }
  else if(ty==='back'){ const k=fall(.08,.62); g.rotation.x=z.rx0-(1.5+z.rx0)*k; if(H){ const a=sm(0,.35); z.armL.rotation.set(-1.3-1.5*a,0,.6*a); z.armR.rotation.set(-1.2-1.6*a,0,-.7*a); z.kneeL.rotation.x=.5*a; z.kneeR.rotation.x=.3*a; z.neck.rotation.x=-.6*a; H.position.y=.95-.08*a; } }
  else if(ty==='crumple'&&H){ const a=sm(0,.42); H.position.y=.95-.4*a; z.legL.rotation.x=-1.0*a; z.legR.rotation.x=-.85*a; z.kneeL.rotation.x=1.9*a; z.kneeR.rotation.x=1.7*a;
    z.chest.rotation.x=.25+.5*a; z.armL.rotation.x=-.2*a; z.armR.rotation.x=-.3*a; z.foreL.rotation.x=-.3; z.foreR.rotation.x=-.2; z.neck.rotation.x=.5*a;
    g.rotation.x=z.rx0+(1.25-z.rx0)*fall(.4,.95); }
  else if(ty==='spin'||ty==='crumple'){ const k=1-sm(0,.9); g.rotation.y+=z.dspin*dt*k; g.rotation.z=z.dside*1.45*fall(.1,.8); if(H){ const a=sm(0,.3); z.armL.rotation.set(-.5,0,1.1*a); z.armR.rotation.set(-.6,0,-1.2*a); z.kneeL.rotation.x=.6*a; } }
  else if(ty==='side'){ g.rotation.z=z.dside*1.5*fall(0,.45); z.armL.rotation.x=z.armR.rotation.x=-.6; z.legL.rotation.x=z.legR.rotation.x=.5; }
  if(!z.pooled&&t>.75){ z.pooled=true; if(typeof spawnDecal==='function'&&z.kind!=='boss'){ const tp=new V3(); (z.chest||z.parts[0]||g).getWorldPosition(tp); spawnDecal(new V3(tp.x,0,tp.z),null,z.kind==='hollow'||z.prime?'ichor':'pool',rand(1.1,1.7)); } }
  if(t>1.7) p.y-=dt*(z.boss?.6:.38);
  return t>(z.boss?3.4:3.2); }
function zHeadOff(z){ if(!z.head||z.boss) return; z.headKill=true; z.head.visible=false; if(z.stump) z.stump.visible=true; const hp_=new V3(); z.head.getWorldPosition(hp_); spawnParticles(hp_,'blood',QUAL?14:9);
  if(typeof spawnDecal==='function') spawnDecal(new V3(hp_.x+rand(-.6,.6),0,hp_.z+rand(-.6,.6)),null,'blood',rand(.8,1.2)); }
