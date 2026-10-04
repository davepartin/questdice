// QuestDice audio engine: everything is synthesised with WebAudio (no asset files).
//
//  sfx.*   one-shot effects (layered noise bursts + filtered oscillators + a short generated-IR reverb)
//  music.* generative dark-fantasy score: detuned drone pads, frame-drum pulse, sparse modal melody,
//          wind and ember crackle beds. Moods: title | road | battle | boss | victory | camp
//
// The AudioContext is created lazily on the first sound (needs a user gesture to run). Muting persists in
// localStorage. Nothing here throws when WebAudio is missing. Impulse responses and noise buffers are built
// once. `renderOffline(name, args, seconds)` renders any sfx through an OfflineAudioContext for testing.
//
// Sound design notes (one line each) are next to every voice below.

let ctx = null; let muted = false; let graph = null; let offline = false;
try { muted = localStorage.getItem('questdice.mute') === '1'; } catch { /* ignore */ }
let musicVol = 0.5; let sfxVol = 1;

// ------------------------------------------------------------------------------------------------
// context + graph
// ------------------------------------------------------------------------------------------------
function buildGraph(a) {
  const master = a.createGain(); master.gain.value = 0.85;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
  master.connect(comp); comp.connect(a.destination);
  const sfxBus = a.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
  const musicBus = a.createGain(); musicBus.gain.value = musicVol; musicBus.connect(master);
  // reverb: stereo exponentially decaying noise IR (built once)
  const len = Math.floor(a.sampleRate * 1.5);
  const ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len; lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.45 * t); // darker as it decays
      d[i] = lp * Math.pow(1 - t, 3.2) * (i < 120 ? i / 120 : 1);
    }
  }
  const conv = a.createConvolver(); conv.buffer = ir;
  const rvIn = a.createGain(); rvIn.gain.value = 1; const rvOut = a.createGain(); rvOut.gain.value = 0.5;
  rvIn.connect(conv); conv.connect(rvOut); rvOut.connect(master);
  const mrvIn = a.createGain(); mrvIn.gain.value = 1; const mrvOut = a.createGain(); mrvOut.gain.value = 0.7;
  const conv2 = a.createConvolver(); conv2.buffer = ir; mrvIn.connect(conv2); conv2.connect(mrvOut); mrvOut.connect(master);
  // noise buffers: white (2 s) and brown (4 s, loopable)
  const white = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); { const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const brown = a.createBuffer(1, a.sampleRate * 4, a.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  return { master, comp, sfxBus, musicBus, rvIn, mrvIn, white, brown };
}
function ac() {
  if (offline) return ctx;
  if (muted) return null;
  try {
    if (!ctx) { const C = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext); if (!C) return null; ctx = new C(); graph = buildGraph(ctx); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
const safe = (fn) => (...args) => { try { return fn(...args); } catch (e) { /* audio must never break the game */ return undefined; } };
const rnd = (a, b) => a + Math.random() * (b - a);
const semi = (f, s) => f * Math.pow(2, s / 12);

// ------------------------------------------------------------------------------------------------
// building blocks (all take an absolute start time t and write into dest)
// ------------------------------------------------------------------------------------------------
function envGain(a, t, { a: att = 0.004, d = 0.2, peak = 0.2, hold = 0, sus = 0 } = {}) {
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + att);
  if (hold) g.gain.setValueAtTime(peak, t + att + hold);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + att + hold + d);
  return g;
}
function osc(a, t, { type = 'sine', f = 440, to = null, curve = 'exp', dur = 0.2, att = 0.004, peak = 0.15, detune = 0, dest, send = 0, filt = null, hold = 0 }) {
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (to) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur); else o.frequency.linearRampToValueAtTime(to, t + dur); }
  const g = envGain(a, t, { a: att, d: dur - att, peak, hold });
  let node = o;
  if (filt) { const bf = a.createBiquadFilter(); bf.type = filt.type || 'lowpass'; bf.frequency.setValueAtTime(filt.f, t); if (filt.to) bf.frequency.exponentialRampToValueAtTime(filt.to, t + dur); bf.Q.value = filt.q ?? 0.7; o.connect(bf); node = bf; }
  node.connect(g); g.connect(dest || graph.sfxBus);
  if (send) { const s = a.createGain(); s.gain.value = send; g.connect(s); s.connect(graph.rvIn); }
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(a, t, { dur = 0.1, peak = 0.15, att = 0.002, type = 'bandpass', f = 2000, to = null, q = 1, dest, send = 0, buf = 'white', f2 = null, type2 = null, rate = 1 }) {
  const s = a.createBufferSource(); s.buffer = graph[buf]; s.loop = true; s.playbackRate.value = rate;
  const off = Math.random() * (s.buffer.duration - dur - 0.1); const bf = a.createBiquadFilter(); bf.type = type; bf.frequency.setValueAtTime(f, t); if (to) bf.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur); bf.Q.value = q;
  let node = bf; s.connect(bf);
  if (type2) { const b2 = a.createBiquadFilter(); b2.type = type2; b2.frequency.value = f2; bf.connect(b2); node = b2; }
  const g = envGain(a, t, { a: att, d: dur - att, peak });
  node.connect(g); g.connect(dest || graph.sfxBus);
  if (send) { const sg = a.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(graph.rvIn); }
  s.start(t, Math.max(0, off)); s.stop(t + dur + 0.05);
}
// inharmonic metal partials (clangs, coins, shields)
const METAL = [1, 2.76, 5.4, 8.93, 13.34];
function metal(a, t, { f = 600, dur = 0.5, peak = 0.12, dest, send = 0.25, decay = 1, partials = 4 }) {
  for (let i = 0; i < partials; i++) {
    osc(a, t, { f: f * METAL[i] * (1 + rnd(-0.004, 0.004)), dur: dur / (1 + i * 0.7 * decay), peak: peak / (1 + i * 0.9), att: 0.001, dest, send: i === 0 ? send : send * 0.5 });
  }
}
// formant voice: saw/noise through two band-pass formants (growls, roars, chants)
function voice(a, t, { f = 110, to = null, f2 = null, dur = 0.6, peak = 0.2, formants = [600, 1700], fto = null, vib = 5, vibAmt = 0.02, breath = 0.3, att = 0.04, rough = 40, dest, send = 0.2, type = 'sawtooth', q = 5 }) {
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.5);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const lfo = a.createOscillator(); lfo.frequency.value = vib; const lg = a.createGain(); lg.gain.value = f * vibAmt; lfo.connect(lg); lg.connect(o.frequency);
  const out = a.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(peak, t + att); out.gain.setValueAtTime(peak, t + dur * 0.55); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // amplitude roughness (growl): fast tremolo
  if (rough) { const tr = a.createOscillator(); tr.frequency.value = rough; const tg = a.createGain(); tg.gain.value = peak * 0.45; tr.connect(tg); tg.connect(out.gain); tr.start(t); tr.stop(t + dur + 0.05); }
  formants.forEach((ff, i) => {
    const bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = q; bf.frequency.setValueAtTime(ff, t);
    if (fto) bf.frequency.exponentialRampToValueAtTime(fto[i] || ff, t + dur);
    const fg = a.createGain(); fg.gain.value = 1 / (1 + i * 0.7); o.connect(bf); bf.connect(fg); fg.connect(out);
  });
  if (breath) { const s = a.createBufferSource(); s.buffer = graph.white; s.loop = true; const nf = a.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = formants[1] || 1500; nf.Q.value = 1.5; const ng = a.createGain(); ng.gain.value = breath; s.connect(nf); nf.connect(ng); ng.connect(out); s.start(t); s.stop(t + dur + 0.05); }
  out.connect(dest || graph.sfxBus);
  if (send) { const sg = a.createGain(); sg.gain.value = send; out.connect(sg); sg.connect(graph.rvIn); }
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}
// brass-like note: two detuned saws, lowpass that opens with the attack
function brass(a, t, { f = 261.6, dur = 0.5, peak = 0.07, dest, send = 0.35, att = 0.05 }) {
  for (const d of [-7, 6]) osc(a, t, { type: 'sawtooth', f, detune: d, dur, att, peak, hold: dur * 0.3, dest, send, filt: { type: 'lowpass', f: f * 1.6, to: f * 5, q: 0.8 } });
}
function pluck(a, t, { f = 440, dur = 0.8, peak = 0.12, dest, send = 0.4 }) {
  osc(a, t, { type: 'triangle', f, dur, att: 0.003, peak, dest, send, filt: { type: 'lowpass', f: f * 6, to: f * 1.2, q: 1 } });
  osc(a, t, { type: 'sine', f: f * 2, dur: dur * 0.5, att: 0.002, peak: peak * 0.4, dest, send });
}

// ------------------------------------------------------------------------------------------------
// SFX
// ------------------------------------------------------------------------------------------------
const run = (fn) => safe((...args) => { const a = ac(); if (!a || !graph) return; fn(a, a.currentTime + 0.005, ...args); });

// wood click-clack: bandpassed noise tick + short pitched knock + low body. v = speed 0..2, pitch varies per call
const dieClack = (a, t, v = 1, vol = 1) => {
  const p = rnd(0.85, 1.25); const pk = Math.min(2, 0.6 + v * 0.8) * vol;
  noise(a, t, { dur: 0.035, peak: 0.22 * pk, type: 'bandpass', f: 2400 * p, q: 3, send: 0.1 });
  osc(a, t, { type: 'triangle', f: 900 * p, to: 420 * p, dur: 0.05, peak: 0.1 * pk, att: 0.001 });
  osc(a, t, { type: 'sine', f: 190 * p, to: 110 * p, dur: 0.09, peak: 0.16 * pk, att: 0.001 });
  noise(a, t + 0.006, { dur: 0.05, peak: 0.07 * pk, type: 'lowpass', f: 900, q: 0.5 });
};
const chimeNote = (a, t, f, peak = 0.08, dur = 0.5) => { osc(a, t, { f, dur, peak, att: 0.004, send: 0.5 }); osc(a, t, { f: f * 2.01, dur: dur * 0.6, peak: peak * 0.35, att: 0.003, send: 0.5 }); };

export const sfx = {
  // ---- UI
  click: run((a, t) => { osc(a, t, { type: 'triangle', f: 520, to: 760, dur: 0.05, peak: 0.16 }); noise(a, t, { dur: 0.015, peak: 0.05, type: 'highpass', f: 4000 }); }),
  select: run((a, t) => { osc(a, t, { type: 'triangle', f: 700, dur: 0.05, peak: 0.14 }); osc(a, t + 0.03, { type: 'sine', f: 1050, dur: 0.07, peak: 0.08, send: 0.2 }); }),
  uiOpen: run((a, t) => { noise(a, t, { dur: 0.16, peak: 0.14, type: 'bandpass', f: 600, to: 2600, q: 1.2 }); osc(a, t, { type: 'sine', f: 330, to: 560, dur: 0.14, peak: 0.12, send: 0.3 }); }),
  uiClose: run((a, t) => { noise(a, t, { dur: 0.13, peak: 0.12, type: 'bandpass', f: 2400, to: 500, q: 1.2 }); osc(a, t, { type: 'sine', f: 520, to: 280, dur: 0.12, peak: 0.1, send: 0.3 }); }),
  card: run((a, t) => { // paper swish then a bright chime
    noise(a, t, { dur: 0.12, peak: 0.09, type: 'bandpass', f: 3000, to: 1400, q: 0.8 }); chimeNote(a, t + 0.06, 784, 0.07, 0.45); chimeNote(a, t + 0.13, 1175, 0.06, 0.6);
  }),
  error: run((a, t) => { osc(a, t, { type: 'square', f: 150, to: 110, dur: 0.16, peak: 0.07, filt: { type: 'lowpass', f: 700 } }); osc(a, t + 0.09, { type: 'square', f: 120, to: 90, dur: 0.18, peak: 0.07, filt: { type: 'lowpass', f: 600 } }); }),
  lockIn: run((a, t) => { // heavy latch: low thunk, steel click, rising confirm
    osc(a, t, { f: 120, to: 48, dur: 0.22, peak: 0.28, att: 0.002 }); noise(a, t, { dur: 0.05, peak: 0.16, type: 'bandpass', f: 3200, q: 2, send: 0.15 });
    metal(a, t + 0.03, { f: 800, dur: 0.35, peak: 0.07 }); osc(a, t + 0.12, { type: 'triangle', f: 440, to: 880, dur: 0.18, peak: 0.07, send: 0.4 });
  }),
  lock: run((a, t) => { osc(a, t, { type: 'sawtooth', f: 180, to: 80, dur: 0.2, peak: 0.1, filt: { type: 'lowpass', f: 900 } }); noise(a, t, { dur: 0.1, peak: 0.1, type: 'bandpass', f: 700, q: 0.8 }); }),

  // ---- dice (wood tray)
  dieHit: run((a, t, v = 1) => dieClack(a, t, v)),
  dieSettle: run((a, t) => { dieClack(a, t, 0.5, 0.9); dieClack(a, t + 0.045, 0.3, 0.6); osc(a, t, { f: 140, to: 90, dur: 0.14, peak: 0.1 }); }),
  diceRoll: run((a, t, n = 9) => { // a handful of dice tumbling: accelerated clacks that thin out + wooden rumble + tail
    noise(a, t, { dur: 0.55 + n * 0.02, peak: 0.07, type: 'bandpass', f: 380, to: 220, q: 0.7, att: 0.05, send: 0.1 });
    let at = 0;
    for (let i = 0; i < n * 3; i++) {
      const k = i / (n * 3); at += rnd(0.012, 0.03) * (1 + k * 3.2);
      dieClack(a, t + at, 1.3 - k * 0.9, 0.55 + (1 - k) * 0.5);
      if (Math.random() < 0.35) dieClack(a, t + at + rnd(0.008, 0.02), 1 - k, 0.4);
    }
  }),
  roll: run((a, t) => sfx.diceRoll(5)),
  settle: run((a, t, i = 0) => { dieClack(a, t, 0.6, 0.8); osc(a, t, { f: 300 + i * 25, to: 180, dur: 0.06, peak: 0.03, type: 'triangle' }); }),

  // ---- combat
  slash: run((a, t) => { // air whoosh with a rising metallic sheen
    noise(a, t, { dur: 0.2, peak: 0.2, type: 'bandpass', f: 1200, to: 6500, q: 1.1, att: 0.04, send: 0.1 });
    osc(a, t + 0.03, { type: 'sawtooth', f: 1600, to: 4200, dur: 0.14, peak: 0.025, filt: { type: 'highpass', f: 1500 } });
    metal(a, t + 0.05, { f: 1900, dur: 0.25, peak: 0.03, partials: 3 });
  }),
  crunch: run((a, t, power = 1) => { // flesh/bone: sub thud + low body noise + a bright crack
    const p = Math.max(0.4, Math.min(2.2, power));
    osc(a, t, { f: 130, to: 42, dur: 0.22 * p, peak: 0.32 * Math.min(1.3, p), att: 0.002, send: 0.08 });
    noise(a, t, { dur: 0.16 * p, peak: 0.26 * Math.min(1.3, p), type: 'lowpass', f: 1800, to: 300, q: 0.7, send: 0.15 });
    noise(a, t, { dur: 0.04, peak: 0.2, type: 'highpass', f: 3500 });
    noise(a, t + 0.012, { dur: 0.09, peak: 0.1, type: 'bandpass', f: 1200, to: 500, q: 2 });
  }),
  hit: run((a, t) => sfx.crunch(1)),
  hurt: run((a, t) => { // player pain: heavy crunch + low body groan + vignette-matching sub swell
    sfx.crunch(1.2); voice(a, t + 0.02, { f: 150, to: 100, dur: 0.38, peak: 0.12, formants: [500, 1100], vib: 6, rough: 28, breath: 0.2 });
  }),
  shieldHit: run((a, t) => { // boom of a struck shield: wood-metal thump with a short ringing partial
    osc(a, t, { f: 150, to: 62, dur: 0.2, peak: 0.3, att: 0.002 }); noise(a, t, { dur: 0.06, peak: 0.18, type: 'bandpass', f: 1500, q: 1.5, send: 0.1 });
    metal(a, t + 0.004, { f: 520, dur: 0.5, peak: 0.11, partials: 3 }); osc(a, t, { type: 'sine', f: 1040, to: 980, dur: 0.3, peak: 0.04, send: 0.4 });
  }),
  block: run((a, t) => sfx.shieldHit()),
  pierce: run((a, t) => { // glass-like lance: rising shimmer + hiss + a ping at the tip
    osc(a, t, { type: 'sawtooth', f: 420, to: 2600, dur: 0.16, peak: 0.07, att: 0.01, filt: { type: 'bandpass', f: 1800, q: 2 }, send: 0.3 });
    noise(a, t, { dur: 0.2, peak: 0.12, type: 'highpass', f: 3500, att: 0.03, send: 0.2 }); metal(a, t + 0.12, { f: 2100, dur: 0.5, peak: 0.07, partials: 3 });
    osc(a, t + 0.12, { f: 120, to: 55, dur: 0.18, peak: 0.12 });
  }),
  fireball: run((a, t) => { // fire whoosh: low-passed noise swelling + crackle
    noise(a, t, { dur: 0.7, peak: 0.2, type: 'lowpass', f: 400, to: 2400, q: 0.8, att: 0.25, send: 0.2, buf: 'brown' });
    for (let i = 0; i < 12; i++) noise(a, t + rnd(0, 0.6), { dur: 0.02, peak: 0.08, type: 'highpass', f: 3000 + rnd(0, 3000) });
    osc(a, t, { type: 'sawtooth', f: 90, to: 260, dur: 0.5, peak: 0.05, filt: { type: 'lowpass', f: 600 } });
  }),
  explode: run((a, t) => { // sub boom + debris rumble + a sharp crack up front
    osc(a, t, { f: 110, to: 26, dur: 0.9, peak: 0.5, att: 0.002, send: 0.2 });
    noise(a, t, { dur: 1.1, peak: 0.34, type: 'lowpass', f: 1800, to: 120, q: 0.6, send: 0.35, buf: 'brown' });
    noise(a, t, { dur: 0.1, peak: 0.3, type: 'highpass', f: 1800 }); noise(a, t + 0.15, { dur: 0.7, peak: 0.07, type: 'bandpass', f: 900, to: 300, q: 0.8, send: 0.3 });
    for (let i = 0; i < 8; i++) noise(a, t + 0.15 + rnd(0, 0.7), { dur: 0.03, peak: 0.06, type: 'bandpass', f: rnd(400, 2000), q: 3 });
  }),
  magic: run((a, t) => { // shimmer: stacked detuned sines gliding up with sparkle
    for (const [f, d] of [[880, 0], [1320, 8], [1760, -6]]) osc(a, t, { f, to: f * 1.5, dur: 0.22, peak: 0.04, att: 0.01, detune: d, send: 0.5 });
    for (let i = 0; i < 4; i++) osc(a, t + i * 0.04, { f: 2200 * Math.pow(1.26, i), dur: 0.2, peak: 0.025, att: 0.002, send: 0.6 });
  }),
  heal: run((a, t) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chimeNote(a, t + i * 0.07, f, 0.07, 0.7)); noise(a, t, { dur: 0.5, peak: 0.02, type: 'highpass', f: 6000, att: 0.2, send: 0.4 }); }),
  synergy: run((a, t) => { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => { chimeNote(a, t + i * 0.06, f, 0.07, 0.6); osc(a, t + i * 0.06, { type: 'triangle', f: f / 2, dur: 0.3, peak: 0.04 }); }); }),
  coin: run((a, t) => { const p = rnd(0.94, 1.1); metal(a, t, { f: 1318 * p, dur: 0.35, peak: 0.05, partials: 2, decay: 1.4 }); osc(a, t + 0.05, { type: 'sine', f: 1976 * p, dur: 0.3, peak: 0.05, send: 0.4 }); }),
  coins: run((a, t) => { for (let i = 0; i < 9; i++) { const tt = t + i * rnd(0.04, 0.09) + (i > 5 ? 0.1 : 0); const p = rnd(0.85, 1.25); metal(a, tt, { f: 1500 * p, dur: 0.3, peak: 0.045, partials: 2, decay: 1.5, send: 0.3 }); osc(a, tt + 0.02, { f: 2200 * p, dur: 0.18, peak: 0.025, send: 0.4 }); } }),
  step: run((a, t, big = false) => {
    if (!big) { osc(a, t, { f: 90, to: 50, dur: 0.12, peak: 0.12 }); noise(a, t, { dur: 0.08, peak: 0.08, type: 'lowpass', f: 700 }); }
    else { osc(a, t, { f: 70, to: 28, dur: 0.5, peak: 0.45, send: 0.15 }); noise(a, t, { dur: 0.5, peak: 0.22, type: 'lowpass', f: 500, to: 90, buf: 'brown', send: 0.2 }); noise(a, t, { dur: 0.05, peak: 0.12, type: 'highpass', f: 2500 }); }
  }),
  deathEmber: run((a, t) => { // soft ember crackle and a falling airy tone
    for (let i = 0; i < 14; i++) noise(a, t + rnd(0, 0.9), { dur: 0.02, peak: 0.06, type: 'bandpass', f: rnd(1500, 5000), q: 2 });
    osc(a, t, { type: 'sine', f: 520, to: 180, dur: 0.9, peak: 0.05, att: 0.08, send: 0.6 }); noise(a, t, { dur: 0.9, peak: 0.07, type: 'bandpass', f: 900, to: 300, q: 0.6, att: 0.1, send: 0.4 });
  }),
  hex: run((a, t) => { // dark detuned descent + chain rattle
    for (const d of [-25, 0, 25]) osc(a, t, { type: 'sawtooth', f: 330, to: 110, dur: 0.7, peak: 0.05, detune: d, filt: { type: 'lowpass', f: 1400, to: 300, q: 2 }, send: 0.4 });
    for (let i = 0; i < 7; i++) metal(a, t + 0.08 + i * rnd(0.04, 0.07), { f: rnd(900, 1500), dur: 0.14, peak: 0.04, partials: 2, send: 0.15 });
  }),
  summon: run((a, t) => { // swirling rift: rising noise swell + choir-ish low voices + whoosh
    noise(a, t, { dur: 1.2, peak: 0.16, type: 'bandpass', f: 300, to: 2200, q: 1.2, att: 0.6, send: 0.4 });
    voice(a, t, { f: 82, to: 110, dur: 1.2, peak: 0.1, formants: [500, 900], rough: 0, breath: 0.1, att: 0.5, vibAmt: 0.01, send: 0.5 });
    voice(a, t + 0.1, { f: 123, to: 165, dur: 1.1, peak: 0.07, formants: [400, 1100], rough: 0, breath: 0.1, att: 0.5, vibAmt: 0.01, send: 0.5 });
    osc(a, t + 0.9, { f: 80, to: 30, dur: 0.5, peak: 0.25, send: 0.2 });
  }),
  windup: run((a, t) => { // rising dread: saw sweep through an opening filter, tremolo, sub
    osc(a, t, { type: 'sawtooth', f: 55, to: 190, dur: 1.1, peak: 0.1, att: 0.5, filt: { type: 'lowpass', f: 160, to: 1400, q: 3 }, send: 0.3 });
    osc(a, t, { type: 'sawtooth', f: 58, to: 197, dur: 1.1, peak: 0.07, att: 0.5, detune: 14, filt: { type: 'lowpass', f: 160, to: 1000, q: 2 } });
    noise(a, t, { dur: 1.1, peak: 0.07, type: 'bandpass', f: 200, to: 1800, q: 2, att: 0.7, send: 0.2 });
    osc(a, t, { f: 40, to: 50, dur: 1.1, peak: 0.16, att: 0.4 });
  }),
  slam: run((a, t) => { // huge: sub boom, impact crack, falling debris rumble
    osc(a, t, { f: 85, to: 24, dur: 1.1, peak: 0.55, att: 0.002, send: 0.25 });
    noise(a, t, { dur: 0.08, peak: 0.35, type: 'bandpass', f: 1400, q: 1 }); noise(a, t, { dur: 1.5, peak: 0.3, type: 'lowpass', f: 900, to: 70, buf: 'brown', send: 0.4, q: 0.6 });
    for (let i = 0; i < 10; i++) noise(a, t + 0.1 + rnd(0, 1), { dur: 0.04, peak: 0.07, type: 'bandpass', f: rnd(300, 1500), q: 3 });
  }),
  rage: run((a, t) => { sfx.roar(); osc(a, t + 0.05, { f: 60, to: 30, dur: 0.8, peak: 0.3, send: 0.2 }); noise(a, t, { dur: 0.8, peak: 0.12, type: 'lowpass', f: 1200, to: 150, buf: 'brown' }); }),

  // ---- monsters (formant voices)
  growl: run((a, t, kind = 'goblin') => {
    const K = {
      goblin: { f: 210, to: 150, dur: 0.45, formants: [650, 1800], rough: 55, peak: 0.16 },
      wolf: { f: 120, to: 85, dur: 0.7, formants: [420, 1100], rough: 38, peak: 0.2, breath: 0.5 },
      cultist: { f: 140, to: 120, dur: 0.6, formants: [500, 1500], rough: 20, peak: 0.12, vibAmt: 0.04 },
      ogre: { f: 70, to: 52, dur: 0.9, formants: [300, 800], rough: 26, peak: 0.26 },
      skeleton: { f: 180, to: 130, dur: 0.4, formants: [900, 2400], rough: 70, peak: 0.1, breath: 0.6 },
    }[kind] || { f: 150, to: 100, dur: 0.6, formants: [500, 1400], rough: 35, peak: 0.16 };
    voice(a, t, { ...K, send: 0.25 });
  }),
  roar: run((a, t) => { // big beast: low saw, formants sweeping open then closed, noise breath, long tail
    voice(a, t, { f: 78, to: 120, f2: 60, dur: 1.4, peak: 0.28, formants: [350, 900], fto: [800, 1900], rough: 32, breath: 0.45, att: 0.08, send: 0.4, q: 3 });
    voice(a, t, { f: 81, to: 124, f2: 62, dur: 1.4, peak: 0.12, formants: [350, 900], fto: [800, 1900], rough: 0, breath: 0, att: 0.08, send: 0.3, q: 3 });
    noise(a, t, { dur: 1.2, peak: 0.08, type: 'bandpass', f: 600, to: 1800, q: 1, att: 0.1, send: 0.3 });
  }),
  howl: run((a, t) => { // wolf howl: pure-ish tone gliding up then down with vibrato + breath
    voice(a, t, { f: 300, to: 560, f2: 380, dur: 1.5, peak: 0.16, formants: [700, 1300], fto: [500, 1100], vib: 5.5, vibAmt: 0.03, rough: 0, breath: 0.12, att: 0.25, type: 'sawtooth', send: 0.55, q: 7 });
    voice(a, t + 0.02, { f: 302, to: 566, f2: 384, dur: 1.5, peak: 0.07, formants: [900], vib: 5.8, vibAmt: 0.03, rough: 0, breath: 0, att: 0.25, type: 'sine', send: 0.5, q: 2 });
  }),
  screech: run((a, t) => { voice(a, t, { f: 900, to: 1900, f2: 1300, dur: 0.5, peak: 0.1, formants: [1500, 3200], vib: 14, vibAmt: 0.05, rough: 80, breath: 0.3, att: 0.02, send: 0.3 }); }),
  squeal: run((a, t) => { voice(a, t, { f: 700, to: 1400, f2: 900, dur: 0.38, peak: 0.1, formants: [900, 2600], vib: 11, vibAmt: 0.06, rough: 60, breath: 0.15, att: 0.015, send: 0.2 }); voice(a, t + 0.17, { f: 800, to: 1500, f2: 800, dur: 0.3, peak: 0.07, formants: [1000, 2800], vib: 12, vibAmt: 0.05, rough: 60, att: 0.01, send: 0.2 }); }),
  chant: run((a, t) => { // cultist: three low voices holding a droning minor cluster with a vowel sweep
    [[110, 0], [130.8, 0.05], [164.8, 0.1]].forEach(([f, d]) => voice(a, t + d, { f, dur: 1.6, peak: 0.07, formants: [500, 900], fto: [350, 1200], vib: 5, vibAmt: 0.012, rough: 0, breath: 0.12, att: 0.4, type: 'sawtooth', send: 0.6, q: 6 }));
  }),

  // ---- fanfares
  win: run((a, t) => { // short warm brass: C major arpeggio resolving to a held chord
    [[261.6, 0], [329.6, 0.14], [392, 0.28], [523.25, 0.42]].forEach(([f, d]) => brass(a, t + d, { f, dur: 0.35 }));
    [261.6, 392, 523.25, 659.25].forEach((f) => brass(a, t + 0.6, { f, dur: 1.3, peak: 0.055, att: 0.08 })); osc(a, t + 0.6, { f: 65.4, dur: 1.3, peak: 0.12, att: 0.05 });
    chimeNote(a, t + 0.7, 1318.5, 0.04, 1.2);
  }),
  level: run((a, t) => { [392, 493.9, 587.3, 784].forEach((f, i) => brass(a, t + i * 0.1, { f, dur: 0.3, peak: 0.06 })); [392, 587.3, 784, 987.8].forEach((f) => brass(a, t + 0.42, { f, dur: 1.0, peak: 0.05, att: 0.06 })); [1568, 2093, 2637].forEach((f, i) => chimeNote(a, t + 0.5 + i * 0.08, f, 0.035, 0.8)); }),
  lose: run((a, t) => { // defeat sting: falling minor line, tolling bell, sub
    [[220, 0], [196, 0.28], [164.8, 0.56], [110, 0.9]].forEach(([f, d]) => { osc(a, t + d, { type: 'sawtooth', f, dur: 0.9, att: 0.08, peak: 0.07, filt: { type: 'lowpass', f: 900, to: 200 }, send: 0.5 }); osc(a, t + d, { type: 'sawtooth', f: f * 1.005, dur: 0.9, att: 0.08, peak: 0.05, filt: { type: 'lowpass', f: 700, to: 180 } }); });
    metal(a, t + 0.9, { f: 130, dur: 2, peak: 0.12, partials: 4, send: 0.6, decay: 0.6 }); osc(a, t + 0.9, { f: 55, to: 36, dur: 1.8, peak: 0.28, att: 0.01 });
  }),
};
// `card` aliases the better named one; legacy exports kept
export const isMuted = () => muted;
export function setMuted(m) {
  muted = !!m; try { localStorage.setItem('questdice.mute', muted ? '1' : '0'); } catch { /* ignore */ }
  if (muted) { music.stop(); try { ctx?.suspend?.(); } catch { /* ignore */ } } else { try { ctx?.resume?.(); } catch { /* ignore */ } }
}
export function setSfxVolume(v) { sfxVol = v; if (graph) graph.sfxBus.gain.value = v; }

// ------------------------------------------------------------------------------------------------
// MUSIC: generative score
// ------------------------------------------------------------------------------------------------
const SCALES = { dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10] };
const MOODS = {
  title: { root: 50, scale: 'dorian', bpm: 56, drums: 0, pad: 0.8, melody: 0.5, wind: 0.5, crackle: 0.2, lp: 500, voice: 'flute', chords: [[0, 7, 12], [-2, 5, 10], [3, 10, 15], [0, 7, 12]] },
  road: { root: 50, scale: 'dorian', bpm: 66, drums: 0.12, pad: 0.6, melody: 0.7, wind: 0.8, crackle: 0.05, lp: 650, voice: 'pluck', chords: [[0, 7, 12], [5, 12, 17], [-2, 5, 10], [0, 7, 12]] },
  battle: { root: 40, scale: 'phrygian', bpm: 104, drums: 0.9, pad: 0.7, melody: 0.55, wind: 0.2, crackle: 0.15, lp: 900, voice: 'pluck', chords: [[0, 7, 12], [1, 8, 13], [0, 7, 12], [-2, 5, 10]] },
  boss: { root: 38, scale: 'phrygian', bpm: 118, drums: 1.4, pad: 0.95, melody: 0.7, wind: 0.1, crackle: 0.3, lp: 1100, voice: 'pluck', chords: [[0, 7, 12], [1, 8, 13], [-4, 3, 8], [0, 6, 12]] },
  victory: { root: 48, scale: 'mixolydian', bpm: 76, drums: 0.15, pad: 0.7, melody: 0.9, wind: 0.1, crackle: 0.1, lp: 1200, voice: 'flute', chords: [[0, 7, 16], [5, 12, 21], [7, 14, 23], [0, 7, 16]] },
  camp: { root: 45, scale: 'dorian', bpm: 52, drums: 0, pad: 0.45, melody: 0.4, wind: 0.35, crackle: 1, lp: 420, voice: 'flute', chords: [[0, 7, 12], [3, 10, 15], [-2, 5, 10], [0, 7, 12]] },
};
const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);
const M = { on: false, mood: 'title', timer: 0, next: 0, step: 0, bar: 0, nodes: null, vol: 1, intensity: 1 };

function musicNodes(a) {
  const out = a.createGain(); out.gain.value = 0; out.connect(graph.musicBus);
  const send = a.createGain(); send.gain.value = 0.5; out.connect(send); send.connect(graph.mrvIn);
  // drone pad: 3 pairs of detuned saws through a slowly breathing lowpass
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2.5;
  const padG = a.createGain(); padG.gain.value = 0; lp.connect(padG); padG.connect(out);
  const lfo = a.createOscillator(); lfo.frequency.value = 0.07; const lfoG = a.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  const voices = [];
  for (let i = 0; i < 6; i++) { const o = a.createOscillator(); o.type = 'sawtooth'; o.detune.value = (i % 2 ? 1 : -1) * (6 + i * 2); const g = a.createGain(); g.gain.value = 0.05; o.connect(g); g.connect(lp); o.frequency.value = 80; o.start(); voices.push(o); }
  // sub drone
  const sub = a.createOscillator(); sub.type = 'sine'; sub.frequency.value = 40; const subG = a.createGain(); subG.gain.value = 0.12; sub.connect(subG); subG.connect(padG); sub.start();
  // wind bed
  const ws = a.createBufferSource(); ws.buffer = graph.brown; ws.loop = true; const wf = a.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.8;
  const wg = a.createGain(); wg.gain.value = 0; ws.connect(wf); wf.connect(wg); wg.connect(out); ws.start();
  const wl = a.createOscillator(); wl.frequency.value = 0.11; const wlg = a.createGain(); wlg.gain.value = 300; wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
  const drumBus = a.createGain(); drumBus.gain.value = 1; drumBus.connect(out);
  return { out, lp, padG, voices, sub, wg, wf, lfo, ws, wl, drumBus };
}
function drum(a, t, { f = 90, vol = 0.3, len = 0.35 }) { // frame drum: pitch-dropped sine + skin noise
  osc(a, t, { f, to: f * 0.45, dur: len, peak: vol, att: 0.002, dest: M.nodes.drumBus, send: 0.15 });
  noise(a, t, { dur: 0.09, peak: vol * 0.5, type: 'bandpass', f: 220, q: 1.2, dest: M.nodes.drumBus });
  noise(a, t, { dur: 0.03, peak: vol * 0.25, type: 'highpass', f: 2200, dest: M.nodes.drumBus });
}
function musicTick() {
  const a = ctx; if (!a || !M.on || !M.nodes) return;
  const P = MOODS[M.mood]; const spb = 60 / P.bpm; const step = spb / 2; // eighth notes
  const scale = SCALES[P.scale];
  while (M.next < a.currentTime + 0.6) {
    const t = M.next; const s = M.step; const bar = Math.floor(s / 8); const inBar = s % 8; const chord = P.chords[bar % P.chords.length];
    if (inBar === 0) { // chord change: glide the drone voices
      M.nodes.voices.forEach((o, i) => o.frequency.setTargetAtTime(m2f(P.root + chord[i % 3] + (i < 2 ? 0 : 12)), t, 1.2));
      M.nodes.sub.frequency.setTargetAtTime(m2f(P.root - 12 + chord[0]), t, 1.0);
    }
    // drums: low pulse on 1 and 3, syncopated ghost hits scale with intensity
    if (P.drums > 0) {
      const I = P.drums * (0.6 + 0.4 * M.intensity);
      if (inBar === 0) drum(a, t, { f: 95, vol: 0.34 * I });
      if (inBar === 4) drum(a, t, { f: 80, vol: 0.26 * I });
      if (P.drums > 0.6 && (inBar === 3 || inBar === 7) && Math.random() < 0.65) drum(a, t, { f: 120, vol: 0.14 * I, len: 0.2 });
      if (P.drums > 1.2 && inBar % 2 === 1) drum(a, t, { f: 140, vol: 0.08 * I, len: 0.12 });
    }
    // melody: sparse modal phrases (never on every beat); steps follow a gentle random walk
    if (Math.random() < 0.28 * P.melody * (inBar % 2 === 0 ? 1.2 : 0.7)) {
      M.deg = Math.max(0, Math.min(13, (M.deg ?? 4) + Math.round(rnd(-2.2, 2.2))));
      const oct = Math.floor(M.deg / 7); const note = P.root + 12 + scale[M.deg % 7] + oct * 12;
      const dest = M.nodes.out; const f = m2f(note);
      if (P.voice === 'flute') { // breathy sine + noise
        osc(a, t, { f, dur: spb * 1.6, att: 0.12, peak: 0.07 * P.melody, dest, send: 0.5, filt: { type: 'lowpass', f: 3000 } });
        osc(a, t, { f: f * 2, dur: spb * 1.2, att: 0.15, peak: 0.012, dest, send: 0.5 });
        noise(a, t, { dur: spb * 1.2, peak: 0.02, type: 'bandpass', f: f * 2, q: 4, att: 0.1, dest });
      } else pluck(a, t, { f, dur: spb * 1.8, peak: 0.1 * P.melody, dest });
    }
    // ember crackle
    if (Math.random() < 0.5 * P.crackle) noise(a, t + rnd(0, step), { dur: 0.02, peak: 0.05, type: 'bandpass', f: rnd(1500, 6000), q: 2, dest: M.nodes.out });
    if (Math.random() < 0.25 * P.crackle) noise(a, t + rnd(0, step), { dur: 0.012, peak: 0.07, type: 'highpass', f: 4500, dest: M.nodes.out });
    M.next += step; M.step++;
  }
}
function applyMood(a, first) {
  const P = MOODS[M.mood]; const n = M.nodes; const t = a.currentTime; const tc = first ? 0.3 : 1.6;
  n.padG.gain.setTargetAtTime(0.5 * P.pad, t, tc); n.lp.frequency.setTargetAtTime(P.lp, t, tc);
  n.wg.gain.setTargetAtTime(0.3 * P.wind, t, tc); n.wf.frequency.setTargetAtTime(300 + 400 * P.wind, t, tc);
  M.deg = 4;
}
export const music = {
  start: safe((mood = 'title') => {
    const a = ac(); if (!a || !graph) return;
    if (!M.nodes) M.nodes = musicNodes(a);
    M.mood = MOODS[mood] ? mood : 'title';
    if (!M.on) { M.on = true; M.next = a.currentTime + 0.1; M.step = 0; }
    M.nodes.out.gain.cancelScheduledValues(a.currentTime); M.nodes.out.gain.setTargetAtTime(M.vol, a.currentTime, 0.8);
    applyMood(a, true);
    clearInterval(M.timer); M.timer = setInterval(safe(musicTick), 120);
  }),
  setMood: safe((mood) => {
    if (!MOODS[mood]) return; M.mood = mood;
    const a = ctx; if (!a || !M.nodes) { return; }
    if (!M.on) return music.start(mood);
    applyMood(a, false); M.step = Math.ceil(M.step / 8) * 8; // new mood starts on a bar line
  }),
  setIntensity: safe((v) => { M.intensity = Math.max(0, Math.min(1.5, v)); }),
  stop: safe(() => {
    clearInterval(M.timer); M.timer = 0; M.on = false;
    if (ctx && M.nodes) { const n = M.nodes; n.out.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const dead = n; M.nodes = null; setTimeout(() => { try { dead.voices.forEach((o) => o.stop()); dead.sub.stop(); dead.lfo.stop(); dead.ws.stop(); dead.wl.stop(); dead.out.disconnect(); } catch { /* ignore */ } }, 2500); }
  }),
  setVolume: safe((v) => { musicVol = Math.max(0, Math.min(1, v)); if (graph) graph.musicBus.gain.value = musicVol; }),
  get mood() { return M.mood; },
  get playing() { return M.on; },
};

// ------------------------------------------------------------------------------------------------
// offline rendering for tests: renderOffline('crunch', [1.2], 1.5) -> { peak, rms, nan, silentAfter }
// ------------------------------------------------------------------------------------------------
export async function renderOffline(name, args = [], seconds = 2, sampleRate = 44100) {
  const O = (typeof OfflineAudioContext !== 'undefined') ? OfflineAudioContext : window.webkitOfflineAudioContext;
  const saveCtx = ctx; const saveGraph = graph;
  const oc = new O(2, Math.floor(seconds * sampleRate), sampleRate);
  ctx = oc; graph = buildGraph(oc); offline = true;
  try {
    if (name.startsWith('music:')) { const m = name.slice(6); M.nodes = musicNodes(oc); M.mood = m; M.on = true; M.next = 0; M.step = 0; M.nodes.out.gain.value = 1; applyMood(oc, true); musicTickOffline(oc, seconds); } else sfx[name](...args);
    const buf = await oc.startRendering();
    let peak = 0; let sum = 0; let cnt = 0; let nan = 0; let last = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== v || !isFinite(v)) { nan++; continue; } const av = Math.abs(v); if (av > peak) peak = av; sum += v * v; cnt++; if (av > 0.003 && i > last) last = i; } }
    return { name, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / cnt).toFixed(4), nan, soundSeconds: +(last / sampleRate).toFixed(2), seconds };
  } finally { ctx = saveCtx; graph = saveGraph; offline = false; M.on = false; M.nodes = null; }
}
function musicTickOffline(a, seconds) { // schedule the whole offline timeline in one go
  Object.defineProperty(a, 'currentTime', { get: () => seconds - 0.6, configurable: true });
  M.next = 0; M.step = 0; musicTick();
}
