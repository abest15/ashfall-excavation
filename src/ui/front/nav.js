/* ---------- menu navigation: arrows / D-pad move focus, Enter / A selects, Esc / B goes back, everywhere in the front end ---------- */
const NAV={rep:{},padShown:null};
function navVisible(el){ if(!el||el.disabled||el.closest('[hidden]')) return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }
function openPanel(){ return document.querySelector('#front-main .panel:not([hidden])'); }
function navScope(){
  if(LOAD.on) return null;
  if(BOOT.on) return 'boot';
  if(!$('over').hidden) return $('over');
  if($('menu').hidden) return null;
  if(FRONT.splash) return 'splash';
  const p=openPanel(), a=document.activeElement;
  if(p&&p.contains(a)) return p;
  return document.querySelector('#front-main .mnav'); }
function navItems(sc){ return [...sc.querySelectorAll('button,input,select')].filter(navVisible); }
function navFocus(el,silent){ if(!el) return; const prev=document.activeElement; try{ el.focus({preventScroll:true}); }catch(e){ el.focus(); }
  if(el.closest('.panel')&&el.scrollIntoView) el.scrollIntoView({block:'nearest',behavior:'smooth'});
  if(el.classList.contains('mbtn')&&el.dataset.desc){ const d=$('mdesc'); if(d&&d.textContent!==el.dataset.desc){ d.textContent=el.dataset.desc; d.classList.remove('swap'); void d.offsetWidth; d.classList.add('swap'); } }
  if(prev!==el&&!silent) uiSfx('move'); }
const navTop=el=>el.getBoundingClientRect().top;
function navMove(sc,dir){ const it=navItems(sc); if(!it.length) return false; const a=document.activeElement; const i=it.indexOf(a); if(i<0){ navFocus(it[0]); return true; }
  const top=navTop(a);
  if(dir==='up'||dir==='down'){ const step=dir==='down'?1:-1; let j=i;
    for(let n=0;n<it.length;n++){ j=(j+step+it.length)%it.length; if(Math.abs(navTop(it[j])-top)>8) break; }
    if(j===i) return false; const rt=navTop(it[j]); while(j>0&&Math.abs(navTop(it[j-1])-rt)<=8) j--;
    navFocus(it[j]); return true; }
  const j=i+(dir==='right'?1:-1); if(j>=0&&j<it.length&&Math.abs(navTop(it[j])-top)<=8){ navFocus(it[j]); return true; } return false; }
function rangeStep(i,d){ const st=+i.step||1, v=Math.min(+i.max,Math.max(+i.min,+i.value+st*d)); if(v===+i.value) return; i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); }
function selStep(s,d){ const n=s.options.length, k=(s.selectedIndex+d+n)%n; if(k===s.selectedIndex) return; s.selectedIndex=k; s.dispatchEvent(new Event('change',{bubbles:true})); uiSfx('tick'); }
function panelBtn(id){ return document.querySelector(`.mbtn[data-panel="${id}"]`); }
function enterPanel(id){ const p=$(id); if(p.hidden) showPanel(id); const first=navItems(p)[0]; if(first) navFocus(first,true); else uiSfx('move'); }
function navAct(act){ const sc=navScope(); if(!sc) return false;
  if(sc==='boot'){ bootAdvance(); return true; }
  if(sc==='splash'){ dismissSplash(); return true; }
  const a=document.activeElement, inside=sc.contains(a), inPanel=sc.classList.contains('panel');
  if(act==='back'){
    if(sc===$('over')) return true;
    if(inPanel){ showPanel(null); navFocus(panelBtn(sc.id),true); return true; }
    if(openPanel()){ showPanel(null); return true; }
    if(state==='paused'){ $('play').click(); return true; }
    toSplash(); return true; }
  if(!inside){ const f=navItems(sc)[0]; if(f) navFocus(f); return true; }
  if(act==='ok'){
    if(a.tagName==='SELECT'){ selStep(a,1); return true; }
    if(a.tagName==='INPUT'){ if(a.type!=='range'){ if(a.id==='mp-code') $('mp-join').click(); else navMove(sc,'down'); } return true; }
    if(a.dataset.panel){ enterPanel(a.dataset.panel); return true; }
    a.click(); return true; }
  if(act==='up'||act==='down'){ navMove(sc,act);
    if(!inPanel&&openPanel()){ const b=document.activeElement; showPanel(b.dataset.panel||null,true); } // panels follow focus like tabs
    return true; }
  if(a.tagName==='INPUT'&&a.type==='range'){ rangeStep(a,act==='right'?1:-1); return true; }
  if(a.tagName==='SELECT'){ selStep(a,act==='right'?1:-1); return true; }
  if(navMove(sc,act)) return true;
  if(inPanel&&act==='left'){ navFocus(panelBtn(sc.id)); return true; }
  if(!inPanel&&act==='right'&&a.dataset.panel){ enterPanel(a.dataset.panel); return true; }
  return true; }
const NAVKEYS={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'ok',NumpadEnter:'ok',Escape:'back',Backspace:'back'};
addEventListener('keydown',e=>{ navHint();
  const sc=navScope(); if(!sc) return;
  if(sc==='boot'||sc==='splash'){ if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^F\d+$/.test(e.key)||e.key==='Tab') return; e.preventDefault(); navAct('ok'); return; }
  const a=document.activeElement, text=a&&a.tagName==='INPUT'&&a.type!=='range';
  let act=NAVKEYS[e.code]||NAVKEYS[e.key]; if(!act) return;
  if(text&&(act==='left'||act==='right'||(act==='back'&&e.key==='Backspace'))) return;
  if(e.repeat&&(act==='ok'||act==='back')) return;
  if(navAct(act)) e.preventDefault(); });
function frontPad(hit,now,p){ navHint();
  const sc=navScope(); if(!sc){ NAV.rep={}; return; }
  const fresh=now.some((v,i)=>v&&!PAD.prev[i]);
  if(sc==='boot'||sc==='splash'){ if(fresh) navAct('ok'); return; }
  if(hit(0)) navAct('ok'); else if(hit(1)) navAct('back'); else if(hit(9)){ if(state==='paused') $('play').click(); else navAct('ok'); }
  const ax=p.axes||[], t=performance.now(), dirs={up:now[12]||ax[1]<-.55,down:now[13]||ax[1]>.55,left:now[14]||ax[0]<-.55,right:now[15]||ax[0]>.55};
  for(const d in dirs){ if(!dirs[d]){ NAV.rep[d]=0; continue; } const r=NAV.rep[d]; if(!r){ NAV.rep[d]=t+380; navAct(d); } else if(t>=r){ NAV.rep[d]=t+110; navAct(d); } } }
// mouse: hovering a button focuses it, so hover and keyboard focus are always the same highlight
function navHover(e){ const b=e.target.closest&&e.target.closest('.mbtn,.btn'); if(!b||b===document.activeElement||!navVisible(b)||BOOT.on) return; navFocus(b); }
$('menu').addEventListener('mouseover',navHover); $('over').addEventListener('mouseover',navHover);
function navClick(e){ const b=e.target.closest&&e.target.closest('.mbtn,.btn'); if(!b||b.dataset.panel||b.id==='play'&&state==='paused'||b.id==='over-menu') return; uiSfx('confirm'); }
$('menu').addEventListener('click',navClick); $('over').addEventListener('click',navClick);
addEventListener('mousedown',()=>navHint());
// button prompts along the bottom, swapping between keyboard and controller glyphs with the last device used
function navHint(){ const pad=!!PAD.active; if(NAV.padShown===pad) return; NAV.padShown=pad; const h=$('navhint');
  const k=(g,l,c)=>`<span><kbd class="${c||''}">${g}</kbd>${l}</span>`;
  if(h) h.innerHTML=pad?k('✥','Navigate','pad')+k('A','Select','pad face')+k('B','Back','pad face'):k('↑↓','Navigate')+k('Enter','Select','w')+k('Esc','Back','w');
  const o=$('over-hint'); if(o) o.innerHTML=pad?'<kbd class="pad face">A</kbd> Select':'<kbd class="w">Enter</kbd> Select'; }
