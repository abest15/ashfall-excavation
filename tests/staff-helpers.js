// Elemental staffs (gameplay/19f-staffs.js): run a staff's real part tasks, binding and upgrade trial through __G.
// Each runs inside the page with __G.tick, so the timed parts (holds, bindings, the Gale shrine) take real game time.

export async function staffBuild(page, k) {
  await page.evaluate(k => {
    const g = window.__G, Q = g.QUEST, S = Q.STF[k];
    const keep = () => { g.P.hp = g.P.maxHp; g.P.invuln = 5; g.P.downed = false; };
    const tick = s => { for (let i = 0; i < Math.round(s / 0.05); i++) { keep(); g.tick(0.05); } };
    const take = key => { const e = Q.QP.find(q => q.key === key); if (!e) throw new Error('no pickup ' + key); g.P.pos.set(e.x, 0, e.z); g.updateInteract(); e.o.use(); };
    const at = (kind, x, z) => { const q = g.spawnZombie(kind); q.g.position.set(x, 0, z); q.rise = 0; q.win = null; q.wstate = null; return q; };
    // part 1: a special carries it
    const kind = Q.STAFF_PARTS[k][0].kind;
    for (let n = 0; n < 30 && !S.parts[0] && !Q.QP.some(e => e.key === 'sp_' + k + '0'); n++) g.killZombie(at(kind === 'warden' ? 'boss' : kind, g.P.pos.x + 3, g.P.pos.z), 'body');
    take('sp_' + k + '0');
    // part 2: the target puzzle, in the staff's order
    for (const i of S.seqOrder) Q.questShoot('st_' + k + '_' + i, { id: 'pistol' });
    take('sp_' + k + '1');
    // part 3: the defence
    if (k === 'cinder') { g.TRAP.t = 22; for (let n = 0; n < 8; n++) g.killZombie(at('walker', 4 + n * .5, 18.4), 'body'); g.TRAP.t = 0; }
    else if (k === 'gale') { const a = Q.QA.staffs.gale.zone; for (let n = 0; n < 10; n++) g.killZombie(at('walker', a.x + 1, a.z), 'body'); }
    else { const H = Q.SHOLD[k]; g.P.pos.set(H.o.x, 0, H.o.z); g.updateInteract(); g.keys.KeyE = true; for (let i = 0; i < 180; i++) { keep(); g.P.pos.set(H.o.x, 0, H.o.z); g.tick(0.05); } g.keys.KeyE = false; }
    take('sp_' + k + '2');
    // binding at the pedestal (each staff's own condition)
    const a = Q.QA.staffs.pedestals[Q.STAFF_IDS.indexOf(k)];
    g.P.pos.set(a.x + 1.5, 0, a.z); Q.qAct('ped', [k, 0]);
    if (k === 'grave') { tick(1); g.killZombie(at('walker', a.x + 4, a.z), 'body'); }
    tick(k === 'gale' ? 6.5 : 4.5);
    if (!S.built) throw new Error(k + ' did not bind');
  }, k);
}

// claim (or swap to) a staff at its pedestal
export async function staffClaim(page, k) {
  await page.evaluate(k => { const g = window.__G; g.QUEST.qAct('ped', [k, g.P.weapons.some(w => w.id === k) ? 1 : 0]); }, k);
}

// the staff's own upgrade trial (the staff must be claimed by this player)
export async function staffUpgrade(page, k) {
  await page.evaluate(k => {
    const g = window.__G, Q = g.QUEST, S = Q.STF[k];
    const keep = () => { g.P.hp = g.P.maxHp; g.P.invuln = 5; g.P.downed = false; };
    const tick = s => { for (let i = 0; i < Math.round(s / 0.05); i++) { keep(); g.tick(0.05); } };
    const at = (kind, x, z) => { const q = g.spawnZombie(kind); q.g.position.set(x, 0, z); q.rise = 0; q.win = null; q.wstate = null; return q; };
    const px = g.P.pos.x, pz = g.P.pos.z;
    if (k === 'cinder') for (let r = 0; r < 6 && !S.up; r++) { Q.qAct('stfx', ['cinder', 0, 1, px + 3, pz, []]); for (let n = 0; n < 4; n++) { const q = at('walker', px + 3, pz); q.hp = 1; q.speed = 0; } tick(.6); }
    else if (k === 'brine') for (let r = 0; r < 6 && !S.up; r++) { for (let n = 0; n < 6; n++) { const q = at('walker', px + Math.cos(n) * 3, pz + Math.sin(n) * 3); q.hp = 1e5; q.maxHp = 1e5; } Q.qAct('stfx', ['brine', 0, 1, px, pz, []]); tick(.2); }
    else if (k === 'grave') { Q.qAct('ped', ['grave', 1]); const z = g.zombies.find(q => q.graveTrial && !q.dead); if (!z) throw new Error('no grave warden'); g.killZombie(z, 'body'); }
    else { const a = Q.QA.staffs.gale.shrine; g.R.inBreak = false; g.R.toSpawn = 999; for (let i = 0; i < 440 && !S.up; i++) { keep(); g.P.pos.set(a.x + 1, 0, a.z); g.tick(0.05); } }
    for (const q of g.zombies) if (!q.dead && !q.boss) g.killZombie(q, 'self', true);
    if (!S.up) throw new Error(k + ' did not upgrade (trial ' + S.trial + ')');
  }, k);
}
