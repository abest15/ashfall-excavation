/* ================= textures ================= */
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const NRM=new WeakMap();
function makeNormal(c,str){ const w=c.width,h=c.height, src=c.getContext('2d').getImageData(0,0,w,h).data, o=document.createElement('canvas'); o.width=w; o.height=h; const og=o.getContext('2d'), out=og.createImageData(w,h);
  const lum=(x,y)=>{ x=(x+w)%w; y=(y+h)%h; const i=(y*w+x)*4; return (src[i]+src[i+1]+src[i+2])/765; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const nx=-(lum(x+1,y)-lum(x-1,y))*str, ny=(lum(x,y+1)-lum(x,y-1))*str, l=Math.hypot(nx,ny,1), i=(y*w+x)*4; out.data[i]=(nx/l*.5+.5)*255; out.data[i+1]=(ny/l*.5+.5)*255; out.data[i+2]=(1/l*.5+.5)*255; out.data[i+3]=255; }
  og.putImageData(out,0,0); const t=new THREE.CanvasTexture(o); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=ANISO; return t; }
function makeTex(size,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');draw(g,size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=ANISO;if(QUAL===2)NRM.set(c,makeNormal(c,3));return t;}
function speckle(g,s,n,cols,a,b){for(let i=0;i<n;i++){g.fillStyle=pick(cols);g.globalAlpha=rand(.15,.6);const r=rand(a,b);g.fillRect(Math.random()*s,Math.random()*s,r,r);}g.globalAlpha=1;}
const mudTex=makeTex(256,(g,s)=>{g.fillStyle='#463a2b';g.fillRect(0,0,s,s);
  for(let i=0;i<16;i++){g.fillStyle='rgba(26,20,14,.35)';g.beginPath();g.ellipse(Math.random()*s,Math.random()*s,rand(10,44),rand(6,20),Math.random()*3,0,7);g.fill();}
  for(let i=0;i<10;i++){g.strokeStyle='rgba(30,24,17,.5)';g.lineWidth=rand(2,5);g.beginPath();let x=Math.random()*s,y=Math.random()*s;g.moveTo(x,y);for(let k=0;k<6;k++){x+=rand(-30,30);y+=rand(-6,6);g.lineTo(x,y)}g.stroke();}
  speckle(g,s,2600,['#2c241a','#5e4d38','#6b5a40','#352b20'],1,4);},80,80);
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
