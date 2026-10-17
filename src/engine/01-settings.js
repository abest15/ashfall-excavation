/* ================= settings ================= */
const SETTINGS={sens:1,scale:0.75,fov:78,vol:0.7,diff:'vet',aim:'std',rumble:true};
try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem('ashfall:settings')||'{}'));}catch(e){}
function saveSettings(){try{localStorage.setItem('ashfall:settings',JSON.stringify(SETTINGS));}catch(e){}}
let BEST=0; try{BEST=+(localStorage.getItem('ashfall:best')||0);}catch(e){}
const DIFF={rec:{hp:.7,dmg:.7,spd:.9},vet:{hp:1,dmg:1,spd:1},hard:{hp:1.4,dmg:1.3,spd:1.1}};
const DF=()=>DIFF[SETTINGS.diff]||DIFF.vet;
const NET={role:'solo',remotes:{}};
const pickN=(a,n)=>a.slice().sort(()=>Math.random()-.5).slice(0,n);
