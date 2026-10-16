/* ================= systems ================= */
const POWER={on:false};
const R={n:0,toSpawn:0,spawnT:0,breakT:0,inBreak:true,bossDue:false,markedDone:false,pups:0,rebuild:0};
const P={pos:new V3(0,0,44),vy:0,yaw:0,pitch:0,hp:100,maxHp:100,lastHit:-99,points:500,weapons:[],cur:0,perks:new Set(),swBuys:0,ads:0,sprint:false,
  moving:false,grounded:true,meleeT:0,swapT:0,bobT:0,kick:0,kills:0,heads:0,invuln:0,revive:0,zone:'A',earned:0,shield:0,bless:new Set(),lungeT:0,lx:0,lz:0,shake:0,meleePending:false,items:new Set(),aegis:false,inCabin:false};
const PU={double:0,insta:0,freeze:0,sale:0,gatling:0,gat:null};
let mode='main'; // 'main' | 'hollow'
let state='menu'; let GT=0; let playTime=0;
