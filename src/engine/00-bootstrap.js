
const $=id=>document.getElementById(id);
if(!THREE.REVISION){ $('loaderr').hidden=false; $('play').disabled=true; return; }
const V3=THREE.Vector3;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const pick=a=>a[(Math.random()*a.length)|0];
