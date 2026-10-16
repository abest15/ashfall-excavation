/* ---------- HUD ---------- */
const hudEl={round:$('round'),points:$('points'),mag:$('mag'),res:$('res'),wname:$('wname'),wnote:$('wnote'),slots:$('slots'),perks:$('perks'),prompt:$('prompt'),dmg:$('dmg'),pups:$('pups'),jtext:$('jtext'),jlist:$('jlist'),boss:$('bossbar'),bossfill:$('bossfill'),bossname:$('bossname'),cross:$('cross'),ammo:$('ammo'),hpbar:$('hpbar'),hpfill:$('hpfill'),shfill:$('shfill'),items:$('items'),team:$('team')};
const cache={};
function setT(el,key,v){ if(cache[key]!==v){ cache[key]=v; el.textContent=v; } }
function setH(el,key,v){ if(cache[key]!==v){ cache[key]=v; el.innerHTML=v; } }
function setRoundHud(v,pulse){ hudEl.round.textContent=v; hudEl.round.classList.remove('pulse'); if(pulse){ void hudEl.round.offsetWidth; hudEl.round.classList.add('pulse'); } }
let toastT=null; function toast(t){ const e=$('toast'); e.textContent=t; e.style.opacity=1; clearTimeout(toastT); toastT=setTimeout(()=>e.style.opacity=0,2600); }
let bannerT=null; function banner(t,sub,local){ if(NET.role==='host'&&!local) bcast({t:'ev',k:'banner',a:t,b:sub}); const e=$('banner'); e.innerHTML=''; e.append(t); if(sub){ const s=document.createElement('small'); s.textContent=sub; e.append(s); } e.style.opacity=1; clearTimeout(bannerT); bannerT=setTimeout(()=>e.style.opacity=0,3400); }
// hit markers: body (white ticks), head (gold, wider), kill (red, pops out); a kill marker is not downgraded by the hit that caused it
const HMH={head:false,killUntil:0}; let hmT=null;
function hitMarker(kill,head){ const e=$('hitm'); if(head===undefined) head=HMH.head; const now=performance.now();
  if(!kill&&now<HMH.killUntil) return; if(kill) HMH.killUntil=now+260;
  e.className=''; void e.offsetWidth; e.className=(kill?'kill':'hit')+(head?' head':''); clearTimeout(hmT); hmT=setTimeout(()=>{ e.className=''; },kill?420:220);
  if(!kill){ if(sfx.hitmarker) sfx.hitmarker(!!head); else sfx.hit(); } else if(head&&sfx.hitmarker) sfx.hitmarker(true); }
// damage direction: a wedge around the crosshair pointing at the source, tracked while you turn
const DMGI=[];
function dmgIndicator(src){ const box=$('dmgdir'); if(!box||!src) return; let d=DMGI.find(q=>Math.hypot(q.x-src.x,q.z-src.z)<1.5);
  if(!d){ if(DMGI.length>=6){ const o=DMGI.shift(); o.el.remove(); } const el=document.createElement('i'); box.append(el); d={el}; DMGI.push(d); }
  d.x=src.x; d.z=src.z; d.t=performance.now(); updateDmgDir(); }
function updateDmgDir(){ const now=performance.now(), fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw), rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw);
  for(let i=DMGI.length-1;i>=0;i--){ const d=DMGI[i], age=(now-d.t)/1500; if(age>=1){ d.el.remove(); DMGI.splice(i,1); continue; }
    const dx=d.x-P.pos.x, dz=d.z-P.pos.z, a=Math.atan2(dx*rx+dz*rz,dx*fx+dz*fz); d.el.style.transform=`rotate(${a}rad)`; d.el.style.opacity=(1-age*age).toFixed(3); } }
let lowWarned=false;
const ppopEl=$('ppop');
function popPts(v){ const e=document.createElement('div'); e.className='pp'; e.textContent='+'+v; e.style.left=rand(0,20)+'px'; ppopEl.append(e); setTimeout(()=>e.remove(),800); }
function flashScreen(col){ const e=$('hurtflash'); e.style.background=col||'rgba(255,190,120,.45)'; e.style.opacity=1; setTimeout(()=>{ e.style.opacity=0; e.style.background=''; },160); }
function journal(){
  if(P.inCabin) return {t:`Inside the Colossus. ${Math.ceil(CAB.t)}s before it shakes you loose.`,l:[[!CAB.item,'Take the prize on the pedestal'],[false,'Drop through the floor hatch to leave']]};
  if(mode==='hollow'){ return {t:HL.gateOpen?'The gate is open. Step into the light at the center.':HL.lit?`The Prime is warded. Shatter the glowing crystals (${HL.lit.length} left).`:`Survive the Hollow. Wave ${Math.max(1,HL.wave)} of 4.`,l:[]}; }
  const s=Q.stage, f=Q.frag;
  if(s==='frags') return {t:`Recover the three Rod fragments (${fragCount()}/3).`,l:[[f.dig,'Something hard lies under the disturbed earth in the trenches.'],[f.locker,'A field locker in the generator yard is bolted. Its lock needs power.'],[f.marked,'A marked one walks among the dead. It glows blue.']]};
  if(s==='assembling') return {t:'The Lodestone is binding the fragments…',l:[]};
  if(s==='rodReady') return {t:'Take the Lodestone Rod from the pedestal.',l:[]};
  if(s==='stones') return {t:`Wake the waystones: kill ${STONE_KILLS} dead near each, then strike it with the Rod.`,l:Q.stones.map(st=>[st.lit,`${st.name[0].toUpperCase()+st.name.slice(1)}: ${st.lit?'burning':st.fed?'fed, strike it':`${st.kills}/${STONE_KILLS}`}`])};
  if(s==='echoes'){ const E=Q.echo||{verse:1,seq:[]}; return {t:E.verse===1?'Find the three resonators and strike them in order, deepest note to highest. Bigger forks ring deeper.':'The echoes reversed. Strike them from the highest note down to the deepest.',l:[[false,`Verse ${E.verse} of 2 · ${E.seq.length}/3 tones`],[false,'A wrong note wakes the dead']]}; }
  if(s==='candles') return {t:'Go to the chapel. Shoot the bell to light the glass behind the altar, then light the candelabras in the order the glass shows.',l:[[CH.seq>0,`Candles lit in order: ${CH.seq}/4`],[false,'A wrong flame wakes the dead']]};
  if(s==='ember') return {t:"Take the Saint's Ember from the chapel altar.",l:[]};
  if(s==='colossus') return {t:'Ride the Colossus in No Man\'s Land. When its glowing left foot lifts, stand where the blue ring marks its landing.',l:[[POWER.on,'Power on (the hatch needs it)'],[false,'Any other footfall will crush you']]};
  if(s==='gauntlet') return {t:"Bring the Saint's Ember and the Colossus Heart to the chapel workbench.",l:[[P.items.has('ember'),"Saint's Ember"],[P.items.has('heart'),'Colossus Heart'],[POWER.on,'Power on']]};
  if(s==='return') return {t:'Return the Rod to the Lodestone. It needs power.',l:[[POWER.on,'Power restored']]};
  if(s==='awakening') return {t:`Hold the dig while the Rod awakens: ${Math.ceil(Q.t)}s`,l:[[Q.near,Q.near?'Close to the Lodestone':'Too far! The awakening has stalled']]};
  if(s==='awakenReady') return {t:'Claim the Awakened Rod.',l:[]};
  if(s==='wraith'){ const W=Q.wr||{hits:0}; return {t:W.bound?'The wraith has taken a body. Destroy the bound Warden.':'Hunt the wraith. Wound it with the Awakened Rod.',l:[[W.hits>=3,`Wounds ${Math.min(3,W.hits)}/3`],[false,'Its touch is grave-cold. Keep your distance']]}; }
  if(s==='felling') return {t:'Bring down the Colossus. Breach its three glowing valves with the Awakened Rod or the Tempest Gauntlet.',l:COL.vBurst.map((b,i)=>[b,['Left knee','Right knee','Chest furnace'][i]])};
  if(s==='strike') return {t:'Strike the Lodestone itself with the Awakened Rod.',l:[]};
  if(s==='descent') return {t:'The way below is open. Descend at the Lodestone.',l:[]};
  return {t:'',l:[]};
}
function updateHud(){
  setT(hudEl.points,'pts',P.points.toLocaleString()); if(ppopEl.parentNode!==hudEl.points) hudEl.points.append(ppopEl);
  const w=curW();
  const warn=$('ammowarn'); let wt='';
  if(w){ const s=statsOf(w); setT(hudEl.wname,'wn',s.name); hudEl.wname.className=w.id==='rod'?'relic':w.up?'up':''; const gat=w.id==='gatling'; setT(hudEl.mag,'mag',gat?'∞':String(w.mag)); setT(hudEl.res,'res',gat?'':'/ '+w.res); hudEl.ammo.classList.toggle('low',w.mag<=Math.ceil(s.mag*.25));
    setT(hudEl.wnote,'wnote',gat?`Burns out in ${Math.ceil(PU.gatling)}s`:w.reloadEnd?'Reloading':'');
    const low=!gat&&w.mag<=Math.ceil(s.mag*.25), key=PAD.active?'X':'R';
    if(!gat&&!w.reloadEnd){ if(w.mag===0&&w.res===0) wt='<b>NO AMMO</b>'; else if(w.mag===0) wt=`<kbd>${key}</kbd> RELOAD`; else if(low&&w.res>0) wt=`<kbd>${key}</kbd> RELOAD`; else if(low||w.res<=s.mag&&w.res>=0&&w.mag+w.res<=s.mag*.5) wt='LOW AMMO'; }
    if(low&&!gat&&!lowWarned){ lowWarned=true; if(sfx.lowAmmo&&w.mag>0) sfx.lowAmmo(); } else if(!low) lowWarned=false;
    const pk=gat?'g':w.mag+'/'+s.mag; if(cache.pips!==pk){ cache.pips=pk; let h=''; if(gat) h='';
      else if(s.mag<=40){ for(let i=0;i<s.mag;i++) h+=`<i class="${i<w.mag?'on':''}"></i>`; } else h=`<span class="bar"><i style="width:${(w.mag/s.mag*100).toFixed(1)}%"></i></span>`; $('pips').innerHTML=h; $('pips').className=s.mag>40?'cont':s.mag>14?'thin':''; } }
  else { cache.pips=''; $('pips').innerHTML=''; setT(hudEl.wname,'wn','Bare hands'); hudEl.wname.className=''; setT(hudEl.mag,'mag','—'); setT(hudEl.res,'res',''); setT(hudEl.wnote,'wnote',FORGE.state!=='idle'?'Weapon in the Forge':''); }
  setH(warn,'warn',wt); warn.className=wt?(wt.includes('NO AMMO')?'out':wt.includes('RELOAD')?'rl':'low'):'';
  setH(hudEl.slots,'slots',P.weapons.map((x,i)=>`<span class="slot${i===P.cur&&!(PU.gatling>0)?' on':''}"><em>${i+1}</em>${esc(statsOf(x).name)}</span>`).join('')+(P.lureOwned?`<span class="slot lure"><em>${PAD.active?'LB':'G'}</em>${P.lures} lures</span>`:''));
  setH(hudEl.perks,'perks',[...P.perks].map(k=>`<span class="perk" title="${TONICS[k].name}" style="background:${TONICS[k].color}">${TONICS[k].letter}</span>`).join('')+[...P.bless].map(k=>`<span class="perk bless" title="${BLESS[k].name}">${BLESS[k].letter}</span>`).join(''));
  hudEl.dmg.style.opacity=P.hp<P.maxHp?(1-P.hp/P.maxHp)*.9:0;
  hudEl.hpfill.style.width=Math.max(0,P.hp/P.maxHp*100)+'%'; hudEl.shfill.style.width=P.shield+'%'; hudEl.hpbar.classList.toggle('hurt',P.hp<P.maxHp*.35);
  let pu=''; if(PU.double>0) pu+=`<span class="pup" style="color:#f2cb78">DOUBLE POINTS ${Math.ceil(PU.double)}</span>`; if(PU.insta>0) pu+=`<span class="pup" style="color:#e7ddcc">INSTANT KILL ${Math.ceil(PU.insta)}</span>`; if(PU.freeze>0) pu+=`<span class="pup" style="color:#9fe6ff">STILL TIME ${Math.ceil(PU.freeze)}</span>`; if(PU.sale>0) pu+=`<span class="pup" style="color:#8ad0e8">FIRE SALE ${Math.ceil(PU.sale)}</span>`; if(PU.gatling>0) pu+=`<span class="pup" style="color:#ff6a3a">GATLING ${Math.ceil(PU.gatling)}</span>`; setH(hudEl.pups,'pu',pu);
  setH(hudEl.items,'it',[...P.items].map(k=>`<span class="item">${ITEM_NAMES[k]}</span>`).join('')+(P.aegis?'<span class="item aegis">Iron Aegis</span>':''));
  if(NET.role!=='solo'){ let h=''; for(const id in NET.remotes){ const r=NET.remotes[id], st=r.st; if(!st) continue; h+=`<span class="mate" style="border-color:${AVCSS[r.color]}">${esc(r.name)} · ${(st.pts||0).toLocaleString()}${st.dn?' · <b>DOWN</b>':st.dd?' · OUT':''}</span>`; } setH(hudEl.team,'tm',h); } else setH(hudEl.team,'tm','');
  const j=(NET.role==='client'&&NET.jr&&!P.inCabin)?NET.jr:journal(); setT(hudEl.jtext,'jt',j.t); setH(hudEl.jlist,'jl',j.l.map(([d,t])=>`<li class="${d?'done':''}">${t}</li>`).join(''));
  let boss=null; for(const z of zombies) if(z.boss&&!z.dead){ boss=z; break; }
  hudEl.boss.hidden=!boss; if(boss){ hudEl.bossfill.style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%'; setT(hudEl.bossname,'bn',boss.prime?(boss.shield?'Warden Prime · warded':'Warden Prime'):boss.wraithBound?'Wraith-bound Warden':'Iron Warden'); }
  // crosshair gap = the real spread cone projected to pixels
  const px=innerHeight/2/Math.tan(camera.fov*Math.PI/360), gap=clamp((w?spreadNow(w):.02)*px+3,3,110);
  const c=hudEl.cross; c.style.setProperty('--g',gap.toFixed(1)+'px'); c.classList.toggle('sg',!!(w&&statsOf(w).pellets>1));
  c.style.opacity=(P.sprint||P.slideT>0||VM.inspect>0?0:clamp(1-P.ads*1.8,0,1)*(w&&w.reloadEnd?.45:1)).toFixed(2);
  updateDmgDir();
}
