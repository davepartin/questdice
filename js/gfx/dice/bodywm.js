// Body-die watermarks: faint line-art behind head / left hand / right hand / feet, so the
// dice grid reads like a person. Hands and feet are shared (the knight's gauntlets and boots);
// only the HEAD changes by class. Other dice (weapon, heart, talent) stay unmarked.

export const BODY_HANDS_FEET = {
  leftHand: 'assets/dice/knight/left-hand.png',
  rightHand: 'assets/dice/knight/right-hand.png',
  feet: 'assets/dice/knight/feet.png',
};

export const CLASS_HEADS = {
  knight: 'assets/dice/heads/knight.png',
  ranger: 'assets/dice/heads/ranger.png',
  wizard: 'assets/dice/heads/wizard.png',
  dwarf: 'assets/dice/heads/dwarf.png',
  bard: 'assets/dice/heads/bard.png',
};

export const CLASS_BODY_WATERMARKS = Object.fromEntries(
  Object.entries(CLASS_HEADS).map(([cls, head]) => [cls, { head, ...BODY_HANDS_FEET }]),
);

export const BODY_WATERMARK_SLOT = { N: 'head', W: 'leftHand', E: 'rightHand', S: 'feet' };

export function bodyWatermarkSrc(cls, slot) {
  const part = BODY_WATERMARK_SLOT[slot];
  return (part && CLASS_BODY_WATERMARKS[cls]?.[part]) || null;
}

export function allBodyWatermarkSrcs() {
  return [...new Set([...Object.values(CLASS_HEADS), ...Object.values(BODY_HANDS_FEET)])];
}

const imgs = new Map();
const waiters = new Set();

function settled(src) {
  if (!imgs.has(src)) return false;
  const im = imgs.get(src);
  return !im || im.complete;
}

function allReady() {
  const srcs = allBodyWatermarkSrcs();
  return srcs.length > 0 && srcs.every(settled);
}

function notify() {
  if (!allReady()) return;
  for (const fn of [...waiters]) try { fn(); } catch { /* a tray that already went away */ }
}

export function bodyWatermarkImage(src) {
  const im = imgs.get(src);
  return im && im.complete && im.naturalWidth ? im : null;
}

export function loadBodyWatermark(src) {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);
  const have = imgs.get(src);
  if (have) {
    if (have.complete) return Promise.resolve(have.naturalWidth ? have : null);
    return new Promise((resolve) => {
      have.addEventListener('load', () => resolve(have.naturalWidth ? have : null), { once: true });
      have.addEventListener('error', () => resolve(null), { once: true });
    });
  }
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { notify(); resolve(im); };
    im.onerror = () => { imgs.set(src, null); notify(); resolve(null); };
    imgs.set(src, im);
    im.src = src;
  });
}

export function preloadBodyWatermarks() {
  return Promise.all(allBodyWatermarkSrcs().map(loadBodyWatermark));
}

export function onBodyWatermarksReady(fn) {
  waiters.add(fn);
  if (allReady()) queueMicrotask(fn);
  return () => waiters.delete(fn);
}

// Draw `img` centred at (x, y) with its longest side equal to `size` px (contain).
export function drawBodyWatermark(ctx, img, x, y, size) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;
  const s = size / Math.max(w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x - (w * s) / 2, y - (h * s) / 2, w * s, h * s);
  ctx.restore();
}

if (typeof Image !== 'undefined') preloadBodyWatermarks();
