import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_BODY_WATERMARKS, CLASS_HEADS, BODY_HANDS_FEET, BODY_WATERMARK_SLOT, bodyWatermarkSrc, allBodyWatermarkSrcs } from '../js/gfx/dice/bodywm.js';

const CLASSES = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];

test('every class has a head of its own and shares the knight gauntlets and boots', () => {
  for (const cls of CLASSES) {
    const set = CLASS_BODY_WATERMARKS[cls];
    assert.equal(set.head, `assets/dice/heads/${cls}.png`);
    assert.equal(set.leftHand, BODY_HANDS_FEET.leftHand);
    assert.equal(set.rightHand, BODY_HANDS_FEET.rightHand);
    assert.equal(set.feet, BODY_HANDS_FEET.feet);
  }
  assert.equal(BODY_HANDS_FEET.leftHand, 'assets/dice/knight/left-hand.png');
  assert.equal(BODY_HANDS_FEET.rightHand, 'assets/dice/knight/right-hand.png');
  assert.equal(BODY_HANDS_FEET.feet, 'assets/dice/knight/feet.png');
});

test('body watermark slots map onto the person-shaped grid', () => {
  assert.equal(BODY_WATERMARK_SLOT.N, 'head');
  assert.equal(BODY_WATERMARK_SLOT.W, 'leftHand');
  assert.equal(BODY_WATERMARK_SLOT.E, 'rightHand');
  assert.equal(BODY_WATERMARK_SLOT.S, 'feet');
  assert.equal(BODY_WATERMARK_SLOT.NW, undefined);
  assert.equal(BODY_WATERMARK_SLOT.C, undefined);
});

test('every class resolves body dice; weapons, heart and talent do not', () => {
  for (const cls of CLASSES) {
    assert.equal(bodyWatermarkSrc(cls, 'N'), CLASS_HEADS[cls]);
    assert.equal(bodyWatermarkSrc(cls, 'W'), BODY_HANDS_FEET.leftHand);
    assert.equal(bodyWatermarkSrc(cls, 'E'), BODY_HANDS_FEET.rightHand);
    assert.equal(bodyWatermarkSrc(cls, 'S'), BODY_HANDS_FEET.feet);
    assert.equal(bodyWatermarkSrc(cls, 'NW'), null);
    assert.equal(bodyWatermarkSrc(cls, 'C'), null);
    assert.equal(bodyWatermarkSrc(cls, 'SW'), null);
  }
});

test('shared hands and feet are not listed five times in the preload set', () => {
  const srcs = allBodyWatermarkSrcs();
  assert.equal(srcs.filter((s) => s === BODY_HANDS_FEET.leftHand).length, 1);
  assert.equal(srcs.filter((s) => s.startsWith('assets/dice/heads/')).length, 5);
  assert.ok(!srcs.includes('assets/dice/knight/head.png'));
});
