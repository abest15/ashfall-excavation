/* ---------- tonics ---------- */
const TONICS={
  iron:{name:'Ironhide Tonic',cost:2500,hex:0xb5402c,color:'#c25236',letter:'I',desc:'more health'},
  quick:{name:'Quickhand Tonic',cost:3000,hex:0x4f9a5a,color:'#5aa866',letter:'Q',desc:'faster reloads'},
  fleet:{name:'Fleetfoot Tonic',cost:2000,hex:0xd0a83a,color:'#d9b245',letter:'F',desc:'faster on your feet'},
  rapid:{name:'Rapid Draught',cost:2000,hex:0xd07a2a,color:'#d9853a',letter:'R',desc:'faster fire rate'},
  wind:{name:'Second Wind',cost:500,hex:0x4a86b8,color:'#5a96c8',letter:'S',desc:'rise once after falling',noPower:true},
  mule:{name:'Packmule Tonic',cost:4000,hex:0x7a5ac8,color:'#9a7ae0',letter:'M',desc:'carry a third weapon'},
  steady:{name:'Steadyhand Draught',cost:2500,hex:0x3a8ab8,color:'#4aa0d0',letter:'D',desc:'deadlier headshots and steadier aim'},
};
const tonicPanels=[];
function tonicMachine(key,x,z,ry){
  const T=TONICS[key]; const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry; scene.add(g);
  const cab=box(1.2,2.3,.9,M.dark,0,1.15,0,{parent:g}); addSolid(cab);
  box(1.3,.1,1,M.brass,0,2.32,0,{parent:g}); box(1.3,.12,1,M.brass,0,.06,0,{parent:g});
  const pm=L({color:0x1a1814,emissive:T.hex,emissiveIntensity:T.noPower?.9:.12}); const panel=box(.86,1.15,.04,pm,0,1.45,.46,{parent:g});
  tonicPanels.push({pm,T});
  box(.5,.18,.04,M.brass,0,.65,.46,{parent:g});
  const bm=B({color:T.hex}); cyl(.13,.15,.42,bm,0,2.6,0,10,g); cyl(.05,.06,.18,bm,0,2.9,0,8,g); cyl(.06,.06,.04,M.brass,0,3.0,0,8,g);
  const lab=makeLabel(T.name,{sx:2.4,size:46,color:T.color}); lab.position.set(0,3.45,0); g.add(lab); if(typeof dressTonic==='function') dressTonic(g,T);
  const fx=Math.sin(ry),fz=Math.cos(ry);
  const W=Math.abs(Math.sin(ry))>.7?.9:1.2, D=Math.abs(Math.sin(ry))>.7?1.2:.9; addCol(x,z,W,D);
  addInter({x:x+fx*1.2,z:z+fz*1.2,r:1.9,prompt:()=>{ if(P.perks.has(key)) return null; if(T.quest&&!Q.tonicOpen) return '!Sealed with black wax. Something in the dig holds the key'; if(!T.noPower&&!POWER.on) return '!Requires power'; if(key==='wind'&&P.swBuys>=3) return '!The bottle is dry'; return `Drink ${T.name}, ${T.desc} [${T.cost}]`; },
    use:()=>{ if(P.perks.has(key)||(T.quest&&!Q.tonicOpen)||(!T.noPower&&!POWER.on)||(key==='wind'&&P.swBuys>=3)) return; if(!spend(T.cost)) return; P.perks.add(key); if(key==='wind') P.swBuys++; if(key==='iron'){P.maxHp=175;P.hp=175;} sfx.tonic(); toast(T.name); }});
}
tonicMachine('wind',-8.6,45,Math.PI/2);
tonicMachine('iron',28.6,21,-Math.PI/2);
tonicMachine('fleet',-28.6,25,Math.PI/2);
tonicMachine('quick',3,-28.6,0);
tonicMachine('rapid',22,-28.6,0);
tonicMachine('mule',-24,28.6,Math.PI);
tonicMachine('steady',36,5.6,0);
