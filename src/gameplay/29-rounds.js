/* ---------- rounds ---------- */
const zCount=n=>n<=4?[0,6,8,13,18][n]:Math.min(26+(n-5)*6,110);
const maxAlive=()=>Math.min(24,(SETTINGS.scale<.6?18:24)+6*(NP()-1)); // never more than 24 alive (Low budgets)
const PMULT=()=>[1,1.6,2.2,2.8][Math.min(4,NP())-1];
function startRound(n){ R.rebuild=0; R.n=n; R.hound=n>=5&&n%5===0; R.houndPos=null; R.toSpawn=Math.round((R.hound?Math.min(8+n,32):zCount(n))*PMULT()); R.inBreak=false; R.spawnT=2; R.pups=0; R.markedDone=false; R.total=R.toSpawn; if(n>=6&&(n-6)%5===0) R.bossDue=true;
  setRoundHud(n,true); sfx.roundStart(); bcast({t:'ev',k:'round',n}); if(P.dead) respawn(); if(R.hound){ banner('The ash is howling','Hound round · '+R.toSpawn+' hounds'); sfx.howl(); } MOUNDS.forEach(m=>{ m.dug=false; m.m.scale.y=1; }); }
function updateRounds(dt){
  if(mode==='main'){
    if(R.inBreak){ R.breakT-=dt; if(R.breakT<=0) startRound(R.n+1); return; }
    R.spawnT-=dt; const alive=aliveCount();
    if(R.spawnT<=0&&R.toSpawn>0&&alive<maxAlive()){ let kind='walker';
      if(R.hound) kind='hound';
      else if(R.n>=2&&!Q.frag.marked&&!R.markedDone&&!pickups.some(k=>k.key==='marked')&&R.toSpawn<R.total-2){ kind='marked'; R.markedDone=true; }
      else if((kind=pickSpecial()||'walker')!=='walker'){} // Shrieker (8+) / Sapper (10+), 19c-specials.js
      else if(R.n>=7&&Math.random()<Math.min(.14,.03+R.n*.005)) kind='burster';
      spawnZombie(kind); R.toSpawn--; R.spawnT=R.hound?Math.max(.6,1.4-R.n*.03):Math.max(.45,2.1-R.n*.12); }
    if(R.bossDue&&R.toSpawn<R.total*.6){ R.bossDue=false; spawnZombie('boss'); }
    if(Q.stage==='awakening'){ Q.spawnT-=dt; if(Q.spawnT<=0&&alive<maxAlive()){ Q.spawnT=Math.max(.7,1.2-R.n*.02); spawnZombie(R.n>=7&&Math.random()<.15?'burster':'walker'); } }
    if(R.toSpawn<=0&&alive===0&&Q.stage!=='awakening'&&!questHoldsRound()){ R.inBreak=true; R.breakT=9; sfx.roundEnd(); bcast({t:'ev',k:'roundEnd'}); if(R.hound&&R.houndPos){ dropPup(R.houndPos.x,R.houndPos.z,'ammo'); R.houndPos=null; toast('The howling stops'); } }
  } else {
    if(HL.inBreak){ HL.breakT-=dt; if(HL.breakT<=0&&HL.wave<4&&!HL.gateOpen) startWave(HL.wave+1); return; }
    if(HL.primeT>0){ HL.primeT-=dt; if(HL.primeT<=0) spawnZombie('prime'); }
    HL.spawnT-=dt; const alive=aliveCount();
    if(HL.spawnT<=0&&HL.toSpawn>0&&alive<maxAlive()){ spawnZombie(HL.wave===3&&Math.random()<.35?'hound':HL.wave>=2&&Math.random()<.12?'burster':'hollow'); HL.toSpawn--; HL.spawnT=.6; }
    if(HL.toSpawn<=0&&alive===0&&!HL.gateOpen&&!(HL.primeT>0)){ if(HL.wave<4){ HL.inBreak=true; HL.breakT=7; sfx.roundEnd(); toast('The Hollow quiets… for now'); } }
  }
}
function startWave(w){ HL.wave=w; HL.inBreak=false; HL.pups=0; HL.toSpawn=Math.round([16,22,26,16][w-1]*PMULT()); HL.spawnT=1; setRoundHud(['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][w-1],true); sfx.roundStart(); bcast({t:'ev',k:'round',n:['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][w-1]}); if(P.dead) respawn();
  HL.primeT=w===4?3.5:0; banner(`Hollow wave ${w} of 4`,w===4?'Something vast stirs':w===3?'The ash hounds have your scent':'They climb from the crystal'); if(w===3) sfx.howl(); }
function primeDown(){ rite(); HL.lit=null; for(const z of zombies) if(!z.dead) killZombie(z,'body',true); HL.toSpawn=0; HL.gateOpen=true; HL.gate.visible=true; sfx.portal(); banner('The Warden Prime falls','A gate of light opens at the center'); }
function enterHollow(){
  bcast({t:'mode',m:'hollow'}); mode='hollow'; for(const z of zombies){ scene.remove(z.g); } zombies.length=0; zparts=[]; projs.forEach(q=>scene.remove(q.m)); projs.length=0; PUPS.forEach(q=>pupFree(q.g)); PUPS.length=0;
  P.pos.set(HX,0,HZ+17); P.yaw=0; P.pitch=0; setAtmosphere('hollow'); ambienceMode('hollow'); flashScreen('#bff3ff');
  HL.inBreak=true; HL.breakT=6; HL.wave=0; setRoundHud('—',false); banner('The Hollow Below','Survive four waves to find the way out'); }
function victory(){ if(state==='end') return; if(NET.role==='host') bcast({t:'victory'}); if(NET.role!=='client') rite(); state='end'; try{ document.exitPointerLock&&document.exitPointerLock(); }catch(e){} flashScreen('#ffffff'); sfx.portal();
  showEnd('You sealed the Deep Vault','Escaped',`You restored the power, woke the Lodestone Rod, broke the Warden Prime and the Furnace Heart, and rode the lift out on round ${R.n}.`); playEnding(); }
function gameOver(){ if(NET.role==='host') bcast({t:'over'}); state='over'; try{ document.exitPointerLock&&document.exitPointerLock(); }catch(e){} sfx.gameOver();
  const where=mode==='hollow'?`in the Hollow on wave ${HL.wave}`:`on round ${R.n}`;
  showEnd(`Overrun ${where}`,'The line broke',`You held the dig for ${fmtTime(playTime)} and earned ${P.earned.toLocaleString()} points before the dead dragged you under.`); }
function showEnd(title,eyebrow,lede){ const rnd=R.n; if(rnd>BEST){ BEST=rnd; try{ localStorage.setItem('ashfall:best',String(BEST)); }catch(e){} }
  $('over-title').textContent=title; $('over-eyebrow').textContent=eyebrow; $('over-lede').textContent=lede;
  $('st-round').textContent=rnd; $('st-kills').textContent=P.kills; $('st-heads').textContent=P.heads; $('st-time').textContent=fmtTime(playTime); $('st-rites').textContent=`${Q.rites||0}/${RITES_TOTAL}`;
  $('hud').hidden=true; $('over').hidden=false; $('again').focus(); }
const fmtTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
