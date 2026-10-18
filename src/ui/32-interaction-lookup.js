/* ---------- interaction lookup ---------- (levels: an interactable's optional y is its floor height) */
let curInter=null;
function updateInteract(){
  curInter=null; let bd=1e9;
  for(const o of inter){ const d=Math.hypot(o.x-P.pos.x,o.z-P.pos.z); if(d<o.r&&d<bd&&Math.abs((o.y||0)-P.pos.y)<2.2){ const t=o.prompt(); if(t){ bd=d; curInter={o,t}; } } }
  for(const q of pickups){ if(Math.hypot(q.x-P.pos.x,q.z-P.pos.z)<1.8){ curInter={o:{quest:!q.take||q.key==='ember',use:()=>{ if(q.take) q.take(); else takeFrag(q.key); scene.remove(q.m); pickups.splice(pickups.indexOf(q),1); }},t:q.label||'Take the Rod fragment'}; } }
  if(NET.role==='client'&&curInter&&curInter.o.quest) curInter={o:{},t:'!The host carries the ritual. Help them fight'};
  for(const id in NET.remotes){ const r=NET.remotes[id], st=r.st; if(st&&st.dn&&st.m===mode&&!P.downed&&!P.dead&&Math.hypot(st.x-P.pos.x,st.z-P.pos.z)<2.2&&Math.abs((st.y||0)-P.pos.y)<2) curInter={o:{revive:id,name:r.name},t:`Hold to revive ${r.name}${P.revProg>0?' · '+Math.min(100,Math.round(P.revProg/3*100))+'%':''}`}; }
  const e=hudEl.prompt;
  if(curInter){ const info=curInter.t[0]==='!'; const txt=info?curInter.t.slice(1):curInter.t; const html=info?txt:`<kbd>${PAD.active?'X':'E'}</kbd>${txt.replace(/&/g,'&amp;').replace(/</g,'&lt;')}`; setH(e,'pr',html); e.classList.toggle('info',info); e.hidden=false; }
  else e.hidden=true;
}
function interact(){ if(P.downed||P.dead) return; if(curInter&&curInter.t[0]!=='!'&&curInter.o.use) curInter.o.use(); }
