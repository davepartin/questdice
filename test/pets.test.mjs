import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, newHero, evaluate, isActive, activeSlots, sidesOf, rollBoard, petFace, petOffer, buyPet, newPet, addPetSymbol,
  removePetSymbol, petTrainInfo, petGrowInfo, growPet, petPowerOf, newBattle, startRoll, canReroll, reroll, beginReset, questsFor } from '../js/engine.js';
import { PETS, PET_PRICE, petKindMax, ROLE } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of Object.keys(ROLE)) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
const hero = (gold = 1000) => {
  const h = newHero({ name: 'K', cls: 'knight', seed: 1, full: true });
  h.campaign = { act: 1, step: 3, seed: 42 }; h.gold = gold; return h;
};

test('no pet: the pet die is not on the board and rolls nothing', () => {
  const h = hero();
  assert.equal(isActive(h, 'P'), false); assert.ok(!activeSlots(h).includes('P'));
  const a = rollBoard(h, makeRng(7)); const keep = h.pet; h.pet = undefined;
  assert.deepEqual(a.P, { v: 1, bound: false }); assert.equal(keep, undefined);
  const e = evaluate(h, board({ P: 3 })); assert.equal(e.pet, undefined);
});

test('the traveler sells one pet a camp for 90 gold; it starts a d4 with two of its own symbol and one blank face', () => {
  const h = hero(PET_PRICE - 1); const o = petOffer(h);
  assert.ok(PETS[o.type]); assert.equal(o.price, PET_PRICE);
  assert.equal(buyPet(h), false, 'not enough gold');
  h.gold = PET_PRICE; assert.ok(buyPet(h)); assert.equal(h.gold, 0);
  const k = PETS[o.type].kind;
  assert.deepEqual(h.pet, { type: o.type, size: 4, faces: [[k], [k], []] });
  assert.ok(isActive(h, 'P')); assert.equal(sidesOf(h, 'P'), 4);
  assert.equal(petFace(h, 1), null, 'face 1 is always blank');
  assert.deepEqual(petFace(h, 2), [k]); assert.deepEqual(petFace(h, 3), [k]); assert.equal(petFace(h, 4), null);
  assert.equal(petOffer(h).owned, true); h.gold = 999; assert.equal(buyPet(h), false, 'already has this one');
});

test('each symbol on the pet face pays the pet power (2 on a d4)', () => {
  const h = hero(); h.pet = newPet('pup');
  const base = evaluate(h, board({ P: 1 })); const hit = evaluate(h, board({ P: 2 }));
  assert.equal(hit.atk - base.atk, 2); assert.deepEqual(hit.pet, { syms: ['atk'], power: 2 });
  h.pet = newPet('bunny'); assert.equal(evaluate(h, board({ P: 3 })).heal - evaluate(h, board({ P: 1 })).heal, 2);
});

test('train the pet like a talent die: 25 gold a symbol, two a face, its own kind up to four', () => {
  const h = hero(1000); h.pet = newPet('turtle');
  assert.equal(petTrainInfo(h).faces, 3);
  assert.ok(addPetSymbol(h, 0, 'block')); assert.equal(h.gold, 975);
  assert.equal(addPetSymbol(h, 0, 'heal'), false, 'face is full');
  assert.ok(addPetSymbol(h, 2, 'block')); assert.ok(addPetSymbol(h, 2, 'heal')); // the fourth block
  assert.equal(h.pet.faces.flat().filter((x) => x === 'block').length, petKindMax(4));
  assert.equal(addPetSymbol(h, 1, 'block'), false, 'a fifth block is too many');
  assert.ok(addPetSymbol(h, 1, 'heal')); assert.equal(addPetSymbol(h, 0, 'heal'), false);
  assert.equal(addPetSymbol(h, 3, 'block'), false, 'no face 4 on a d4');
  assert.ok(removePetSymbol(h, 2, 1)); assert.deepEqual(h.pet.faces[2], ['block']);
  const g = hero(); g.pet = newPet('turtle'); // other symbols: two at most, like talents
  assert.ok(addPetSymbol(g, 2, 'heal')); assert.ok(addPetSymbol(g, 2, 'heal')); assert.equal(addPetSymbol(g, 0, 'heal'), false);
  // a d4 with two blocks on face 2 pays four
  assert.equal(evaluate(h, board({ P: 2 })).block - evaluate(h, board({ P: 1 })).block, 4);
});

test('grow the pet: d6 for 80 gold, then d8 for 180; power rises with it', () => {
  const h = hero(260); h.pet = newPet('owl');
  assert.equal(petGrowInfo(h).cost, 80); assert.ok(growPet(h)); assert.equal(sidesOf(h, 'P'), 6); assert.equal(petPowerOf(h), 3);
  assert.equal(h.pet.faces.length, 5); assert.equal(petFace(h, 1), null);
  assert.ok(growPet(h)); assert.equal(sidesOf(h, 'P'), 8); assert.equal(petPowerOf(h), 4); assert.equal(h.gold, 0);
  assert.equal(petGrowInfo(h).why, 'Max'); assert.equal(growPet(h), false);
  assert.equal(evaluate(h, board({ P: 2 })).magic - evaluate(h, board({ P: 1 })).magic, 4);
  // a bigger pet may carry more of its own symbol: one per side
  h.gold = 1000; for (let f = 0; f < 7 && h.pet.faces.flat().filter((x) => x === 'magic').length < 8; f++) while (addPetSymbol(h, f, 'magic')) { /* fill */ }
  assert.equal(h.pet.faces.flat().filter((x) => x === 'magic').length, petKindMax(8));
});

test('Bristle the hedgehog starts with pierce, which talents lack, and trains it; old fox and magpie saves still work', () => {
  const h = hero(); h.pet = newPet('bristle');
  assert.deepEqual(h.pet.faces, [['pierce'], ['pierce'], []]);
  assert.ok(addPetSymbol(h, 2, 'pierce')); assert.equal(addPetSymbol(h, 2, 'pierce'), true);
  assert.equal(evaluate(h, board({ P: 4 })).pierce - evaluate(h, board({ P: 1 })).pierce, 4);
  const g = hero(); g.pet = newPet('turtle'); assert.equal(addPetSymbol(g, 2, 'pierce'), false, 'only the hedgehog trains pierce');
  assert.equal(PETS.pup, PETS.ember); assert.equal(PETS.magpie, PETS.penny); assert.ok(!Object.keys(PETS).includes('pup'));
  const old = hero(); old.pet = { type: 'pup', size: 4, faces: [['atk'], ['atk'], []] };
  assert.equal(evaluate(old, board({ P: 2 })).atk - evaluate(old, board({ P: 1 })).atk, 2);
  assert.equal(Object.keys(PETS).length, 6);
});


test('the pet die is one roll of luck a round: it cannot be rerolled and is never tangled (Dave)', () => {
  const h = hero(); h.pet = newPet('bunny');
  const b = newBattle(h, questsFor(h)[0], makeRng(4), 1);
  for (let r = 0; r < 12; r++) {
    startRoll(b); b.magic = 20;
    assert.ok(b.board.P, 'the pet rolls with the board');
    assert.equal(b.board.P.bound, false, 'never tangled');
    assert.equal(canReroll(b, ['P']), false); assert.equal(canReroll(b, ['N', 'P']), false);
    const v = b.board.P.v; assert.equal(reroll(b, ['P']), false); assert.equal(b.board.P.v, v);
    beginReset(b);
  }
});
