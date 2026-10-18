import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGNS, DEFAULT_PACK, packOf, packIdOf, packList, actsOf, beatsOf, stepsOf,
  fillNames, forcedLine, partySize, coverClasses, cloneDawnActs, helpOff, bansOf, monsterOf,
} from '../js/campaigns.js';
import { ACTS, CLASSES, PARTY } from '../js/data.js';
import { pending, beat, storySoFar, markSeen, pendingVictory } from '../js/story.js';
import * as E from '../js/engine.js';
import * as SV from '../js/save.js';
import { createTable, joinTable, command } from '../js/table.js';
import { ensureRoad } from '../js/roads.js';

test('every pack has the fields a writer and the picker need', () => {
  const ids = packList().map((p) => p.id);
  assert.deepEqual(ids, ['dawn', 'rivalduo', 'ballad']);
  for (const p of packList()) {
    assert.ok(p.title && p.pitch && p.acts?.length === 3, p.id);
    assert.ok(p.startMode === 'scaled' || p.startMode === 'fresh', p.id);
    assert.ok(p.requiredHeroes >= 1 && (p.maxHeroes || p.requiredHeroes) >= p.requiredHeroes, p.id);
    assert.ok(coverClasses(p).every((c) => CLASSES[c]), p.id);
  }
  assert.equal(CAMPAIGNS.dawn.acts, ACTS);
  assert.equal(CAMPAIGNS.dawn.startMode, 'scaled');
  assert.equal(CAMPAIGNS.dawn.requiredHeroes, 1);
  assert.equal(packIdOf(null), DEFAULT_PACK);
  assert.equal(packOf('nope').id, 'dawn');
  assert.equal(actsOf({ pack: 'dawn' }), ACTS);
});

test('Rival Duo and That’s Not How It Went are two-hero fresh packs with forced classes', () => {
  const r = CAMPAIGNS.rivalduo;
  const b = CAMPAIGNS.ballad;
  assert.equal(r.title, 'Rival Duo');
  assert.equal(r.requiredHeroes, 2);
  assert.equal(r.maxHeroes, 2);
  assert.equal(r.startMode, 'fresh');
  assert.deepEqual(r.forcedClasses, ['wizard', 'dwarf']);
  assert.equal(b.title, 'That’s Not How It Went');
  assert.equal(b.requiredHeroes, 2);
  assert.equal(b.maxHeroes, 2);
  assert.equal(b.startMode, 'fresh');
  assert.deepEqual(b.forcedClasses, ['knight', 'bard']);
  assert.equal(partySize(r), '2 heroes');
  assert.equal(partySize({ id: 'rivalduo', requiredHeroes: 2, maxHeroes: 2 }), '2 heroes');
  assert.equal(forcedLine(r), 'Wizard + Dwarf');
  assert.equal(forcedLine(b), 'Knight + Bard');
  assert.ok(/bangle|gerald/i.test(r.pitch));
  assert.ok(/crown/i.test(b.pitch) && /knight/i.test(b.pitch));
  assert.ok(!/curse/i.test(r.pitch), 'the bangle is a novelty charm, not a curse');
});

test('Dawn fights stay the same list; duo packs use the writer’s locked casts', () => {
  const dawn = actsOf('dawn');
  const rival = actsOf('rivalduo');
  const ballad = actsOf('ballad');
  assert.notEqual(rival, dawn);
  assert.deepEqual(dawn[0].fights, ACTS[0].fights);
  assert.equal(rival[0].name, 'The Ten-Pace Problem');
  assert.equal(ballad[0].name, 'Verse the First');
  assert.equal(rival[1].name, 'The Cellars Under Everything');
  assert.equal(ballad[2].name, 'The Big Finish');
  assert.deepEqual(rival[0].fights[0], ['goblin']);
  assert.deepEqual(rival[0].names[0], ['Crumb']);
  assert.deepEqual(rival[1].fights[4], ['bigwheel']);
  assert.equal(rival[1].names[4][0], 'Big Wheel');
  assert.deepEqual(ballad[0].fights[4], ['mungo']);
  assert.deepEqual(ballad[0].names[4], ['Mungo']);
  assert.deepEqual(ballad[2].fights[4], ['vharaxis']);
  assert.equal(ballad[2].names[9][0], 'The Dowager Blazemorrow');
  assert.deepEqual(rival[0].help, []);
  assert.deepEqual(ballad[1].help, []);
  assert.ok(helpOff({ pack: 'rivalduo', act: 1 }));
  assert.ok(!helpOff({ pack: 'dawn', act: 1 }));
  const copy = cloneDawnActs(['A', 'B', 'C']);
  assert.equal(copy[0].name, 'A');
  assert.deepEqual(copy[0].fights, ACTS[0].fights);
});

test('fight display names ride with the locked list and title the set-pieces', () => {
  const wiz = E.newHero({ name: 'Ada', cls: 'wizard', seed: 11, pack: 'rivalduo' });
  const q1 = E.questsFor(wiz)[0];
  assert.deepEqual(q1.enemies, ['goblin']);
  assert.deepEqual(q1.foeNames, ['Crumb']);
  const crumb = E.spawnEnemy('goblin', { campaign: wiz.campaign, name: q1.foeNames[0] }, E.makeRng(1));
  assert.equal(crumb.name, 'Crumb');
  wiz.campaign.step = 5;
  const elite = E.questsFor(wiz)[0];
  assert.equal(elite.kind, 'elite');
  assert.equal(elite.name, 'Big Norman');
  assert.deepEqual(elite.foeNames, ['Big Norman']);
  wiz.campaign.step = 10;
  const boss = E.questsFor(wiz)[0];
  assert.equal(boss.kind, 'boss');
  assert.equal(boss.name, 'King Grabbo');
  const bard = E.newHero({ name: 'Pip', cls: 'bard', seed: 12, pack: 'ballad' });
  bard.campaign.act = 2; bard.campaign.step = 10;
  const mort = E.questsFor(bard)[0];
  assert.equal(mort.name, 'King Mortimer');
  assert.deepEqual(mort.enemies, ['lich']);
  bard.campaign.act = 1; bard.campaign.step = 5;
  const mungo = E.questsFor(bard)[0];
  assert.equal(mungo.kind, 'elite');
  assert.deepEqual(mungo.enemies, ['mungo']);
  assert.deepEqual(mungo.foeNames, ['Mungo']);
  assert.equal(monsterOf('mungo').img, 'assets/miniatures/mungo.webp');
  assert.equal(monsterOf('mungo').look, 'left');
  assert.equal(monsterOf('bigwheel').img, 'assets/miniatures/bigwheel.webp');
  assert.equal(monsterOf('bigwheel').look, 'left');
});

test('story names fill {wizard}/{dwarf}/{knight}/{bard} in titles too, and Dawn copy is untouched', () => {
  const heroes = [{ name: 'Ada', cls: 'wizard' }, { name: 'Bea', cls: 'dwarf' }];
  assert.equal(fillNames('{wizard} and {dwarf}. {names} walk.', heroes), 'Ada and Bea. Ada and Bea walk.');
  assert.equal(fillNames('{name} goes.', [{ name: 'Ada', cls: 'knight' }]), 'Ada goes.');
  assert.equal(fillNames('{wizard}’s hat', []), 'the wizard’s hat');
  const dawn = beat('open:1', 1);
  assert.equal(dawn.title, 'The Night the Light Went Out');
  assert.ok(!/\{wizard\}/.test(String(dawn.text)));
  const duo = beat('open:1', 1, heroes, { pack: 'rivalduo' });
  assert.equal(duo.title, 'Some Assembly Required');
  assert.ok(duo.text.some((t) => t.includes('Ada') && t.includes('Bea')));
  assert.ok(!duo.text.some((t) => /\{wizard\}|\{dwarf\}/.test(t)));
  const pair = [{ name: 'Sir P', cls: 'knight' }, { name: 'Pip', cls: 'bard' }];
  const ballad = beat('open:1', 1, pair, { pack: 'ballad' });
  assert.ok(ballad.text.some((t) => t.includes('Sir P') && t.includes('Pip')));
  const close = beat('close:3', 3, pair, { pack: 'ballad' });
  assert.equal(close.title, 'The True Ballad of Sir P');
});

test('duo packs reuse the same beat keys as Dawn, with their own copy', () => {
  for (const id of ['rivalduo', 'ballad']) {
    const c = { pack: id, act: 1, step: 1, storySeen: [] };
    assert.deepEqual(pending(c), [{ id: 'open:1', act: 1 }]);
    assert.ok(beatsOf(id)['elite:1'] && beatsOf(id)['boss:3'] && beatsOf(id)['close:3']);
    assert.ok(!beatsOf(id)['close:ascent'], `${id} ends after act III`);
    const soFar = storySoFar({ pack: id, act: 1, step: 10 });
    assert.deepEqual(soFar.map((b) => b.id), ['open:1', 'elite:1', 'boss:1']);
    for (const b of soFar) assert.ok(b.title && b.text.length, b.id);
  }
});

test('story already-seen flags are namespaced per campaign pack', () => {
  const dawn = { pack: 'dawn', act: 1, step: 1, storySeen: ['open:1@1'] };
  assert.deepEqual(pending(dawn), []);
  const rival = { pack: 'rivalduo', act: 1, step: 1, storySeen: ['open:1@1'] };
  assert.deepEqual(pending(rival), [{ id: 'open:1', act: 1 }]);
  markSeen(rival, 'open:1', 1);
  assert.ok(rival.storySeen.includes('rivalduo/open:1@1'));
  assert.deepEqual(pending(rival), []);
  const other = { pack: 'ballad', act: 1, step: 1, storySeen: rival.storySeen };
  assert.deepEqual(pending(other), [{ id: 'open:1', act: 1 }]);
});

test('duo step copy is keyed by step, names the renamed foes, and skips Call for Help', () => {
  for (const id of ['rivalduo', 'ballad']) {
    const steps = stepsOf(id);
    const acts = actsOf(id);
    for (let a = 0; a < 3; a++) {
      assert.equal(steps[a].length, 10, `${id} act ${a + 1}`);
      for (let s = 0; s < 10; s++) {
        const row = steps[a][s];
        const names = acts[a].names[s];
        assert.deepEqual(row.foes, acts[a].fights[s], `${id} ${a + 1}.${s + 1} foes`);
        assert.deepEqual(row.names, names);
        const blob = [...row.arrive, ...row.win].join('\n');
        for (const n of names) {
          const token = n.replace(/^the /i, '').split(',')[0].trim();
          assert.ok(blob.includes(token), `${id} ${a + 1}.${s + 1} copy does not name ${n}`);
        }
      }
    }
  }
  const c = { pack: 'rivalduo', act: 1, step: 2, storySeen: [] };
  assert.equal(pending(c, 'Burnt Orchard')[0].id, 'arrive:1.2');
  const win = pendingVictory(c, 'Burnt Orchard');
  assert.equal(win.id, 'win:1.2');
  const h = E.newHero({ name: 'Ada', cls: 'wizard', seed: 2, pack: 'rivalduo' });
  h.campaign.act = 1; h.campaign.step = 8; h.campaign.wins = 7; h.campaign.road = null;
  const ev = ensureRoad(h, [h]);
  assert.notEqual(ev.id, 'help');
  h.campaign.step = 2; h.campaign.wins = 1;
  const q = E.questsFor(h)[0];
  assert.deepEqual(q.foeNames, ['Toastie', 'Grater']);
});

test('duo packs keep out monsters that look like their heroes', () => {
  for (const id of ['rivalduo', 'ballad']) {
    const ban = new Set(bansOf(id));
    assert.ok(ban.size, id);
    for (const act of actsOf(id)) {
      for (const group of [...act.fights, ...(act.pool || []), ...(act.elite || [])]) {
        for (const mid of group) assert.ok(!ban.has(mid), `${id} uses look-alike ${mid}`);
      }
      for (const mid of act.boss || []) assert.ok(!ban.has(mid), `${id} boss ${mid}`);
    }
  }
  assert.ok(bansOf('rivalduo').includes('lich'));
  assert.ok(bansOf('rivalduo').includes('cultist'));
  assert.ok(bansOf('ballad').includes('dirgesinger'));
  assert.ok(bansOf('ballad').includes('shieldbearer'));
});

test('duo locked fights stay near Dawn threat, with the writer’s fightHp knobs', () => {
  // Set-piece swaps (ogre-for-warden, ordinary step 7 instead of the Fallen Champion) are
  // supposed to differ; fightHp is how the writer rebalances them. Ordinary steps stay close.
  const skip = new Set(['2.5', '2.10', '3.4', '3.5', '3.7']);
  const dawn = actsOf('dawn');
  for (const id of ['rivalduo', 'ballad']) {
    const acts = actsOf(id);
    for (let a = 0; a < 3; a++) {
      for (let s = 0; s < 10; s++) {
        if (skip.has(`${a + 1}.${s + 1}`)) continue;
        const ours = E.crowdThreat(acts[a].fights[s], { pack: id });
        const theirs = E.crowdThreat(dawn[a].fights[s], { pack: 'dawn' });
        const gap = Math.abs(ours - theirs);
        assert.ok(gap <= 0.7, `${id} act ${a + 1} step ${s + 1}: threat ${ours} vs dawn ${theirs}`);
      }
    }
  }
  assert.equal(actsOf('rivalduo')[1].fightHp[5], 1.8);
  assert.equal(actsOf('rivalduo')[1].fightHp[10], 1.25);
  assert.equal(actsOf('ballad')[2].fightHp[4], 1.4);
  const wheel = E.newHero({ name: 'Ada', cls: 'wizard', seed: 3, pack: 'rivalduo' });
  wheel.campaign.act = 2; wheel.campaign.step = 5;
  const q = E.questsFor(wheel)[0];
  assert.equal(q.kind, 'elite');
  assert.deepEqual(q.enemies, ['bigwheel']);
  assert.equal(q.name, 'Big Wheel');
  assert.ok(q.hpMult > 2, `Big Wheel Act II elite should keep fightHp 1.8, got ${q.hpMult}`);
  // Duo packs do not retune PARTY; Dave's team numbers live in data.js (see TEAMPLAY.md).
  assert.equal(PARTY.hp[1], 2.2);
  const mate = E.newHero({ name: 'Bea', cls: 'dwarf', seed: 3, pack: 'rivalduo' });
  mate.campaign = wheel.campaign;
  const solo = E.newBattle(wheel, q, E.makeRng(1), 1);
  const pair = E.newPartyBattle([wheel, mate], q, E.makeRng(1));
  assert.equal(Math.round(pair.enemies[0].maxHp / solo.enemies[0].maxHp * 10) / 10, PARTY.hp[1]);
});

test('per-campaign saves keep Dawn keys and namespace the duo packs', () => {
  const mem = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
    },
  };
  assert.equal(SV.key('Ada'), 'questdice.hero.ada');
  assert.equal(SV.key('Ada', 'dawn'), 'questdice.hero.ada');
  assert.equal(SV.key('Ada', 'rivalduo'), 'questdice.hero.rivalduo.ada');
  const dawn = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  const duo = E.newHero({ name: 'Ada', cls: 'wizard', seed: 2, pack: 'rivalduo' });
  return Promise.all([SV.createSave(dawn, 'abc'), SV.createSave(duo, 'xyz')]).then(async () => {
    assert.equal((await SV.openHero('Ada', 'abc')).cls, 'knight');
    assert.equal((await SV.openHero('Ada', 'xyz', 'rivalduo')).cls, 'wizard');
    const listed = SV.listHeroes();
    assert.equal(listed.length, 2);
    assert.ok(listed.some((h) => h.pack === 'dawn' && h.cls === 'knight'));
    assert.ok(listed.some((h) => h.pack === 'rivalduo' && h.cls === 'wizard'));
  });
});

test('two duo heroes who share a seed list as one company save', async () => {
  const mem = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
    },
  };
  const co = E.newCompany({ name: 'Bound', roster: [{ name: 'Wiz', cls: 'wizard' }, { name: 'Dor', cls: 'dwarf' }], seed: 99, pack: 'rivalduo' });
  assert.equal(co.campaign.pack, 'rivalduo');
  assert.equal(co.members[0].level, 1);
  assert.equal(co.members[0].campaign, co.members[1].campaign);
  await SV.createSave(co.members[0], 'abc');
  await SV.createSave(co.members[1], 'abc');
  const saves = SV.listSaves();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].kind, 'company');
  assert.equal(saves[0].pack, 'rivalduo');
  assert.equal(saves[0].size, 2);
  assert.ok(saves[0].name.includes('Wiz') && saves[0].name.includes('Dor'));
});

test('a duo table seats exactly those two classes, fresh, and refuses a third', () => {
  const table = createTable({ code: 'DUO1', seed: 7, name: 'Bracelet', pack: 'rivalduo' });
  assert.equal(table.pack, 'rivalduo');
  const a = joinTable(table, { name: 'Ada', cls: 'wizard', token: 'tokaaaaaa' });
  assert.equal(a.ok, true, a.error);
  const bad = joinTable(table, { name: 'Ned', cls: 'knight', token: 'tokbbbbbb' });
  assert.equal(bad.ok, false);
  const b = joinTable(table, { name: 'Bea', cls: 'dwarf', token: 'tokcccccc' });
  assert.equal(b.ok, true, b.error);
  const extra = joinTable(table, { name: 'Cal', cls: 'wizard', token: 'tokdddddd' });
  assert.equal(extra.ok, false);
  command(table, b.player.id, { type: 'ready' });
  const started = command(table, a.player.id, { type: 'start' });
  assert.equal(started.ok, true, started.error);
  assert.equal(table.company.campaign.pack, 'rivalduo');
  assert.equal(table.company.members[0].level, 1);
  assert.equal(table.company.members[1].level, 1);
});

test('fresh startMode ignores a brought high-level overlay', () => {
  const table = createTable({ code: 'FRESH', seed: 3, name: 'Ballad', pack: 'ballad' });
  const high = E.newHero({ name: 'Sir', cls: 'knight', seed: 1, pack: 'dawn' });
  high.level = 8; high.campaign.act = 3; high.campaign.step = 4;
  const a = joinTable(table, { name: 'Sir', cls: 'knight', token: 'tokaaaaaa', hero: high });
  assert.equal(a.ok, true, a.error);
  const b = joinTable(table, { name: 'Pip', cls: 'bard', token: 'tokbbbbbb' });
  assert.equal(b.ok, true, b.error);
  command(table, b.player.id, { type: 'ready' });
  assert.equal(command(table, a.player.id, { type: 'start' }).ok, true);
  assert.equal(table.company.campaign.act, 1);
  assert.equal(table.company.campaign.step, 1);
  assert.equal(table.company.members[0].level, 1);
  assert.equal(table.company.campaign.pack, 'ballad');
});

test('a scaled Dawn table still overlays the host campaign', () => {
  const table = createTable({ code: 'DAWN', seed: 3, name: 'Lantern', pack: 'dawn' });
  const high = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  high.level = 8; high.campaign.act = 2; high.campaign.step = 4; high.campaign.reached = { act: 2, step: 4 };
  const a = joinTable(table, { name: 'Ada', cls: 'knight', token: 'tokaaaaaa', hero: high });
  assert.equal(a.ok, true, a.error);
  assert.equal(command(table, a.player.id, { type: 'start' }).ok, true);
  assert.equal(table.company.campaign.act, 2);
  assert.equal(table.company.campaign.step, 4);
  assert.equal(table.company.members[0].level, 8);
});
