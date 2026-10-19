/* ---------- quest anchors: every place a quest prop can stand, in one table (see docs/QUEST.md) ----------
   To move a puzzle into a new area (the Underworks, the Château), change or add rows here only.
   Row fields: x, z (world metres), y (floor height, default 0), ry (facing, radians; 0 faces +z), zone (ZONES key the
   anchor sits in, used for hints and to keep random picks spread out), area ('main' today; new areas later),
   hint (journal wording). Rows marked temp:true are temporary placements on the current map that are meant to move
   to an anchor from docs/MAP.md once the new areas exist. */
const QA={
  // POWER_ANCHORS: three of these get a breaker switch each game (seeded, never two in the same zone)
  power:[
    {id:'bunker-corner',x:-8.7,z:33.2,ry:Math.PI/2,zone:'A',hint:'in the south-west corner of the spawn bunker'},
    {id:'trench-cart',x:-13.5,z:25,ry:0,zone:'B',hint:'behind the broken cart in the west trench'},
    {id:'trench-east',x:25.5,z:6.7,ry:0,zone:'B',hint:'by the sandbags where the east trench meets the yard wall'},
    {id:'dig-southeast',x:2.5,z:-24,ry:Math.PI,zone:'C',hint:'south-east of the pit, near the Quickhand machine'},
    {id:'dig-south',x:-22,z:-28.5,ry:0,zone:'C',hint:'against the south wall of the dig, near the Forge'},
    {id:'yard-corner',x:13.5,z:-21.5,ry:Math.PI/2,zone:'D',hint:'near the south-west corner of the generator yard'},
    {id:'yard-gate',x:38.4,z:-2.2,ry:-Math.PI/2,zone:'D',hint:'next to the gate out to No Man\'s Land'},
    {id:'chapel-vestry',x:58.4,z:12.4,ry:-Math.PI/2,zone:'E',hint:'in the chapel, beside the vestry glass'},
    {id:'nml-crater',x:96.5,z:-26,ry:-Math.PI/2,zone:'G',hint:'in the far shell crater of No Man\'s Land'},
    {id:'nml-north',x:44.5,z:1.2,ry:Math.PI/2,zone:'G',hint:'just inside No Man\'s Land, under the chapel wall'},
  ],
  // FUSE_ANCHORS: searchable supply crates; one hides the breaker fuse (zombies can also drop it once a fuse breaker is found)
  fuse:[{x:7.6,z:47.4,zone:'A'},{x:-25.6,z:8.4,zone:'B'},{x:6.6,z:-4.2,zone:'C'},{x:19,z:-27.8,zone:'D'},{x:32.4,z:21.5,zone:'E'},{x:97,z:1.5,zone:'G'}],
  // the main generator (fixed; the old lever)
  generator:{x:35.5,z:-14,use:{x:33.6,z:-13}},
  // PUZZLE_ANCHORS
  valves:{x:10.9,z:-17,ry:Math.PI/2,zone:'D',hint:'the pressure manifold on the west wall of the generator yard'},
  chalk:{x:-9.3,z:37.3,ry:Math.PI/2,zone:'A',hint:'the chalkboard in the spawn bunker'},
  radio:{x:6.9,z:34.1,ry:-Math.PI/2,dial:{x:5.1,z:34},key:{x:6.5,z:35.6},zone:'A',hint:'the field radio on the bunker map table'},
  drop:[{x:24,z:-20,zone:'D'},{x:-18,z:-22,zone:'C'},{x:-20,z:14,zone:'B'},{x:46,z:20,zone:'E'}],
  glyphs:[
    {x:-29.35,z:12,ry:Math.PI/2,zone:'B'},{x:29.35,z:24,ry:-Math.PI/2,zone:'B'},{x:-29.35,z:-24,ry:Math.PI/2,zone:'C'},
    {x:9.35,z:-20,ry:-Math.PI/2,zone:'C'},{x:39.35,z:-22,ry:-Math.PI/2,zone:'D'},{x:30.65,z:11,ry:Math.PI/2,zone:'E'},
  ],
  lockbox:{x:2,z:-8,ry:-Math.PI/2,zone:'C',hint:'the diggers\' strongbox at the north end of the dig'},
  musicbox:{x:57.6,z:19.1,use:{x:56.2,z:19.1},zone:'E',hint:'the music box on the chapel altar'},
  braziers:[{x:-17,z:-9,zone:'C'},{x:-3,z:-9,zone:'C'},{x:-3,z:-19.5,zone:'C'},{x:-17,z:-19.5,zone:'C'}],
  souls:[{x:-12,z:14,zone:'B'},{x:-18,z:-6,zone:'C'},{x:24,z:-16,zone:'D'},{x:46,z:13,zone:'E'},{x:-16,z:22,zone:'B'}],
  lanterns:[{x:-17,z:-14},{x:-3,z:-14},{x:-10,z:-6},{x:-10,z:-22},{x:-20,z:-24}],
  gravecaller:{x:-10,z:-5,zone:'C'},
  tonic:{x:-28.6,z:-2,ry:Math.PI/2,zone:'C',hint:'the wax-sealed machine on the dig\'s west wall'},
  // STAFF_ANCHORS: the four staff pedestals (shared workbench / swap point) and each staff's part tasks and trial.
  // seq: three shootable targets (h = height above the floor); seqDrop: where that part falls; hold / zone / shrine / trial: defences and trials.
  staffs:{
    pedestals:[{x:47,z:15.6,zone:'E'},{x:47,z:19.4,zone:'E'},{x:51,z:15.6,zone:'E'},{x:51,z:19.4,zone:'E'}],
    cinder:{seq:[{x:-22.6,z:-28.9,h:1.9},{x:-28.9,z:-22.6,h:2.5},{x:-26.6,z:-26.6,h:3.6}],seqDrop:{x:-22,z:-22},zone:'fuel trench (TRAP)'},
    brine:{seq:[{x:62,z:-28.9,h:1.3},{x:98.9,z:-18,h:1.5},{x:75,z:4.1,h:1.7}],seqDrop:{x:96,z:-22},hold:{x:90,z:-27.2}},
    grave:{seq:[{x:30.9,z:20.5,h:1.4},{x:30.9,z:24.5,h:2.3},{x:43,z:29.1,h:3.2}],seqDrop:{x:33,z:22},hold:{x:-15,z:-26.2},trial:{x:-10,z:-23}},
    gale:{seq:[{x:-20,z:29.1,h:2.9},{x:12,z:29.1,h:3.1},{x:14,z:5.9,h:2.8}],seqDrop:{x:-2,z:24},zone:{x:25,z:-14},shrine:{x:70,z:1.5}},
  },
  // VAULT_ANCHORS: the deep vault finale. It belongs in the Underworks (Lane 7); until then it sits in the dig pit.
  vault:{temp:true,future:'underworks:vault',zone:'C',
    spawn:{x:-10,z:-1.5}, door:{x:-10,z:-14,ry:0}, gramophone:{x:-6.5,z:-6.5}, heart:{x:-10,z:-14},
    seals:[{x:-16.5,z:-14},{x:-3.5,z:-14},{x:-10,z:-21}], exit:{x:-19.5,z:-26.5}},
};
const POWER_ANCHORS=QA.power;
// seeded randomness: one seed per game (host-chosen, replicated), so every layout pick is the same on every machine
function qrng(seed){ let a=seed>>>0||1; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function qShuffle(arr,r){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const qy=a=>a.y||0;
