// T20: the released arrows, resolved by the real engine (read-only demonstration; nothing in the game changes).
//   node tools/t20-arrows.mjs [json]      prints the demonstration; with `json` writes docs/team/tasks/T20/arrows.json
// Released rules (applyRelease): Normal, Piercing, Fire, Frost; an arrowhead face keeps a small number (A2 on a d4) and adds the hand's printed
// number in the ammunition's way. The dice below are SET with the practice battle's own mechanism (b.script.rolls): DEMONSTRATION ONLY.
// Bronze d4 Arrows in the left hand, the left-hand die (W) showing 4, no perks, charms, talents or Heart bonuses.
process.env.RELEASE = '1';
const { applyRelease } = await import('../js/release.js'); applyRelease();
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const fs = await import('node:fs');
const SLOTS = { NW: 1, NE: 1, N: 1, W: 4, C: 1, E: 1, S: 4, SW: 1, SE: 1, P: 1 };
const hero = (ammo, name = 'Archer') => { const h = E.newHero({ name, cls: 'ranger', seed: 5 }); h.dice = [...new Set([...(h.dice || []), 'NE'])]; h.loadout.NW = { uid: `q-${ammo}`, id: 'quiver', ammo, rarity: 0, size: 4 }; return h; };
const faceOf = (ammo, n) => E.weaponFaces({ id: 'quiver', ammo, rarity: 0, size: 4 }, 4)[n - 1];
const faceName = (f) => (f.arrow ? `A${f.v} (arrowhead)` : `R${f.v}`);
const guardMove = (n) => ({ n: 'Wing Wall', v: 'guard', f: n, m: 0 }); const idleMove = { n: 'Wait', v: 'charge', f: 0, m: 0 };
const strikeMove = (n) => ({ n: 'Club', v: 'strike', f: n, m: 0 });
const foes = (specs) => specs.map((s) => ({ id: s.id || 'goblin', hp: s.hp, intent: s.intent, mdef: s }));
function fight(ammo, face, specs, { rounds = [{ NW: face }], hp = 60 } = {}) {
  const h = hero(ammo); h.level = 8; const q = { enemies: specs.map((s) => s.id || 'goblin'), hpMult: 3, flat: 0, rewardMult: 1, kind: 'battle' };
  const b = E.newBattle(h, q, E.makeRng(3), 1); b.script = { rolls: rounds.map((r) => ({ ...SLOTS, ...r })) }; const log = [];
  specs.forEach((s, i) => { b.enemies[i].hp = b.enemies[i].maxHp = s.hp; b.enemies[i].name = s.name || b.enemies[i].name; });
  rounds.forEach((r, k) => {
    specs.forEach((s, i) => { const e = b.enemies[i]; e.intent = (r.intent?.[i] || s.intent); e.windup = false; if (r.foeInit?.[i] != null) e.initDie = r.foeInit[i]; });
    const roundNo = k + 1; E.startRoll(b); const before = b.enemies.map((e) => e.hp);
    const frostBefore = b.enemies.map((e) => e.frost);
    E.resolve(b, { target: 0 }); const rep = b.report;
    log.push({ round: roundNo, dice: { arrowDie: r.NW, face: faceName(faceOf(ammo, r.NW)), hand: SLOTS.W, ...(r.S != null ? { feet: r.S } : {}) }, ev: { atk: rep.ev.atk, pierce: rep.ev.pierce, fire: rep.ev.fire || 0, frost: rep.ev.frost || 0, notes: rep.ev.notes }, T: { atk: rep.T.atk, pierce: rep.T.pierce },
      enemies: b.enemies.map((e, i) => ({ name: e.name, before: before[i], after: e.hp, frostBefore: !!frostBefore[i], frostAfter: !!e.frost })), splashed: (rep.splashed || []).map((s) => ({ ...s, name: b.enemies.find((e) => e.uid === s.uid)?.name })),
      acts: rep.acts.map((a) => ({ who: b.enemies.find((e) => e.uid === a.uid)?.name, move: a.name, blow: a.mag, frosted: !!a.frosted, early: !!a.early })), init: rep.init, frosted: !!rep.frosted });
  });
  return log;
}
const out = { build: process.env.BUILD || null, rules: D.WEAPONS2.arrowRules, scenarios: [] }; const add = (title, why, log, extra = {}) => { out.scenarios.push({ title, why, ...extra, log }); };
const guard3 = (name = 'Guard Goblin', hp = 60) => ({ id: 'goblin', hp, name, intent: guardMove(3) });
const open = (name, hp = 60) => ({ id: 'goblin', hp, name, intent: idleMove });
// 1-4: face 4 of each ammunition against a target that is guarding for 3 (alone)
for (const ammo of ['normal', 'pierce', 'fire', 'frost']) add(`${ammo}: the fourth face against a target guarding for 3`, 'Arrow lane in isolation: face 4 with the left hand showing 4.', fight(ammo, 4, [guard3()]), { ammo, face: faceName(faceOf(ammo, 4)) });
// Fire: a group, and a lone boss
add('Fire at a group: the arrowhead hits the chosen goblin and splashes the others', 'Splash is the hand number (4) to every OTHER living enemy; each one\'s guard can stop it.', fight('fire', 4, [guard3('Chosen goblin'), open('Open goblin'), { id: 'goblin', hp: 60, name: 'Guarding goblin', intent: guardMove(3) }]), { ammo: 'fire', face: faceName(faceOf('fire', 4)) });
add('Fire at a lone boss: nobody to splash', 'Same arrowhead, same 6 on the target, but no other enemy stands: the splash has nowhere to go.', fight('fire', 4, [{ id: 'ogre', hp: 200, name: 'Lone boss', intent: guardMove(3) }]), { ammo: 'fire', face: faceName(faceOf('fire', 4)) });
// non-trigger faces
add('Fire, ordinary numbered face 3 (not an arrowhead): same 6 on the target, no splash', 'Only the marked arrowhead triggers the effect. The numbered face is R2 + 4 = 6 and nobody else is touched.', fight('fire', 3, [guard3('Chosen goblin'), open('Open goblin'), open('Open goblin 2')]), { ammo: 'fire', face: faceName(faceOf('fire', 3)) });
add('Frost, ordinary numbered face 3 (not an arrowhead): no chill', 'The monster\'s 12-point blow stays 12.', fight('frost', 3, [{ id: 'ogre', hp: 200, name: 'Ogre', intent: strikeMove(12) }]), { ammo: 'frost', face: faceName(faceOf('frost', 3)) });
// Frost timing. Round 1 the archer is always first. From round 2 a monster whose initiative die beats the hero's feet die strikes before the archer (foeInit forces it: demonstration only)
add('Frost, archer first: the chilled blow is softer in the same round', 'Round 1: the archer always acts first, so the 12-point Club is 12 - 4 = 8 before any block.', fight('frost', 4, [{ id: 'ogre', hp: 200, name: 'Ogre', intent: strikeMove(12) }]), { ammo: 'frost', face: faceName(faceOf('frost', 4)) });
add('Frost, monster first: the first blow lands in full, the chill softens the NEXT one', 'Round 2: the monster\'s initiative die beats the archer\'s feet (set for the demonstration), so it strikes first at 12. The chill the arrow leaves is spent on its next blow in round 3: 8.', fight('frost', 4, [{ id: 'ogre', hp: 400, name: 'Ogre', intent: strikeMove(12) }], { rounds: [{ NW: 1, S: 1 }, { NW: 4, S: 1, foeInit: [1000] }, { NW: 1, S: 1, foeInit: [1000] }] }), { ammo: 'frost', face: faceName(faceOf('frost', 4)) });
// numbers: how often, and what the choice costs on the whole die (the arrow lane alone, left hand 4)
const exp = []; for (const size of [4, 6, 8, 10]) {
  const row = { size }; for (const ammo of ['normal', 'pierce', 'fire', 'frost']) {
    const faces = E.weaponFaces({ id: 'quiver', ammo, rarity: 0, size }, size); const heads = faces.filter((f) => f.arrow).length;
    const lane = faces.map((f) => { const h = hero(ammo); h.loadout.NW.size = size; h.strength = { W: size, E: size }; const board = Object.fromEntries(Object.entries({ ...SLOTS, NW: faces.indexOf(f) + 1 }).map(([k, v]) => [k, { v: Math.min(v, size) }])); return E.evaluate(h, board); });
    const avg = (g) => lane.reduce((a, ev) => a + Math.max(0, ev.atk - g) + ev.pierce, 0) / faces.length;
    row[ammo] = { arrowheads: heads, chance: `${heads}/${size}`, laneAvgBy: { 0: +avg(0).toFixed(2), 3: +avg(3).toFixed(2), 6: +avg(6).toFixed(2) } };
  } exp.push(row);
}
out.perRoll = exp;
// tests the claims in the board brief
const must = (ok, msg) => { if (!ok) throw new Error(`T20 check failed: ${msg}`); };
const byTitle = (t) => out.scenarios.find((s) => s.title.startsWith(t)).log;
{ const n = byTitle('normal:')[0]; must(n.T.atk === 8 && n.enemies[0].before - n.enemies[0].after === 5, 'Normal 8 attack, 5 through guard 3'); }
{ const p = byTitle('pierce:')[0]; must(p.T.pierce === 6 && p.T.atk === 0 && p.enemies[0].before - p.enemies[0].after === 6, 'Piercing 6 pierce ignores guard'); }
{ const f = byTitle('fire:')[0]; must(f.T.atk === 6 && f.ev.fire === 4 && f.enemies[0].before - f.enemies[0].after === 3, 'Fire 6 attack, 3 through guard 3'); }
{ const g = byTitle('Fire at a group')[0]; must(g.enemies[1].before - g.enemies[1].after === 4 && g.enemies[2].before - g.enemies[2].after === 1, 'splash 4 to an open goblin, 1 to a guarding one'); }
{ const g = byTitle('Fire at a lone')[0]; must(g.splashed.length === 0, 'no splash alone'); }
{ const g = byTitle('Fire, ordinary')[0]; must(g.T.atk === 6 && g.ev.fire === 0 && g.splashed.length === 0, 'numbered face: no splash'); }
{ const g = byTitle('Frost, ordinary')[0]; must(g.acts[0].blow === 12 && !g.acts[0].frosted, 'numbered face: no chill'); }
{ const g = byTitle('Frost, archer first')[0]; must(g.acts[0].blow === 8 && g.acts[0].frosted, 'archer first: 12 -> 8 this round'); }
{ const g = byTitle('Frost, monster first'); must(g[1].acts[0].early && g[1].acts[0].blow === 12 && !g[1].acts[0].frosted, 'monster first: full 12'); must(g[2].acts[0].blow === 8 && g[2].acts[0].frosted, 'chill spent on the next blow'); }
if (process.argv[2] === 'json') { fs.mkdirSync('docs/team/tasks/T20', { recursive: true }); fs.writeFileSync('docs/team/tasks/T20/arrows.json', JSON.stringify(out, null, 1)); }
for (const s of out.scenarios) { console.log(`\n## ${s.title}\n${s.why}`); for (const r of s.log) console.log(`  round ${r.round}: arrow die shows ${r.dice.arrowDie} (${r.dice.face}), hand ${r.dice.hand}; attack ${r.T.atk}, pierce ${r.T.pierce}${r.ev.fire ? `, fire ${r.ev.fire}` : ''}${r.ev.frost ? `, frost ${r.ev.frost}` : ''} | ${r.enemies.map((e) => `${e.name} ${e.before}->${e.after}${e.frostAfter ? ' (chilled)' : ''}`).join('; ')} | blows: ${r.acts.map((a) => `${a.who} ${a.move} ${a.blow}${a.frosted ? ' (chilled)' : ''}${a.early ? ' (first)' : ''}`).join(', ') || 'none'}`); }
console.log('\nPer roll (left hand 4, one arrow lane): arrowheads, and mean damage on that lane against guard 0 / 3 / 6'); for (const r of exp) console.log(`  d${r.size}: ${['normal', 'pierce', 'fire', 'frost'].map((a) => `${a} ${r[a].chance} ${r[a].laneAvgBy[0]}/${r[a].laneAvgBy[3]}/${r[a].laneAvgBy[6]}`).join(' · ')}`);
