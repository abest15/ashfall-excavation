/* ================= textures ================= */
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const NRM=new WeakMap();
function makeNormal(c,str){ const w=c.width,h=c.height, src=c.getContext('2d').getImageData(0,0,w,h).data, o=document.createElement('canvas'); o.width=w; o.height=h; const og=o.getContext('2d'), out=og.createImageData(w,h);
  const lum=(x,y)=>{ x=(x+w)%w; y=(y+h)%h; const i=(y*w+x)*4; return (src[i]+src[i+1]+src[i+2])/765; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const nx=-(lum(x+1,y)-lum(x-1,y))*str, ny=(lum(x,y+1)-lum(x,y-1))*str, l=Math.hypot(nx,ny,1), i=(y*w+x)*4; out.data[i]=(nx/l*.5+.5)*255; out.data[i+1]=(ny/l*.5+.5)*255; out.data[i+2]=(1/l*.5+.5)*255; out.data[i+3]=255; }
  og.putImageData(out,0,0); const t=new THREE.CanvasTexture(o); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=ANISO; return t; }
function makeTex(size,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');draw(g,size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=ANISO;if(QUAL===2)NRM.set(c,makeNormal(c,3));return t;}
function speckle(g,s,n,cols,a,b){for(let i=0;i<n;i++){g.fillStyle=pick(cols);g.globalAlpha=rand(.15,.6);const r=rand(a,b);g.fillRect(Math.random()*s,Math.random()*s,r,r);}g.globalAlpha=1;}
// churned mud: ruts, wet puddle rims, boot prints, scattered stones and grit (higher resolution on Medium/High)
const mudTex=makeTex(QUAL?512:256,(g,s)=>{ const k=s/256; g.fillStyle='#463a2b'; g.fillRect(0,0,s,s);
  for(let i=0;i<40;i++){ const c=pick(['rgba(26,20,14,.28)','rgba(84,68,48,.22)','rgba(60,48,34,.3)']); g.fillStyle=c; g.beginPath(); g.ellipse(Math.random()*s,Math.random()*s,rand(10,50)*k,rand(6,24)*k,Math.random()*3,0,7); g.fill(); }
  for(let i=0;i<7;i++){ const y=Math.random()*s, w=rand(5,10)*k; for(const off of [0,w*2.4]){ g.strokeStyle='rgba(22,17,12,.55)'; g.lineWidth=w; g.beginPath(); let x=-20, yy=y+off; g.moveTo(x,yy); while(x<s+20){ x+=rand(20,40)*k; yy+=rand(-5,5)*k; g.lineTo(x,yy);} g.stroke();
    g.strokeStyle='rgba(110,92,66,.25)'; g.lineWidth=w*.3; g.stroke(); } }
  for(let i=0;i<6;i++){ const x=Math.random()*s, y=Math.random()*s, rx=rand(12,30)*k, ry=rand(8,18)*k; g.fillStyle='rgba(18,16,14,.55)'; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.fill(); g.strokeStyle='rgba(120,104,80,.35)'; g.lineWidth=2*k; g.beginPath(); g.ellipse(x,y,rx+2*k,ry+2*k,0,0,7); g.stroke(); }
  for(let i=0;i<30;i++){ const x=Math.random()*s, y=Math.random()*s, a=Math.random()*6.28; g.save(); g.translate(x,y); g.rotate(a); g.fillStyle='rgba(24,18,12,.4)'; g.beginPath(); g.ellipse(0,0,4*k,9*k,0,0,7); g.fill(); g.fillRect(-3*k,10*k,6*k,4*k); g.restore(); }
  speckle(g,s,s*14,['#2c241a','#5e4d38','#6b5a40','#352b20'],1,4*k);
  for(let i=0;i<s*.1;i++){ const x=Math.random()*s, y=Math.random()*s, r=rand(1.5,4)*k; g.fillStyle=pick(['#5e5648','#6a6252','#4a4236']); g.beginPath(); g.ellipse(x,y,r,r*rand(.6,1),Math.random()*3,0,7); g.fill(); g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-r,y+r*.6,r*2,r*.4); }
},80,80);
const earthTex=makeTex(128,(g,s)=>{g.fillStyle='#4f3f2d';g.fillRect(0,0,s,s);
  for(let y=0;y<s;y+=6){g.fillStyle=`rgba(${rand(30,60)|0},${rand(22,45)|0},14,.35)`;g.fillRect(0,y+rand(-2,2),s,rand(2,5));}
  speckle(g,s,700,['#2a2118','#6a5640','#3a2e22'],1,3);
  g.strokeStyle='rgba(30,22,14,.6)';for(let i=0;i<7;i++){g.beginPath();let x=Math.random()*s,y=Math.random()*s;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rand(-10,10);y+=rand(4,12);g.lineTo(x,y)}g.stroke();}});
const plankTex=makeTex(128,(g,s)=>{for(let i=0;i<8;i++){const c=rand(80,112)|0;g.fillStyle=`rgb(${c},${c*.72|0},${c*.46|0})`;g.fillRect(i*16,0,16,s);g.fillStyle='rgba(20,14,8,.75)';g.fillRect(i*16,0,1.5,s);}
  speckle(g,s,500,['#2b1e12','#7a5c3c'],1,2);for(let i=0;i<10;i++){g.fillStyle='#1f160d';g.fillRect((Math.random()*8|0)*16+8,Math.random()*s,2,2);}});
const sandTex=makeTex(128,(g,s)=>{g.fillStyle='#3a3224';g.fillRect(0,0,s,s);
  for(let r=0;r<4;r++)for(let i=-1;i<4;i++){const x=i*40+(r%2)*20,y=r*32;g.fillStyle=`rgb(${rand(118,142)|0},${rand(104,120)|0},${rand(70,86)|0})`;rr(g,x+2,y+2,36,28,10);g.fill();g.strokeStyle='rgba(60,50,34,.6)';g.stroke();}
  speckle(g,s,500,['#5a4e36','#9a8a66'],1,2);});
const stoneTex=makeTex(128,(g,s)=>{g.fillStyle='#55534f';g.fillRect(0,0,s,s);speckle(g,s,1400,['#3b3a37','#6d6a64','#47453f'],1,5);
  g.strokeStyle='rgba(25,24,22,.7)';for(let i=0;i<8;i++){g.beginPath();let x=Math.random()*s,y=Math.random()*s;g.moveTo(x,y);for(let k=0;k<4;k++){x+=rand(-16,16);y+=rand(-16,16);g.lineTo(x,y)}g.stroke();}});
const brickTex=makeTex(128,(g,s)=>{g.fillStyle='#2a1a14';g.fillRect(0,0,s,s);for(let r=0;r<8;r++)for(let i=-1;i<5;i++){const c=rand(95,130)|0;g.fillStyle=`rgb(${c},${c*.5|0},${c*.36|0})`;g.fillRect(i*32+(r%2)*16+1,r*16+1,30,14);}speckle(g,s,600,['#1a100c','#8a5a40'],1,3);});
const crystalTex=makeTex(128,(g,s)=>{g.fillStyle='#14121f';g.fillRect(0,0,s,s);speckle(g,s,900,['#221d36','#0b0a14','#2a2648'],1,4);
  g.strokeStyle='rgba(116,217,234,.55)';g.lineWidth=1.5;for(let i=0;i<6;i++){g.beginPath();let x=Math.random()*s,y=Math.random()*s;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rand(-20,20);y+=rand(-20,20);g.lineTo(x,y)}g.stroke();}},14,14);

// trench revetments: plank boards (grain, gaps, nails), corrugated iron, woven wicker
const plankRevTex=makeTex(QUAL?512:256,(g,s)=>{ const k=s/256, n=8, bh=s/n; g.fillStyle='#120d08'; g.fillRect(0,0,s,s);
  for(let r=0;r<n;r++){ let x=-rand(0,120)*k; while(x<s){ const w=rand(150,280)*k, c=rand(58,86)|0, y=r*bh+1.5*k; g.fillStyle=`rgb(${c},${c*.74|0},${c*.5|0})`; g.fillRect(x,y,w-2*k,bh-3*k);
      g.strokeStyle='rgba(30,20,10,.35)'; g.lineWidth=k; for(let i=0;i<5;i++){ g.beginPath(); const yy=y+rand(2,bh-4)*1; g.moveTo(x,yy); g.bezierCurveTo(x+w*.3,yy+rand(-3,3)*k,x+w*.6,yy+rand(-3,3)*k,x+w-2*k,yy+rand(-2,2)*k); g.stroke(); }
      if(Math.random()<.4){ g.fillStyle='rgba(30,20,10,.6)'; g.beginPath(); g.ellipse(x+rand(10,w-10),y+bh/2,rand(2,4)*k,rand(1.5,3)*k,0,0,7); g.fill(); }
      g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x,y+bh-6*k,w-2*k,3*k);
      for(const nx of [x+4*k,x+w-7*k]){ g.fillStyle='#2a2622'; g.fillRect(nx,y+bh*.3,2.2*k,2.2*k); g.fillStyle='rgba(120,60,30,.5)'; g.fillRect(nx,y+bh*.3+2*k,1.5*k,4*k); }
      x+=w; } }
  for(let i=0;i<14;i++){ g.fillStyle=`rgba(50,38,24,${rand(.2,.45)})`; g.beginPath(); g.ellipse(rand(0,s),s-rand(0,s*.35),rand(10,40)*k,rand(6,20)*k,0,0,7); g.fill(); }
  const gr=g.createLinearGradient(0,s*.65,0,s); gr.addColorStop(0,'rgba(40,30,20,0)'); gr.addColorStop(1,'rgba(40,30,20,.7)'); g.fillStyle=gr; g.fillRect(0,0,s,s); });
const ironTex=makeTex(QUAL?256:128,(g,s)=>{ for(let x=0;x<s;x++){ const v=Math.sin(x/s*Math.PI*2*10); const c=(70+v*28)|0; g.fillStyle=`rgb(${c},${c+2},${c-2})`; g.fillRect(x,0,1,s); }
  for(let i=0;i<40;i++){ g.fillStyle=`rgba(${rand(110,150)|0},${rand(50,70)|0},${rand(20,35)|0},${rand(.2,.55)})`; g.beginPath(); g.ellipse(rand(0,s),rand(0,s),rand(3,26),rand(3,18),rand(0,3),0,7); g.fill(); }
  for(let i=0;i<20;i++){ g.fillStyle='rgba(90,40,18,.4)'; const x=rand(0,s); g.fillRect(x,rand(0,s),rand(1,2),rand(10,40)); }
  g.fillStyle='rgba(20,18,16,.8)'; g.fillRect(0,s*.49,s,s*.02); for(let x=6;x<s;x+=s/10) { g.fillStyle='#222'; g.fillRect(x,s*.47,3,3); g.fillRect(x,s*.03,3,3); }
  speckle(g,s,600,['#3a3a36','#8a6a4a','#5a5a52'],1,2); });
const wickerTex=makeTex(QUAL?256:128,(g,s)=>{ g.fillStyle='#1a140d'; g.fillRect(0,0,s,s); const n=16, h=s/n;
  for(let r=0;r<n;r++) for(let x=0;x<s;x+=s/8){ const up=((x/(s/8))+r)%2; const c=rand(80,115)|0; g.fillStyle=`rgb(${c},${c*.78|0},${c*.5|0})`; g.beginPath(); g.ellipse(x+s/16,r*h+h/2+(up?-1:1),s/16+1,h*.42,0,0,7); g.fill(); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x,r*h+h*.7,s/8,h*.25); }
  for(let x=0;x<s;x+=s/8){ g.fillStyle='#2a1e12'; g.fillRect(x-2,0,4,s); }
  speckle(g,s,500,['#3a2a1a','#8a7050'],1,2); });
