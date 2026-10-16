/* ---------- loading: warm every shader and render target behind a progress bar with field tips ---------- */
const LOAD={on:false,warm:false,tip:-1};
const TIPS=[
  'Hold Use at a broken window to nail the boards back. Each plank pays ten points and buys you a breath.',
  'Headshots pay more and drop the dead faster. Aim for the jaw, not the chest.',
  'The relic crate costs 950 points and gives a random weapon. When it lifts away, follow its glow to the next spot.',
  'The Forge turns a weapon into something meaner. Upgraded guns hit harder and carry more rounds.',
  'Throw the generator lever to restore power. Most tonic machines stay dark until you do.',
  'A marked zombie glows blue. Bring it down and pick up what it leaves behind.',
  'Clockwork Lures pull every nearby corpse toward the ticking. Throw one, then reload somewhere quiet.',
  'The knife lunges at anything close. When the magazine runs dry, a slash can still save you.',
  'In co-op, a downed digger can be revived. Stand over them and hold Use for three seconds.',
  'Spend points on doors to open the dig. More ground means more room to run and more ways to be flanked.',
  'Swollen dead glowing with embers burst when they die or reach you. Put them down at range.',
  'You can only rebuild so many boards each round for points, but the boards themselves never stop helping.',
  'Listen between rounds. The dig site hums, rings and whispers when something can be found.'
];
const LDSTEPS=[['Clearing the trenches',fresh=>{ if(fresh) newGame(); }],['Waking the dead',()=>{ hideMenuScene(); }],['Compiling shaders',()=>{ try{ renderer.compile(scene,camera); }catch(e){} }],
  ['Oiling the guns',()=>{ try{ renderer.compile(vmScene,vmCam); }catch(e){} }],['Lighting the lanterns',()=>{ try{ renderFrame(true); }catch(e){} }]];
function loadThenPlay(fresh){ if(LOAD.on) return; LOAD.on=true; initAudio(); stopMenuMusic(); uiSfx('start');
  let n; do{ n=(Math.random()*TIPS.length)|0; }while(n===LOAD.tip&&TIPS.length>1); LOAD.tip=n; $('ld-tip').textContent=TIPS[n];
  const L=$('loading'), fill=$('ld-fill'), pct=$('ld-pct'), lab=$('ld-stage'); L.classList.remove('out'); L.hidden=false; fill.style.width='0%'; pct.textContent='0%'; lab.textContent='Preparing';
  const t0=performance.now(), MIN=LOAD.warm?1100:1500; let i=0, armed=false, shown=0;
  function frameStep(){ const now=performance.now();
    if(i<LDSTEPS.length){ if(!armed){ lab.textContent=LDSTEPS[i][0]; armed=true; } else { LDSTEPS[i][1](fresh); i++; armed=false; } }
    const goal=Math.min(i/LDSTEPS.length,(now-t0)/MIN); shown+=(goal-shown)*.35; if(goal>=1&&shown>.985) shown=1;
    fill.style.width=(shown*100).toFixed(1)+'%'; pct.textContent=Math.round(shown*100)+'%';
    if(shown<1){ requestAnimationFrame(frameStep); return; }
    lab.textContent='Ready'; LOAD.warm=true;
    setTimeout(()=>{ startPlay(); LOAD.on=false; L.classList.add('out'); setTimeout(()=>{ L.hidden=true; L.classList.remove('out'); },650); },160); }
  requestAnimationFrame(frameStep); }
function veilIn(){ const v=$('veil'); v.classList.remove('fade'); v.hidden=false; void v.offsetWidth; v.classList.add('fade'); setTimeout(()=>{ v.hidden=true; v.classList.remove('fade'); },900); }
