/* ---------- extras: Quit to desktop (desktop app only), first-run field journal card ---------- */
{ const d=window.ashfallDesktop; if(d&&d.isDesktop&&typeof d.quit==='function'){ $('m-desk').hidden=false;
  $('m-desk').addEventListener('click',()=>{ try{ if(NET.role!=='solo'&&window.netLeave) netLeave(); }catch(e){} try{ d.quit(); }catch(e){} }); } }
const FR={shown:false};
function firstRunPending(){ if(FR.shown) return false; try{ return !localStorage.getItem('ashfall:firstrun'); }catch(e){ return true; } }
function firstRunShow(done){ FR.shown=true; const c=$('firstrun'); c.hidden=false; uiSfx('open'); setTimeout(()=>navFocus($('fr-go'),true),40);
  const go=()=>{ $('fr-go').removeEventListener('click',go); if($('fr-never').checked){ try{ localStorage.setItem('ashfall:firstrun','1'); }catch(e){} }
    c.classList.add('out'); setTimeout(()=>{ c.hidden=true; c.classList.remove('out'); },350); done(); };
  $('fr-go').addEventListener('click',go); }
$('firstrun').addEventListener('mouseover',navHover);
