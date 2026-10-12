import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLines } from '../js/readout.js';

const soloBattle = {
  hero: { name: 'Ada' },
  enemies: [
    { uid: 'e1', name: 'Goblin Skulker' },
    { uid: 'e2', name: 'Dire Wolf' },
    { uid: 'e3', name: 'Ember Mage', rageName: 'Greed-Mad' },
  ],
};

const soloRep = {
  round: 2,
  T: { atk: 18, pierce: 2, heal: 4, block: 6, magic: 0, gold: 0 },
  dealt: 14, guarded: 6, targetUid: 'e1', killed: ['e1'],
  splashed: [{ uid: 'e1', dealt: 2 }, { uid: 'e2', dealt: 3 }],
  acts: [
    { uid: 'e2', name: 'Bite', v: 'strike', d: 9, ab: 4, net: 5, mag: 9, p: 5 },
    { uid: 'e3', name: 'Tangle', v: 'bind', mag: 0, p: 3 },
    { uid: 'e3', name: 'Rally!', v: 'summon', mag: 0, p: 2 },
  ],
  taken: 9, absorbed: 4, healed: 4, burned: 4,
  magicStolen: 2, goldStolen: 6, bound: 1,
  raged: ['e3'], summoned: ['e4'],
};

test('formatLines: solo report covers both sides of the exchange', () => {
  const lines = formatLines(soloRep, soloBattle).map((l) => l.text);
  assert.ok(lines.some((t) => t.includes('Ada strikes Goblin Skulker') && t.includes('18 attack') && t.includes('6 blocked') && t.includes('14 damage')));
  assert.ok(lines.some((t) => t.includes('Splash 3 on Dire Wolf')));
  assert.ok(lines.some((t) => t.includes('Goblin Skulker falls')));
  assert.ok(lines.some((t) => t.includes('Ada heals 4')));
  assert.ok(lines.some((t) => t.includes('Dire Wolf hits Ada') && t.includes('9 attack') && t.includes('Ada blocked 4') && t.includes('5 damage')));
  assert.ok(lines.some((t) => t.includes('Ember Mage locked 1 die')));
  assert.ok(lines.some((t) => t.includes('2 magic stolen from Ada')));
  assert.ok(lines.some((t) => t.includes('6 gold stolen')));
  assert.ok(lines.some((t) => t.includes('Ember Mage summons help')));
  assert.ok(lines.some((t) => t.includes('Ember Mage rages (Greed-Mad)')));
  assert.ok(lines.some((t) => t.includes('Fire Ward burns Ada for 4')));
});

test('formatLines: bind line uses board slots when the engine later marks them', () => {
  const lines = formatLines(soloRep, soloBattle, { boundSlots: ['SW'] }).map((l) => l.text);
  assert.ok(lines.some((t) => t === 'Ember Mage locked your left talent.'));
  assert.equal(lines.some((t) => t.includes('locked 1 die')), false);
});

test('formatLines: party report names each hero strike and the enemy answer', () => {
  const b = {
    enemies: [
      { uid: 'og', name: 'Hill Ogre' },
      { uid: 'mg', name: 'Ember Mage' },
    ],
  };
  const rep = {
    round: 3, party: true, leader: 'Ada',
    strikes: [
      { name: 'Ada', targetUid: 'og', atk: 12, guarded: 4, pierce: 0, dealt: 8, killed: false, burned: 0 },
      { name: 'Bea', targetUid: 'og', atk: 10, guarded: 0, pierce: 2, dealt: 12, killed: true, burned: 0 },
    ],
    acts: [
      { uid: 'og', name: 'Club', v: 'strike', d: 12, ab: 5, net: 7, mag: 12, p: 6 },
      { uid: 'mg', name: 'Tangle', v: 'bind', mag: 0, p: 4 },
    ],
    fighters: [
      { name: 'Ada', taken: 5, absorbed: 5, healed: 3, down: false },
      { name: 'Bea', taken: 2, absorbed: 0, healed: 0, down: false },
    ],
    bound: 1, magicStolen: 0, goldStolen: 0, raged: [], summoned: [],
    order: [
      { kind: 'hero', name: 'Bea' },
      { kind: 'hero', name: 'Ada' },
      { kind: 'foe', uid: 'og' },
      { kind: 'foe', uid: 'mg' },
    ],
  };
  const lines = formatLines(rep, b, { boundSlots: ['NW'] }).map((l) => l.text);
  assert.ok(lines.some((t) => t.includes('Ada strikes Hill Ogre') && t.includes('12 attack') && t.includes('4 blocked') && t.includes('8 damage')));
  assert.ok(lines.some((t) => t.includes('Bea strikes Hill Ogre') && t.includes('+2 pierce') && t.includes('12 damage')));
  assert.ok(lines.some((t) => t.includes('Hill Ogre falls')));
  assert.ok(lines.some((t) => t.includes('Hill Ogre hits Ada') && t.includes('12 attack') && t.includes('Ada blocked 5') && t.includes('7 damage')));
  assert.ok(lines.some((t) => t === "Ember Mage locked Ada's left weapon."));
  assert.ok(lines.some((t) => t.includes('Ada heals 3')));
});
