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

// ---- an online table, as one phone sees it: the real table code, and the views it hands this phone
function atBattle(names = [['Ada', 'knight'], ['Bea', 'bard']]) {
  const table = createTable({ code: 'ZXQW', seed: 777, name: 'Ash Company' }); table.envelopes = 'off';
  const players = names.map(([name, cls], i) => joinTable(table, { name, cls, token: `tok-${name.toLowerCase()}-secret` }).player);
  for (const p of players) command(table, p.id, { type: 'ready' });
  command(table, players[0].id, { type: 'start' });
  for (let i = 0; i < 4 && table.phase === 'road'; i++) { const ev = playerView(table, players[0].id).road; if (!ev.done) command(table, players[0].id, { type: 'choose', id: ev.choices.find((c) => c.ok).id }); for (const p of table.players) command(table, p.id, { type: 'onward' }); }
  command(table, players[0].id, { type: 'quest', id: E.questsFor(table.company.members[0])[0].id });
  assert.equal(table.phase, 'battle');
  table.battle.enemies.forEach((e) => { e.intent = { n: 'Maul', v: 'strike', f: 400, m: 1 }; }); table.battle.fighters.forEach((f) => { f.hp = 20; }); // enough that even a potion cannot save the company
  BR.forgetOnline(); BR.forgetReports(mockStore());
  const seen = []; const watch = (who = players[0]) => { const r = BR.observeView(playerView(table, who.id)); if (r) seen.push(r); };
  return { table, players, seen, watch };
}

test('an online table: this phone builds the report from the shared view, including the final round, and says what it lacks', () => {
  const { table, players: [ada, bea], seen, watch } = atBattle();
  watch();
  for (const p of [ada, bea]) { command(table, p.id, { type: 'roll' }); watch(); }
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  assert.equal(table.phase, 'defeat'); assert.equal(seen.length, 1, 'one report, when the fight ended');
  const r = seen[0]; const rd = lastRound(r);
  assert.equal(r.mode, 'online'); assert.equal(r.outcome.result, 'defeat'); assert.equal(rd.resolved, true, 'the final round came through the defeat view');
  assert.ok(rd.shown.length > 0 && rd.shown.every((m) => m.move === 'Maul'));
  assert.ok(rd.heroes.every((h) => Number.isFinite(h.healthBeforeResolution) && Number.isFinite(h.healthAfter)));
  assert.ok(mine(rd, 'Ada').dice?.length, 'this phone’s own dice'); assert.equal(mine(rd, 'Bea').dice, undefined, 'the other hero’s dice are not available');
  assert.equal(rd.healthBasis, 'exact', 'every command was seen in turn: nothing changed unseen'); assert.ok(rd.heroes.every((h) => h.healthBeforeResolutionBasis === 'exact'));
  assert.ok(rd.derived.lethalBlow && Object.keys(rd.derived.lethalBlow).length, 'who fell, and to which blow, when the health is exact');
  assert.ok(r.legend.unavailable.length > 0);
  const text = BR.exportText(r); for (const bad of ['ZXQW', 'tok-ada-secret', 'tok-bea-secret']) assert.ok(!text.includes(bad), `no ${bad}`);
});

test('online: a thrown potion is not turned into a drink; only the belt count is established, so recipient and healing are unavailable', () => {
  const { table, players: [ada, bea], seen, watch } = atBattle();
  watch(); for (const p of [ada, bea]) { command(table, p.id, { type: 'roll' }); watch(); }
  const beaBefore = table.battle.fighters[1].hp;
  const threw = command(table, ada.id, { type: 'team', kind: 'potion', to: 'Bea' }); assert.ok(threw.ok, threw.error);
  assert.ok(table.battle.fighters[1].hp > beaBefore, 'Bea was healed by Ada’s potion'); watch();
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); watch(); command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  const rd = lastRound(seen[0]); const potion = mine(rd, 'Ada').actions.find((a) => a.kind === 'potion');
  assert.ok(potion, 'Ada’s belt count dropped, which the view does show'); assert.equal(potion.inferred, true);
  assert.equal(potion.for, 'unavailable'); assert.equal(potion.healed, 'unavailable'); assert.equal(potion.healthBefore, 'unavailable'); assert.equal(potion.healthAfter, 'unavailable');
  assert.match(BR.summaryText(seen[0]), /inferred from the belt count/); assert.doesNotMatch(BR.summaryText(seen[0]), /drank a potion for Ada/);
  assert.ok(mine(rd, 'Bea').healthBeforeResolution > beaBefore, 'Bea’s health is what the roster showed after the throw, not a claim about the potion');
});

test('online: a potion thrown TO this hero changes no belt, so nothing is claimed about it', () => {
  const { table, players: [ada, bea], seen, watch } = atBattle();
  watch(); for (const p of [ada, bea]) { command(table, p.id, { type: 'roll' }); watch(); }
  assert.ok(command(table, bea.id, { type: 'team', kind: 'potion', to: 'Ada' }).ok); watch();
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); watch(); command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  assert.equal(mine(lastRound(seen[0]), 'Ada').actions.filter((a) => a.kind === 'potion').length, 0);
});

test('online: skipped updates make the health before resolution "last observed", and no lethal blow is derived from it', () => {
  const { table, players: [ada, bea], seen, watch } = atBattle();
  watch();
  command(table, ada.id, { type: 'roll' }); command(table, bea.id, { type: 'roll' }); // two updates this phone never saw
  assert.ok(command(table, bea.id, { type: 'team', kind: 'potion', to: 'Ada' }).ok); // a third: Ada is healed unseen
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' });
  watch(); // only the end of the fight arrives
  assert.equal(table.phase, 'defeat'); assert.equal(seen.length, 1);
  const r = seen[0]; const rd = lastRound(r);
  assert.equal(rd.healthBasis, 'last observed'); assert.ok(rd.heroes.every((h) => h.healthBeforeResolutionBasis === 'last observed'));
  assert.ok(typeof rd.derived.uncertain === 'string' && rd.derived.uncertain.length > 0);
  assert.deepEqual(rd.derived.lethalBlow, {}, 'no confident lethal blow');
  assert.ok(rd.derived.fell.length > 0, 'who fell is still captured from the engine’s own result');
  assert.ok(Object.values(rd.derived.perHero).every((h) => h.blows.every((b) => b.healthAfter === undefined)), 'no derived health after each blow');
  const text = BR.summaryText(r); assert.match(text, /last observed, may be stale/); assert.match(text, /Lethal blow: not derived/); assert.match(text, /fell this round \(captured\)/);
  assert.ok(r.legend.unavailable.some((x) => /last observed/.test(x)));
});

test('shared phone: a potion thrown to a friend is recorded with who threw it, who it was for and what it healed', () => {
  const a = hero('knight', 4); const bea = E.newHero({ name: 'Bea', cls: 'bard', seed: 6 }); bea.level = 6; bea.campaign = a.campaign;
  const b = E.newPartyBattle([a, bea], quest(a), E.makeRng(31)); b.fighters[1].hp = b.fighters[1].maxHp - 20; BR.begin(b);
  E.startFighter(b, 0); E.startFighter(b, 1);
  const before = b.fighters[1].hp; assert.ok(E.teamAction(b, 0, 'potion', 1).ok); const healed = b.fighters[1].hp - before;
  E.resolveParty(b);
  const r = BR.finish(b, b.outcome || 'withdrew'); const potion = r.rounds[0].heroes.find((h) => h.name === 'Dave').actions.find((x) => x.kind === 'potion');
  assert.ok(potion, 'recorded'); assert.equal(potion.thrownBy, 'Dave'); assert.equal(potion.for, 'Bea'); assert.equal(potion.healthBefore, before); assert.equal(potion.healed, healed);
});

test('sharing: native sharing with a file, the text fallback, and copy and download when sharing is missing', async () => {
  const r = { v: 1, id: 's1', build: 'dev', mode: 'solo', difficulty: 'normal', act: 2, step: 6, quest: { name: 'Night Raid' }, heroes: [], enemies: [], rounds: [], savedAt: '2026-10-24T10:00:00Z', outcome: { result: 'defeat', roundsResolved: 3, enemiesLeft: [] }, legend: { unavailable: [] } };
  const sent = []; const nav = (extra) => Object.defineProperty(globalThis, 'navigator', { value: extra, configurable: true });
  nav({ canShare: () => true, share: async (d) => { sent.push(d); } });
  assert.equal(await UI.nativeShare(r), true); assert.ok(sent[0].files?.[0] instanceof File && sent[0].files[0].name.endsWith('.txt'));
  assert.equal(sent[0].text, undefined, 'a file share carries no text beside the file: Notes and Messages insert both, which doubled the heading on a real iPhone');
  assert.equal((await sent[0].files[0].text()).split('QUEST DICE BATTLE REPORT').length - 1, 1, 'the heading is in the file once');
  nav({ share: async (d) => { sent.push(d); } }); assert.equal(await UI.nativeShare(r), true); assert.match(sent[1].text, /--- details \(JSON\) ---/);
  nav({ share: async () => { const e = new Error('closed'); e.name = 'AbortError'; throw e; } }); assert.equal(await UI.nativeShare(r), null, 'closing the share sheet is not an error');
  nav({ share: async () => { throw new Error('nope'); } }); assert.equal(await UI.nativeShare(r), false);
  nav({}); assert.equal(UI.canShareNatively(), false); assert.equal(await UI.nativeShare(r), false);
  let copied = ''; nav({ clipboard: { writeText: async (t) => { copied = t; } } }); assert.equal(await UI.copyText('hello'), true); assert.equal(copied, 'hello');
  nav({ clipboard: { writeText: async () => { throw new Error('blocked'); } } }); assert.equal(await UI.copyText('x'), false, 'no clipboard and no document: reported, not thrown');
  assert.match(BR.exportName(r), /^questdice-battle-report-2026-10-24-defeat\.txt$/);
});

// ---- review: memory and storage are one list, by id and recency
test('a write that fails keeps the newest fight on top of the picker, above older saved reports; memory and storage are merged', () => {
  const store = mockStore(); BR.forgetReports(store); globalThis.window = { localStorage: store };
  try {
    const mk = (id, ms, extra = {}) => ({ v: 1, id, rounds: [], savedMs: ms, savedAt: new Date(ms).toISOString(), outcome: { result: 'victory', roundsResolved: 1 }, build: 'dev', mode: 'solo', act: 2, step: 6, quest: { name: `Fight ${id}` }, ...extra });
    BR.saveReport(mk('old1', 1000), store); BR.saveReport(mk('old2', 2000), store);
    const realSet = store.setItem; store.setItem = () => { throw new Error('QuotaExceededError'); }; // the next write fails
    const out = BR.saveReport(mk('new3', 3000), store); assert.equal(out.stored, false);
    store.setItem = realSet;
    assert.deepEqual(BR.loadReports(store).map((r) => r.id), ['new3', 'old2', 'old1'], 'the newest first, not hidden behind the stale stored list');
    assert.deepEqual(BR.pickerEntries().map((e) => e.id), ['new3', 'old2', 'old1'], 'the picker the player opens reads the same storage and the same list');
    assert.match(BR.pickerEntries()[0].title, /Fight new3/);
    // a fourth after the failure still keeps only three, newest first, with no duplicates
    BR.saveReport(mk('new4', 4000), store);
    assert.deepEqual(BR.pickerEntries().map((e) => e.id), ['new4', 'new3', 'old2']);
    assert.deepEqual(JSON.parse(store.getItem(BR.reportsKey())).map((r) => r.id).sort(), ['new3', 'new4', 'old2'], 'and what the device kept is the same three');
    // a newer report in storage (another tab) beats an older one in memory
    const other = mockStore(); BR.forgetReports(other); BR.saveReport(mk('m1', 5000), other);
    other.setItem(BR.reportsKey(), JSON.stringify([mk('tab9', 9000), mk('m1', 5000)]));
    assert.deepEqual(BR.loadReports(other).map((r) => r.id), ['tab9', 'm1']);
  } finally { delete globalThis.window; BR.forgetReports(mockStore()); }
});

// ---- review: one report is never longer than its bound
const sixHeroFight = (rounds) => {
  const hs = ['knight', 'ranger', 'wizard', 'dwarf', 'bard', 'knight'].map((c, i) => { const h = E.newHero({ name: `H${i + 1}`, cls: c, seed: 10 + i }); h.level = 6; return h; }); hs.forEach((h) => { h.campaign = hs[0].campaign; }); hs[0].campaign.act = 2; hs[0].campaign.step = 6;
  const b = E.newPartyBattle(hs, E.questsFor(hs[0])[0], E.makeRng(8)); BR.begin(b);
  for (let g = 0; g < rounds && !b.outcome; g++) { for (let i = 0; i < b.fighters.length; i++) if (b.fighters[i].hp > 0) { E.startFighter(b, i); b.fighters[i].target = 0; } b.fighters.forEach((f) => { f.hp = f.maxHp; }); E.resolveParty(b); }
  return BR.finish(b, b.outcome || 'withdrew');
};
test('fit always honours its bound: one- and two-round reports, six heroes, and a report padded far past the limit', () => {
  const one = sixHeroFight(1); const two = sixHeroFight(2);
  for (const [name, rep, max] of [['six heroes, one round', one, 6000], ['six heroes, one round, tighter', one, 2500], ['six heroes, two rounds', two, 7000], ['six heroes, two rounds, tighter', two, 2500], ['the smallest bound', two, BR.MIN_REPORT_CHARS]]) {
    assert.ok(JSON.stringify(rep).length > max, `${name}: the report really is over the bound`);
    const f = BR.fit(rep, max);
    assert.ok(JSON.stringify(f).length <= max, `${name}: ${JSON.stringify(f).length} <= ${max}`);
    assert.equal(f.trimmed, true); assert.ok(f.omitted.length > 0, `${name}: says what it left out`);
    assert.equal(f.outcome.result, rep.outcome.result, `${name}: the outcome survives`); assert.equal(f.outcome.roundsResolved, rep.outcome.roundsResolved);
    assert.equal(f.v, 1); assert.ok(Array.isArray(f.rounds), 'still a valid report for the picker');
    const text = BR.summaryText(f); assert.match(text, /Left out:/); assert.match(text, /BATTLE REPORT/); assert.doesNotThrow(() => BR.exportText(f));
  }
  // far past the real bound: padded with a huge field in the only round
  const padded = JSON.parse(JSON.stringify(one)); padded.rounds = padded.rounds.slice(0, 1); padded.rounds[0].heroes[0].junk = 'x'.repeat(90000); padded.heroes[0].junk = 'y'.repeat(60000);
  assert.ok(JSON.stringify(padded).length > 150000);
  const f = BR.fit(padded); assert.ok(JSON.stringify(f).length <= BR.MAX_REPORT_CHARS); assert.equal(f.outcome.result, padded.outcome.result); assert.ok(f.omitted.length > 0);
  const store = mockStore(); BR.forgetReports(store); BR.saveReport(padded, store);
  assert.ok(store.getItem(BR.reportsKey()).length <= BR.MAX_REPORT_CHARS + 2, 'and what is stored is bounded too');
  const one2 = JSON.parse(JSON.stringify(two)); one2.rounds.forEach((r) => r.heroes.forEach((h) => { h.junk = 'z'.repeat(50000); }));
  const g = BR.fit(one2); assert.ok(JSON.stringify(g).length <= BR.MAX_REPORT_CHARS, 'two padded rounds'); assert.equal(g.outcome.roundsResolved, two.outcome.roundsResolved);
});

test('the last-resort record is short enough for the smallest bound, even with long names', () => {
  const rep = sixHeroFight(1); rep.quest.name = 'Q'.repeat(400); rep.build = 'B'.repeat(200); rep.id = 'I'.repeat(100);
  const f = BR.fit(rep, BR.MIN_REPORT_CHARS); assert.ok(JSON.stringify(f).length <= BR.MIN_REPORT_CHARS, String(JSON.stringify(f).length));
  assert.equal(f.outcome.result, rep.outcome.result); assert.deepEqual(f.rounds, []); assert.match(BR.summaryText(f), /Left out: all detail except how the fight ended/);
});

// ---- a preview copy keeps its own storage; the real site is never affected
test('a preview copy (any page under /preview/) keeps its own saves, reports and daily record; the real site and the lab are unchanged', async () => {
  const load = async (pathname, search = '') => { globalThis.location = { pathname, search }; try { return await import(`../js/lab.js?at=${encodeURIComponent(pathname + search)}`); } finally { delete globalThis.location; } };
  const live = await load('/questdice/'); const prev = await load('/questdice/preview/battle-report/'); const lab = await load('/questdice/', '?lab');
  assert.deepEqual([live.PREVIEW, live.SANDBOX, live.SANDBOX_NAME], [false, false, '']);
  assert.deepEqual([prev.PREVIEW, prev.SANDBOX, prev.SANDBOX_NAME], [true, true, 'preview']);
  assert.deepEqual([lab.PREVIEW, lab.SANDBOX, lab.SANDBOX_NAME], [false, true, 'lab']);
  assert.equal(live.keyOf('qd.daily'), 'qd.daily'); assert.equal(prev.keyOf('qd.daily'), 'qd.preview.daily'); assert.equal(lab.keyOf('qd.daily'), 'qd.lab.daily');
  assert.equal(live.keyOf('questdice.hero.'), 'questdice.hero.'); assert.equal(prev.keyOf('questdice.hero.'), 'questdice.preview.hero.');
  assert.notEqual(BR.reportsKey(), 'questdice.preview.battlereports', 'this run is not a preview');
  assert.equal(BR.reportsKey(), 'questdice.battlereports', 'the real key outside a preview');
});

test('a weapon equipped in a slot whose die is not unlocked is labelled as not in play, and an unlocked one is not', () => {
  const h = hero(); h.dice = ['N', 'W', 'C', 'E', 'S', 'NW', 'SW']; h.loadout.NE = { ...h.loadout.NW, id: 'shield' }; // the Round Shield, in the right weapon slot, whose die is not unlocked (camp, 30 gold)
  const b = E.newBattle(h, quest(h), E.makeRng(11), 1); BR.begin(b); play(b); const r = BR.finish(b, b.outcome || 'withdrew');
  const w = r.heroes[0].weapons; assert.equal(w.find((x) => x.slot === 'left weapon').inPlay, true); assert.equal(w.find((x) => x.slot === 'right weapon').inPlay, false);
  const text = BR.summaryText(r); assert.match(text, /\(right weapon: equipped but NOT IN PLAY, its die is not unlocked, so it rolled nothing\)/); assert.doesNotMatch(text, /left weapon: equipped but NOT/);
  assert.ok(r.rounds.every((rd) => mine(rd).dice.every((d) => d.slot !== 'NE')), 'no die was rolled for the locked slot');
  const h2 = hero(); h2.dice = [...h2.dice, 'NE']; const b2 = E.newBattle(h2, quest(h2), E.makeRng(11), 1); BR.begin(b2); play(b2); const r2 = BR.finish(b2, b2.outcome || 'withdrew');
  assert.ok(r2.heroes[0].weapons.every((x) => x.inPlay), 'with the die unlocked both are in play'); assert.doesNotMatch(BR.summaryText(r2), /NOT IN PLAY/);
});

test('online (T21): a defeat names the foes last seen, no locked slot is listed as a die, and every hero keeps the totals they locked in', () => {
  const { table, players: [ada, bea], seen, watch } = atBattle();
  watch(); for (const p of [ada, bea]) { command(table, p.id, { type: 'roll' }); watch(); }
  command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }); watch(); command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }); watch();
  assert.equal(table.phase, 'defeat'); const r = seen[0]; const rd = lastRound(r);
  assert.ok(r.outcome.enemiesLeft.length > 0 && r.outcome.enemiesLeft.every((s) => /last seen/.test(s)), 'a defeat no longer reports an empty list of foes');
  assert.match(r.outcome.enemiesLeftBasis, /last observed/);
  for (const d of mine(rd, 'Ada').dice) assert.ok(Number.isFinite(d.sides) && d.sides > 0, `${d.slot} has a real die`);
  assert.doesNotMatch(JSON.stringify(r), /"sides":null/);
  for (const h of rd.heroes) assert.ok(h.totals && Number.isFinite(h.totals.attack), `${h.name}: totals present even if they fell before striking`);
});
