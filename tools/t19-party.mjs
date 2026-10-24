// T19 part 2b: the Vharaxis encounter at a table of 2, 4 and 6 heroes (read-only measurement; nothing in the game changes).
//   node tools/t19-party.mjs [fightsPerCell=24]      markdown to stdout, rows to /tmp/t19/party.json
// Parties are built from the bot's campaign heroes (tools/sim.mjs campaign): "strong" = Act III step 8 (the heroes t19-fights.mjs uses), "mid" = the end
// of Act II, "fresh" = a level-1 newcomer. Equal: N strong heroes of mixed classes. Mixed: half strong and half mid; one strong and the rest fresh.
// The table is built by the game's own newPartyBattle (real partyScale, real goblins), played by the smart bot as tools/party.mjs plays it.
// Two encounters: the designed step 10 boss, and the nemesis return as Dave met it (step 8 pair + Vharaxis wounded at step 5).
process.env.RELEASE = '1';
const SIM = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js');
const fs = await import('node:fs');
const { campaign, smartActs, botShape } = SIM;
const FIGHTS = Number(process.argv[2] || 24); const CLS = Object.keys(D.CLASSES);
fs.mkdirSync('/tmp/t19', { recursive: true });
const cacheOf = (name, make) => { const p = `/tmp/t19/${name}.json`; if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); const v = make(); fs.writeFileSync(p, JSON.stringify(v)); return v; };
const strongAll = JSON.parse(fs.readFileSync('/tmp/t19/heroes-9.json', 'utf8'));
const strong = Object.fromEntries(CLS.map((c) => [c, Object.entries(strongAll).filter(([k, v]) => v && k.startsWith(`${c}:`)).map(([, v]) => v)]));
const campOf = (acts, label) => cacheOf(label, () => Object.fromEntries(CLS.map((c) => [c, Array.from({ length: 6 }, (_, s) => { try { return campaign(c, 5000 + s * 11, acts).hero; } catch { return null; } }).filter(Boolean)])));
const mid = campOf(2, 'weak-act2'); // a hero at the end of Act II
const fresh = Object.fromEntries(CLS.map((c) => [c, Array.from({ length: 6 }, (_, s) => E.newHero({ name: `${c}-new${s}`, cls: c, seed: 700 + s }))]));
const pick = (pool, i) => { const cls = CLS[i % CLS.length]; const list = pool[cls]; return structuredClone(list[Math.floor(i / CLS.length) % list.length]); };
function makeParty(kind, n, rep) {
  const hs = [];
  const nStrong = kind === 'equal' ? n : kind === 'half' ? Math.ceil(n / 2) : 1; // 'half': half strong, half end-of-Act-II; 'one': one strong, the rest fresh
  for (let i = 0; i < n; i++) { const idx = i + rep; const src = i < nStrong ? strong : kind === 'half' ? mid : fresh; const h = pick(src, idx); h.name = `${h.cls}${i}`; hs.push(h); }
  const camp = structuredClone(hs[0].campaign);
  for (const h of hs) h.campaign = structuredClone(camp);
  return hs;
}
const setup = {
  'Designed step 10 boss': (hs) => { for (const h of hs) { h.campaign.step = 10; h.campaign.nemeses = []; h.campaign.nextEnemies = null; h.campaign.nextPlace = null; } return E.questsFor(hs[0])[0]; },
  'Nemesis return as Dave met it': (hs) => { for (const h of hs) { const c = h.campaign; c.step = 8; c.nemeses = [{ id: 'vharaxis', name: D.MONSTERS.vharaxis.name, scar: 'blade', wound: 0.3, act: 3, step: 5, grudge: 0, bounty: 1.5 }]; c.nextPlace = 'Wyrmwatch'; c.nextEnemies = ['gloomstalker', 'dirgesinger']; } return E.questsFor(hs[0])[0]; },
};
function tableFight(hs, quest, seed) {
  const rng = E.makeRng(seed); const clones = hs.map((h) => structuredClone(h)); const b = E.newPartyBattle(clones, quest, rng); b._real = true;
  const start = b.enemies.map((e) => ({ id: e.id, hp: e.hp, flat: e.flat, tf: e.teamFlat })); const out = { start, team: b.team, boss: b.enemies.find((e) => e.tier === 'boss')?.maxHp || 0, bossOnly: 0, rounds: 0, curve: [] };
  for (let guard = 0; guard < 80 && !b.outcome; guard++) {
    const alive = b.enemies.filter((e) => e.hp > 0); if (alive.length === 1 && alive[0].tier === 'boss') out.bossOnly++;
    for (let i = 0; i < b.fighters.length; i++) {
      if (!E.startFighter(b, i)) continue; botShape(b, rng); const o = smartActs(b); E.commitFighter(b); const f = b.fighters[i]; f.target = o.target; f.straight = o.straight; f.locked = true;
    }
    E.resolveParty(b); out.rounds = b.round;
    for (const f of b.fighters) { f.locked = false; f._low = Math.min(f._low ?? 1, Math.max(0, f.hp) / f.maxHp); if (f.hp <= 0) f._fell = 1; }
  }
  out.outcome = b.outcome || 'timeout';
  const F = b.fighters; const sum = (g) => F.reduce((a, f) => a + (g(f) || 0), 0); const tk = F.map((f) => f.stats.taken || 0); const dl = F.map((f) => f.stats.dealt || 0);
  out.heroes = F.length; out.falls = F.filter((f) => f._fell).length; out.dealt = sum((f) => f.stats.dealt); out.taken = sum((f) => f.stats.taken); out.takenMaxShare = out.taken ? Math.max(...tk) / out.taken : 0; out.dealtMaxShare = out.dealt ? Math.max(...dl) / out.dealt : 0;
  out.revives = sum((f) => f.stats.revives); out.healGiven = sum((f) => f.stats.healGiven); out.potions = sum((f) => f.stats.potionsThrown); out.endShare = F.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / F.length; out.low = F.reduce((a, f) => a + (f._low ?? 1), 0) / F.length;
  out.strengths = clones.map((h) => E.heroStrength(h)); return out;
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1); const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1); const f0 = (x) => String(Math.round(x));
const rowsOut = []; const md = [`# T19 part 2b: Vharaxis at tables of 2, 4 and 6 (${FIGHTS} fights per cell; bot heroes, released rules)`, ''];
for (const [enc, mk] of Object.entries(setup)) {
  md.push(`## ${enc}`, '', '| Table | Heroes | Company factor m (hero strengths: low to high) | Foes at the start (health each) | Boss max health | Team +hit | Win % | Rounds p50 / p90 / max | Boss-only rounds | Heroes who fell | Table dealt per round | Share of damage taken by the worst-hit hero | Share of damage dealt by the top hero | Revives | Lowest hero health (mean) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const n of [1, 2, 4, 6]) for (const kind of (n === 1 ? ['equal'] : ['equal', 'half', 'one'])) {
    const fs_ = [];
    for (let r = 0; r < FIGHTS; r++) { const hs = makeParty(kind, n, r * 3); const q = mk(hs); fs_.push(tableFight(hs, q, 31000 + r * 13 + n)); }
    const won = fs_.filter((f) => f.outcome === 'victory'); const rd = fs_.map((f) => f.rounds); const st = fs_[0].strengths;
    const foes = fs_[0].start.map((e) => `${e.id} ${e.hp}`).join(', ');
    const label = n === 1 ? 'Solo' : kind === 'equal' ? 'Equal' : kind === 'half' ? 'Half strong, half end of Act II' : 'One strong, rest level-1';
    md.push(`| ${label} | ${n} | ${f1(mean(fs_.map((f) => f.team.m)))} (${f0(Math.min(...st))}-${f0(Math.max(...st))}) | ${foes} | ${f0(mean(fs_.map((f) => f.boss)))} | +${f0(mean(fs_.map((f) => f.team.flat)))} | ${f0(100 * won.length / fs_.length)} | ${f0(pct(rd, 0.5))} / ${f0(pct(rd, 0.9))} / ${Math.max(...rd)} | ${f1(mean(fs_.map((f) => f.bossOnly)))} | ${f1(mean(fs_.map((f) => f.falls)))} of ${n} | ${f0(mean(fs_.map((f) => f.dealt / f.rounds)))} | ${f0(100 * mean(fs_.map((f) => f.takenMaxShare)))}% | ${f0(100 * mean(fs_.map((f) => f.dealtMaxShare)))}% | ${f1(mean(fs_.map((f) => f.revives)))} | ${f0(100 * mean(fs_.map((f) => f.low)))}% |`);
    rowsOut.push({ enc, n, kind, fights: fs_.map((f) => ({ outcome: f.outcome, rounds: f.rounds, bossOnly: f.bossOnly, falls: f.falls, dealt: f.dealt, taken: f.taken, m: f.team.m, boss: f.boss, start: f.start })) });
  }
  md.push('');
}
console.log(md.join('\n')); fs.writeFileSync('/tmp/t19/party.json', JSON.stringify(rowsOut));
