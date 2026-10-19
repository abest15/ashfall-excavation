# Ashfall Excavation: quest, power and puzzles (dev docs, full spoilers)

This page documents the power restoration, the main quest ("the rite", 23 rites), the four elemental staffs, every puzzle and its solution,
the special dead, the rewards, and the anchor tables that place all of it. It is for developers and testers.

Code map:

| File | What it holds |
|---|---|
| `src/gameplay/16a-quest-anchors.js` | `QA`: every anchor table (power, crates, puzzles, vault); `qrng(seed)`, `qShuffle` |
| `src/gameplay/16b-quest-core.js` | `qAct` (host-routed actions), `qEv` (replicated events), `QI` (team items), `QP` (shared pickups), `questSpawn` |
| `src/gameplay/16-generator-power.js` | breakers, supply crates, generator crank, `powerOn` |
| `src/gameplay/19-quest-lodestone-fragments-waystones.js` | the original stages (fragments, waystones, resonators, chapel, wraith, strike), re-wired into the longer chain |
| `src/gameplay/19b-puzzles.js` | pressure manifold + chalkboard, field radio + supply drop, glyph strongbox, soul canisters, brazier melody |
| `src/gameplay/19c-specials.js` | Shrieker, Sapper, Gravecaller bodies and behaviour; Sapper charges; `pickSpecial` |
| `src/gameplay/19d-quest-finale.js` | Gravecaller stage, Emberwake Draught, the Deep Vault (gramophone, door, seals, Furnace Heart, lift), the ending |
| `src/gameplay/19e-quest-sync.js` | `questLayout(seed)`, `questReset`, combat hooks, the journal, co-op snapshot (`questVisX` / `applyQuestVisX`) |
| `src/audio/33e-quest-sfx.js` | the quest's procedural sounds |

## Seeds and layout

Everything random about the quest comes from one integer seed per game (`Q.seed`). The host (or solo player) picks it
in `questReset()` when a game starts; `?seed=1234` in the URL forces one (handy for testing). `questLayout(seed)` draws
all random choices from `qrng(seed)` in a fixed order: breaker anchors and types, fuse crate, manifold readings, radio
frequencies, glyph walls/tallies/dial order, ward circle spots, brazier notes and order, grave lantern spots. Clients
receive the seed in the snapshot (`qx.sd`) and run the same layout, so props stand in the same places everywhere.

## Co-op

The host is authoritative. Every quest action calls `qAct(kind, arg)`: solo/host runs `QACT[kind](arg, 'h')` at once; a
client sends `{t:'q', k, a}` and the host runs the same handler with the client's id (points are credited to them).
Shootable quest targets carry `userData.qhit` and travel as `{t:'shoot', k:'q', i}`. Sounds, toasts and one-player
rewards go out as `{t:'qx', k}` events (`qEv`). The snapshot carries `qx: questVisX()` (stage, rites, breaker flags,
crates, team items, pickups, valve/radio/dial/brazier/soul/vault state, Sapper charges). Unlike the old rites, clients
can do every new step themselves (throw breakers, crank, turn valves, transmit, shoot dials, light braziers, ...).
Team items (`QI`: fuse, dog tags, record shards, vault key, soul lantern) are shared by the whole team.

## Power (3 breakers + generator)

The generator no longer has a lever. Three **breaker switches** stand on three of the fourteen `QA.power` anchors (the old map, the Château and the
Underworks), chosen per game, never two in one zone. Breakers in the Château or the Underworks sit behind their doors,
so the power hunt can send you through two or three purchases first. Each breaker gets one of three requirements (shuffled per game):

| Type | Prompt | What to do |
|---|---|---|
| `jammed` | "rusted solid. Knock it loose with your knife (n/5)" | Five knife blows on the housing, each within 2.2 s of the last (a longer pause resets the count), then throw it |
| `fuse` | "The fuse holder is empty" | Search the six supply crates (`QA.fuse`); one (seeded) holds the fuse. Once the fuse breaker has been found, any kill also has a 4% chance to drop a fuse. Seat it, then throw |
| `surge` | "Throw the breaker switch (the alarm line is live)" | Throwing it sounds the alarm: 5 + 2 per player fast runners pour in |

Finding: a breaker is found when any player comes within 7 m on its floor (height gap under 2.5 m) (banner "A breaker switch (n/3 found)"). Cues: each
unthrown breaker hums (positional, every 2.4 s within 26 m), sparks along its ground cable, and flickers its lamp. The
journal lists "Power: breakers found f/3 · thrown t/3", "A hum from <zone>…" for each unfound breaker, and the
requirement for each found one. The generator's three lamps light one per thrown breaker.

Generator: with all three thrown, **hold E for 3 s** at the generator (progress in the prompt; letting go drains it).
The first crank calls 4 + 2 per player runners. When it catches: power on (rite 1). Everything power-dependent is
unchanged (tonics, the Forge, the field locker, the fuel trench, the Colossus hatch, the Lodestone's awakening).

## The rite: all 23 steps

| # | Stage(s) | Step | Rite awarded when |
|---|---|---|---|
| 1 | (any) | Restore power (above) | the generator catches |
| 2 | `frags` → `assembling` → `rodReady` | Three Rod fragments: dig mound in the trenches, field locker in the yard (needs power), the glowing "marked" zombie (round 2+). Set them in the Lodestone, take the Rod | fragments set |
| 3 | `stones` | Kill 12 dead near each waystone, strike each with the Rod. Reward: **Stoneskin** (25% less damage) | third stone lit |
| 4 | `echoes` | Resonators: strike low→high, they move, then high→low. Reward: **Resonant Knife** | second verse done |
| 5 | `valves` | **Pressure manifold** (puzzle 1). Reward: record shard I | manifold holds |
| 6 | `candles` → `ember` | Ring the chapel bell, read the glass, light the candelabras in its order; take the Saint's Ember | candles lit |
| 7 | `colossus` | Ride the Colossus (stand where the glowing foot lands, power on), take the Colossus Heart | Heart taken |
| 8 | `gauntlet` | Build the Tempest Gauntlet at the chapel workbench (needs power) | Gauntlet built |
| 9 | `radio` | **Field radio** (puzzle 2). Reward: Quartermaster's Drum Magazine + record shard II | third frequency answered |
| 10 | `return` → `awakening` → `awakenReady` | Return the Rod (power), hold 14 m of the Lodestone for 45 s (an Iron Warden comes at 25 s), take the Awakened Rod | Rod awake |
| 11 | `wraith` | Wound the wraith three times with the Awakened Rod; destroy the Warden it possesses. Reward: **Ashen Talisman** (every tonic) | bound Warden dies |
| 12 | `gravecaller` | **Mid-quest boss: the Gravecaller** (below). Reward: unseals the **Emberwake Draught** | Gravecaller dies |
| 13 | `felling` | Breach the Colossus's three valves with a relic weapon; it falls | Colossus falls |
| 14 | `strike` | Strike the Lodestone with the Awakened Rod: four glyphs light up | struck |
| 15 | `glyphs` | **Glyph strongbox** (puzzle 3). Reward: vault key + record shard III | lid opens |
| 16 | `souls` | **Soul canisters** (puzzle 4). Reward: soul lantern | third canister sealed |
| 17 | `braziers` | **Brazier melody** (puzzle 5): opens the shaft at the Lodestone | fourth brazier lit |
| 18 | `descent` + the Hollow | Descend; survive four Hollow waves; the Warden Prime wards twice (shatter the lit crystals) | Prime falls |
| 19 | `vault` | The Hollow's gate brings everyone up into the **ossuary** (Underworks), outside the sealed Deep Vault door. Set the three record shards on the gramophone; hold out while the Deep Hymn plays (7 s) | hymn ends |
| 20 | `vault` | Set all four **upgraded staffs** in the vault door sockets (each holder sets their own; solo: claim, carry and set them one at a time) | fourth staff set |
| 21 | `seals` | Unlock the vault door (vault key + soul lantern). Stand on each of the three seal plates until it burns white (12 s each, any player counts); the dead pour in | third seal |
| 22 | `furnace` | The Furnace Heart rises (3 s). Destroy it (30 000 HP, +60% per extra player; relic weapons ×2.5; at most 2 500 per hit). Every 7 s it pulses (30 damage within 6.5 m); at half health a Sapper and a Shrieker climb out | Heart breaks |
| 23 | `escape` → `won` | Reach the lift (60 s on the clock, the dead keep coming) and ride it out: victory, ending text | lift ridden |

The end screen shows `rites/23` (`RITES_TOTAL`). The staffs are built alongside the chain (their parts need power) and must all be upgraded before the vault door (rite 20). When the door opens, the staffs go back to the players who set them (solo: the last one returns to you, the rest to their pedestals).

## Puzzle solutions

### 1. Pressure manifold (stage `valves`, needs power)
- Where: manifold on the north wall of the pump room in the Underworks (`QA.valves`, marker `under.pump.valve`; down the
  shaft stair in the dig); chalkboard in the spawn bunker (`QA.chalk`).
- Clue: the chalkboard shows three gauges A, B, C with chalk needles pointing at 1..5 ("MANIFOLD - HOLD AT").
- Solve: turn each wheel (E; each turn steps the gauge 1→5→1) to its chalked reading, then pull the red lever.
- Wrong lever pull: scalding steam (25 damage within 3.5 m) and 3 dead climb out nearby. Wheels keep their positions.
- Seeded: `VAL.tgt` (never 1-1-1).

### 2. Field radio (stage `radio`)
- Where: radio on the Château radio-room desk (`QA.radio`, marker `chateau.radio`): dial and key on the room side.
- Clue: Shriekers carry dog tags. During this stage the host keeps one Shrieker walking (every 10 s if none) until all
  three tags have dropped. Each tag reads "Dog tag I/II/III: <freq> kc" (toast, prompt, journal).
- Solve: turn the dial to tag I's frequency and transmit, then II, then III (dial steps through
  31.5, 38.0, 42.5, 47.0, 53.5, 58.0, 64.5, 71.0 kc). You need the matching tag in hand.
- Wrong frequency: static, 2 dead, the sequence restarts.
- Reward: a supply drop falls (smoke, parachute) at one of `QA.drop`; opening it gives the opener the
  **Quartermaster's Drum Magazine** (+50% magazine and reserve on every gun they carry, except relics) and drops record shard II.
- Seeded: `RAD.freqs`, the drop spot.

### 3. Glyph strongbox (stage `glyphs`)
- Where: four of the six `QA.glyphs` walls carry a glyph (sun, moon, star, eye) with 1..6 tally marks (dim until
  this stage, then bright). Three more wall spots are in the Château (bell room) and the Underworks (ossuary, rail tunnel). The strongbox is
  upstairs in the Château north quarters (`QA.lockbox`, marker `chateau.safe`).
- Clue: the box's face shows four glyphs, each above a number dial.
- Solve: shoot each dial to turn it (1→6→1) until it shows the tally count of the glyph above it, then use the box.
- Wrong: a jolt (20 damage within 3 m), 2 dead. Dials keep their values.
- Reward: vault key and record shard III. Seeded: wall spots, tallies (`GLY.tally`), dial order (`GLY.order`).

### 4. Soul canisters (stage `souls`)
- A chalk ward (4.5 m circle) appears at one of `QA.souls` with a glass canister beside it.
- Kill 10 dead (+2 per extra player) inside the circle; the canister fills. Then the ward moves to the next spot.
  Three canisters → the soul lantern. Seeded: the three spots.

### 5. Brazier melody (stage `braziers`)
- Where: music box on the ossuary altar (`QA.musicbox`, marker `under.ossuary.altar`); four braziers in the ossuary
  (`QA.braziers`).
- Clue: winding the music box plays four notes (once every 4 s); its open lid shows the punched strip (left to right,
  higher holes = higher notes). Each brazier's bowl hums its own note when you stand close; bigger bowls ring deeper.
- Solve: light the braziers in the melody's order. Notes: 196, 246.9, 293.7, 392 Hz.
- Wrong: all flames die, 3 dead. Seeded: which bowl has which note (`BRZ.notes`), the order (`BRZ.order`).

## The four elemental staffs (`src/gameplay/19f-staffs.js`)

One staff per player, enough for a full squad of four. Each has its own element, three parts with three different
tasks (a special dead, a target puzzle, a defence), its own binding condition at the shared pedestals, and its own
upgrade trial. Staffs are claimed per player and tracked by the host (`STF[k].owner`); a claimed staff shows
"<name> carries the …" to everyone else. A solo player can build all four but carries one at a time: claiming another
staff puts the carried one back on its pedestal (swap). If you lose your staff (bleed out), take it again at its
pedestal. **Alt-fire: aim (right click / LT) and fire**; it costs three charges.

| Staff | Primary fire | Alt-fire | Part 1 (special) | Part 2 (puzzle) | Part 3 (defence) | Binding | Upgrade trial |
|---|---|---|---|---|---|---|---|
| **Cinder** (molten slag, orange) | slag bolt; leaves a burning slag pool (2 m, 3 s; upgraded 2.8 m, 5 s) | **Slag Geyser**: eruption at the aim point (4 m) and a big pool; upgraded: three in a line | slag core: a **Sapper** drops it | bellows grip: shoot the three embers round the Forge **smallest to largest** | quench ring: kill **8 dead in the burning fuel trench** | needs **power** (4 s) | **Quench**: 12 dead die in its slag (pools from its holder) |
| **Brine** (tidal pressure, teal) | piercing pressure jet that knocks the dead back | **Undertow**: wave round the holder, pushes everything within 7 m 4 m away (upgraded 5 m) and hurts it | tide gem: an **ash hound** may swallow it (35% per hound) | barnacle haft: shoot the brine jars in No Man's Land **largest to smallest** | pressure cap: **hold E 8 s at the pump on the flooded gallery walkway** (Underworks; the dead come) | needs the **manifold solved** (4 s) | **Turn the tide**: push 20 dead with its Undertow |
| **Grave** (soul-drain, violet) | automatic drain tether that chains to 2 (upgraded 4) and heals the holder 1.5 per hit | **Soul Harvest**: soul pulse at the aim point (6 m); each kill heals 10 and refunds a charge | bone finial: an **Iron Warden** drops it | mourning band: shoot the ossuary's skull lamps **lowest to highest** | vigil candle: **hold E 8 s at the dig's gravestone** | wants a **soul**: kill one of the dead within 12 m during its 20 s binding | **Lay the Grave Warden to rest**: start it at the pedestal (holding the staff); a Grave Warden rises in the dig |
| **Gale** (glass-storm, white) | spray of six glass shards (eight upgraded) | **Glass Cyclone**: 4 s vortex at the aim point that drags the dead in (7 m) and shreds them | glass eye: a **Shrieker** keeps it | chime spindle: shoot the glass chimes in the Château bell room and balcony **in the order they flash** (they flash in sequence every 6 s) | vane blade: kill **10 dead in the middle of the generator yard** (6 m) | stand **within 3 m for 6 s** while it spins | **Charge** it at the vane shrine on the Château balcony: its holder stands there 20 s during a live round |

Part drops and targets only count once the power is on. A wrong target order resets that puzzle and wakes two dead.
Seeded per game: which target is which size (Cinder/Brine) and the Gale flash order. The pedestal prompt lists each
staff's parts (✓/✗) and its binding condition; the journal shows one line with every staff's state.
Each staff has its own firing sound (`staffCinder`, `staffBrine`, `staffGrave`, `staffGale`) and alt-fire sound
(`staffAlt`), its own beam colour and its own head ornament on the shared staff model (`dressStaff`).
Co-op: claims, bindings, part tasks and trials run on the host; alt-fire effects run on the host (`QACT.stfx`, the
shooter's position travels with the shot); slag pools and cyclones are drawn on clients from the snapshot.

## The Gravecaller (mid-quest boss, stage `gravecaller`)
Eight seconds after the wraith-bound Warden dies, the Gravecaller (a giant Shrieker) rises near the Lodestone
(`QA.gravecaller`). HP max(9 000, 1 500 × round) before difficulty and player scaling. It summons 3 dead every 9 s
(6 s while warded; one may be a Sapper from round 10) and throws furnace bolts like a Warden. At 66% and 33% it wards
itself: shoot the three grave lanterns around the pit (`QA.lanterns`, seeded 3 of 5) to break the ward. If it is lost
somehow, it rises again after 10 s. Its death unseals the **Emberwake Draught**.

## Rewards
- **Emberwake Draught** (new tonic, 3 500, needs power, sealed until the Gravecaller dies, at `QA.tonic`
  in the ossuary, marker `under.ossuary.perk`): every kill puts a round back in your magazine and mends 4 health. Not included in the Ashen Talisman
  unless already unsealed.
- **Quartermaster's Drum Magazine** (radio supply drop): +50% magazine and reserve on every non-relic gun you carry.
- Stoneskin, Resonant Knife, Ashen Talisman, Tempest Gauntlet, Iron Aegis: unchanged.
- **Ending**: after the lift, a full-screen sequence of lines ("The Furnace Heart split like a struck bell…") ending
  with THE DEEP VAULT IS SEALED; click or any key skips to the stats screen.

## Special dead (and pacing)

| Kind | From | Notes |
|---|---|---|
| Shrieker | round 8 (chance 5% + 0.4%/round per spawn, max 12%; 1 alive solo, 2 in co-op) | pale and quick (≈3.2 m/s), 80% walker HP. Within 20 m it stops and screams (every 11-15 s): 2 dead (3 from round 15) climb up around it; nearby players get a shake and flash. Drops dog tags during `radio` |
| Sapper | round 10 (4% + 0.4%/round, max 10%; 2 alive) | riveted plate: body shots deal 45% (heads and the knife are full). 2.2× HP, slow. Between 5 and 18 m it lobs a ticking charge every 6-9 s: 1.1 s flight, 1.6 s fuse, 3.6 m blast (42 to players, also hurts the dead) |
| Gravecaller | quest only | see above |

Pacing: rounds 5+ send `26 + 6 × (round − 5)` (cap 110, × player multiplier), up from `24 + 5 × …` (cap 95). At most
**24 alive** at any time (18 on low render scale), also in co-op. Quest defences (breaker surge, generator crank, Deep
Hymn, seals, Furnace Heart, escape) hold the round open while they run (`questHoldsRound`).

## Anchor tables (re-anchoring)

All placements live in `QA` in `src/gameplay/16a-quest-anchors.js`. Each row: `x`, `z`, optional `y` (floor height,
props are placed at it), `ry` (facing), `zone` (a `ZONES` key; used for hints and to keep breakers apart), `hint`.
To move something into a new area, edit or add rows there; no other file needs to change. Notes for Lane 7:

- `QA.power`: add Underworks / Château breaker anchors as new rows (`zone` should be the new area's zone key; give
  `y` for an upper floor). Three distinct zones are picked per game.
- `QA.fuse`, `QA.drop`, `QA.glyphs`, `QA.souls`, `QA.lanterns`, `QA.braziers`: pools; extra rows are fine except
  `braziers` (exactly 4) and `glyphs` (at least 4), `souls` (at least 3), `lanterns` (at least 3).
- `QA.staffs`: the four pedestals (chapel nave), and per staff its three puzzle targets (`seq`, `h` = height),
  where that part falls (`seqDrop`), its hold point / kill zone, and the trial places (Grave Warden spawn, Gale shrine).
  Cinder's kill zone is the fuel trench (`TRAP`). These are good candidates to move into the Underworks / Château.
- `QA.vault` now lives in the Underworks: arrival in the ossuary (y −7), the gramophone and the door sockets at the
  map's sealed door `LVL.doors.vault` (marker `under.vault.seal`; it stays locked until the four staffs, the vault key
  and the soul lantern open it, and is re-locked on a new game), and the arena in the deep vault (floor −10): seals
  round the dais, the Furnace Heart over `under.vault.dais`, the lift in the south-west corner. On maps without that
  door a round hatch (`VT.door`) is shown instead.
- Levels: every row may carry `y`; props below y −2 go in the `UNDER` group, interactables get `y`, colliders on other
  floors use `addColY` (`qCol`), and every distance check (breaker finding, seals, ward circle, kill zones, holds,
  shrine, pulses, area damage) also checks the height gap (`qdy`).
- Fixed single anchors: `generator`, `valves`, `chalk`, `radio` (with `dial`/`key` use points), `lockbox`,
  `musicbox` (with `use`), `gravecaller`, `tonic`.

| Table | Current rows |
|---|---|
| `power` | bunker-corner (-8.7, 33.2, A), trench-cart (-13.5, 25, B), trench-east (25.5, 6.7, B), dig-south (-22, -28.5, C), yard-corner (13.5, -21.5, D), yard-gate (38.4, -2.2, D), chapel-vestry (58.4, 12.4, E), nml-crater (96.5, -26, G), nml-north (44.5, 1.2, G), chateau-maproom (-31.3, -24.8, K), chateau-quarters (-56.9, y 4.2, -24.8, L), under-pump (23.3, y −7, -28.6, U1), under-rail (-45, y −7, -41.5, U2), under-gallery (45, y −7, -20.6, U4) |
| `fuse` | (7.6, 47.4) (-25.6, 8.4) (6.6, -4.2) (19, -27.8) (32.4, 21.5) (97, 1.5) |
| `valves` / `chalk` / `radio` | `under.pump.valve` (12, y −7, -14.6) / (-9.3, 37.3) bunker / `chateau.radio` (-55.9, -21.5) |
| `drop` | (24, -20) (-18, -22) (-20, 14) (46, 20) |
| `glyphs` | (-29.35, 12) (29.35, 24) (-29.35, -24) (9.35, -20) (39.35, -22) (30.65, 11) (-41.9, y 4.2, -16) (-14.1, y −7, -50) (-10, y −7, -38.1) |
| `lockbox` / `musicbox` | `chateau.safe` (-55.6, y 4.2, -0.5) / `under.ossuary.altar` (-24, y −5.9, -54) |
| `braziers` | ossuary (y −7): (-31, -48.5) (-17, -48.5) (-17, -58.5) (-31, -58.5) |
| `souls` | (-12, 14) (-18, -6) (24, -16) (46, 13) (-16, 22) (13, y −7, -24) pump room (-38, -6) Château hall |
| `lanterns` / `gravecaller` / `tonic` | 5 spots round the pit / (-10, -5) / `under.ossuary.perk` (-14.6, y −7, -47) |
| `staffs` | pedestals (47, 15.6) (47, 19.4) (51, 15.6) (51, 19.4); Cinder embers round the Forge; Brine jars in No Man's Land, pump on the flooded gallery walkway (34, y −7, -31.3); Grave skull lamps in the ossuary niches (y −7), gravestone (-15, -26.2), trial (-10, -23); Gale chimes in the Château bell room and balcony (y 4.2), yard zone (25, -14), shrine `chateau.balcony` |
| `vault` | arrival (-24, y −7, -49.5) ossuary; door use point (-24, y −7, -57.9); gramophone (-27.6, y −7, -58.6); heart over the dais (-28, y −9.6, -75); seals (y −10) (-36, -70.5) (-20, -70.5) (-28, -82.4); lift (-37.6, y −10, -81.6) |

## Tests
- `tests/power.spec.js`: placement (zones, types, seed determinism, variety), every requirement (knife timing reset,
  wrong crate, fuse, surge horde), generator refusal / short crank / full crank, and co-op (same layout on the client,
  the client throws breakers and cranks through its own prompts).
- `tests/staffs.spec.js`: the Cinder Staff built through its real tasks (Sapper drop, ember order incl. a wrong
  order, fuel-trench kills, powered binding), claimed, fired (slag pool), alt-fired (three charges) and upgraded (slag
  kills); all four staffs distinct (tasks, alt-fire effects); solo swap; co-op claim (the client takes the Brine Staff,
  the host sees it carried, the client's Undertow pushes the host's zombie).
- `tests/ritual.spec.js`: the whole 23-rite quest (all four staffs built and upgraded through their tasks) from the breakers to the ending through `window.__G` (`__G.QUEST`
  exposes the quest systems; see `tools/test-hook.js`).
