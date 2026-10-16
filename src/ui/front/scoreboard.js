/* ---------- end of game: scoreboard and stat count-up ---------- */
// In co-op each row comes from NET.remotes[id].st (pts, and kills / heads when the net code sends them); solo shows the local digger.
function scoreRows(){ const coop=NET.role!=='solo', won=state==='end', rows=[];
  const remotes=coop?Object.values(NET.remotes).filter(r=>r&&r.st):[], earnedAll=remotes.length>0&&remotes.every(r=>typeof r.st.er==='number');
  const st=(dn,dd)=>won?'Escaped':dd?'Fallen':dn?'Down':'Standing';
  rows.push({name:coop?(NET.name||'You'):'You',me:true,score:coop&&!earnedAll?(P.points||0):(P.earned||P.points||0),kills:P.kills||0,heads:P.heads||0,status:st(P.downed,P.dead||(!coop&&state==='over')),color:coop?AVCSS[NET.myColor|0]||AVCSS[0]:null});
  for(const r of remotes){ const s=r.st; rows.push({name:r.name||'Digger',score:(earnedAll?s.er:s.pts)||0,kills:s.kills??s.k,heads:s.heads??s.hs,status:st(s.dn,s.dd),color:AVCSS[r.color|0]}); }
  rows.sort((a,b)=>b.score-a.score); return rows; }
function buildBoard(){ const tb=$('board-rows'); if(!tb) return; const esc2=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])), num=v=>typeof v==='number'?v.toLocaleString():'—';
  tb.innerHTML=scoreRows().map((r,i)=>`<tr class="${r.me?'me':''}" style="--d:${.35+i*.08}s${r.color?';--c:'+r.color:''}"><td><span class="rk">${i+1}</span>${esc2(r.name)}${r.me&&NET.role!=='solo'?' <small>you</small>':''}</td><td>${num(r.score)}</td><td>${num(r.kills)}</td><td>${num(r.heads)}</td><td class="s-${r.status.toLowerCase()}">${r.status}</td></tr>`).join('');
  $('over').classList.toggle('won',state==='end'); }
function countUp(el,dur){ const end=parseInt(el.textContent,10); if(!(end>0)||String(end)!==el.textContent.trim()) return; const t0=performance.now();
  (function f(){ const k=Math.min(1,(performance.now()-t0)/dur), e=1-Math.pow(1-k,3); el.textContent=String(Math.round(end*e)); if(k<1) requestAnimationFrame(f); else el.textContent=String(end); })(); }
new MutationObserver(()=>{ if($('over').hidden) return; buildBoard(); navHint(); ['st-round','st-kills','st-heads'].forEach((id,i)=>countUp($(id),900+i*150)); setTimeout(()=>{ if(!$('over').hidden&&!$('over').contains(document.activeElement)) navFocus($('again'),true); },60); })
  .observe($('over'),{attributes:true,attributeFilter:['hidden']});
