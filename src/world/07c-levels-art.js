/* ================= level art · lane 2: dressing for the Château and the Underworks =================
   Everything here is merged per material and baked with the same vertex lighting as the graybox (07b), so a whole
   area costs a handful of draw calls. Detail counts drop on Low. Coordinates: docs/MAP.md. */
const LART={drips:null,lights:[],ulamps:[]};
// shared canvas atlas (4 x 2 tiles of 128 px): 0 pinned map, 1 survey map, 2 notices, 3 wool blanket, 4 skull wall, 5 bone ends, 6 wine bottles, 7 gauge/dial face
const ART_ATLAS=(()=>{ const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d'); const T=(i,f)=>{ g.save(); g.translate((i%4)*128,Math.floor(i/4)*128); f(); g.restore(); };
  T(0,()=>{ g.fillStyle='#c8b48a'; g.fillRect(0,0,128,128); g.strokeStyle='#5a4a30'; g.lineWidth=1.5; for(let i=0;i<10;i++){ g.beginPath(); g.moveTo(rand(0,128),rand(0,128)); g.bezierCurveTo(rand(0,128),rand(0,128),rand(0,128),rand(0,128),rand(0,128),rand(0,128)); g.stroke(); }
    g.strokeStyle='rgba(90,70,40,.35)'; for(let i=0;i<128;i+=16){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,128); g.moveTo(0,i); g.lineTo(128,i); g.stroke(); }
    g.fillStyle='#8a1a12'; for(let i=0;i<7;i++){ g.beginPath(); g.arc(rand(10,118),rand(10,118),3,0,7); g.fill(); } g.strokeStyle='#8a1a12'; g.lineWidth=2.5; g.beginPath(); g.moveTo(20,100); g.lineTo(60,70); g.lineTo(90,80); g.lineTo(110,30); g.stroke(); });
  T(1,()=>{ g.fillStyle='#d8ccb0'; g.fillRect(0,0,128,128); g.strokeStyle='#3a4a5a'; g.lineWidth=1; for(let r=10;r<90;r+=9){ g.beginPath(); g.ellipse(64+rand(-6,6),64+rand(-6,6),r,r*.7,rand(0,1),0,7); g.stroke(); } g.fillStyle='#2a3a4a'; g.font='10px monospace'; g.fillText('SECTOR 7',8,14); });
  T(2,()=>{ g.fillStyle='#1a1612'; g.fillRect(0,0,128,128); for(let i=0;i<4;i++){ const x=6+(i%2)*62, y=6+Math.floor(i/2)*62; g.fillStyle=pick(['#d8d0b8','#c8bc98','#e0d8c4']); g.fillRect(x,y,54,54); g.fillStyle='#3a3228'; for(let l=0;l<6;l++) g.fillRect(x+5,y+10+l*7,rand(20,44),2); g.fillStyle='#7a1a12'; g.fillRect(x+5,y+4,30,3); } });
  T(3,()=>{ g.fillStyle='#4a4436'; g.fillRect(0,0,128,128); for(let y=0;y<128;y+=3){ g.fillStyle=`rgba(0,0,0,${rand(.05,.15)})`; g.fillRect(0,y,128,1); } g.fillStyle='#6a2a20'; g.fillRect(0,14,128,6); g.fillRect(0,108,128,6); speckle(g,128,300,['#3a3428','#5a5444'],1,2); });
  T(4,()=>{ g.fillStyle='#1a1610'; g.fillRect(0,0,128,128); for(let r=0;r<5;r++) for(let i=0;i<5;i++){ const x=13+i*25.5+(r%2)*6-3, y=13+r*25.5, s=rand(.85,1.05); g.fillStyle=`rgb(${rand(180,215)|0},${rand(168,200)|0},${rand(130,160)|0})`;
      g.beginPath(); g.ellipse(x,y-2,10*s,9*s,0,0,7); g.fill(); g.fillRect(x-6*s,y+3,12*s,6*s); g.fillStyle='#120e0a'; g.beginPath(); g.ellipse(x-4*s,y-1,3*s,3.2*s,0,0,7); g.ellipse(x+4*s,y-1,3*s,3.2*s,0,0,7); g.fill(); g.fillRect(x-1,y+3,2,2); for(let t=-2;t<=2;t++) g.fillRect(x+t*2.4-.5,y+6,1,3); } });
  T(5,()=>{ g.fillStyle='#16120c'; g.fillRect(0,0,128,128); for(let i=0;i<70;i++){ const x=rand(4,124), y=rand(4,124), r=rand(3,6); g.fillStyle=`rgb(${rand(170,210)|0},${rand(160,195)|0},${rand(125,155)|0})`; g.beginPath(); g.ellipse(x-r*.6,y,r*.7,r,0,0,7); g.ellipse(x+r*.6,y,r*.7,r,0,0,7); g.fill(); } });
  T(6,()=>{ g.fillStyle='#120c08'; g.fillRect(0,0,128,128); for(let r=0;r<8;r++) for(let i=0;i<8;i++){ const x=8+i*16, y=8+r*16; if(Math.random()<.12) continue; g.fillStyle=pick(['#1a2a14','#2a1a10','#14201a']); g.beginPath(); g.arc(x,y,6.5,0,7); g.fill(); g.fillStyle='rgba(180,200,160,.25)'; g.beginPath(); g.arc(x-2,y-2,2,0,7); g.fill(); } });
  T(7,()=>{ g.fillStyle='#2a2620'; g.fillRect(0,0,128,128); g.fillStyle='#e8dcc0'; g.beginPath(); g.arc(64,64,54,0,7); g.fill(); g.strokeStyle='#2a2018'; g.lineWidth=2; for(let i=0;i<=10;i++){ const a=Math.PI*.75+i/10*Math.PI*1.5; g.beginPath(); g.moveTo(64+Math.cos(a)*44,64+Math.sin(a)*44); g.lineTo(64+Math.cos(a)*52,64+Math.sin(a)*52); g.stroke(); }
    g.strokeStyle='#8a1a10'; g.lineWidth=3; g.beginPath(); g.moveTo(64,64); g.lineTo(64+Math.cos(-.6)*40,64+Math.sin(-.6)*40); g.stroke(); });
  const t=new THREE.CanvasTexture(c); t.anisotropy=ANISO; return t; })();
// a quad textured with one atlas tile (w x h, facing +z before the o.r rotation)
function atlasQuad(b,tile,w,h,col,o,rep=1){ const pg=new THREE.PlaneGeometry(w,h), uv=pg.attributes.uv; for(let i=0;i<uv.count;i++){ uv.setXY(i,((uv.getX(i)*rep)%1.0001+(tile%4))/4,(uv.getY(i)+1-Math.floor(tile/4))/2); } b.add(pg,col,o); }
// tiled atlas wall: repeats a tile over a w x h area as separate quads (keeps the tile scale)
function atlasWall(b,tile,cx,cy,cz,w,h,ry,ts,col){ const nx=Math.max(1,Math.round(w/ts)), ny=Math.max(1,Math.round(h/ts)), sw=w/nx, sh=h/ny, ux=Math.cos(ry), uz=-Math.sin(ry);
  for(let i=0;i<nx;i++) for(let j=0;j<ny;j++){ const a=-w/2+sw*(i+.5), y=cy-h/2+sh*(j+.5); atlasQuad(b,tile,sw,sh,col,{p:[cx+ux*a,y,cz+uz*a],r:[0,ry,0]}); } }
function bakedMesh(geo,lights,amb,sun,skyY,mat,parent){ lvBake(geo,lights,amb,sun,skyY); const m=new THREE.Mesh(geo,mat); parent.add(m); return m; }
const ATLAS_MAT=new THREE.MeshBasicMaterial({map:ART_ATLAS,vertexColors:true});

/* ---------------------------------------------------------------- THE CHÂTEAU */
{ const CL=LVL.chLights||[], SUN=LVL.chSun, D=QUAL, UF=4.2;
  const W=lvBuilder(), S=lvBuilder(), PA=GB(), G=GB(), GL=GB(), wood=0x9a7a58, dk=0x6a5038, iron=0x4a4a46, stone=0xa8a090;
  // ceiling beams under the upper floor (ground floor rooms), and joists of the quarters' roof
  for(let z=-24.4;z<-2;z+=D?2.4:4.8) W.box(-57.6,-30.6,3.6,3.9,z-.13,z+.13,dk,3);
  for(const x of [-42.4,-41.6]) W.box(x-.15,x+.15,3.5,3.9,-25.6,1.6,dk,3);
  for(let x=-56;x<-42;x+=D?2:4) W.box(x-.12,x+.12,7.9,8.2,-25.6,1.6,dk,3);
  // broken rafters over the open hall and bell room, slates on the wall tops
  for(const [x0,x1,z,y0,y1] of [[-42,-37.5,-9.5,8.3,7.6],[-42,-39,-5,8.3,8.0],[-34,-30.6,-17,7.7,8.3],[-42,-38,-23,8.3,7.2],[-36,-30.6,-3,8.1,8.3]]){ const L_=x1-x0, a=Math.atan2(y1-y0,L_); W.add(new THREE.BoxGeometry(Math.hypot(L_,y1-y0),.22,.22),dk,{p:[(x0+x1)/2,(y0+y1)/2,z],r:[0,0,a]}); }
  if(D) for(let i=0;i<16;i++){ const onN=i%2, x=rand(-41.5,-31), z=onN?rand(1.4,2.2):rand(-26.2,-25.4); S.add(new THREE.BoxGeometry(rand(.4,.7),.04,rand(.3,.5)),0x4a4a50,{p:[x,8.45,z],r:[rand(-.3,.3),rand(0,3),rand(-.3,.3)]}); }
  // timber posts in the corners and along the long walls (both floors)
  for(const [x,z] of [[-57.3,-25.3],[-57.3,1.3],[-42.3,-25.3],[-42.3,1.3],[-30.9,-25.3],[-57.3,-13],[-30.9,-13]]){ W.box(x-.16,x+.16,0,3.6,z-.16,z+.16,dk,3); if(D) W.box(x-.14,x+.14,UF,7.9,z-.14,z+.14,dk,3); }
  // window frames, sills and broken shutters; jagged glass left in the frames
  const wins=[['z',-58,-19,.9,2.5,2.2],['z',-58,-8,5.2,6.9,2],['z',-58,-20,5.2,6.9,2],['x',2,-50,.9,2.5,2.2],['x',2,-37,5.2,6.9,2],['x',2,-51,5.2,6.9,2],['x',-26,-36,.9,2.5,2.2],['x',-26,-49,5.2,6.9,2]];
  for(const [ax,f,c,y0,y1,w] of wins){ const inn=ax==='z'?1:(f>0?-1:1); // inward direction (+x for west wall, -z for north, +z for south)
    const P_=(a,b,hy0,hy1,d0,d1)=>ax==='z'?S.box(f+d0*inn,f+d1*inn,hy0,hy1,a,b,stone,2):S.box(a,b,hy0,hy1,f+d0*inn,f+d1*inn,stone,2);
    P_(c-w/2-.1,c+w/2+.1,y0-.12,y0,.2,.55); P_(c-w/2-.1,c+w/2+.1,y1,y1+.18,.2,.5);
    const fr=(a,b,hy0,hy1)=>ax==='z'?W.box(f+.42*inn-.04,f+.42*inn+.04,hy0,hy1,a,b,dk,2):W.box(a,b,hy0,hy1,f+.42*inn-.04,f+.42*inn+.04,dk,2);
    fr(c-w/2,c-w/2+.08,y0,y1); fr(c+w/2-.08,c+w/2,y0,y1); fr(c-.04,c+.04,y0,y1); fr(c-w/2,c+w/2,(y0+y1)/2-.04,(y0+y1)/2+.04);
    for(let k=0;k<(D?5:2);k++){ const a=c+rand(-w/2,w/2)*.8, y=rand(y0,y1), s=rand(.12,.3); const pos=ax==='z'?[f+.43*inn,y,a]:[a,y,f+.43*inn];
      GL.add(new THREE.ConeGeometry(s*.5,s,3),0xffffff,{p:pos,r:[ax==='z'?0:rand(-.5,.5),ax==='z'?Math.PI/2:0,rand(0,6)]}); }
    if(D&&Math.random()<.7){ const sd=Math.random()<.5?-1:1, a=c+sd*(w/2+.45), pos=ax==='z'?[f+.62*inn,(y0+y1)/2-.2,a]:[a,(y0+y1)/2-.2,f+.62*inn]; W.add(new THREE.BoxGeometry(ax==='z'?.05:.8,y1-y0,ax==='z'?.8:.05),0x5a4a38,{p:pos,r:[0,rand(-.4,.4),rand(-.2,.2)]}); } }
  // hall: long trestle table, benches, sandbagged entrance, coat pegs
  W.box(-39.5,-35,.75,.82,-8.6,-7.4,wood,2); for(const x of [-39.2,-35.3]) W.box(x-.08,x+.08,0,.75,-8.5,-7.5,dk,2);
  for(const z of [-9.1,-6.9]) W.box(-39.4,-35.1,.42,.48,z-.18,z+.18,wood,2);
  for(let i=0;i<(D?10:5);i++) S.add(new THREE.SphereGeometry(1,D?8:5,D?5:3),0x9a8a66,{p:[-31.2,.12+Math.floor(i/5)*.22,-13.3+(i%5)*.48+((i/5|0)%2)*.2],s:[.24,.11,.17],r:[0,Math.PI/2,0]});
  // map room: map table trim and pinned maps, two desks, chairs, filing cabinet, map board on the south wall
  W.box(-38.1,-34.4,.82,.92,-21.1,-18.4,dk,2); for(const [x,z] of [[-37.8,-20.8],[-34.7,-20.8],[-37.8,-18.7],[-34.7,-18.7]]) W.box(x-.07,x+.07,0,.82,z-.07,z+.07,dk,2);
  atlasQuad(PA,0,1.4,1,0xffffff,{p:[-36.8,.93,-19.8],r:[-Math.PI/2,0,.2]}); atlasQuad(PA,1,1.1,.8,0xffffff,{p:[-35.3,.931,-19.4],r:[-Math.PI/2,0,-.3]}); atlasQuad(PA,2,.6,.6,0xffffff,{p:[-36,.932,-20.5],r:[-Math.PI/2,0,.6]});
  atlasQuad(PA,0,2.4,1.6,0xffffff,{p:[-36.3,1.9,-25.55],r:[0,0,0]}); W.box(-37.6,-35,1.05,1.1,-25.6,-25.5,dk,2);
  for(const [x,z,ry] of [[-40.5,-24.3,0],[-32,-14.5,Math.PI]]){ W.add(new THREE.BoxGeometry(1.6,.06,.8),wood,{p:[x,.78,z],r:[0,ry,0]}); for(const dx of [-.7,.7]) W.add(new THREE.BoxGeometry(.06,.78,.7),dk,{p:[x+dx,.39,z],r:[0,ry,0]}); atlasQuad(PA,2,.5,.5,0xffffff,{p:[x,.812,z],r:[-Math.PI/2,0,rand(-.4,.4)]});
    W.add(new THREE.BoxGeometry(.45,.05,.45),wood,{p:[x+.2,.45,z+(ry?-.7:.7)]}); W.add(new THREE.BoxGeometry(.45,.5,.05),wood,{p:[x+.2,.7,z+(ry?-.92:.92)]}); }
  S.add(new THREE.BoxGeometry(.6,1.4,.55),0x5a5c58,{p:[-31.1,.7,-24.9]});
  // radio room: two radio sets on the desk (glowing valves and dial lights), battery crates, chair, aerial wire
  for(const [z,h] of [[-23,0],[-20.6,1]]){ S.add(new THREE.BoxGeometry(.7,.55,1.1),0x2e302c,{p:[-56.2,1.28+h*.02,z]}); atlasQuad(PA,7,.22,.22,0xffffff,{p:[-55.84,1.35,z-.25],r:[0,Math.PI/2,0]}); atlasQuad(PA,7,.22,.22,0xffffff,{p:[-55.84,1.35,z+.2],r:[0,Math.PI/2,0]});
    for(let i=0;i<4;i++) G.add(new THREE.CylinderGeometry(.035,.035,.12,6),0xff9a3a,{p:[-56.3+i*.08,1.62,z-.3+i*.18]}); G.add(new THREE.BoxGeometry(.02,.05,.3),0xffd070,{p:[-55.84,1.16,z]}); }
  for(const [x,z] of [[-55.2,-24.6],[-54.4,-24.6]]) W.box(x-.32,x+.32,0,.5,z-.25,z+.25,0x6a5438,2);
  W.add(new THREE.BoxGeometry(.45,.05,.45),wood,{p:[-54.6,.45,-21.5]}); W.add(new THREE.BoxGeometry(.05,.5,.45),wood,{p:[-54.38,.7,-21.5]});
  for(let i=0;i<6;i++) S.add(new THREE.CylinderGeometry(.012,.012,1.6,4),0x111111,{p:[-57.2,2.6+i*.9,-21.5+Math.sin(i)*.2],r:[0,0,Math.PI/2*0+.05]});
  // kitchen: range with stovepipe and firebox glow, pots, work table, shelf of jars, sacks
  S.add(new THREE.BoxGeometry(2.1,.1,2.1),0x2a2826,{p:[-55.8,1.15,0]}); S.add(new THREE.CylinderGeometry(.14,.14,2.8,8),0x2a2826,{p:[-56.3,2.6,.7]});
  G.add(new THREE.PlaneGeometry(.6,.3),0xff6a20,{p:[-54.79,.45,0],r:[0,Math.PI/2,0]}); for(const z of [-.5,.4]) S.add(new THREE.CylinderGeometry(.22,.18,.28,10),0x3a3a36,{p:[-55.6,1.34,z]});
  W.box(-51.5,-48.5,.82,.9,-2.5,-1,wood,2); for(const [x,z] of [[-51.3,-2.3],[-48.7,-2.3],[-51.3,-1.2],[-48.7,-1.2]]) W.box(x-.06,x+.06,0,.82,z-.06,z+.06,dk,2);
  W.box(-57.55,-57.2,1.6,1.66,-6,-2.5,wood,2); W.box(-57.55,-57.2,2.2,2.26,-6,-2.5,wood,2); if(D) for(let i=0;i<10;i++) S.add(new THREE.CylinderGeometry(.07,.07,.2,6),pick([0x6a5a3a,0x3a4a3a,0x7a6a5a]),{p:[-57.38,1.76+(i%2)*.6,-5.8+(i>>1)*.7]});
  for(let i=0;i<4;i++) S.add(new THREE.SphereGeometry(1,D?8:5,D?6:3),0x8a7a5a,{p:[-43.5,.25,-1.2+i*.55],s:[.3,.28,.25]});
  // upper floor: cots become bunks (frames, upper berths, blankets), lockers; bell frame braces; stair and balcony balusters
  for(const z0 of [-24.5,-20.5,-10.5,-6.5]){ for(const [x,z] of [[-57.15,z0],[-55.25,z0],[-57.15,z0+1],[-55.25,z0+1]]) W.box(x-.05,x+.05,UF,UF+2,z-.05,z+.05,dk,2);
    W.box(-57.2,-55.2,UF+1.3,UF+1.42,z0,z0+1,wood,2); atlasQuad(PA,3,1.9,.9,0xffffff,{p:[-56.2,UF+.62,z0+.5],r:[-Math.PI/2,0,Math.PI/2]}); atlasQuad(PA,3,1.9,.9,0xffffff,{p:[-56.2,UF+1.43,z0+.5],r:[-Math.PI/2,0,Math.PI/2]}); }
  for(let i=0;i<(D?4:2);i++) S.add(new THREE.BoxGeometry(.5,1.8,.5),0x4a5048,{p:[-43,UF+.9,-24.9+i*.55]});
  for(const [x,z,r] of [[-37,-22,.6],[-33,-16,-2.5],[-37,-16,2.5],[-33,-22,-.6]]) W.add(new THREE.BoxGeometry(.12,1.4,.12),dk,{p:[x+(x<-35?.35:-.35),UF+2.7,z+(z<-19?.35:-.35)],r:[r>0?.5:-.5,0,x<-35?-.5:.5]});
  if(D){ for(let x=-40.6;x<-33.2;x+=.4){ const yy=UF*(-33-x)/8; W.box(x-.025,x+.025,yy+UF*0+.0,yy+.95,-1.45,-1.35,dk,2); }
    for(let z=-23.8;z<-16;z+=.35) W.box(-27.25,-27.15,UF,UF+1,z-.03,z+.03,dk,2); for(let x=-30.4;x<-27.2;x+=.35){ W.box(x-.03,x+.03,UF,UF+1,-24.25,-24.15,dk,2); W.box(x-.03,x+.03,UF,UF+1,-15.85,-15.75,dk,2); } }
  W.box(-30.6,-27,UF-.3,UF-.1,-24.2,-15.8,dk,2); for(let x=-30;x<-27;x+=1.2) W.add(new THREE.BoxGeometry(.18,1.6,.18),dk,{p:[x,UF-.9,-20],r:[0,0,.7]});
  // rubble under the open roof and in the corners
  for(const [x,z,n] of [[-40.5,-11.5,7],[-32,-24.5,6],[-41,-24.5,5],[-31.5,-3,5]]) for(let i=0;i<(D?n:2);i++) S.add(new THREE.DodecahedronGeometry(rand(.15,.4)),new THREE.Color().setHSL(.08,.06,rand(.4,.6)).getHex(),{p:[x+rand(-.8,.8),(x<-40&&z>-12)?.1:UF*(z<-13&&x<-36?0:0)+.1,z+rand(-.8,.8)],r:[rand(0,3),rand(0,3),0]});
  // bake and add
  const add=(B,tex)=>{ if(B.count) lvAdd(B.done(CL,.34,2,SUN),lvMat(tex,0xffffff),CHATEAU,false); };
  add(W,plankTex); add(S,stoneTex);
  bakedMesh(PA.done(),CL,.36,SUN,undefined,ATLAS_MAT,CHATEAU);
  CHATEAU.add(new THREE.Mesh(G.done(),new THREE.MeshBasicMaterial({vertexColors:true})));
  CHATEAU.add(new THREE.Mesh(GL.done(),new THREE.MeshBasicMaterial({color:0x9ab0c0,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide})));
  // the bell: a cast bronze bell (lathe) with a clapper, replacing the graybox cone (same mesh object: it stays the quest anchor)
  if(LVL.bell){ const pr=[[.08,.48],[.22,.46],[.3,.38],[.33,.2],[.38,0],[.5,-.3],[.62,-.42],[.6,-.46],[.5,-.44]].map(a=>new THREE.Vector2(a[0],a[1])); const bg=new THREE.LatheGeometry(pr,D?20:12); LVL.bell.geometry.dispose(); LVL.bell.geometry=bg;
    LVL.bell.material=L({color:0x8a6a30,specular:0x806040,shininess:50,side:THREE.DoubleSide}); const cl=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),LVL.bell.material); cl.position.y=-.4; LVL.bell.add(cl);
    const yoke=new THREE.Mesh(new THREE.BoxGeometry(1.1,.18,.22),lvMat(plankTex,0x6a5038)); yoke.position.y=.6; LVL.bell.add(yoke); }
  // moonlight through the upper windows (Medium and High): soft shafts and pale pools on the floor, one mesh each
  if(QUAL){ const sb=GB(), pb=GB(); for(const [x,z,ry,dx,dz] of [[-57.3,-8,Math.PI/2,1,0],[-57.3,-20,Math.PI/2,1,0],[-37,1.4,0,0,-1],[-51,1.4,0,0,-1]]){
      sb.add(new THREE.CylinderGeometry(.5,1.2,4,10,1,true),0xffffff,{p:[x+dx*1.4,UF+1.2,z+dz*1.4],r:[dz?-.6*-dz*-1:0,0,dx?.6:0]});
      pb.add(new THREE.CircleGeometry(1.2,12),0xffffff,{p:[x+dx*3.2,UF+.03,z+dz*3.2],r:[-Math.PI/2,0,0],s:[1.4,1,1]}); }
    const sh=new THREE.Mesh(sb.done(),VOL_MAT2(0x8fa6cc,.05)); CHATEAU.add(sh); LART.chShafts=sh;
    const pool=new THREE.Mesh(pb.done(),new THREE.MeshBasicMaterial({color:0x1a2230,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); CHATEAU.add(pool); }
}

/* ---------------------------------------------------------------- THE UNDERWORKS */
// the dressing has its own group: it draws only when the camera is underground or on a stair (not from the surface)
const UART=new THREE.Group(); UART.name='underArt'; UART.visible=false; scene.add(UART);
{ const UL=LVL.uLights||[], D=QUAL, U=LV.UNDER;
  const BR=lvBuilder(), WD=lvBuilder(), MT=lvBuilder(), ST=lvBuilder(), PA=GB(), GW=GB(), RN=GB(), brick=0x9a8070, wood=0x8a6a48, dk=0x5a4430, iron=0x5a5a56, bone=0xd8ccb0;
  // brick arch ribs along the tunnels (rib = half torus with a square section, piers down to the floor)
  const arch=(cx,cz,alongX,r=2,spring=-5)=>{ BR.add(new THREE.TorusGeometry(r,.2,4,D?12:7,Math.PI),brick,{p:[cx,spring,cz],r:[0,alongX?Math.PI/2:0,0]});
    for(const s of [-1,1]){ const px=alongX?cx:cx+s*r, pz=alongX?cz+s*r:cz; BR.box(px-.22,px+.22,U,spring,pz-.22,pz+.22,brick,2); } };
  for(let x=-62;x<=10;x+=D?4:8) arch(x,-40,true);
  for(let z=-36;z<=-18;z+=D?4:8) arch(-62,z,false);
  for(let z=-40;z<=-32;z+=4) arch(14,z,false);
  arch(-24,-44,false); // ossuary passage
  // timber shoring: frame sets down the shaft stair, ceiling beams and posts in the pump room and cellar
  for(let x=-5;x<8;x+=D?2:4){ const fy=-7*(x+6)/14; for(const z of [-23.8,-20.6]) WD.box(x-.12,x+.12,fy,fy+3.1,z-.12,z+.12,dk,2); WD.box(x-.14,x+.14,fy+3,fy+3.25,-24,-20.4,dk,2); }
  for(let x=9.5;x<24;x+=D?3:6){ WD.box(x-.15,x+.15,-3.2,-2.8,-30,-14,dk,3); for(const z of [-29.7,-14.3]) WD.box(x-.12,x+.12,U,-3.2,z-.12,z+.12,dk,2); }
  for(let x=-65;x<-57;x+=D?2.5:5) WD.box(x-.15,x+.15,-3.35,-3,-16,-6,dk,3);
  // wine cellar: racks of bottles along the walls (bottle ends from the atlas), a cask cradle, a broken barrel
  for(const [x,z0,z1,ry] of [[-65.7,-15.5,-12,Math.PI/2],[-65.7,-10,-6.5,Math.PI/2],[-57,-15.5,-13.6,-Math.PI/2]]){ const len=z1-z0, xi=x+(ry>0?.05:-.05);
    WD.box(Math.min(x,xi+(ry>0?.6:-.6)),Math.max(x,xi+(ry>0?.6:-.6)),U,U+2.2,z0,z1,dk,2); atlasWall(PA,6,xi+(ry>0?.62:-.62),U+1.1,(z0+z1)/2,len,2.0,ry,1,0xffffff); }
  for(let i=0;i<(D?4:2);i++){ const z=-14+i*1.1; WD.add(new THREE.CylinderGeometry(.42,.42,.9,D?12:7),0x6a4a2c,{p:[-59.5,U+.45,z],r:[0,0,Math.PI/2]}); MT.add(new THREE.TorusGeometry(.43,.03,3,D?12:7),iron,{p:[-59.2,U+.45,z],r:[0,Math.PI/2,0]}); MT.add(new THREE.TorusGeometry(.43,.03,3,D?12:7),iron,{p:[-59.8,U+.45,z],r:[0,Math.PI/2,0]}); }
  // pump room: boiler shell with firebox, flywheel and rods, pump cylinders with flanged pipes, gauges
  MT.add(new THREE.CylinderGeometry(1.32,1.32,5.2,D?18:10),0x34302c,{p:[18.5,-5.6,-16.25],r:[0,0,Math.PI/2]});
  for(const x of [16.2,18.5,20.8]) MT.add(new THREE.CylinderGeometry(1.36,1.36,.12,D?18:10),0x6a4a34,{p:[x,-5.6,-16.25],r:[0,0,Math.PI/2]});
  MT.add(new THREE.CylinderGeometry(.3,.35,2.6,8),0x2e2c2a,{p:[17.2,-4,-16.2]}); GW.add(new THREE.PlaneGeometry(.8,.45),0xff6a24,{p:[18.5,-6.3,-17.62]}); MT.box(18,19,-6.6,-6,-17.7,-17.55,0x2a2826,1);
  MT.add(new THREE.TorusGeometry(1.1,.12,6,D?20:10),0x3a3836,{p:[22.6,-5.4,-16.6],r:[0,Math.PI/2,0]}); for(let i=0;i<4;i++) MT.add(new THREE.BoxGeometry(.08,2.1,.1),0x3a3836,{p:[22.6,-5.4,-16.6],r:[i*Math.PI/4,0,0]});
  MT.add(new THREE.CylinderGeometry(.08,.08,3.2,6),0x9a948a,{p:[21.2,-5.2,-17.7],r:[0,0,Math.PI/2+.2]});
  for(const x of [10,13]){ MT.add(new THREE.CylinderGeometry(.42,.42,1.6,10),0x4a4642,{p:[x,-6.2,-14.6]}); for(const y of [-5.4,-7]) MT.add(new THREE.CylinderGeometry(.5,.5,.1,10),0x6a4a34,{p:[x,y,-14.6]}); }
  for(let x=9;x<=22;x+=2.2) MT.add(new THREE.CylinderGeometry(.24,.24,.12,8),0x6a4a34,{p:[x,-3.45,-14.25],r:[0,0,Math.PI/2]});
  MT.add(new THREE.CylinderGeometry(.16,.16,4,8),0x4a4440,{p:[16,-5,-14.3]}); MT.add(new THREE.CylinderGeometry(.16,.16,6,8),0x4a4440,{p:[19,-3.6,-14.3],r:[0,0,Math.PI/2]});
  for(const [x,y,z,ry] of [[17.4,-5,-17.64,0],[19.6,-5,-17.64,0],[23.9,-5,-25,-Math.PI/2]]){ MT.add(new THREE.CylinderGeometry(.17,.17,.06,10),0x8a6a3a,{p:[x,y,z+(ry?0:-.02)],r:[Math.PI/2,ry,0]}); atlasQuad(PA,7,.28,.28,0xffffff,{p:[ry?x-.04:x,y,ry?z:z-.06],r:[0,ry?-Math.PI/2:Math.PI,0]}); }
  MT.add(new THREE.TorusGeometry(.3,.04,5,12),0xa03020,{p:[20.4,-5.8,-14.2]}); MT.box(20.36,20.44,-6.1,-5.5,-14.25,-14.15,0xa03020,1);
  // rail tunnel: a mine cart on the rails (hopper, frame, wheels), coal spilled beside it
  MT.box(-30.2,-27.4,U+.35,U+.5,-40.9,-39.1,0x3a3632,1); for(const [x0,x1,z0,z1] of [[-30.3,-27.3,-41,-40.85],[-30.3,-27.3,-39.15,-39],[-30.3,-30.15,-41,-39],[-27.45,-27.3,-41,-39]]) MT.box(x0,x1,U+.5,U+1.55,z0,z1,0x5a4a3a,1);
  for(const x of [-29.6,-28]) for(const z of [-40.7,-39.3]) MT.add(new THREE.CylinderGeometry(.28,.28,.1,D?12:7),0x2a2826,{p:[x,U+.32,z],r:[Math.PI/2,0,0]});
  for(let i=0;i<(D?10:4);i++) ST.add(new THREE.DodecahedronGeometry(rand(.08,.18)),0x1a1816,{p:[-30.5+rand(0,3.4),U+1.55,-40+rand(-.7,.7)]});
  // hanging cables between the ceiling lamps and caged lamps (the cage is metal, the bulb glows)
  const cable=(a,b)=>{ const n=D?4:2; for(let i=0;i<n;i++){ const t0=i/n, t1=(i+1)/n, s=k=>Math.sin(k*Math.PI)*.35; const p0=[a[0]+(b[0]-a[0])*t0,a[1]+(b[1]-a[1])*t0-s(t0),a[2]+(b[2]-a[2])*t0], p1=[a[0]+(b[0]-a[0])*t1,a[1]+(b[1]-a[1])*t1-s(t1),a[2]+(b[2]-a[2])*t1];
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], dz=p1[2]-p0[2], L_=Math.hypot(dx,dy,dz), g=new THREE.CylinderGeometry(.018,.018,L_,4); g.lookAt?0:0; const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),new V3(dx,dy,dz).normalize()), e=new THREE.Euler().setFromQuaternion(q);
    MT.add(g,0x161412,{p:[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],r:[e.x,e.y,e.z]}); } };
  const lampsU=UL.filter(l=>l[1]<-2.5);
  for(const l of lampsU){ if(D){ for(let i=0;i<4;i++) MT.add(new THREE.BoxGeometry(.02,.32,.02),0x1a1816,{p:[l[0]+Math.cos(i*1.57)*.15,l[1],l[2]+Math.sin(i*1.57)*.15]}); MT.add(new THREE.TorusGeometry(.15,.015,3,8),0x1a1816,{p:[l[0],l[1]-.14,l[2]],r:[Math.PI/2,0,0]}); }
    MT.add(new THREE.CylinderGeometry(.1,.17,.1,8),0x2a2826,{p:[l[0],l[1]+.17,l[2]]}); LART.ulamps.push(l); }
  for(let i=0;i<lampsU.length-1;i++){ const a=lampsU[i], b=lampsU[i+1]; if(Math.hypot(a[0]-b[0],a[2]-b[2])<14) cable([a[0],a[1]+.6,a[2]],[b[0],b[1]+.6,b[2]]); }
  // ossuary: skull walls and bone stacks (atlas), skulls and bones in the niches, the altar cloth and candles
  atlasWall(PA,4,-33.98,-4.6,-53,13.6,4.6,Math.PI/2,1.1,0xffffff); atlasWall(PA,4,-14.02,-4.6,-53,13.6,4.6,-Math.PI/2,1.1,0xffffff);
  for(const cx of [-30,-18]){ atlasWall(PA,5,cx,-4.6,-59.98,8,4.6,0,1.1,0xffffff); atlasWall(PA,5,cx,-4.6,-46.02,8,4.6,Math.PI,1.1,0xffffff); }
  for(let i=0;i<9;i++){ const z=-57.5+i*1.5; for(const [x,sx] of [[-33.6,1],[-14.4,-1]]){ ST.add(new THREE.SphereGeometry(1,D?7:5,D?5:3),bone,{p:[x,U+.82,z],s:[.11,.12,.13]}); if(D) for(let k=0;k<3;k++) ST.add(new THREE.CylinderGeometry(.025,.025,.42,4),bone,{p:[x+sx*.05,U+.66+k*.05,z+rand(-.2,.2)],r:[0,0,Math.PI/2]}); } }
  atlasQuad(PA,3,4.2,2.2,0x8a3020,{p:[-24,U+1.12,-54],r:[-Math.PI/2,0,0]});
  for(const [x,z] of [[-25.6,-53.3],[-22.4,-53.3],[-25.6,-54.7],[-22.4,-54.7],[-24,-53.2]]){ ST.add(new THREE.CylinderGeometry(.04,.05,.25,6),0xe8e0c8,{p:[x,U+1.25,z]}); GW.add(new THREE.ConeGeometry(.03,.08,5),0xffc060,{p:[x,U+1.42,z]}); }
  for(let i=0;i<(D?14:6);i++) ST.add(new THREE.SphereGeometry(1,D?7:5,D?5:3),bone,{p:[-24+rand(-1.6,1.6),U+1.2,-55.4+rand(-.15,.15)],s:[.1,.11,.12],r:[0,rand(-1,1),0]});
  // flooded gallery: plank decking over the walkways, piles in the water, rope rails, brick piers to the ceiling, sluice frame
  for(const [x0,x1,z0,z1,ax] of [[24,46,-23,-21,'x'],[33,35,-32,-12,'z'],[24,46,-14,-12,'x']]){ const L_=ax==='x'?x1-x0:z1-z0, n=Math.floor(L_/(D?.3:.6));
    for(let i=0;i<n;i++){ const a=(ax==='x'?x0:z0)+(i+.5)*L_/n; if(ax==='x') WD.box(a-.12,a+.12,U-.04,U+.02,z0+.05,z1-.05,wood,2); else WD.box(x0+.05,x1-.05,U-.04,U+.02,a-.12,a+.12,wood,2); }
    for(let a=(ax==='x'?x0:z0)+1;a<(ax==='x'?x1:z1);a+=2.5){ for(const s of [0,1]){ const px=ax==='x'?a:(s?x1:x0), pz=ax==='x'?(s?z1:z0):a; WD.box(px-.1,px+.1,-7.6,U+.9,pz-.1,pz+.1,dk,2); } } }
  for(const [x,z] of [[29,-17.5],[29,-27],[40,-17.5],[40,-27]]){ BR.box(x-.45,x+.45,-7.4,-2.6,z-.45,z+.45,brick,2); BR.box(x-.6,x+.6,-3,-2.6,z-.6,z+.6,brick,2); }
  WD.box(45.6,45.95,U-.4,-3.4,-24.5,-19.5,dk,2); for(let z=-24.2;z<-19.6;z+=.5) WD.box(45.5,45.6,U-.4,-3.6,z-.2,z+.2,wood,2);
  // the deep vault: a great furnace door in the south wall (rings, spokes, rivets, a glowing grate), banded pillars,
  // braziers on the dais, hanging chains, a rune ring around the dais and the door
  const DZ=-83.9, DX=-28, DY=-6.4;
  BR.add(new THREE.TorusGeometry(3.9,.45,4,D?24:12,Math.PI),brick,{p:[DX,DY,DZ+.1]}); for(const s of [-1,1]) BR.box(DX+s*3.9-.45,DX+s*3.9+.45,-10,DY,DZ-.3,DZ+.5,brick,2);
  for(const [r,t] of [[3.2,.22],[2.5,.14],[1.6,.14]]) MT.add(new THREE.TorusGeometry(r,t,6,D?32:16),0x34302c,{p:[DX,DY,DZ+.22]});
  MT.add(new THREE.CircleGeometry(3.2,D?32:16),0x262320,{p:[DX,DY,DZ+.12]});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; MT.add(new THREE.BoxGeometry(.16,1.6,.12),0x34302c,{p:[DX+Math.cos(a)*2.4,DY+Math.sin(a)*2.4,DZ+.24],r:[0,0,a+Math.PI/2]}); }
  if(D) for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; MT.add(new THREE.SphereGeometry(.07,5,4),0x5a5048,{p:[DX+Math.cos(a)*2.85,DY+Math.sin(a)*2.85,DZ+.3]}); }
  for(let i=0;i<5;i++) GW.add(new THREE.PlaneGeometry(.12,1.6),0xff4a1a,{p:[DX-.5+i*.25,DY,DZ+.3]}); MT.box(DX-.75,DX+.75,DY-.9,DY+.9,DZ+.16,DZ+.25,0x1a1210,1);
  for(const [x,z] of [[-36,-70],[-20,-70],[-36,-80],[-20,-80]]){ for(const y of [-9.4,-6,-2.4]) MT.box(x-.68,x+.68,y,y+.25,z-.68,z+.68,0x3a3632,2); ST.box(x-.85,x+.85,-10,-9.4,z-.85,z+.85,0x6a6470,2); ST.box(x-.8,x+.8,-1.6,-1,z-.8,z+.8,0x6a6470,2);
    if(D) for(let k=0;k<5;k++){ const cy=-1-k*.28; MT.add(new THREE.TorusGeometry(.12,.025,3,6),0x2a2826,{p:[x+.9,cy,z],r:[0,k%2?Math.PI/2:0,0]}); } }
  for(const [x,z] of [[-30.6,-77.6],[-25.4,-77.6],[-30.6,-72.4],[-25.4,-72.4]]){ MT.add(new THREE.CylinderGeometry(.35,.2,.4,8),0x2a2624,{p:[x,-9.1,z]}); MT.add(new THREE.CylinderGeometry(.06,.1,.6,6),0x2a2624,{p:[x,-9.5,z]}); GW.add(new THREE.SphereGeometry(.26,8,5),0xff5a20,{p:[x,-8.92,z],s:[1,.5,1]}); }
  // rune rings (atlas-free: glowing segments laid in a circle), additive
  const ring=(cx,cy,cz,r,n,vertical)=>{ for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, l=r*6.28/n*.6, kind=i%3; const px=cx+Math.cos(a)*r, py=vertical?cy+Math.sin(a)*r:cy, pz=vertical?cz:cz+Math.sin(a)*r;
      RN.add(new THREE.PlaneGeometry(l,kind?.08:.22),0xffffff,{p:[px,py,pz],r:vertical?[0,0,a+Math.PI/2]:[-Math.PI/2,0,-a+Math.PI/2]}); } };
  ring(-28,-9.58,-75,2.6,D?36:18,false); ring(-28,-9.58,-75,2.0,D?24:12,false); ring(DX,DY,DZ+.32,3.55,D?40:20,true);
  // spawn grates get bars
  if(D) for(const k in LEVEL_SPAWNS) for(const s of LEVEL_SPAWNS[k]) for(let i=0;i<5;i++) MT.box(s[0]-.55,s[0]+.55,s[2]+.04,s[2]+.08,s[1]-.5+i*.25-.03,s[1]-.5+i*.25+.03,0x3a3836,2);
  // bake and add (underground group)
  const add=(B,tex,c)=>{ if(B.count) lvAdd(B.done(UL,.26,2,null,-2.2),lvMat(tex,c||0xffffff),UART,false); };
  add(BR,brickTex,0xb8a898); add(WD,plankTex); add(MT,metalTex,0x8a8680); add(ST,stoneTex);
  bakedMesh(PA.done(),UL,.3,null,-2.2,ATLAS_MAT,UART);
  UART.add(new THREE.Mesh(GW.done(),new THREE.MeshBasicMaterial({vertexColors:true})));
  const rn=new THREE.Mesh(RN.done(),new THREE.MeshBasicMaterial({color:0xc03a20,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); UART.add(rn); LART.runes=rn;
  // dripping water (Medium and High): one Points draw call
  if(QUAL){ const src=[[30,-18],[38,-26],[44,-15],[12,-26],[22,-20],[-20,-52],[-30,-58],[-61,-30],[-10,-40],[-40,-40]], N=40, pos=new Float32Array(N*3), geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const d=[]; for(let i=0;i<N;i++){ const s=src[i%src.length]; d.push({x:s[0]+rand(-1.5,1.5),z:s[1]+rand(-1.5,1.5),y:-3+rand(-.5,0),v:0,t:rand(0,3)}); }
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0x9ab4c0,size:.05,transparent:true,opacity:.7,depthWrite:false})); pts.frustumCulled=false; UART.add(pts); LART.drips={pts,d,pos}; }
}
function updateLevelArt(dt){ const D_=LART.drips; if(D_&&UART.visible){ for(let i=0;i<D_.d.length;i++){ const q=D_.d[i]; if(q.t>0){ q.t-=dt; q.y=-2.9; q.v=0; } else { q.v+=9.8*dt; q.y-=q.v*dt; const fy=floorAt(q.x,-3,q.z); if(q.y<(fy>LV.VOID?fy:-7.2)){ q.t=rand(.6,3.5); if(QUAL===2&&Math.random()<.5) spawnParticles(new V3(q.x,q.y+.05,q.z),'dirt',1); } }
      D_.pos[i*3]=q.x; D_.pos[i*3+1]=q.y; D_.pos[i*3+2]=q.z; } D_.pts.geometry.attributes.position.needsUpdate=true; }
  if(LART.runes&&UART.visible) LART.runes.material.opacity=.55+Math.sin(GT*1.7)*.2; }
