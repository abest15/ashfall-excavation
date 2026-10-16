/* ---------- power-ups ---------- */
const PUPS=[]; const PUP_DEF={ammo:{t:'AMMO',c:0xc9a35a,css:'#c9a35a'},double:{t:'2X',c:0xf2cb78,css:'#f2cb78'},insta:{t:'KILL',c:0xe7ddcc,css:'#e7ddcc'},nuke:{t:'BLAST',c:0xff7a2a,css:'#ff7a2a'},
  health:{t:'HEALTH',c:0xe06a5a,css:'#e06a5a'},points:{t:'BONUS',c:0xb8e07a,css:'#b8e07a'},freeze:{t:'FREEZE',c:0x9fe6ff,css:'#9fe6ff'},sale:{t:'SALE',c:0x8ad0e8,css:'#8ad0e8'},gatling:{t:'GATLING',c:0xff5a2a,css:'#ff6a3a'}};
const PUP_W=[['ammo',17],['double',15],['insta',13],['nuke',9],['health',14],['points',10],['freeze',8],['sale',6],['gatling',4]];
function pickPup(){ let t=0; for(const e of PUP_W) t+=e[1]; let r=Math.random()*t; for(const [k,w] of PUP_W){ if((r-=w)<0) return k==='sale'&&mode==='hollow'?'ammo':k; } return 'ammo'; }
function dropPup(x,z,type){ type=type||pickPup(); PUPS.push({g:pupVisual(type,x,z),type,life:25,id:++NET.pupId}); }
function pupVisual(type,x,z){ const D=PUP_DEF[type]; const g=new THREE.Group(); g.position.set(x,1,z); scene.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.06,6,22),B({color:D.c})); g.add(ring); const ring2=new THREE.Mesh(new THREE.TorusGeometry(.42,.03,6,22),M.add(D.c,.6)); ring2.rotation.y=Math.PI/2; g.add(ring2);
  const lab=makeLabel(D.t,{sx:.9,size:76,color:D.css,fog:false}); g.add(lab); return g; }
function updatePups(dt){ for(let i=PUPS.length-1;i>=0;i--){ const q=PUPS[i]; q.life-=dt; q.g.rotation.y+=dt*2; q.g.position.y=1+Math.sin(GT*3+i)*.15; q.g.visible=q.life>6||Math.sin(GT*18)>0;
  if(!P.downed&&!P.dead&&Math.hypot(q.g.position.x-P.pos.x,q.g.position.z-P.pos.z)<1.5){ pupShared(q.type,'h'); scene.remove(q.g); PUPS.splice(i,1); continue; }
  if(q.life<=0){ scene.remove(q.g); PUPS.splice(i,1); } }
  if(PU.double>0) PU.double-=dt; if(PU.insta>0) PU.insta-=dt; if(PU.freeze>0) PU.freeze-=dt; if(PU.sale>0) PU.sale-=dt;
  if(PU.gatling>0){ PU.gatling-=dt; if(PU.gatling<=0){ PU.gat=null; P.swapT=.4; buildVM(); toast('The Gatling burns out'); } } }
function applyPup(t){ sfx.pup();
  if(t==='ammo'){ for(const w of P.weapons){ w.res=statsOf(w).res; } if(P.lureOwned) P.lures=3; toast('Max ammo'); }
  else if(t==='double'){ PU.double=30; toast('Double points'); }
  else if(t==='insta'){ PU.insta=30; toast('Instant kill'); }
  else if(t==='health'){ P.hp=P.maxHp; P.shield=Math.min(100,P.shield+50); toast('Max health, plus armor'); }
  else if(t==='points'){ addPts(Math.min(1500,250*(1+Math.floor(R.n/5)))); toast('Bonus points'); }
  else if(t==='freeze'){ PU.freeze=15; toast('Still Time: the dead slow to a crawl'); }
  else if(t==='sale'){ PU.sale=30; toast('Fire sale: the relic crate costs 10'); }
  else if(t==='gatling'){ PU.gatling=20; PU.gat=mkInst('gatling'); P.swapT=.3; buildVM(); banner('Ember Gatling','Twenty seconds. Make them count',true); }
  else if(t==='nuke'){ for(const z of zombies) if(!z.dead&&!z.boss&&z.rise<=0){ spawnParticles(z.g.position.clone().setY(1.2),'ember',3); killZombie(z,'body',true); } for(const z of zombies) if(!z.dead&&!z.boss){ killZombie(z,'body',true);} addPts(400); flashScreen(); toast('Blast'); } }
