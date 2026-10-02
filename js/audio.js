// Tiny WebAudio synth: no asset files, all sounds are generated. Muted state persists.
let ctx = null; let muted = false;
try { muted = localStorage.getItem('questdice.mute') === '1'; } catch { /* ignore */ }

function ac() {
  if (muted) return null;
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone({ f = 440, to = null, dur = 0.12, type = 'sine', vol = 0.12, delay = 0 }) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise({ dur = 0.08, vol = 0.1, delay = 0, hp = 1200 }) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay; const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start(t);
}
export const sfx = {
  click: () => tone({ f: 520, to: 700, dur: 0.05, type: 'triangle', vol: 0.07 }),
  select: () => tone({ f: 660, dur: 0.04, type: 'triangle', vol: 0.06 }),
  roll: () => { for (let i = 0; i < 6; i++) noise({ dur: 0.04, vol: 0.07, delay: i * 0.06, hp: 1800 + i * 300 }); },
  settle: (i = 0) => tone({ f: 300 + i * 25, to: 180, dur: 0.07, type: 'square', vol: 0.05 }),
  lock: () => { tone({ f: 180, to: 90, dur: 0.18, type: 'sawtooth', vol: 0.12 }); noise({ dur: 0.1, vol: 0.1, hp: 400 }); },
  hit: () => { noise({ dur: 0.14, vol: 0.16, hp: 500 }); tone({ f: 200, to: 60, dur: 0.18, type: 'square', vol: 0.1 }); },
  hurt: () => { tone({ f: 150, to: 50, dur: 0.28, type: 'sawtooth', vol: 0.14 }); noise({ dur: 0.18, vol: 0.12, hp: 300 }); },
  block: () => { tone({ f: 900, to: 500, dur: 0.1, type: 'triangle', vol: 0.1 }); tone({ f: 1300, dur: 0.06, type: 'sine', vol: 0.05, delay: 0.02 }); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.14, type: 'sine', vol: 0.08, delay: i * 0.07 })); },
  magic: () => tone({ f: 880, to: 1320, dur: 0.1, type: 'sine', vol: 0.06 }),
  card: () => { tone({ f: 392, dur: 0.1, type: 'triangle', vol: 0.09 }); tone({ f: 587, dur: 0.16, type: 'triangle', vol: 0.09, delay: 0.07 }); },
  synergy: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.18, type: 'triangle', vol: 0.1, delay: i * 0.06 })),
  windup: () => tone({ f: 90, to: 220, dur: 0.5, type: 'sawtooth', vol: 0.1 }),
  rage: () => { tone({ f: 70, to: 40, dur: 0.7, type: 'sawtooth', vol: 0.16 }); noise({ dur: 0.5, vol: 0.12, hp: 200 }); },
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.22, type: 'triangle', vol: 0.1, delay: i * 0.1 })),
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.2, type: 'square', vol: 0.06, delay: i * 0.07 })),
  lose: () => [330, 247, 196, 147].forEach((f, i) => tone({ f, dur: 0.3, type: 'sawtooth', vol: 0.09, delay: i * 0.16 })),
  coin: () => { tone({ f: 1318, dur: 0.06, type: 'square', vol: 0.05 }); tone({ f: 1760, dur: 0.12, type: 'square', vol: 0.05, delay: 0.06 }); },
  error: () => tone({ f: 130, dur: 0.12, type: 'square', vol: 0.07 }),
};
export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('questdice.mute', m ? '1' : '0'); } catch { /* ignore */ } }
