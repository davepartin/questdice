import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS } from '../js/data.js';
import {
  cueFromAct, cuesFromStrike, cueFromRage, cueFromFlee, cuesFromReport, ctxFromRep,
} from '../js/g3/abilitypop.js';

const facesOf = (m) => [...(m.faces || []), ...(m.rage?.faces || [])];

function specialFaces() {
  const out = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    for (const f of facesOf(m)) {
      if (f.v && f.n && f.v !== 'strike' && f.v !== 'pierce') out.push({ id, ...f });
    }
    if (m.armor) out.push({ id, n: 'Armor', v: 'armor' });
    if (m.rage) out.push({ id, n: m.rage.name, v: 'rage' });
    if (m.flee) out.push({ id, n: 'Fled', v: 'flee' });
    if (m.slam) out.push({ id, n: m.slam.v === 'breath' ? 'Breath Slam' : 'Slam', v: m.slam.v === 'breath' ? 'breath' : 'slam', slam: true });
    if (m.pounce) out.push({ id, n: 'Pounce', v: 'slam', slam: true });
  }
  return out;
}

test('user-facing examples: Bone Wall, Phase, Fire Ward, Fire Breath, flee', () => {
  const wall = cuesFromStrike({ targetUid: 'e1', guarded: 7, dealt: 4 }, { uid: 'e1', name: 'Bone Wall', v: 'guard' });
  assert.equal(wall.length, 1);
  assert.equal(wall[0].name, 'Bone Wall');
  assert.equal(wall[0].line, 'blocked 7 of your attack');
  assert.equal(wall[0].icon, 'block');

  const phase = cuesFromStrike({ targetUid: 'e2', phased: true, guarded: 12, pierce: 2, dealt: 2 }, { uid: 'e2', name: 'Phase', v: 'phase' });
  assert.equal(phase[0].name, 'Phase');
  assert.equal(phase[0].line, 'only pierce gets through');

  const ward = cuesFromStrike({ targetUid: 'e3', guarded: 4, burned: 4, dealt: 6 }, { uid: 'e3', name: 'Fire Ward', v: 'ward' });
  assert.equal(ward[0].name, 'Fire Ward');
  assert.equal(ward[0].line, 'burns whoever hits it');

  const breath = cueFromAct({ uid: 'e4', name: 'Fire Breath', v: 'breath', mag: 10 }, { party: true });
  assert.equal(breath.name, 'Fire Breath');
  assert.equal(breath.line, 'splashes every hero');

  const fled = cueFromFlee('e5');
  assert.equal(fled.line, 'Flew away! It will be back');
});

test('plain strikes and pierces do not pop; slams and specials do', () => {
  assert.equal(cueFromAct({ uid: 'a', name: 'Stab', v: 'strike', mag: 8 }), null);
  assert.equal(cueFromAct({ uid: 'a', name: 'Bone Throw', v: 'pierce', mag: 6 }), null);
  const slam = cueFromAct({ uid: 'a', name: 'Slam', v: 'strike', slam: true, mag: 14 });
  assert.equal(slam.v, 'slam');
  assert.match(slam.line, /charged/);
  const pounce = cueFromAct({ uid: 'a', name: 'Pounce', v: 'strike', slam: true, mag: 10 });
  assert.equal(pounce.line, 'a leaping strike');
});

test('guard / ward / phase pop on the strike, not on the monster’s turn', () => {
  assert.equal(cueFromAct({ uid: 'a', name: 'Duck', v: 'guard', mag: 5 }), null);
  assert.equal(cueFromAct({ uid: 'a', name: 'Fire Ward', v: 'ward', mag: 4, k: 4 }), null);
  assert.equal(cueFromAct({ uid: 'a', name: 'Fade', v: 'phase' }), null);
  assert.deepEqual(cuesFromStrike({ targetUid: 'a', guarded: 0, dealt: 0 }, { uid: 'a', name: 'Duck', v: 'guard' }), []);
  assert.equal(cuesFromStrike({ targetUid: 'a', guarded: 5, dealt: 2 }, { uid: 'a', name: 'Duck', v: 'guard' })[0].line, 'blocked 5 of your attack');
});

test('armor soaks without a guard face', () => {
  const c = cuesFromStrike({ targetUid: 's', guarded: 3, dealt: 10 }, { uid: 's', name: 'Spear', v: 'strike' });
  assert.equal(c[0].v, 'armor');
  assert.equal(c[0].name, 'Armor');
  assert.equal(c[0].line, 'blocked 3 of your attack');
});

test('steals, bind, hush, chain, summon, howl, charge, stalk, mend', () => {
  const ctx = ctxFromRep({ bound: 2, chained: 1, magicStolen: 3, goldStolen: 6 });
  assert.equal(cueFromAct({ uid: 'a', name: 'Siphon', v: 'drain', k: 3, drain: 3 }, ctx).line, 'stole 3 magic');
  assert.equal(cueFromAct({ uid: 'a', name: 'Pilfer', v: 'pilfer', net: 4 }, ctx).line, 'stole 6 gold');
  assert.equal(cueFromAct({ uid: 'a', name: 'Tangle', v: 'bind', k: 2 }, ctx).line, 'locked 2 of your dice');
  assert.equal(cueFromAct({ uid: 'a', name: 'Hush', v: 'hush' }, ctx).line, 'hushes your heart next round');
  assert.equal(cueFromAct({ uid: 'a', name: 'Chain', v: 'chain', k: 1 }, ctx).line, 'chains 1 of your die');
  assert.equal(cueFromAct({ uid: 'a', name: 'Rally!', v: 'summon', k: 1 }, ctx).line, 'called for help');
  assert.equal(cueFromAct({ uid: 'a', name: 'Howl', v: 'howl', k: 2 }, ctx).line, 'the pack hits harder next round');
  assert.equal(cueFromAct({ uid: 'a', name: 'Wind-Up', v: 'charge' }, ctx).line, 'a slam is coming');
  assert.equal(cueFromAct({ uid: 'a', name: 'Wind-Up', v: 'charge', cancelled: true }, ctx), null);
  assert.equal(cueFromAct({ uid: 'a', name: 'Stalk', v: 'stalk' }, ctx).line, 'hit it or it pounces');
  assert.equal(cueFromAct({ uid: 'a', name: 'Mend', v: 'mend', healed: 8 }, ctx).line, 'healed 8');
});

test('rage and flee cues', () => {
  const rage = cueFromRage('k', { enemies: [{ uid: 'k', rageName: 'Greed-Mad' }] });
  assert.equal(rage.name, 'Greed-Mad');
  assert.equal(rage.line, 'hits harder now');
  assert.equal(cueFromFlee('c').icon, 'flee');
});

test('every MONSTERS special ability has a named line and an icon', () => {
  const seen = [];
  for (const f of specialFaces()) {
    let c = null;
    if (f.v === 'guard' || f.v === 'ward' || f.v === 'phase' || f.v === 'armor') {
      c = cuesFromStrike({
        targetUid: 'x', guarded: 7, burned: f.v === 'ward' ? 4 : 0, phased: f.v === 'phase', dealt: 3,
      }, { uid: 'x', name: f.n, v: f.v === 'armor' ? 'strike' : f.v })[0];
    } else if (f.v === 'rage') {
      c = cueFromRage('x', { enemies: [{ uid: 'x', rageName: f.n }] });
    } else if (f.v === 'flee') {
      c = cueFromFlee('x');
    } else {
      c = cueFromAct({ uid: 'x', name: f.n, v: f.v === 'slam' ? 'strike' : f.v, slam: !!f.slam || f.v === 'slam', k: f.k || 2, mag: 6, net: 3, healed: 4 }, { party: true, bound: 2, chained: 2, goldStolen: 4, magicStolen: 2 });
    }
    assert.ok(c, `${f.id} ${f.n} (${f.v}) should produce a cue`);
    assert.ok(c.name, `${f.id} ${f.n} needs a name`);
    assert.ok(c.line && c.line.length > 3, `${f.id} ${f.n} needs a line, got ${c.line}`);
    assert.ok(c.icon, `${f.id} ${f.n} needs an icon`);
    seen.push(`${f.n}:${f.v}`);
  }
  const names = new Set(seen.map((s) => s.split(':')[0]));
  for (const need of ['Duck', 'Roar', 'Gold Shield', 'Shield Up', 'Skitter', 'Bone Wall', 'Bone Armor', 'Lock Shields', 'Stone Wall', 'Hoard', 'Curl Up', 'Wing Buffet', 'Wing Wall', 'Fire Ward', 'Chain Ward', 'Phase', 'Fade', 'Fire Breath', 'Rally!', 'Raise Dead', 'Hush', 'Chain', 'Pilfer', 'Snatch', 'Siphon']) {
    assert.ok(names.has(need), `missing ${need}`);
  }
});

test('cuesFromReport: solo and party, never a hero ability', () => {
  const b = {
    enemies: [
      { uid: 'e1', name: 'Bone Warden', rageName: 'Unbound' },
      { uid: 'e2', name: 'Cinderling' },
    ],
  };
  const solo = cuesFromReport({
    targetUid: 'e1', guarded: 7, dealt: 9, T: { atk: 16 },
    acts: [
      { uid: 'e1', name: 'Bone Wall', v: 'guard', mag: 7 },
      { uid: 'e2', name: 'Puff', v: 'breath', mag: 6 },
      { uid: 'e2', name: 'Nip', v: 'strike', mag: 5, d: 5, net: 5 },
    ],
    raged: ['e1'], fled: ['e2'],
  }, b);
  const lines = solo.map((c) => `${c.name}: ${c.line}`);
  assert.ok(lines.some((t) => t === 'Bone Wall: blocked 7 of your attack'));
  assert.ok(lines.some((t) => t.includes('Puff:')));
  assert.ok(lines.some((t) => t.includes('Unbound')));
  assert.ok(lines.some((t) => t.includes('Flew away')));
  assert.equal(solo.some((c) => /Nip/.test(c.name)), false, 'plain hits are not pop-ups');

  const party = cuesFromReport({
    party: true,
    strikes: [
      { name: 'Ada', targetUid: 'e1', atk: 10, guarded: 4, pierce: 0, dealt: 6, burned: 0 },
      { name: 'Bea', targetUid: 'e1', atk: 8, guarded: 0, pierce: 2, dealt: 10, burned: 0 },
    ],
    acts: [{ uid: 'e1', name: 'Roar', v: 'guard', mag: 4 }],
  }, b);
  assert.equal(party.filter((c) => c.name === 'Roar').length, 1);
  assert.equal(party.some((c) => c.name === 'Ada' || c.name === 'Bea'), false);
});

test('unknown verb still gets a cue if it is not a plain hit (new monsters)', () => {
  const c = cueFromAct({ uid: 'n', name: 'Hex', v: 'bind', k: 1 }, { bound: 1 });
  assert.equal(c.icon, 'bind');
  assert.match(c.line, /locked/);
  const fresh = cueFromAct({ uid: 'n', name: 'Moonveil', v: 'veil' });
  assert.equal(fresh.name, 'Moonveil');
  assert.equal(fresh.line, 'used Moonveil');
});

test('a plain blow gets a card that says what it hit for and what block took off', async () => {
  const { cueFromHit } = await import('../js/g3/abilitypop.js');
  const c = cueFromHit({ uid: 'g1', v: 'strike', name: 'Slash' }, [{ name: 'Dave', part: 9, net: 5 }]);
  assert.equal(c.v, 'hit'); assert.equal(c.name, 'Slash'); assert.match(c.line, /Hit Dave for 5\. Block stopped 4\./);
  const all = cueFromHit({ uid: 'g1', v: 'strike' }, [{ name: 'Dave', part: 6, net: 0 }]);
  assert.equal(all.v, 'blocked'); assert.match(all.line, /Dave blocked all 6/); assert.equal(all.name, 'Strike');
  const party = cueFromHit({ uid: 'w', v: 'pierce' }, [{ name: 'Ann', part: 4, net: 4 }, { name: 'Bo', part: 4, net: 1 }]);
  assert.equal(party.lines.length, 2); assert.equal(party.icon, 'pierce');
  assert.equal(cueFromHit(null, []), null);
});
