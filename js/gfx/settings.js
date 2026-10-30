// Graphics settings kept on THIS device (Dave, 27 Oct 2026: a slow, hot Android needs a way to turn the picture down).
//   q: 'auto' | 'low' | 'med' | 'high'   saver: true = Low + 30 frames a second + 1x pixel ratio + no shadows
// ?q=low / ?q=med / ?q=high and ?saver=1 in the address still win (tests, links to send a friend). Changes apply after a restart: the stage is built once.
const KEY = 'qd.gfx';
export const QUALITIES = ['auto', 'low', 'med', 'high'];
export const QUALITY_NAME = { auto: 'Auto', low: 'Low', med: 'Medium', high: 'High' };
export function getGfx() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { q: QUALITIES.includes(o.q) ? o.q : 'auto', saver: !!o.saver }; } catch { return { q: 'auto', saver: false }; }
}
export function setGfx(patch) {
  const next = { ...getGfx(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked: the choice lasts until the page closes */ }
  return next;
}
// What Auto picks. Android phones start on Low unless they are clearly strong (8+ cores and 6+ GB): many cheap phones report 8 cores and still overheat.
export function autoQuality() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''; const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  const mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 4;
  if (/Android/i.test(ua)) return cores >= 8 && mem >= 6 ? 'med' : 'low';
  if (/iPhone|iPad|Mobile/i.test(ua)) return cores >= 6 ? 'med' : 'low'; // current iPhones report 6 cores; they have the power for med
  return 'high';
}
const param = (k) => { try { return new URLSearchParams(location.search).get(k); } catch { return null; } };
export function batterySaver() { const p = param('saver'); return p === '1' ? true : p === '0' ? false : getGfx().saver; }
export function chosenQuality() {
  const q = param('q'); if (q === 'low' || q === 'med' || q === 'high') return q;
  if (batterySaver()) return 'low';
  const s = getGfx().q; return s === 'auto' ? autoQuality() : s;
}
