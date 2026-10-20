/* ---------- weapons ---------- */
const WD={
  pistol:{name:'Service Pistol',up:'Cinder Talon',type:'pistol',dmg:45,rate:.16,mag:8,res:64,rl:1.5,spread:.012,head:2.5,upMul:4,snd:'pistol'},
  carbine:{name:'Trench Carbine',up:'Dreadnought',type:'rifle',dmg:150,rate:.75,mag:5,res:50,rl:2.4,spread:.003,head:3,pierce:2,cost:600,snd:'rifle'},
  smg:{name:'Field SMG',up:'Hornet Swarm',type:'smg',dmg:55,rate:.075,auto:true,mag:32,res:192,rl:2,spread:.03,head:2,cost:1200,snd:'smg'},
  shotgun:{name:'Pump Shotgun',up:'Mudslide',type:'shotgun',dmg:48,rate:.8,mag:6,res:42,rl:3,pellets:8,spread:.075,head:1.5,cost:1500,snd:'shotgun'},
  lmg:{name:'Light Machine Gun',up:'Iron Torrent',type:'lmg',dmg:85,rate:.09,auto:true,mag:75,res:300,rl:4,spread:.035,head:2.2,box:true,snd:'lmg'},
  revolver:{name:'Heavy Revolver',up:'Judgement',type:'pistol',dmg:280,rate:.35,mag:6,res:48,rl:2.8,spread:.01,head:3,pierce:2,box:true,snd:'rifle'},
  autorifle:{name:'Assault Rifle',cost:1800,up:'Red Tempest',type:'smg',dmg:95,rate:.1,auto:true,mag:30,res:240,rl:2.2,spread:.022,head:2.5,box:true,snd:'smg'},
  marksman:{name:'Marksman Rifle',up:'Longwatch',type:'rifle',dmg:480,rate:.9,mag:6,res:48,rl:3,spread:0,head:4,pierce:3,box:true,snd:'rifle'},
  rod:{name:'Lodestone Rod',up:'Awakened Rod',type:'rod',dmg:900,rate:.55,mag:12,res:60,rl:2.5,spread:0,head:1,pierce:5,beam:true,snd:'rod',
       upStats:{dmg:2800,mag:20,res:140,pierce:10,rate:.42,chain:true}},
  cannon:{name:'Cinder Cannon',up:'Sunfall',type:'cannon',dmg:650,rate:.95,mag:4,res:24,rl:3.2,spread:.004,head:1,splash:4.2,box:true,snd:'cannon',
       upStats:{dmg:1700,mag:6,res:48,splash:5.6,rate:.8}},
  ion:{name:'Ion Blaster',up:'Ion Annihilator',type:'ion',dmg:1100,rate:.28,mag:20,res:160,rl:2.6,spread:.004,head:1.2,splash:3.2,proj:true,pcol:0x6aff7a,box:true,snd:'ion',upStats:{dmg:2600,mag:40,res:200,splash:4.2,pcol:0xff5a4a}},
  dynamo:{name:'Dynamo Rifle',up:'Dynamo Rifle Mk II',type:'dynamo',dmg:1e6,rate:1.25,mag:3,res:9,rl:3.4,spread:0,head:1,jump:10,box:true,snd:'dynamo',upStats:{mag:6,res:18,jump:24}},
  gauntlet:{name:'Tempest Gauntlet',type:'gauntlet',dmg:800,rate:.3,mag:14,res:84,rl:2,spread:0,head:1.5,pierce:3,beam:true,arc:true,chain:true,chainN:5,chainMul:.75,bcol:0xffd27a,snd:'zap'},
  gatling:{name:'Ember Gatling',type:'gatling',dmg:420,rate:.05,auto:true,mag:999,res:0,rl:1,spread:.03,head:2,pierce:2,snd:'lmg'},
};
const BOX_POOL=['lmg','revolver','autorifle','marksman','shotgun','smg','carbine','cannon','ion','dynamo'];
function statsOf(w){ const d=WD[w.id]; const s=Object.assign({},d); s.pellets=d.pellets||1; s.pierce=d.pierce||1;
  if(w.up){ if(d.upStats) Object.assign(s,d.upStats); else { s.dmg=d.dmg*(d.upMul||2.4); s.mag=Math.round(d.mag*1.5); s.res=d.res*2; s.pierce=s.pierce+1; } s.name=d.up; }
  if(P.drum&&!d.staff&&!['rod','gauntlet','gatling'].includes(w.id)){ s.mag=Math.round(s.mag*1.5); s.res=Math.round(s.res*1.5); } // Quartermaster's Drum Magazine (quest reward)
  return s; }
function mkInst(id,up=false){ const s=statsOf({id,up}); return {id,up,mag:s.mag,res:s.res,next:0,reloadEnd:0}; }
const curW=()=>PU.gatling>0&&PU.gat?PU.gat:(P.weapons[P.cur]||null);
const maxSlots=()=>P.perks.has('mule')?3:2;
/* ---------- handling: recoil, bloom, ADS zoom and reload style per weapon ----------
   v: vertical camera kick (rad) · h: horizontal kick · hb: horizontal drift bias (+ right) · rec: recovery speed
   vz/vr: viewmodel push-back and muzzle climb · bloom: spread added per shot (0..1) · zoom: ADS FOV reduction */
const HANDLING={
  pistol:{v:.014,h:.004,hb:.15,rec:11,vz:.035,vr:.11,bloom:.2,zoom:12},
  revolver:{v:.04,h:.01,hb:.3,rec:7,vz:.06,vr:.32,bloom:.5,zoom:14},
  carbine:{v:.034,h:.007,hb:.2,rec:6,vz:.075,vr:.14,bloom:.6,zoom:22},
  marksman:{v:.032,h:.006,hb:-.2,rec:6,vz:.06,vr:.1,bloom:.6,zoom:38},
  smg:{v:.0075,h:.0055,hb:.35,rec:10,vz:.02,vr:.035,bloom:.07,zoom:16},
  autorifle:{v:.0095,h:.005,hb:.25,rec:9,vz:.024,vr:.04,bloom:.08,zoom:22},
  shotgun:{v:.05,h:.012,hb:.3,rec:6,vz:.095,vr:.28,bloom:.4,zoom:12},
  lmg:{v:.0085,h:.0065,hb:-.3,rec:8,vz:.024,vr:.035,bloom:.06,zoom:16},
  rod:{v:.022,h:.006,hb:0,rec:7,vz:.06,vr:.12,bloom:0,zoom:10},
  cannon:{v:.06,h:.012,hb:.2,rec:5,vz:.11,vr:.34,bloom:.5,zoom:14},
  ion:{v:.013,h:.004,hb:.1,rec:9,vz:.04,vr:.1,bloom:.15,zoom:14},
  dynamo:{v:.045,h:.008,hb:0,rec:5,vz:.09,vr:.25,bloom:0,zoom:16},
  gauntlet:{v:.012,h:.004,hb:0,rec:8,vz:.05,vr:.06,bloom:0,zoom:8},
  gatling:{v:.0035,h:.004,hb:0,rec:10,vz:.012,vr:.015,bloom:.03,zoom:8},
};
const handling=id=>HANDLING[id]||HANDLING.pistol;
