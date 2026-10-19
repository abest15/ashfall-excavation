/* ---------- quest anchors: every place a quest prop can stand, in one table (see docs/QUEST.md) ----------
   To move a puzzle into a new area (the Underworks, the Château), change or add rows here only.
   Row fields: x, z (world metres), y (floor height, default 0), ry (facing, radians; 0 faces +z), zone (ZONES key the
   anchor sits in, used for hints and to keep random picks spread out), area ('main' today; new areas later),
   hint (journal wording). Rows marked temp:true are temporary placements on the current map that are meant to move
   to an anchor from docs/MAP.md once the new areas exist. With the levels engine (docs/MAP.md) rows may sit on any floor:
   y = floor height (Château upper 4.2, Underworks −7, deep vault −10); many rows are built from MARKERS (07b-levels-build.js). */
const MK=(name,o={})=>{ const m=MARKERS[name]; return Object.assign({x:m.x,y:m.y,z:m.z,ry:m.ry||0,zone:m.zone},o); };
const QA={
  // POWER_ANCHORS: three of these get a breaker switch each game (seeded, never two in the same zone)
  power:[
    {id:'bunker-corner',x:-8.7,z:33.2,ry:Math.PI/2,zone:'A',hint:'in the south-west corner of the spawn bunker'},
    {id:'trench-cart',x:-13.5,z:25,ry:0,zone:'B',hint:'behind the broken cart in the west trench'},
    {id:'trench-east',x:25.5,z:6.7,ry:0,zone:'B',hint:'by the sandbags where the east trench meets the yard wall'},
    {id:'dig-south',x:-22,z:-28.5,ry:0,zone:'C',hint:'against the south wall of the dig, near the Forge'},
    {id:'yard-corner',x:13.5,z:-21.5,ry:Math.PI/2,zone:'D',hint:'near the south-west corner of the generator yard'},
    {id:'yard-gate',x:38.4,z:-2.2,ry:-Math.PI/2,zone:'D',hint:'next to the gate out to No Man\'s Land'},
    {id:'chapel-vestry',x:58.4,z:12.4,ry:-Math.PI/2,zone:'E',hint:'in the chapel, beside the vestry glass'},
    {id:'nml-crater',x:96.5,z:-26,ry:-Math.PI/2,zone:'G',hint:'in the far shell crater of No Man\'s Land'},
    {id:'nml-north',x:44.5,z:1.2,ry:Math.PI/2,zone:'G',hint:'just inside No Man\'s Land, under the chapel wall'},
    // the Château and the Underworks (behind their own doors: the power hunt now leads into them)
    {id:'chateau-maproom',x:-31.3,z:-24.8,ry:-Math.PI/2,zone:'K',hint:'in the Château map room, by the east wall'},
    {id:'chateau-quarters',x:-56.9,y:4.2,z:-24.8,ry:Math.PI/2,zone:'L',hint:'upstairs in the Château, in the south quarters'},
    {id:'under-pump',x:23.3,y:-7,z:-28.6,ry:-Math.PI/2,zone:'U1',hint:'down in the pump room, in the far corner'},
    {id:'under-rail',x:-45,y:-7,z:-41.5,ry:0,zone:'U2',hint:'along the rail tunnel under the Château'},
    {id:'under-gallery',x:45,y:-7,z:-20.6,ry:-Math.PI/2,zone:'U4',hint:'at the end of the flooded gallery walkway'},
  ],
  // FUSE_ANCHORS: searchable supply crates; one hides the breaker fuse (zombies can also drop it once a fuse breaker is found)
  fuse:[{x:7.6,z:47.4,zone:'A'},{x:-25.6,z:8.4,zone:'B'},{x:6.6,z:-4.2,zone:'C'},{x:19,z:-27.8,zone:'D'},{x:32.4,z:21.5,zone:'E'},{x:97,z:1.5,zone:'G'}],
  // the main generator (fixed; the old lever)
  generator:{x:35.5,z:-14,use:{x:33.6,z:-13}},
  // PUZZLE_ANCHORS
  valves:MK('under.pump.valve',{ry:Math.PI,hint:'the pressure manifold on the north wall of the pump room (Underworks)'}),
  chalk:{x:-9.3,z:37.3,ry:Math.PI/2,zone:'A',hint:'the chalkboard in the spawn bunker'},
  radio:MK('chateau.radio',{x:-55.9,ry:Math.PI/2,dial:{x:-54.1,z:-20.4},key:{x:-54.1,z:-22.8},hint:'the field radio on the Château radio desk'}),
  drop:[{x:24,z:-20,zone:'D'},{x:-18,z:-22,zone:'C'},{x:-20,z:14,zone:'B'},{x:46,z:20,zone:'E'}],
  glyphs:[
    {x:-29.35,z:12,ry:Math.PI/2,zone:'B'},{x:29.35,z:24,ry:-Math.PI/2,zone:'B'},{x:-29.35,z:-24,ry:Math.PI/2,zone:'C'},
    {x:9.35,z:-20,ry:-Math.PI/2,zone:'C'},{x:39.35,z:-22,ry:-Math.PI/2,zone:'D'},{x:30.65,z:11,ry:Math.PI/2,zone:'E'},
    {x:-41.9,y:4.2,z:-16,ry:Math.PI/2,zone:'L'},{x:-14.1,y:-7,z:-50,ry:-Math.PI/2,zone:'U3'},{x:-10,y:-7,z:-38.1,ry:Math.PI,zone:'U2'},
  ],
  lockbox:MK('chateau.safe',{x:-55.6,ry:Math.PI/2,hint:'the officers\' strongbox upstairs in the Château north quarters'}),
  musicbox:MK('under.ossuary.altar',{use:{x:-24,z:-51.8},hint:'the music box on the ossuary altar'}),
  braziers:[{x:-31,y:-7,z:-48.5,zone:'U3'},{x:-17,y:-7,z:-48.5,zone:'U3'},{x:-17,y:-7,z:-58.5,zone:'U3'},{x:-31,y:-7,z:-58.5,zone:'U3'}],
  souls:[{x:-12,z:14,zone:'B'},{x:-18,z:-6,zone:'C'},{x:24,z:-16,zone:'D'},{x:46,z:13,zone:'E'},{x:-16,z:22,zone:'B'},{x:13,y:-7,z:-24,zone:'U1'},{x:-38,z:-6,zone:'K'}],
  lanterns:[{x:-17,z:-14},{x:-3,z:-14},{x:-10,z:-6},{x:-10,z:-22},{x:-20,z:-24}],
  gravecaller:{x:-10,z:-5,zone:'C'},
  tonic:MK('under.ossuary.perk',{hint:'the wax-sealed machine in the ossuary'}),
  // STAFF_ANCHORS: the four staff pedestals (shared workbench / swap point) and each staff's part tasks and trial.
  // seq: three shootable targets (h = height above the floor); seqDrop: where that part falls; hold / zone / shrine / trial: defences and trials.
  staffs:{
    pedestals:[{x:47,z:15.6,zone:'E'},{x:47,z:19.4,zone:'E'},{x:51,z:15.6,zone:'E'},{x:51,z:19.4,zone:'E'}],
    cinder:{seq:[{x:-22.6,z:-28.9,h:1.9},{x:-28.9,z:-22.6,h:2.5},{x:-26.6,z:-26.6,h:3.6}],seqDrop:{x:-22,z:-22},zone:'fuel trench (TRAP)'},
    brine:{seq:[{x:62,z:-28.9,h:1.3},{x:98.9,z:-18,h:1.5},{x:75,z:4.1,h:1.7}],seqDrop:{x:96,z:-22},hold:{x:34,y:-7,z:-31.3}},
    grave:{seq:[{x:-33.5,y:-7,z:-49.5,h:1.4},{x:-33.5,y:-7,z:-52,h:2.2},{x:-33.5,y:-7,z:-54.5,h:3}],seqDrop:{x:-27,y:-7,z:-50.5},hold:{x:-15,z:-26.2},trial:{x:-10,z:-23}},
    gale:{seq:[{x:-27.6,y:4.2,z:-17,h:1.6},{x:-36,y:4.2,z:-25.3,h:3},{x:-41.8,y:4.2,z:-22,h:2.4}],seqDrop:{x:-34,y:4.2,z:-16},zone:{x:25,z:-14},shrine:MK('chateau.balcony')},
  },
  // VAULT_ANCHORS: the deep vault finale in the Underworks: the Hollow's gate brings everyone up into the ossuary (U3),
  // the sealed vault door is LVL.doors.vault (marker under.vault.seal), the arena is the deep vault (U5, floor −10).
  vault:{zone:'U5',
    spawn:{x:-24,y:-7,z:-49.5}, door:{x:-24,y:-7,z:-61.6,ry:0,use:{x:-24,z:-57.9}}, gramophone:{x:-27.6,y:-7,z:-58.6}, heart:{x:-28,y:-9.6,z:-75},
    seals:[{x:-36,y:-10,z:-70.5},{x:-20,y:-10,z:-70.5},{x:-28,y:-10,z:-82.4}], exit:{x:-37.6,y:-10,z:-81.6}},
};
const POWER_ANCHORS=QA.power;
// seeded randomness: one seed per game (host-chosen, replicated), so every layout pick is the same on every machine
function qrng(seed){ let a=seed>>>0||1; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function qShuffle(arr,r){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function qy(a){ return a.y||0; }
// underground props go in the Underworks group (it draws only when the camera is below ground or near an entrance)
function qPar(y){ return (y||0)<-2&&typeof UNDER!=='undefined'?UNDER:scene; }
// a collider on the anchor's floor (old addCol boxes only block the ground level)
function qCol(x,z,w,d,y){ return (y||0)!==0?addColY(x-w/2,x+w/2,z-d/2,z+d/2,(y||0)-.5,(y||0)+3):addCol(x,z,w,d); }
function qdy(a,b){ return Math.abs((a.y||0)-(b.y||0)); } // level-aware checks: 2D distance and a height gap
