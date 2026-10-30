// T17: straight and triple chances WITH rerolls (the first-roll table in T17-roles-tables.md has none), today's faces against the candidate. Prints markdown.
//   node tools/t17-rerolls.mjs [boards=20000]
// A full board (all nine dice, the head, hands and feet at the set's size, talents d6) is rolled and then up to three free rerolls are spent by a stated, plain policy:
//   chase straight: pick the window of the straight's length with the most different numbers already showing, keep one die for each of those numbers (the weapon
//     dice first), reroll every other die; stop when a straight shows.
//   chase triple: pick the triple line (across or down) with the most matching dice, keep those, reroll the line's other dice; stop when a triple shows.
// The two policies are measured separately (a player chases one thing); the bot in the fights plays its own mix. Nothing in the game changes.
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { buildLadder, METALS } from '../js/weaponladder.js';
applyRelease();
const N = +(process.argv[2] || 20000); const LADDER = buildLadder(); const REROLLS = 3;
const mk = (id, r, s, ammo) => { const w = E.makeWeapon(id, r, () => 0.5, s); if (ammo) w.ammo = ammo; return w; };
const setMode = (m) => { D.WEAPON_SIZE.ladder = m === 'candidate' ? LADDER : null; D.WEAPON_SIZE.cumulative = m === 'candidate'; };
const SLOTS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
const LINES = [['NW', 'N', 'NE'], ['W', 'C', 'E'], ['SW', 'S', 'SE'], ['N', 'C', 'S'], ['NW', 'W', 'SW'], ['NE', 'E', 'SE']];
function numberOf(h, board, s) {
  if (s === 'NW' || s === 'NE') return E.weaponFaces(h.loadout[s], E.sidesOf(h, s))[board[s].v - 1].v;
  if (s === 'SW' || s === 'SE') return E.talentNumber(board[s].v);
  return board[s].v;
}
function hero(ids, metal, size) {
  const h = E.newHero({ name: 'T', cls: 'knight', seed: 11 }); h.level = 8; h.dice = null; h.strength = { W: size, E: size }; h.mind = { N: size }; h.special = { SW: 6, SE: 6 }; h.campaign.act = 2;
  h.loadout.NW = mk(ids[0].split(':')[0], metal, size, ids[0].split(':')[1] || (ids[0] === 'quiver' ? 'normal' : null)); h.loadout.NE = mk(ids[1], metal, size); return h;
}
const keepFor = { straight: (h, board, need) => {
  const nums = new Map(); for (const s of ['NW', 'NE', 'N', 'W', 'E', 'S', 'C', 'SW', 'SE']) { const v = numberOf(h, board, s); if (v > 0 && !nums.has(v)) nums.set(v, s); }
  let best = null; for (let lo = 1; lo <= 12 - need; lo++) { let have = 0; for (let v = lo; v < lo + need; v++) if (nums.has(v)) have++; if (!best || have > best.have) best = { lo, have }; }
  const keep = new Set(); if (best) for (let v = best.lo; v < best.lo + need; v++) if (nums.has(v)) keep.add(nums.get(v)); return keep; },
  triple: (h, board) => {
    let best = null; for (const line of LINES) { const vals = line.map((s) => numberOf(h, board, s)); const count = new Map(); vals.forEach((v) => { if (v > 0) count.set(v, (count.get(v) || 0) + 1); });
      const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]; const n = top ? top[1] : 0; if (!best || n > best.n) best = { line, n, v: top?.[0] }; }
    const keep = new Set(SLOTS); if (best && best.n >= 1) for (const s of best.line) if (numberOf(h, board, s) !== best.v) keep.delete(s); return keep; } };
function trial(h, rng, policy) {
  const need = E.straightMin(h); let board = E.rollBoard(h, rng); let ev = E.evaluate(h, board); let used = 0;
  const done = (ev) => (policy === 'straight' ? ev.straight > 0 : ev.triples.length > 0);
  while (!done(ev) && used < REROLLS) {
    const keep = keepFor[policy](h, board, need); const again = SLOTS.filter((s) => !keep.has(s)); if (!again.length) break;
    for (const s of again) board[s] = { ...E.rollSlot(h, s, rng), bound: false }; ev = E.evaluate(h, board); used++;
  }
  return { straight: ev.straight > 0 ? 1 : 0, triple: ev.triples.length ? 1 : 0, weaponTriple: ev.triples.some((t) => t.row === 'weapons') ? 1 : 0, atk: ev.atk, blk: ev.block };
}
const SETS = [['sword', 'shield'], ['dagger', 'shield'], ['axe', 'tower'], ['spear', 'shield'], ['dagger', 'dagger'], ['sword', 'sword'], ['quiver:normal', 'bow']];
const out = []; const P = (s = '') => out.push(s); const f1 = (x) => x.toFixed(1);
P('# T17: straight and triple chances with three free rerolls (bots playing a plain policy; PROPOSED, nothing live changes)\n');
P(`${N} boards a row, all nine dice, the head, hands and feet at the weapon's size, talents d6. Policy: stated at the top of tools/t17-rerolls.mjs (chase straight: keep one die for each number in the best window; chase triple: keep the matching dice of the best line). Chance of the thing the player is chasing, after up to ${REROLLS} rerolls.\n`);
P('| Set | d | metal | chasing a straight: today | candidate | chasing a triple: today | candidate | weapons triple while chasing any triple: today | candidate |\n|---|---|---|---|---|---|---|---|---|');
for (const ids of SETS) for (const [size, metal] of [[6, 1], [10, 2]]) {
  const cells = {};
  for (const mode of ['today', 'candidate']) { setMode(mode); const h = hero(ids, metal, size); const rng = E.makeRng(99);
    let st = 0; let tr = 0; let wt = 0; for (let i = 0; i < N; i++) { st += trial(h, rng, 'straight').straight; const t = trial(h, rng, 'triple'); tr += t.triple; wt += t.weaponTriple; }
    cells[mode] = { st: 100 * st / N, tr: 100 * tr / N, wt: 100 * wt / N }; }
  setMode('today');
  P(`| ${ids.join(' + ').replace('quiver:normal', 'arrows')} | ${size} | ${METALS[metal]} | ${f1(cells.today.st)}% | ${f1(cells.candidate.st)}% | ${f1(cells.today.tr)}% | ${f1(cells.candidate.tr)}% | ${f1(cells.today.wt)}% | ${f1(cells.candidate.wt)}% |`);
}
P('\nThese are probabilities over random boards, so the only noise is Monte Carlo error (about plus or minus 0.3 points at this many boards); they say how often a chase succeeds, not whether it was worth the rerolls.');
console.log(out.join('\n'));
