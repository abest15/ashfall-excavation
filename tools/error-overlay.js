// Dev/test builds only (left out of `npm run build:prod`): shows uncaught errors and promise
// rejections on screen so problems are visible without opening the devtools console.
(function(){
  'use strict';
  var box=null, list=null, count=0, seen={};
  window.__ashfallErrors=[];
  function ensure(){
    if(box) return true; if(!document.body) return false;
    box=document.createElement('div'); box.id='ash-error-overlay'; box.setAttribute('role','alert');
    box.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;max-height:40vh;overflow:auto;z-index:2147483647;background:rgba(40,6,6,.94);color:#ffd9d0;font:12px/1.4 ui-monospace,Consolas,monospace;border:1px solid #ff6a50;border-radius:6px;padding:8px 10px;box-shadow:0 6px 30px rgba(0,0,0,.6);pointer-events:auto';
    var head=document.createElement('div'); head.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-weight:bold;color:#ff9a80';
    head.innerHTML='<span>Uncaught error (dev build)</span>';
    var close=document.createElement('button'); close.type='button'; close.textContent='Dismiss';
    close.style.cssText='font:inherit;background:#5a1a12;color:#fff;border:1px solid #ff6a50;border-radius:4px;padding:2px 8px;cursor:pointer';
    close.addEventListener('click',function(e){ e.stopPropagation(); box.hidden=true; });
    head.appendChild(close); box.appendChild(head);
    list=document.createElement('div'); box.appendChild(list);
    document.body.appendChild(box); return true;
  }
  function show(msg,stack){
    var key=msg+'|'+(stack||''); window.__ashfallErrors.push(msg);
    if(seen[key]){ seen[key].n++; seen[key].el.firstChild.textContent='(x'+seen[key].n+') '+msg; return; }
    if(!ensure()){ document.addEventListener('DOMContentLoaded',function(){ show(msg,stack); }); return; }
    if(++count>20) return;
    var item=document.createElement('div'); item.style.cssText='border-top:1px solid rgba(255,106,80,.3);padding:4px 0;white-space:pre-wrap;word-break:break-word';
    var m=document.createElement('div'); m.textContent=msg; item.appendChild(m);
    if(stack){ var s=document.createElement('div'); s.style.cssText='opacity:.7;font-size:11px'; s.textContent=String(stack).split('\n').slice(0,6).join('\n'); item.appendChild(s); }
    list.appendChild(item); seen[key]={n:1,el:item}; box.hidden=false;
  }
  window.addEventListener('error',function(e){
    if(e.target&&e.target!==window&&e.target.tagName){
      // only the game's own scripts; optional remote resources (fonts, the co-op library) fail quietly offline
      var u=e.target.src||''; if(e.target.tagName==='SCRIPT'&&u&&u.indexOf(location.origin)===0) show('Failed to load '+u);
      return; }
    var where=e.filename?' ('+String(e.filename).split('/').pop()+':'+e.lineno+':'+e.colno+')':'';
    show((e.message||'Error')+where,e.error&&e.error.stack);
  },true);
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason; show('Unhandled promise rejection: '+(r&&r.message||String(r)),r&&r.stack);
  });
})();
