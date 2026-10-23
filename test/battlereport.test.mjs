// Battle reports (T10, js/battlereport.js): what happened in a fight, kept on this device, shared only when the player chooses.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as BR from '../js/battlereport.js';
import * as UI from '../js/g3/reportui.js';
import { createTable, joinTable, command, playerView } from '../js/table.js';

const hero = (cls = 'knight', seed = 5, level = 6) => { const h = E.newHero({ name: 'Dave', cls, seed }); h.level = level; h.campaign.act = 2; h.campaign.step = 6; return h; };
const quest = (h) => E.questsFor(h)[0];
const mockStore = (limit = Infinity) => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (String(v).length > limit) throw new Error('QuotaExceededError'); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
// a plain deterministic player: roll, drink a potion when low, strike the first monster
const play = (b, { low = 0.8, rounds = 40 } = {}) => { for (let g = 0; g < rounds && !b.outcome; g++) { E.startRoll(b); if (b.hp < b.maxHp * low) E.drinkPotion(b); E.resolve(b, { target: 0 }); } return b; };
const lastRound = (r) => r.rounds[r.rounds.length - 1];
const mine = (rd, name = 'Dave') => rd.heroes.find((h) => h.name === name);

test('a solo fight is recorded: the moves shown, health, potions, dice, the engine’s totals, and a captured/derived split', () => {
  BR.forgetReports(mockStore());
  const h = hero(); const b = E.newBattle(h, quest(h), E.makeRng(11), 1);
  BR.begin(b); play(b);
  const r = BR.finish(b, b.outcome || 'withdrew');
  assert.equal(r.mode, 'solo'); assert.equal(r.act, 2); assert.equal(r.step, 6); assert.equal(r.heroes[0].cls, 'knight'); assert.equal(r.heroes[0].level, 6);
  assert.ok(r.heroes[0].potions.heals > 0 && r.heroes[0].weapons.length && r.heroes[0].powers.length);
  assert.equal(r.enemies.length, b.enemies.length); assert.ok(r.enemies.every((e) => e.maxHealth > 0 && e.powerDie > 0));
  assert.equal(r.outcome.result, b.outcome); assert.equal(r.outcome.roundsResolved, r.rounds.filter((x) => x.resolved).length); assert.equal(r.outcome.roundsResolved, b.round);
  for (const rd of r.rounds) {
    assert.ok(rd.shown.length > 0 && rd.shown.every((m) => m.move && m.verb), 'the moves shown before the player committed');
    const me = mine(rd);
    assert.ok(Number.isFinite(me.healthAtStart) && Number.isFinite(me.healthBeforeResolution) && Number.isFinite(me.healthAfter));
    assert.ok(me.dice.length >= 5 && me.dice.every((d) => d.v >= 1 && d.v <= d.sides), 'final dice faces');
    assert.ok(['attack', 'pierce', 'block', 'heal'].every((k) => Number.isFinite(me.totals[k])), 'attack, block and pierce totals');
    assert.ok(rd.resolution.acts.every((a) => Number.isFinite(a.damageRolled)) && rd.derived && Array.isArray(rd.derived.steps), 'derived blocks are labelled as such');
  }
  assert.ok(r.legend.captured && r.legend.derived);
  assert.match(BR.summaryText(r), /Order of blows \(derived\)/);
});

test('a lethal round after a potion, from three monsters: the potion, the order of the blows and the lethal blow', () => {
  const h = hero('ranger', 8, 8); const q = quest(h); q.enemies = ['goblin', 'goblin', 'goblin']; q.foeNames = ['Left Goblin', 'Middle Goblin', 'Right Goblin'];
  const b = E.newBattle(h, q, E.makeRng(21), 1); b.enemies.forEach((e) => { e.intent = { n: 'Maul', v: 'strike', f: 40, m: 1 }; });
  b.hp = 12; BR.begin(b); // 12 health: one potion cannot save it from three blows of 40
  E.startRoll(b); const hpBeforePotion = b.hp; assert.ok(E.drinkPotion(b)); const afterPotion = b.hp;
  E.resolve(b, { target: 0 });
  assert.equal(b.outcome, 'defeat');
  const r = BR.finish(b, 'defeat'); const rd = lastRound(r); const me = mine(rd);
  assert.deepEqual(rd.shown.map((m) => m.move), ['Maul', 'Maul', 'Maul']);
  assert.equal(me.healthAtStart, 12);
  const potion = me.actions.find((a) => a.kind === 'potion');
  assert.equal(potion.healthBefore, hpBeforePotion); assert.equal(potion.healthAfter, afterPotion); assert.equal(potion.healed, afterPotion - hpBeforePotion);
  assert.equal(me.healthBeforeResolution, afterPotion, 'health immediately before resolution includes the potion');
  assert.equal(me.healthAfter, 0);
  const steps = rd.derived.steps; const blows = steps.filter((s) => !s.yourStrike);
  assert.equal(blows.length, 3); assert.equal(rd.resolution.acts.length, 3);
  assert.ok(rd.derived.lethalBlow && rd.derived.lethalBlow.order >= 1, 'a lethal blow is named');
  const lethal = steps[rd.derived.lethalBlow.order - 1];
  assert.ok(lethal.healthAfter <= 0 && (steps[rd.derived.lethalBlow.order - 2]?.healthAfter ?? 1) > 0, 'the first blow to take health to zero');
  assert.equal(Math.max(0, steps[steps.length - 1].healthAfter), me.healthAfter, 'the derived order ends where the engine ended');
  assert.equal(rd.resolution.acts.reduce((a, x) => a + x.tookAfterBlock, 0), rd.resolution.acts.reduce((a, x) => a + x.damageRolled, 0) - me.blocked, 'damage rolled, less block, is damage taken');
});

test('recording changes nothing about the fight: same dice, same results, same saved hero', () => {
  const start = JSON.stringify(hero('wizard', 3, 7)); // one hero, cloned for both runs
  const run = (record) => {
    const h = JSON.parse(start); const b = E.newBattle(h, quest(h), E.makeRng(99), 1);
    if (record) BR.begin(b);
    const reps = []; for (let g = 0; g < 40 && !b.outcome; g++) { E.startRoll(b); if (b.hp < b.maxHp * 0.7) E.drinkPotion(b); reps.push(E.resolve(b, { target: 0 })); }
    const same = (v) => JSON.stringify(v).replace(/"u[0-9a-z]{5,6}(~R)?"/g, '"_"'); // a monster's or weapon's id is time-based and differs between any two runs
    return { reps: same(reps), next: b.rng(), hero: same(h), state: same({ ...b, rng: null, hero: null }), outcome: b.outcome };
  };
  const a = run(false); const c = run(true);
  assert.deepEqual(c, a);
});

test('a shared phone records every hero of the company, with the order of the blows for each', () => {
  const a = hero('knight', 4); const bea = E.newHero({ name: 'Bea', cls: 'bard', seed: 6 }); bea.level = 6; bea.campaign = a.campaign;
  const q = quest(a); const b = E.newPartyBattle([a, bea], q, E.makeRng(31)); b.enemies.forEach((e) => { e.intent = { n: 'Maul', v: 'strike', f: 35, m: 1 }; });
  BR.begin(b);
  for (let g = 0; g < 12 && !b.outcome; g++) {
    for (let i = 0; i < b.fighters.length; i++) { if (b.fighters[i].hp > 0) { E.startFighter(b, i); E.focusFighter(b, i); if (b.hp < b.maxHp * 0.6) { E.drinkPotion(b); } E.commitFighter(b); b.fighters[i].target = 0; } }
    E.resolveParty(b);
  }
  const r = BR.finish(b, b.outcome || 'withdrew');
  assert.equal(r.mode, 'shared-phone'); assert.equal(r.heroes.length, 2);
  const rd = r.rounds[0];
  assert.deepEqual(rd.heroes.map((h) => h.name).sort(), ['Bea', 'Dave']);
  assert.ok(rd.heroes.every((h) => h.dice?.length && Number.isFinite(h.healthBeforeResolution)));
  assert.ok(rd.derived.perHero.Dave.blows.length > 0 && rd.resolution.acts.some((x) => x.perHero?.length === 2), 'each monster’s blow, share by share');
  assert.ok(rd.resolution.order.length > 0 && rd.resolution.leader);
});

test('the fourth report replaces the oldest; only the latest three are kept', () => {
  const store = mockStore(); BR.forgetReports(store);
  const mk = (i) => ({ v: 1, id: `r${i}`, rounds: [], savedAt: `2026-10-2${i}T00:00:00Z`, outcome: { result: 'victory', roundsResolved: i }, build: 'dev', mode: 'solo' });
  for (let i = 1; i <= 4; i++) BR.saveReport(mk(i), store);
  const kept = BR.loadReports(store).map((r) => r.id);
  assert.deepEqual(kept, ['r4', 'r3', 'r2'], 'newest first, the first one dropped');
  assert.equal(JSON.parse(store.getItem(BR.reportsKey())).length, 3);
});

test('a report is bounded in size: heavy detail goes first, then early rounds, and the report says so', () => {
  const h = hero(); const b = E.newBattle(h, quest(h), E.makeRng(5), 1); BR.begin(b);
  b.enemies.forEach((e) => { e.hp = e.maxHp = 5000; }); // a long fight
  for (let g = 0; g < 60 && !b.outcome; g++) { E.startRoll(b); b.hp = b.maxHp; E.resolve(b, { target: 0 }); b.enemies.forEach((e) => { e.hp = 5000; }); }
  const full = BR.finish(b, 'withdrew');
  const tight = BR.fit(full, 9000);
  assert.ok(JSON.stringify(tight).length <= 9000, 'under the bound');
  assert.equal(tight.trimmed, true); assert.ok(tight.rounds.length >= 2 && tight.rounds.length < full.rounds.length);
  assert.match(BR.summaryText(tight), /Trimmed to fit/);
  assert.ok(JSON.stringify(BR.fit(full)).length <= BR.MAX_REPORT_CHARS, 'and the default bound holds');
});

test('full or blocked storage never interrupts the game: the report stays available for this visit', () => {
  const full = mockStore(10); BR.forgetReports(mockStore());
  const rep = { v: 1, id: 'x1', rounds: [], savedAt: '2026-10-24T00:00:00Z', outcome: { result: 'defeat', roundsResolved: 2 }, build: 'dev', mode: 'solo' };
  let out; assert.doesNotThrow(() => { out = BR.saveReport(rep, full); });
  assert.equal(out.stored, false); assert.equal(out.reason, 'storage is full');
  assert.equal(BR.loadReports(null)[0]?.id, 'x1', 'still shareable from memory');
  assert.doesNotThrow(() => BR.saveReport(rep, null)); assert.equal(BR.saveReport(rep, null).stored, false);
  const dmg = mockStore(); dmg.setItem(BR.reportsKey(), '{not json'); assert.doesNotThrow(() => BR.loadReports(dmg));
});

test('storage trouble drops older reports before refusing the newest', () => {
  const rep = (i, pad) => ({ v: 1, id: `p${i}`, rounds: [], pad: 'x'.repeat(pad), savedAt: '2026-10-24T00:00:00Z', outcome: { result: 'victory', roundsResolved: 1 }, build: 'dev', mode: 'solo' });
  const small = mockStore(400); BR.forgetReports(small);
  BR.saveReport(rep(1, 150), small); BR.saveReport(rep(2, 150), small); const res = BR.saveReport(rep(3, 150), small);
  assert.equal(res.stored, true); assert.ok(res.kept < 3, 'kept fewer than three to fit'); assert.equal(BR.loadReports(small)[0].id, 'p3');
});

test('a report never holds a password, token, save id or room code', () => {
  const h = hero(); h.password = 'hunter2'; h.token = 'tok-secret'; h.saveId = 'abc123abc123'; h.hash = 'deadbeef'; h.salt = 'pepper';
  const b = E.newBattle(h, quest(h), E.makeRng(7), 1); BR.begin(b); play(b);
  const r = BR.finish(b, b.outcome || 'withdrew'); const json = BR.exportText(r);
  for (const bad of ['hunter2', 'tok-secret', 'abc123abc123', 'deadbeef', 'pepper', 'password', 'token', 'roomCode']) assert.ok(!json.includes(bad), bad);
});

test('an online table: this phone builds the report from the shared view, including the final round, and says what it lacks', () => {
  const table = createTable({ code: 'ZXQW', seed: 777, name: 'Ash Company' }); table.envelopes = 'off';
  const ada = joinTable(table, { name: 'Ada', cls: 'knight', token: 'tok-ada-secret' }).player; const bea = joinTable(table, { name: 'Bea', cls: 'bard', token: 'tok-bea-secret' }).player;
  for (const p of [ada, bea]) command(table, p.id, { type: 'ready' });
  command(table, ada.id, { type: 'start' });
  for (let i = 0; i < 4 && table.phase === 'road'; i++) { const ev = (playerView(table, ada.id).road); if (!ev.done) command(table, ada.id, { type: 'choose', id: ev.choices.find((c) => c.ok).id }); for (const p of table.players) command(table, p.id, { type: 'onward' }); }
  assert.equal(table.phase, 'board');
  command(table, ada.id, { type: 'quest', id: E.questsFor(table.company.members[0])[0].id });
  assert.equal(table.phase, 'battle');
  table.battle.enemies.forEach((e) => { e.intent = { n: 'Maul', v: 'strike', f: 70, m: 1 }; }); table.battle.fighters.forEach((f) => { f.hp = 20; });
  BR.forgetOnline(); const seen = []; const watch = () => { const r = BR.observeView(playerView(table, ada.id)); if (r) seen.push(r); };
  watch();
  for (const p of [ada, bea]) { command(table, p.id, { type: 'roll' }); watch(); }
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  assert.equal(table.phase, 'defeat'); assert.equal(seen.length, 1, 'one report, when the fight ended');
  const r = seen[0]; const rd = lastRound(r);
  assert.equal(r.mode, 'online'); assert.equal(r.outcome.result, 'defeat'); assert.equal(rd.resolved, true, 'the final round came through the defeat view');
  assert.ok(rd.shown.length === 2 || rd.shown.length === table.company.members.length || rd.shown.length > 0); assert.ok(rd.shown.every((m) => m.move === 'Maul'));
  assert.ok(rd.heroes.every((h) => Number.isFinite(h.healthBeforeResolution) && Number.isFinite(h.healthAfter)));
  assert.ok(mine(rd, 'Ada').dice?.length, 'this phone’s own dice'); assert.equal(mine(rd, 'Bea').dice, undefined, 'the other hero’s dice are not available');
  assert.ok(rd.derived.lethalBlow && Object.keys(rd.derived.lethalBlow).length, 'who fell, and to which blow');
  assert.ok(r.legend.unavailable.length > 0);
  const text = BR.exportText(r); for (const bad of ['ZXQW', 'tok-ada-secret', 'tok-bea-secret']) assert.ok(!text.includes(bad), `no ${bad}`);
});

test('sharing: native sharing with a file, the text fallback, and copy and download when sharing is missing', async () => {
  const r = { v: 1, id: 's1', build: 'dev', mode: 'solo', difficulty: 'normal', act: 2, step: 6, quest: { name: 'Night Raid' }, heroes: [], enemies: [], rounds: [], savedAt: '2026-10-24T10:00:00Z', outcome: { result: 'defeat', roundsResolved: 3, enemiesLeft: [] }, legend: { unavailable: [] } };
  const sent = []; const nav = (extra) => Object.defineProperty(globalThis, 'navigator', { value: extra, configurable: true });
  nav({ canShare: () => true, share: async (d) => { sent.push(d); } });
  assert.equal(await UI.nativeShare(r), true); assert.ok(sent[0].files?.[0] instanceof File && sent[0].files[0].name.endsWith('.txt'));
  nav({ share: async (d) => { sent.push(d); } }); assert.equal(await UI.nativeShare(r), true); assert.match(sent[1].text, /--- details \(JSON\) ---/);
  nav({ share: async () => { const e = new Error('closed'); e.name = 'AbortError'; throw e; } }); assert.equal(await UI.nativeShare(r), null, 'closing the share sheet is not an error');
  nav({ share: async () => { throw new Error('nope'); } }); assert.equal(await UI.nativeShare(r), false);
  nav({}); assert.equal(UI.canShareNatively(), false); assert.equal(await UI.nativeShare(r), false);
  let copied = ''; nav({ clipboard: { writeText: async (t) => { copied = t; } } }); assert.equal(await UI.copyText('hello'), true); assert.equal(copied, 'hello');
  nav({ clipboard: { writeText: async () => { throw new Error('blocked'); } } }); assert.equal(await UI.copyText('x'), false, 'no clipboard and no document: reported, not thrown');
  assert.match(BR.exportName(r), /^questdice-battle-report-2026-10-24-defeat\.txt$/);
});
