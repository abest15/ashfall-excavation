// Exposes game internals as window.__G for automated tests. Only included when ASHFALL_TEST=1
// (tools/build.mjs inserts it just before core/41-loop.js, so every other file has already run).
// Keep the names in sync when renaming anything listed here. A name that does not exist (for example while
// another lane is mid-rename) is left undefined and listed in __G.__missing instead of breaking the build.
window.__G=(function(){
  const G={}, missing=[], v=(name,get)=>{ try{ G[name]=get(); }catch(e){ missing.push(name); } };
  v('renderer',()=>renderer); v('scene',()=>scene); v('camera',()=>camera);
  v('P',()=>P); v('R',()=>R); v('Q',()=>Q); v('HL',()=>HL); v('PU',()=>PU); v('zombies',()=>zombies);
  v('KN',()=>KN); v('VM',()=>VM); v('WR',()=>WR); v('RESON',()=>RESON); v('LODE',()=>LODE); v('WINDOWS',()=>WINDOWS);
  v('COL',()=>COL); v('CAB',()=>CAB); v('CH',()=>CH); v('TRAP',()=>TRAP); v('DOORS',()=>DOORS); v('ZONES',()=>ZONES);
  v('LURES',()=>LURES); v('BOLTS',()=>BOLTS); v('NET',()=>NET); v('pickups',()=>pickups); v('TONICS',()=>TONICS); v('POWER',()=>POWER);
  v('AU',()=>AU); v('SETTINGS',()=>SETTINGS); v('QUAL',()=>QUAL); v('keys',()=>keys); v('PAD',()=>PAD); v('pollPad',()=>pollPad); v('getPad',()=>getPad);
  v('spawnZombie',()=>spawnZombie); v('killZombie',()=>killZombie); v('hitZombie',()=>hitZombie); v('melee',()=>melee);
  v('applyPup',()=>applyPup); v('dropPup',()=>dropPup); v('startRound',()=>startRound); v('newGame',()=>newGame);
  v('hitReson',()=>hitReson); v('hitWraith',()=>hitWraith); v('enterHollow',()=>enterHollow); v('startWave',()=>startWave);
  v('hitCrystal',()=>hitCrystal); v('lodeUse',()=>lodeUse); v('strikeStone',()=>strikeStone); v('strikeLodestone',()=>strikeLodestone);
  v('giveWeapon',()=>giveWeapon); v('mkInst',()=>mkInst); v('fire',()=>fire); v('explode',()=>explode); v('tick',()=>tick);
  v('grantBless',()=>grantBless); v('curW',()=>curW); v('powerOn',()=>powerOn); v('enterCabin',()=>enterCabin); v('exitCabin',()=>exitCabin);
  v('takeCabin',()=>takeCabin); v('ringBell',()=>ringBell); v('lightCandle',()=>lightCandle); v('benchUse',()=>benchUse); v('benchPrompt',()=>benchPrompt);
  v('hitValve',()=>hitValve); v('rebuildPlank',()=>rebuildPlank); v('openDoor',()=>openDoor); v('wraithDone',()=>wraithDone);
  v('updateInteract',()=>updateInteract); v('throwLure',()=>throwLure); v('spawnLure',()=>spawnLure); v('pickBox',()=>pickBox);
  v('zvoice',()=>zvoice); v('pause',()=>pause); v('victory',()=>victory); v('sfx',()=>sfx);
  v('WSIM',()=>WSIM); v('colliders',()=>colliders); v('collide',()=>collide); v('route',()=>route); v('zoneOf',()=>zoneOf); v('updateZombies',()=>updateZombies);
  Object.defineProperties(G,{
    curInter:{get(){ return curInter; },enumerable:true},
    state:{get(){ return state; },enumerable:true},
    mode:{get(){ return mode; },enumerable:true},
    GT:{get(){ return GT; },enumerable:true},
  });
  G.setTrig=x=>{ trigFresh=x; }; G.setMouse=x=>{ mouseDown=x; };
  G.__missing=missing;
  if(missing.length) console.warn('[test-hook] not found:',missing.join(', '));
  return G;
})();
