/* ---------- WebAssembly simulation core · lane 7 ----------
   Zombie locomotion (flow-field pathing, crowd steering, wall collision) runs in sim/ (Rust -> wasm32) when it
   loads; otherwise updateZombies keeps its original JavaScript path untouched. Only movement maths moves to
   WASM: targets, attacks, windows, rising, bosses, hounds, lures and co-op host authority stay in JS.
     ?sim=js        force the JavaScript fallback
     F3 overlay     "sim" row: active path and ms per frame spent in updateZombies (+ the WASM step)
     ashfallSim     console helpers: .mode, .use('js'|'wasm'), .spawn(n), .bench()
   The .wasm comes from window.__ASHFALL_SIM_WASM (base64, single-file build) or assets/sim.wasm.
   Hooks called from 25-zombies.js: wsimBegin, wsimAim, wsimAgent, wsimEnd. */
const WSIM={want:true,ready:false,on:false,failed:null,ex:null,A:null,C:null,O:null,MAXA:0,NF:0,MAXC:0,NS:0,
  owner:[],seen:null,hwm:0,frame:0,colN:-1,t0:0,ms:0,stepMs:0,fields:0,agents:0,aim:{x:0,z:0}};
// agent struct-of-arrays field order (must match sim/src/lib.rs)
const WF={X:0,Z:1,VX:2,VZ:3,SPD:4,RAD:5,TX:6,TZ:7,STOP:8,FLAGS:9,SLOT:10,DX:11,DZ:12,ST:13,LX:14,LZ:15,NUDGE:16,NSIDE:17};
try{ if(new URLSearchParams(location.search).get('sim')==='js') WSIM.want=false; }catch(e){}

function wsimLoad(){
  if(!WSIM.want){ WSIM.failed='forced (?sim=js)'; return; }
  if(typeof WebAssembly!=='object'){ WSIM.failed='no WebAssembly'; return; }
  const b64=window.__ASHFALL_SIM_WASM;
  const bytes=b64?Promise.resolve(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)))
    :fetch('assets/sim.wasm').then(r=>{ if(!r.ok) throw new Error('assets/sim.wasm: HTTP '+r.status); return r.arrayBuffer(); });
  bytes.then(b=>WebAssembly.instantiate(b,{})).then(r=>wsimInit(r.instance)).catch(e=>{
    WSIM.failed=String(e&&e.message||e); console.warn('[sim] WebAssembly core unavailable, using the JavaScript path:',WSIM.failed); });
}
function wsimInit(inst){
  const ex=inst.exports; WSIM.ex=ex; ex.sim_init(0x9e3779b9);
  WSIM.MAXC=ex.sim_limits(0); WSIM.MAXA=ex.sim_limits(1); WSIM.NF=ex.sim_limits(2); WSIM.NS=ex.sim_limits(3);
  WSIM.seen=new Int32Array(WSIM.MAXA); wsimViews();
  ex.sim_bounds(CABX,HX,HZ,22.5);
  // nav grids, 1 m cells: the trench network (with a margin outside the outer walls) and the Hollow's arena
  ex.sim_nav_region(0,-36,-36,142,92,1,0,0,0);
  ex.sim_nav_region(1,HX-24,HZ-24,48,48,1,HX,HZ,22.5);
  WSIM.colN=-1; WSIM.ready=true; WSIM.on=WSIM.want;
}
function wsimViews(){ const buf=WSIM.ex.memory.buffer; if(WSIM.A&&WSIM.A.buffer===buf) return;
  WSIM.A=new Float32Array(buf,WSIM.ex.sim_agents_ptr(),WSIM.NF*WSIM.MAXA);
  WSIM.C=new Float64Array(buf,WSIM.ex.sim_col_ptr(),WSIM.MAXC*5);
  WSIM.O=new Float64Array(buf,WSIM.ex.sim_out_ptr(),4); }
// mirror `colliders` (the boxes collide() uses); only a real change rebuilds the broadphase and nav grids
function wsimSyncWorld(){ const C=WSIM.C, n=Math.min(colliders.length,WSIM.MAXC); let dirty=n!==WSIM.colN;
  for(let i=0;i<n;i++){ const c=colliders[i], b=i*5, on=c.on?1:0;
    if(C[b]!==c.minX||C[b+1]!==c.maxX||C[b+2]!==c.minZ||C[b+3]!==c.maxZ||C[b+4]!==on){ C[b]=c.minX; C[b+1]=c.maxX; C[b+2]=c.minZ; C[b+3]=c.maxZ; C[b+4]=on; dirty=true; } }
  if(dirty){ WSIM.ex.sim_world_commit(n); WSIM.colN=n; } }

// start of updateZombies: returns true when this frame's locomotion goes through WASM
function wsimBegin(dt){ WSIM.t0=performance.now(); if(!WSIM.on) return false;
  const ex=WSIM.ex; wsimViews(); wsimSyncWorld(); WSIM.frame++;
  // slot 0 seeds: every player zTarget would hunt, so the field leads each zombie to the nearest one by path
  ex.sim_targets_clear(); ex.sim_players_clear(); let nt=0;
  if(!(P.downed||P.dead||P.inCabin)){ ex.sim_target_add(0,P.pos.x,P.pos.z); nt++; }
  ex.sim_player_add(P.pos.x,P.pos.z);
  if(NET.role==='host') for(const id in NET.remotes){ const st=NET.remotes[id].st; if(!st) continue; if(st.m===mode) ex.sim_player_add(st.x,st.z);
    if(!st.dn&&!st.dd&&!st.cab&&st.m===mode){ ex.sim_target_add(0,st.x,st.z); nt++; } }
  if(!nt) ex.sim_target_add(0,P.pos.x,P.pos.z);
  // slots 1..: active lures (more than that steer straight at the lure)
  let s=1; for(const q of LURES){ q._wslot=0; if(q.active&&s<WSIM.NS){ q._wslot=s; ex.sim_target_add(s,q.p.x,q.p.z); s++; } }
  WSIM.fields+=ex.sim_fields_update(); WSIM.agents=0;
  return true; }
function wsimSlot(z){ const MA=WSIM.MAXA; let i=z._ws;
  if(i==null||WSIM.owner[i]!==z){ i=-1; for(let k=0;k<MA;k++) if(!WSIM.owner[k]){ i=k; break; } if(i<0) return -1;
    WSIM.owner[i]=z; z._ws=i; const A=WSIM.A; for(let f=0;f<WSIM.NF;f++) A[f*MA+i]=0;
    A[WF.LX*MA+i]=z.g.position.x; A[WF.LZ*MA+i]=z.g.position.z; if(i>=WSIM.hwm) WSIM.hwm=i+1; }
  WSIM.seen[i]=WSIM.frame; return i; }
// steering point for the facing/route maths in updateZombies: last step's flow direction (or the target)
function wsimAim(z,p,tgx,tgz){ const a=WSIM.aim, i=z._ws, MA=WSIM.MAXA; a.x=tgx; a.z=tgz;
  if(i!=null&&WSIM.owner[i]===z){ const dx=WSIM.A[WF.DX*MA+i], dz=WSIM.A[WF.DZ*MA+i]; if(dx||dz){ a.x=p.x+dx; a.z=p.z+dz; } }
  return a; }
// registers one zombie for this frame's batch step; false (slots full) means "move it the JS way"
function wsimAgent(z,moving,tgx,tgz,lu){ const i=wsimSlot(z); if(i<0) return false; const A=WSIM.A, MA=WSIM.MAXA, p=z.g.position;
  A[WF.X*MA+i]=p.x; A[WF.Z*MA+i]=p.z; A[WF.SPD*MA+i]=z.speed*(PU.freeze>0?.35:1); A[WF.RAD*MA+i]=z.boss?.7:.33;
  A[WF.TX*MA+i]=tgx; A[WF.TZ*MA+i]=tgz; A[WF.STOP*MA+i]=lu?1:z.reach*.8;
  A[WF.FLAGS*MA+i]=1|(moving?2:0)|(z.boss?4:0); A[WF.SLOT*MA+i]=lu?(lu._wslot||WSIM.NS):0; WSIM.agents++;
  return true; }
// end of updateZombies: one batch step for every registered zombie, then positions go back to the meshes
function wsimEnd(ws,dt){
  if(ws){ const t=performance.now(), A=WSIM.A, MA=WSIM.MAXA, own=WSIM.owner;
    for(let i=0;i<WSIM.hwm;i++) if(own[i]&&(WSIM.seen[i]!==WSIM.frame||own[i].dead)){ own[i]=null; A[WF.FLAGS*MA+i]=0; }
    while(WSIM.hwm>0&&!own[WSIM.hwm-1]) WSIM.hwm--;
    if(WSIM.hwm) WSIM.ex.sim_step(WSIM.hwm,dt);
    for(let i=0;i<WSIM.hwm;i++){ const z=own[i]; if(!z) continue; z.g.position.x=A[WF.X*MA+i]; z.g.position.z=A[WF.Z*MA+i]; }
    WSIM.stepMs+=(performance.now()-t-WSIM.stepMs)*.05; }
  WSIM.ms+=(performance.now()-WSIM.t0-WSIM.ms)*.05; }
function wsimLabel(){ const m=WSIM.on?'WASM':'JS'; const why=WSIM.on?'':WSIM.failed?' ('+WSIM.failed+')':WSIM.ready?' (switched)':' (loading)';
  return m+' · '+WSIM.ms.toFixed(2)+' ms'+(WSIM.on?' (step '+WSIM.stepMs.toFixed(2)+')':why); }

// ---- debug and benchmark helpers (console: ashfallSim.spawn(120), ashfallSim.bench())
function wsimFreeSpot(rng){ for(let k=0;k<200;k++){ const zs=Object.keys(ZONES).filter(n=>n!=='H'&&ZONES[n].open), zn=zs[Math.floor(rng()*zs.length)]||'A';
    const c=ZONES[zn].c, x=c.x+(rng()-.5)*36, z=c.z+(rng()-.5)*36; if(zoneOf(x,z)!==zn) continue;
    const p={x,z}; collide(p,.4); if(Math.abs(p.x-x)<1e-6&&Math.abs(p.z-z)<1e-6&&Math.hypot(x-P.pos.x,z-P.pos.z)>4) return p; } return {x:P.pos.x+3,z:P.pos.z+3}; }
function wsimRng(seed){ let s=seed>>>0||1; return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296); }
// spawns n walking zombies already risen at free spots of the open zones (host / solo only)
function wsimStress(n,kind,seed){ if(NET.role==='client'||(state!=='play'&&state!=='paused')) return 0; const rng=wsimRng(seed||Date.now()); let c=0;
  for(let k=0;k<n;k++){ const z=spawnZombie(kind||'walker'); if(!z) break; const s=mode==='hollow'?{x:HX+(rng()-.5)*30,z:HZ+(rng()-.5)*30}:wsimFreeSpot(rng);
    z.win=null; z.wstate=null; z.rise=0; z.g.position.set(s.x,0,s.z); z.tx=s.x; z.tz=s.z; z.lx=s.x; z.lz=s.z; c++; }
  return c; }
// The game's JS locomotion block (route + separation + collide), lifted verbatim, for a locomotion-only comparison
function wsimLocoJS(list,dt){ const pz=zoneOf(P.pos.x,P.pos.z)||P.zone;
  for(const z of list){ const p=z.g.position, tgx=P.pos.x, tgz=P.pos.z, tzone=zoneOf(tgx,tgz)||pz, zf=zoneOf(p.x,p.z); let tx=tgx, tz=tgz;
    if(zf&&tzone&&zf!==tzone){ const r=route(zf,tzone); if(r){ const d=r.door; const dd=Math.hypot(p.x-d.x,p.z-d.z); if(dd<2.6){ const nc=ZONES[r.next].c; const vx=nc.x-d.x, vz=nc.z-d.z, l=Math.hypot(vx,vz)||1; tx=d.x+vx/l*4; tz=d.z+vz/l*4; } else { tx=d.x; tz=d.z; } } z.tx=tx; z.tz=tz; }
    else if(!zf){ tx=z.tx; tz=z.tz; if(Math.hypot(tx-p.x,tz-p.z)<.5){ tx=tgx; tz=tgz; } }
    let dx=tx-p.x, dz=tz-p.z; let dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl; const zs=z.speed;
    let sx=0,sz=0; for(const o of list){ if(o===z) continue; const ox=p.x-o.g.position.x, oz=p.z-o.g.position.z, od=ox*ox+oz*oz; const rr_=(z.boss||o.boss)?1.6:.7; if(od<rr_*rr_&&od>1e-4){ const k=(rr_-Math.sqrt(od))/rr_; sx+=ox*k*2; sz+=oz*k*2; } }
    if(z.nudge>0){ z.nudge-=dt; sx+=-dz*z.nside*1.2; sz+=dx*z.nside*1.2; }
    p.x+=(dx*zs+sx)*dt; p.z+=(dz*zs+sz)*dt; collide(p,z.boss?.7:.33);
    const pd=Math.hypot(P.pos.x-p.x,P.pos.z-p.z), minD=z.boss?1.2:.72; if(pd<minD&&pd>1e-3){ p.x-=(P.pos.x-p.x)/pd*(minD-pd); p.z-=(P.pos.z-p.z)/pd*(minD-pd); }
    z.stuckT+=dt; if(z.stuckT>.8){ const moved=Math.hypot(p.x-z.lx,p.z-z.lz); if(moved<zs*.8*.25){ z.nudge=.9; z.nside=Math.random()<.5?-1:1; } z.stuckT=0; z.lx=p.x; z.lz=p.z; } } }
// Per count: full updateZombies ms/frame (JS vs WASM; AI and animation are identical in both) and the
// locomotion-only cost (the JS block above vs one WASM batch step). Opens every door; debug use only.
function wsimBench(counts,frames){ counts=counts||[24,60,120]; frames=frames||240; if(!WSIM.ready) return {error:'wasm not loaded: '+(WSIM.failed||'loading')};
  if(NET.role==='client'||(state!=='play'&&state!=='paused')) return {error:'start a solo game first'};
  DOORS.forEach(d=>{ if(!d.open) openDoor(d); }); const keep=WSIM.on, dt=1/60, out=[];
  const clear=()=>{ for(const z of zombies) scene.remove(z.g); zombies.length=0; zparts=[]; };
  const hold=()=>{ P.hp=P.maxHp; P.invuln=5; P.downed=false; P.dead=false; P.pos.set(0,0,44); };
  const run=(n,useWasm)=>{ clear(); hold(); WSIM.on=useWasm; wsimStress(n,'walker',1234+n); for(const z of zombies){ z.speed=2.5; }
    for(let k=0;k<20;k++){ hold(); updateZombies(dt); } let t=0, worst=0;
    for(let k=0;k<frames;k++){ hold(); const t0=performance.now(); updateZombies(dt); const e=performance.now()-t0; t+=e; if(e>worst) worst=e; }
    return {ms:t/frames,worst}; };
  const loco=(n,useWasm)=>{ clear(); hold(); WSIM.on=true; wsimStress(n,'walker',777+n); const list=zombies.slice(); for(const z of list) z.speed=2.5;
    const ex=WSIM.ex; let t=0;
    for(let k=0;k<frames;k++){ hold(); const t0=performance.now();
      if(useWasm){ wsimBegin(dt); for(const z of list) wsimAgent(z,true,P.pos.x,P.pos.z,null); wsimEnd(true,dt); }
      else wsimLocoJS(list,dt);
      t+=performance.now()-t0; }
    return t/frames; };
  for(const n of counts){ const js=run(n,false), wa=run(n,true), lj=loco(n,false), lw=loco(n,true);
    out.push({zombies:n,updateJS:+js.ms.toFixed(3),updateWASM:+wa.ms.toFixed(3),worstJS:+js.worst.toFixed(2),worstWASM:+wa.worst.toFixed(2),locoJS:+lj.toFixed(3),locoWASM:+lw.toFixed(3)}); }
  clear(); WSIM.on=keep; return out; }
window.ashfallSim={
  get mode(){ return WSIM.on?'wasm':'js'; }, get ready(){ return WSIM.ready; }, get failed(){ return WSIM.failed; },
  use(m){ WSIM.on=m==='wasm'&&WSIM.ready; return this.mode; },
  spawn(n,kind){ return wsimStress(n||60,kind); }, bench:wsimBench,
  stats(){ return {mode:this.mode,ms:WSIM.ms,stepMs:WSIM.stepMs,agents:WSIM.agents,fieldsBuilt:WSIM.fields}; },
};
wsimLoad();
