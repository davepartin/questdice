// T19 v2 runner: one cell of the measurement per process (so cells can run in parallel), rows to a JSON file. Read-only; nothing in the game changes.
//   node tools/t19-run.mjs --kind solo|party --enc designed|return --arm unchanged|A|B|C [--n 2|4|6] [--comp same|clones|half|one] --fights 16 --out FILE
// solo:  newBattle/resolve, one hero per fight, every committed strong hero fixture, `fights` seeds each.
// party: newPartyBattle/resolveParty. comp: 'same' = n same-stage heroes of mixed classes from the strong fixtures (NOT equal strength);
//        'clones' = n identical clones of one strong hero (strength equal, m = n); 'half' = half strong, half end-of-Act-II;
//        'one' = one strong hero and fresh level-1 heroes. Hero choice and seeds are a fixed function of the fight index.
import fs from 'node:fs';
import { CLASSES, strongKeys, strongByClass, strongOf, midOf, freshOf, soloFight, tableFight, revision } from './t19-lib.mjs';
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, x, i, arr) => (x.startsWith('--') ? [...acc, [x.slice(2), arr[i + 1]]] : acc), []));
const kind = a.kind, enc = a.enc, arm = a.arm || 'unchanged', n = Number(a.n || 1), comp = a.comp || 'same', F = Number(a.fights || 16);
const rows = [];
if (kind === 'solo') {
  for (let i = 0; i < strongKeys.length; i++) for (let r = 0; r < F; r++) { const key = strongKeys[i]; const f = soloFight(strongOf(key), enc, arm, 21000 + i * 7 + r * 1009); rows.push({ fixtures: [key], seed: 21000 + i * 7 + r * 1009, ...f }); }
} else {
  for (let r = 0; r < F; r++) {
    const pick = []; const nStrong = comp === 'half' ? Math.ceil(n / 2) : comp === 'one' ? 1 : n;
    if (comp === 'clones') { const key = strongKeys[(r * 5 + 2) % strongKeys.length]; for (let i = 0; i < n; i++) pick.push({ g: 'S', key, hero: strongOf(key) }); }
    else for (let i = 0; i < n; i++) {
      const cls = CLASSES[(i + r) % CLASSES.length];
      if (i < nStrong) { const list = strongByClass[cls]; const key = list[(r + i) % list.length]; pick.push({ g: 'S', key, hero: strongOf(key) }); }
      else if (comp === 'half') { const m = midOf(cls, r + i); pick.push({ g: 'M', key: m.key, hero: m.hero }); }
      else { const m = freshOf(cls, r + i); pick.push({ g: 'F', key: m.key, hero: m.hero }); }
    }
    // one shared campaign (the strongest hero's), a unique name for every hero
    const camp = structuredClone(pick.find((p) => p.g === 'S').hero.campaign);
    const heroes = pick.map((p, i) => { p.hero.name = `${p.g}${i}-${p.hero.cls}`; p.hero.campaign = structuredClone(camp); return p.hero; });
    const seed = 31000 + r * 13 + n; const f = tableFight(heroes, enc, arm, seed);
    rows.push({ fixtures: pick.map((p) => p.key), groups: pick.map((p) => p.g), seed, ...f });
  }
}
fs.mkdirSync(new URL('.', 'file://' + a.out).pathname.replace(/\/[^/]*$/, ''), { recursive: true });
fs.writeFileSync(a.out, JSON.stringify({ header: { revision: revision(), kind, enc, arm, n, comp, fights: F, fixtures: ['docs/team/tasks/T19/fixtures/strong-step8.json', 'docs/team/tasks/T19/fixtures/mid-act2.json'], date: new Date().toISOString() }, rows }));
console.log(`${kind} ${enc} ${arm} n${n} ${comp}: ${rows.length} fights -> ${a.out}`);
