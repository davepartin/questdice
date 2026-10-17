import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_BODY_WATERMARKS, BODY_WATERMARK_SLOT, bodyWatermarkSrc, allBodyWatermarkSrcs } from '../js/gfx/dice/bodywm.js';

test('knight has a watermark set for head, both hands and feet', () => {
  const set = CLASS_BODY_WATERMARKS.knight;
  assert.equal(set.head, 'assets/dice/knight/head.png');
  assert.equal(set.leftHand, 'assets/dice/knight/left-hand.png');
  assert.equal(set.rightHand, 'assets/dice/knight/right-hand.png');
  assert.equal(set.feet, 'assets/dice/knight/feet.png');
});

test('body watermark slots map onto the person-shaped grid', () => {
  assert.equal(BODY_WATERMARK_SLOT.N, 'head');
  assert.equal(BODY_WATERMARK_SLOT.W, 'leftHand');
  assert.equal(BODY_WATERMARK_SLOT.E, 'rightHand');
  assert.equal(BODY_WATERMARK_SLOT.S, 'feet');
  assert.equal(BODY_WATERMARK_SLOT.NW, undefined);
  assert.equal(BODY_WATERMARK_SLOT.C, undefined);
});

test('knight body dice resolve to their icons; other classes and other dice do not', () => {
  assert.equal(bodyWatermarkSrc('knight', 'N'), CLASS_BODY_WATERMARKS.knight.head);
  assert.equal(bodyWatermarkSrc('knight', 'W'), CLASS_BODY_WATERMARKS.knight.leftHand);
  assert.equal(bodyWatermarkSrc('knight', 'E'), CLASS_BODY_WATERMARKS.knight.rightHand);
  assert.equal(bodyWatermarkSrc('knight', 'S'), CLASS_BODY_WATERMARKS.knight.feet);
  assert.equal(bodyWatermarkSrc('knight', 'NW'), null);
  assert.equal(bodyWatermarkSrc('knight', 'C'), null);
  assert.equal(bodyWatermarkSrc('knight', 'SW'), null);
  assert.equal(bodyWatermarkSrc('ranger', 'N'), null);
  assert.equal(bodyWatermarkSrc('wizard', 'W'), null);
  assert.equal(bodyWatermarkSrc('dwarf', 'E'), null);
  assert.equal(bodyWatermarkSrc('bard', 'S'), null);
});

test('the class map is ready for later sets without changing the slot keys', () => {
  const srcs = allBodyWatermarkSrcs();
  assert.ok(srcs.every((s) => s.startsWith('assets/dice/')));
  assert.deepEqual(Object.keys(CLASS_BODY_WATERMARKS.knight).sort(), ['feet', 'head', 'leftHand', 'rightHand']);
});
