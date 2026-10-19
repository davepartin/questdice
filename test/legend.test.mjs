import test from 'node:test';
import assert from 'node:assert/strict';
import { noteBattle, legendBeat, hasLegend } from '../js/legend.js';
import { pending, beat, storySoFar } from '../js/story.js';
import { createTable, joinTable, command, playerView } from '../js/table.js';
import * as E from '../js/engine.js';

const row = (r, name, o = {}) => ({ r, name, dealt: 0, magic: 0, kills: [], blocked: 0, triples: 0, straight: null, gold: 0, hp: 20, ...o });
const fight = (rows, fighters, quest) => ({ secretLog: rows, fighters: fighters.map(([name, hp, heal = 0]) => ({ hero: { name }, hp, stats: { healGiven: heal } })), quest });

test('every fight adds to the act’s Legend, and the page tells it with a title for each hero and a teaser', () => {
  const c = { pack: 'starfall', act: 1, step: 10, seed: 3 };
  noteBattle(c, fight([row(1, 'WizKid', { dealt: 30, triples: 1, kills: ['a'] }), row(1, 'Smalls', { blocked: 25, dealt: 5 })], [['WizKid', 20], ['Smalls', 4]], { place: 'Cinder Ford', kind: 'battle' }), { won: true });
  noteBattle(c, fight([row(1, 'WizKid', { dealt: 12, hp: 0 }), row(1, 'Smalls', { dealt: 8 })], [['WizKid', 0], ['Smalls', 10]], { place: 'The Toll Bridge', kind: 'elite' }), { won: false });
  noteBattle(c, fight([row(1, 'WizKid', { dealt: 61, kills: ['b'] }), row(2, 'Smalls', { blocked: 40 })], [['WizKid', 12], ['Smalls', 9]], { place: 'Gallows Hill', kind: 'boss', foeNames: ['Gorvash'] }), {
    won: true, reveal: { lines: [{ name: 'Smalls', kind: 'bribe', mode: 'offer', accepted: true, gold: 140 }, { name: 'WizKid', kind: 'challenge', gold: 20 }] } });
  assert.ok(hasLegend(c, 1)); assert.ok(!hasLegend(c, 2));
  const b = legendBeat(c, 1, [{ name: 'WizKid' }, { name: 'Smalls' }]);
  assert.equal(b.title, 'The Legend of WizKid and Smalls');
  assert.match(b.kicker, /Act I · The Star at Cinder Ford/);
  assert.match(b.text[0], /^From Cinder Ford to Gallows Hill: 3 fights, 2 won, 1 lost along the way \(The Toll Bridge\)\. Gorvash is beaten\./);
  assert.ok(b.facts.some((f) => /biggest single round: WizKid, 61 damage at Gallows Hill/.test(f)));
  assert.ok(b.facts.some((f) => /Smalls blocked 65 damage/.test(f)));
  assert.ok(b.facts.some((f) => /The bribes: Smalls took one and cashed it\./.test(f)), b.facts.join(' | '));
  assert.ok(b.facts.some((f) => /^WizKid, /.test(f)) && b.facts.some((f) => /^Smalls, /.test(f)), 'a title for each hero');
  assert.match(b.teaser, /^Next time, Act II: Nothing Down Here Glows\./);
  for (const t of [...b.text, ...b.facts, b.teaser]) assert.doesNotMatch(t, /undefined|NaN|\{/);
});

test('the Legend comes before the act’s closing page, and shows in the story so far', () => {
  const c = { pack: 'dawn', act: 2, step: 1, seed: 5, storySeen: [], legend: { 1: { fights: 1, wins: 1, falls: [], from: 'Cinder Ford', heroes: { Ada: { dealt: 9 } }, secrets: {} } } };
  const p = pending(c);
  assert.deepEqual(p.slice(0, 2).map((x) => x.id), ['legend:1', 'close:1']);
  const b = beat('legend:1', 1, [{ name: 'Ada' }], c);
  assert.equal(b.title, 'The Legend of Ada');
  assert.match(b.teaser, /Act II/);
  assert.ok(storySoFar(c, [{ name: 'Ada' }]).some((x) => x.id === 'legend:1'));
  const last = { ...c, act: 4, legend: { 3: c.legend[1] } };
  assert.match(beat('legend:3', 3, [{ name: 'Ada' }], last).teaser, /Ascent/);
});

test('a table keeps the Legend as it plays', () => {
  const table = createTable({ code: 'LGND', seed: 9, name: 'Tellers' }); table.envelopes = 'off';
  const ps = [['Ada', 'knight'], ['Bea', 'bard']].map(([name, cls], i) => joinTable(table, { name, cls, token: `tok${i}aaaa` }).player);
  for (const p of ps) command(table, p.id, { type: 'ready', name: p.name, cls: p.cls });
  command(table, ps[0].id, { type: 'start' });
  const road = playerView(table, ps[0].id).road; command(table, ps[1].id, { type: 'choose', id: road.choices[0].id });
  for (const p of ps) command(table, p.id, { type: 'onward' });
  command(table, ps[0].id, { type: 'quest', id: E.questsFor(table.company.members[0])[0].id });
  for (let i = 0; i < 60 && table.phase === 'battle'; i++) for (const p of ps) { const f = table.battle?.fighters.find((x) => x.hero === p.hero); if (!f || f.hp <= 0 || f.locked) continue; command(table, p.id, { type: 'roll' }); command(table, p.id, { type: 'lock', target: 0, straight: 'atk' }); }
  const L = table.company.campaign.legend?.[1];
  assert.equal(L?.fights, 1);
  assert.ok(L.heroes.Ada && L.heroes.Bea);
});

test('the Legend names Honor: who said no to a bribe, and who took one', () => {
  const c = { pack: 'dawn', act: 1, step: 10, seed: 4 };
  const lines = [{ name: 'Maya', kind: 'bribe', mode: 'offer', accepted: false, gold: 10 }, { name: 'Theo', kind: 'bribe', mode: 'offer', accepted: true, gold: 0 }];
  for (let i = 0; i < 2; i++) noteBattle(c, fight([row(1, 'Maya', { dealt: 9 }), row(1, 'Theo', { dealt: 9 })], [['Maya', 9], ['Theo', 9]], { place: 'Cinder Ford', kind: 'battle' }), { won: true, reveal: { lines } });
  const b = legendBeat(c, 1, [{ name: 'Maya' }, { name: 'Theo' }]);
  assert.ok(b.facts.includes('The bribes: Maya said no twice. Theo took two and cashed none.'), b.facts.join(' | '));
  for (const f of b.facts) assert.doesNotMatch(f, /Goblins’ Worst/);
});
