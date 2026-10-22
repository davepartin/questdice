// Weapon lab (Dave, Oct 2026: "the blanks are what make the weapons different... a d8 with 6 7 8 and blanks on 4 5, one that is 1 3 5 7,
// one that is 2 4 6 8"). Honest dice: a face shows its own number (face 6 is a 6) or is blank. A weapon is a PATTERN: which numbers are
// live and which of those are blue. This rolls whole boards for each act, with no rerolls (so every rate is a floor; rerolls lift them all
// alike), and compares the patterns:
//   num    the weapon's number a roll        blank  how often it shows nothing
//   red / blue  attack / block from that side (weapon + the hand's number, as the engine adds them)
//   tri    how often this weapon is part of a triple (top row with the head, or its side column with its hand and talent)
//   s6 s7 s8   how often the whole board makes a straight of at least 6 / 7 / 8 (blanks never count)
// It changes no rule and does not use the engine's weapons; the triple and straight rules are the engine's (evaluate in js/engine.js).
//   node tools/weaponlab.mjs [rolls=40000]
const ROLLS = Number(process.argv[2] || 40000);
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const roll = (n) => 1 + Math.floor(rnd() * n);

// ---- patterns: for a die of N sides, which faces are live (red r / blue b); everything else is blank
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const P = {
  'Staff · full (odd red, even blue)': (N) => range(1, N).map((v) => [v, v % 2 ? 'r' : 'b']),
  'Dagger · low run': (N) => range(1, Math.ceil(N / 2) + 1).map((v) => [v, v === 2 ? 'b' : 'r']),
  'Sword · evens': (N) => [...range(1, N).filter((v) => v % 2 === 0).map((v) => [v, 'r']), [N >= 6 ? 3 : 1, 'b']],
  'Axe · odds': (N) => [...range(1, N).filter((v) => v % 2).map((v) => [v, 'r']), [2, 'b']],
  'Mace · high + low (Dave)': (N) => { const lo = Math.max(1, Math.floor(N / 3)); const hi = Math.ceil(N * 3 / 8); return [...range(1, lo).map((v) => [v, v === 1 ? 'b' : 'r']), ...range(N - hi + 1, N).map((v) => [v, 'r'])]; },
  'Spear · top half': (N) => [[1, 'b'], ...range(Math.floor(N / 2) + 1, N).map((v) => [v, 'r'])],
  'Shield · evens (blue)': (N) => [...range(1, N).filter((v) => v % 2 === 0).map((v) => [v, 'b']), [N >= 6 ? 3 : 1, 'r']],
  'Tower · high + low (blue)': (N) => { const lo = Math.max(1, Math.floor(N / 3)); const hi = Math.ceil(N * 3 / 8); return [...range(1, lo).map((v) => [v, v === 1 ? 'r' : 'b']), ...range(N - hi + 1, N).map((v) => [v, 'b'])]; },
};
const die = (pat, N) => { const live = new Map(P[pat](N).map(([v, c]) => [v, c])); return range(1, N).map((v) => (live.has(v) ? { v, c: live.get(v) } : { v: 0 })); };

// ---- the board by act (sizes from the campaign: what a hero usually holds there)
const ACTS = {
  'Act I': { hand: 6, head: 4, heart: 6, feet: 4, talent: 4, bonus: 10 },
  'Act II': { hand: 8, head: 6, heart: 6, feet: 6, talent: 6, bonus: 15 },
  'Act III': { hand: 10, head: 8, heart: 6, feet: 6, talent: 8, bonus: 20 },
};
const TALENT_FACES = { 4: 1, 6: 3, 8: 5, 10: 7 }; // talent dice: faces 1 and 3 blank, 2 doubles the hand, the top faces are numbers
const talentNum = (n) => { const f = roll(n); return f <= 3 ? 0 : f; }; // (the 2x face carries no number for triples or straights)
const longest = (nums) => { const s = new Set(nums.filter((v) => v > 0)); let best = 0; for (const v of s) if (!s.has(v - 1)) { let k = v; while (s.has(k + 1)) k++; best = Math.max(best, k - v + 1); } return best; };

function study(act, left, right) {
  const A = ACTS[act]; const L = die(left, A.hand); const R = die(right, A.hand);
  const t = { num: 0, blank: 0, red: 0, blue: 0, tri: 0, s6: 0, s7: 0, s8: 0 };
  for (let i = 0; i < ROLLS; i++) {
    const wl = L[roll(A.hand) - 1]; const wr = R[roll(A.hand) - 1];
    const head = roll(A.head), lh = roll(A.hand), rh = roll(A.hand), heart = roll(A.heart), feet = roll(A.feet), lt = talentNum(A.talent), rt = talentNum(A.talent);
    t.num += wl.v; t.blank += wl.v ? 0 : 1;
    if (wl.c === 'r') t.red += wl.v + lh; else if (wl.c === 'b') t.blue += wl.v + lh; else t.red += lh; // a blank still adds the hand (as the engine does)
    if (wl.v && ((wl.v === head && head === wr.v) || (wl.v === lh && lh === lt))) t.tri++;
    const s = longest([wl.v, wr.v, head, lh, rh, heart, feet, lt, rt]);
    if (s >= 6) t.s6++; if (s >= 7) t.s7++; if (s >= 8) t.s8++;
  }
  const pct = (x) => `${(100 * x / ROLLS).toFixed(0)}%`.padStart(4); const avg = (x) => (x / ROLLS).toFixed(1).padStart(4);
  return `${left.padEnd(34)} ${A.hand ? `d${A.hand}`.padEnd(4) : ''} ${avg(t.num)}  ${pct(t.blank)}  ${avg(t.red)}  ${avg(t.blue)}  ${pct(t.tri)}   ${pct(t.s6)} ${pct(t.s7)} ${pct(t.s8)}`;
}
console.log(`Weapon lab · honest dice · ${ROLLS} boards a line · no rerolls. Same pattern in both hands unless it says so.`);
for (const act of Object.keys(ACTS)) {
  console.log(`\n${act} (hands d${ACTS[act].hand}, head d${ACTS[act].head}, feet d${ACTS[act].feet}, talents d${ACTS[act].talent}; a triple pays ${ACTS[act].bonus})`);
  console.log(`${'pattern'.padEnd(34)} size  num  blank  red  blue   tri    s6+  s7+  s8+`);
  for (const p of Object.keys(P)) console.log(study(act, p, p));
  const N = ACTS[act].hand;
  console.log(`  faces at d${N}: ${Object.keys(P).map((p) => `${p.split(' ·')[0]} ${die(p, N).map((f) => (f.v ? `${f.v}${f.c === 'b' ? 'b' : ''}` : '–')).join(' ')}`).join('  |  ')}`);
}
