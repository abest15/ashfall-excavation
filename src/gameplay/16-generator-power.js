/* ---------- power: three breaker switches (random anchors each game), then crank the main generator ----------
   Each game three anchors from QA.power (16a-quest-anchors.js) get a breaker, never two in one zone. Every breaker
   needs something different: 'jammed' (knock it loose with five knife blows in quick succession), 'fuse' (seat a fuse
   found in a supply crate or dropped by the dead), 'surge' (throwing it calls a horde). A breaker is "found" when a
   player comes within 7 m; it hums, sparks along its cable and flickers its lamp until thrown. With all three thrown,
   hold E at the generator for 3 s (the dead come while you crank) and the power comes on. */
const GEN={lever:null,inter:null};
{ const g=new THREE.Group(); g.position.set(QA.generator.x,0,QA.generator.z); scene.add(g);
  const body=box(2.2,1.6,3,M.metal,0,.8,0,{parent:g}); addSolid(body); box(2.4,.15,3.2,M.rust,0,1.65,0,{parent:g});
  const fw=cyl(.75,.75,.2,M.dark,-1.2,1,-.6,14,g); fw.rotation.z=Math.PI/2; cyl(.12,.15,2.4,M.rust,.5,2.8,1,6,g); GEN.fw=fw;
  const lb=box(.3,.6,.3,M.dark,-1.25,1,1,{parent:g}); const lever=new THREE.Group(); lever.position.set(-1.45,1.05,1); g.add(lever);
  box(.06,.7,.06,M.metal,0,.3,0,{parent:lever}); box(.14,.14,.14,M.rust,0,.65,0,{parent:lever}); lever.rotation.z=.6; GEN.lever=lever;
  // three indicator lamps on the generator: one lights per thrown breaker
  GEN.lamps=[0,1,2].map(i=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),B({color:0x3a2a1a})); m.position.set(-1.12,1.45,-.5+i*.35); g.add(m); return m; });
  addCol(QA.generator.x,QA.generator.z,2.4,3.2);
  const lab=makeLabel('GENERATOR',{sx:2.2,size:50,color:'#c9a35a'}); lab.position.set(0,2.6,0); g.add(lab);
  GEN.inter=addInter({hold:true,x:QA.generator.use.x,z:QA.generator.use.z,r:2,prompt:genPrompt,use:()=>{}});
}
const PWR={brk:[],crates:[],fuseAt:-1,fuse:false,crank:0,cranking:false,genSurge:false,surge:0,surgeT:0,whackMsg:-9};
const BRK_TYPES={jammed:'rusted solid',fuse:'missing its fuse',surge:'wired to the old alarm line'};
// breaker props: built once, moved onto their anchors by powerLayout()
const BRK_MAT=L({vertexColors:true});
for(let i=0;i<3;i++){ const g=new THREE.Group(); g.visible=false; scene.add(g);
  const b=GB(), S=SEG;
  b.add(new THREE.BoxGeometry(.14,1.9,.14),0x5a3f28,{p:[0,.95,-.12]}); b.add(new THREE.BoxGeometry(.56,.74,.26),0x4b4e51,{p:[0,1.35,.02],grime:.3});
  b.add(new THREE.BoxGeometry(.6,.06,.3),0x6a3a24,{p:[0,1.74,.02]}); b.add(new THREE.BoxGeometry(.42,.5,.02),0x26272a,{p:[0,1.35,.16]});
  b.add(new THREE.CylinderGeometry(.03,.03,.9,S(6,4)),0x3a3a3a,{p:[.2,2.1,-.05]}); b.add(new THREE.BoxGeometry(.3,.04,.04),0x4b4e51,{p:[0,1.98,-.12]});
  b.add(new THREE.BoxGeometry(.16,.12,.1),0xa8823f,{p:[-.12,1.12,.2]}); // fuse holder
  // the cable: a sagging run along the ground behind the post, toward the wall
  for(let k=0;k<5;k++){ const a=-.25-k*.8; b.add(new THREE.BoxGeometry(.05,.05,.82),0x1e1a16,{p:[(k%2?.12:-.05),.03,a],r:[0,(k%2?.16:-.16),0]}); }
  b.add(new THREE.CylinderGeometry(.025,.025,1.1,4),0x1e1a16,{p:[0,.6,-.2],r:[0,0,0]});
  const body=new THREE.Mesh(b.done(),BRK_MAT); g.add(body);
  const lever=new THREE.Group(); lever.position.set(.18,1.35,.2); g.add(lever); box(.05,.36,.05,M.metal,0,.16,0,{parent:lever}); box(.1,.1,.1,M.rust,0,.34,0,{parent:lever}); lever.rotation.x=-.7;
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),B({color:0xf2cb78})); bulb.position.set(0,2.02,.05); g.add(bulb);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),M.add(0xffb050,.25)); bulb.add(glow);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.5),M.metal); hit.position.y=1.35; hit.visible=false; g.add(hit);
  const col={minX:0,maxX:0,minZ:0,maxZ:0,on:false}; colliders.push(col);
  const br={i,g,lever,bulb,glow,hit,col,a:null,type:'surge',found:false,thrown:false,fused:false,whacks:0,whackT:-9,humT:0,flick:0};
  br.o=addInter({x:0,z:0,r:1.9,prompt:()=>brkPrompt(br),use:()=>qAct('brk',i)}); PWR.brk.push(br); }
// supply crates (one hides the fuse)
const CRATE_MAT=L({map:plankTex,color:0x9a8460});
QA.fuse.forEach((a,i)=>{ const g=new THREE.Group(); g.position.set(a.x,qy(a),a.z); g.rotation.y=i*1.3; scene.add(g);
  box(.8,.45,.55,CRATE_MAT,0,.23,0,{parent:g}); const lid=new THREE.Group(); lid.position.set(0,.46,-.27); g.add(lid); box(.84,.06,.58,CRATE_MAT,0,0,.29,{parent:lid});
  box(.5,.12,.02,M.dark,0,.26,.285,{parent:g});
  addCol(a.x,a.z,.8,.8); const c={i,a,g,lid,searched:false}; PWR.crates.push(c);
  addInter({x:a.x,z:a.z,r:1.6,prompt:()=>c.searched?null:'Search the supply crate',use:()=>qAct('crate',i)}); });
function powerLayout(r){ const pool=qShuffle(QA.power,r), used=new Set(), pickA=[];
  for(const a of pool){ if(pickA.length>=3) break; if(used.has(a.zone)) continue; used.add(a.zone); pickA.push(a); }
  const types=qShuffle(['jammed','fuse','surge'],r);
  PWR.brk.forEach((br,i)=>{ const a=pickA[i]; br.a=a; br.type=types[i]; br.found=br.thrown=br.fused=false; br.whacks=0; br.whackT=-9;
    br.g.position.set(a.x,qy(a),a.z); br.g.rotation.y=a.ry||0; br.g.visible=true; br.lever.rotation.x=-.7; br.bulb.material.color.set(0xf2cb78);
    Object.assign(br.col,{minX:a.x-.4,maxX:a.x+.4,minZ:a.z-.4,maxZ:a.z+.4,on:true}); addSolid(br.hit);
    const fx=Math.sin(a.ry||0), fz=Math.cos(a.ry||0); br.o.x=a.x+fx*1.1; br.o.z=a.z+fz*1.1; });
  PWR.fuseAt=Math.floor(r()*QA.fuse.length); PWR.fuse=false; PWR.crank=0; PWR.genSurge=false; PWR.surge=0;
  PWR.crates.forEach(c=>{ c.searched=false; c.lid.rotation.x=0; }); GEN.lamps.forEach(m=>m.material.color.set(0x3a2a1a)); }
const brkThrown=()=>PWR.brk.filter(b=>b.thrown).length, brkFound=()=>PWR.brk.filter(b=>b.found).length;
function brkPrompt(br){ if(POWER.on||!br.a||br.thrown) return null;
  if(br.type==='jammed'&&br.whacks<5) return `!The breaker is rusted solid. Knock it loose with your knife (${br.whacks}/5)`;
  if(br.type==='fuse'&&!br.fused) return QI.has('fuse')?'Seat the fuse in the breaker':'!The fuse holder is empty. Search the supply crates for a fuse';
  return br.type==='surge'?'Throw the breaker switch (the alarm line is live)':'Throw the breaker switch'; }
function genPrompt(){ if(POWER.on) return null; const n=brkThrown();
  if(n<3) return `!The generator is dead. Breakers thrown ${n}/3`;
  return `Hold to crank the generator${PWR.crank>0?' · '+Math.min(100,Math.round(PWR.crank/3*100))+'%':''}`; }
QACT.brk=(i)=>{ const br=PWR.brk[i]; if(!br||!br.a||br.thrown||POWER.on) return; br.found=true;
  if(br.type==='jammed'&&br.whacks<5) return;
  if(br.type==='fuse'&&!br.fused){ if(!QI.has('fuse')) return; QI.delete('fuse'); br.fused=true; qSound('clank',br.a.x,br.a.z,30); qEv('toast',{s:'The fuse clicks home'}); return; }
  br.thrown=true; br.lever.rotation.x=.7; qSound('breaker',br.a.x,br.a.z,60); const n=brkThrown();
  if(br.type==='surge'){ PWR.surge+=5+2*NP(); PWR.surgeT=.5; qSound('alarm',br.a.x,br.a.z,120); banner('The alarm line howls',`Breaker ${n}/3 thrown. The dead heard that`); }
  else if(n<3) banner(`Breaker thrown (${n}/3)`,'Find the others. Listen for the hum');
  if(n===3) banner('All three breakers thrown','Crank the main generator in the yard. Hold on while it catches'); };
QACT.whack=(i)=>{ const br=PWR.brk[i]; if(!br||br.type!=='jammed'||br.thrown||br.whacks>=5) return; br.found=true;
  if(GT-br.whackT>2.2&&br.whacks>0){ br.whacks=0; qEv('toast',{s:'It seized up again. Keep the blows coming'}); }
  br.whacks++; br.whackT=GT; qSound('jam',br.a.x,br.a.z,30,br.whacks); qEv('fx',{p:[br.a.x,1.4,br.a.z],t:'spark',n:5});
  if(br.whacks>=5) qEv('toast',{s:'The breaker grinds loose'}); };
QEV.fx=m=>spawnParticles(new V3(m.p[0],m.p[1],m.p[2]),m.t,m.n||4);
QACT.crate=(i,who)=>{ const c=PWR.crates[i]; if(!c||c.searched) return; c.searched=true; c.lid.rotation.x=-1.9; qSound('crate',c.a.x,c.a.z,25);
  if(i===PWR.fuseAt&&!QI.has('fuse')&&!PWR.brk.some(b=>b.fused)) qDrop('fuse',c.a.x,c.a.z,'Take the breaker fuse',0xd9a040,.1);
  else if(Math.random()<.35){ addPts(250); qEv('toast',{s:'Tucked under the straw: +250'},who); } else qEv('toast',{s:'Mouldy rations and nothing else'},who); };
QTAKE.fuse=()=>{ QI.add('fuse'); qSound('pup'); qEv('toast',{s:'Breaker fuse recovered'}); };
QACT.crank=()=>{ if(POWER.on||brkThrown()<3||PWR.genSurge) return; PWR.genSurge=true; PWR.surge+=4+2*NP(); PWR.surgeT=1; qSound('crank',QA.generator.x,QA.generator.z,50); banner('The generator coughs','Keep cranking. Hold them off'); };
QACT.gen=()=>{ if(POWER.on||brkThrown()<3) return; powerOn(); bcast({t:'power'}); rite(); };
function questMelee(){ const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw);
  for(const br of PWR.brk){ if(!br.a||br.thrown||br.type!=='jammed'||br.whacks>=5) continue; const dx=br.a.x-P.pos.x, dz=br.a.z-P.pos.z, d=Math.hypot(dx,dz);
    if(d<2.6&&(d<.8||(dx*fx+dz*fz)/d>.3)){ qAct('whack',br.i); return; } } }
function updatePower(dt){
  const host=NET.role!=='client';
  for(const br of PWR.brk){ if(!br.a) continue; const ax=br.a.x, az=br.a.z;
    if(host&&!br.found&&!POWER.on){ for(const p of questPlayers()) if(p.m==='main'&&Math.hypot(p.x-ax,p.z-az)<7){ br.found=true; const n=brkFound(); banner(`A breaker switch (${n}/3 found)`,`This one is ${BRK_TYPES[br.type]}`); qSound('relic'); break; } }
    if(POWER.on||br.thrown){ br.bulb.material.color.set(POWER.on?0xffe0a0:0x9ad06a); br.glow.material.opacity=.25; continue; }
    const d=Math.hypot(P.pos.x-ax,P.pos.z-az);
    br.flick-=dt; if(br.flick<=0){ br.flick=rand(.05,.35); const on=Math.random()<.6; br.bulb.material.color.set(on?0xf2cb78:0x3a3326); br.glow.material.opacity=on?.3:.02; }
    if(d<30&&mode==='main'&&Math.random()<dt*2.5){ const k=rand(.6,4), a=br.g.rotation.y; spawnParticles(new V3(ax-Math.sin(a)*k,.12,az-Math.cos(a)*k),'spark',2); }
    br.humT-=dt; if(br.humT<=0){ br.humT=2.4; if(d<26&&mode==='main'&&!P.inCabin) sfxAt('hum',{x:ax,z:az},26); } }
  for(let i=0;i<3;i++) GEN.lamps[i].material.color.set(POWER.on?0xffe0a0:i<brkThrown()?0x9ad06a:0x3a2a1a);
  // hold E at the generator
  const crankable=!POWER.on&&brkThrown()>=3&&curInter&&curInter.o===GEN.inter&&!P.downed&&!P.dead;
  if(crankable&&(keys.KeyE||PAD.useHeld)){ if(PWR.crank===0) qAct('crank'); PWR.crank+=dt; GEN.fw.rotation.x+=dt*6; if(Math.random()<dt*6) spawnParticles(new V3(QA.generator.x-1.2,1.4,QA.generator.z-.6),'spark',1);
    if(PWR.crank>=3){ PWR.crank=0; qAct('gen'); } }
  else PWR.crank=Math.max(0,PWR.crank-dt*2);
  if(POWER.on) GEN.fw.rotation.x+=dt*4;
  // the horde surge (host)
  if(host&&PWR.surge>0&&mode==='main'){ PWR.surgeT-=dt; if(PWR.surgeT<=0&&aliveCount()<maxAlive()){ PWR.surgeT=.45; PWR.surge--; const z=spawnZombie('walker'); if(z) z.speed=Math.max(z.speed,rand(3.5,4.1)*DF().spd); } }
}
function powerOn(){ POWER.on=true; GEN.lever.rotation.z=-.6; LAMPS.forEach(l=>l.intensity=1.1); bulbs.forEach(b=>b.material.color.set(0xf2cb78)); tonicPanels.forEach(t=>t.pm.emissiveIntensity=.9); forgeLight.intensity=1.6; FORGE.mouth.material.color.set(0xff7a2a); sfx.power(); banner('Power restored','The site hums back to life'); }
