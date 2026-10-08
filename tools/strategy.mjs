// Strategy study: is it better to block with one hand and attack with the other, or go all attack?
// A bot hero plays the campaign to a few checkpoints; at each, the same hero fights the next quest many times with
// two loadouts (two attack weapons / a sword and a shield) and three play styles (how it values block when rerolling).
//   node tools/strategy.mjs [fights per cell = 150] [class = knight]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, makeWeapon, intentRange, isDamageIntent, weaponSize } from '../js/engine.js';
import { botRound, botCamp, botLoot, setScore } from './sim.mjs';

const N = Number(process.argv[2] || 150); const CLS = process.argv[3] || 'knight';
const CHECKS = ['1.05', '1.10', '2.05', '2.10'];

// The damage the monsters can throw at you this round that block can soak (pierce goes through block).
const threat = (b) => b.enemies.filter((e) => e.hp > 0 && e.intent && isDamageIntent(e.intent) && e.intent.v !== 'pierce')
  .reduce((a, e) => { const r = intentRange(e); return a + (r ? (r[0] + r[1]) / 2 : 0); }, 0);
const rest = (ev) => 1.1 * ev.pierce + 0.55 * ev.magic + 0.25 * ev.gold + 0.5 * ev.heal;
const STYLES = {
  'All attack': (ev) => ev.atk + 0.1 * ev.block + rest(ev),
  'Steady mix': (ev) => ev.atk + 0.8 * ev.block + rest(ev),
  'Read the box': (ev, b) => { const t = threat(b); return ev.atk + 1.3 * Math.min(ev.block, t) + 0.1 * Math.max(0, ev.block - t) + rest(ev); },
};
const clone = (h) => JSON.parse(JSON.stringify(h));
function withLoadout(hero, kind, rng) {
  const h = clone(hero); const nw = h.loadout.NW; const size = weaponSize(nw); const rar = nw.rarity | 0;
  h.loadout.NW = makeWeapon('sword', rar, rng, size);
  h.loadout.NE = makeWeapon(kind === 'attack' ? 'spear' : 'shield', rar, rng, size);
  if (h.dice && !h.dice.includes('NE')) h.dice.push('NE'); // both hands armed in every test
  h.potions = 2;
  return h;
}

// play a normal campaign (default bot) and keep a copy of the hero at each checkpoint
const snaps = {}; const rng = makeRng(31337);
let hero = newHero({ name: 'S', cls: CLS, seed: 4242 });
for (let n = 0; n < 20 && Object.keys(snaps).length < CHECKS.length; n++) {
  const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')}`;
  if (CHECKS.includes(key)) snaps[key] = { hero: clone(hero), quest: questsFor(hero)[0] };
  const q = questsFor(hero)[0]; let b; let tries = 0;
  do { b = newBattle(hero, q, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 60) botRound(b, rng); } while (b.outcome === 'defeat' && tries < 5);
  if (b.outcome !== 'victory') { console.log('campaign bot fell at', key); break; }
  const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); advanceCampaign(hero); botCamp(hero, rng);
}

console.log(`${CLS}, ${N} fights per cell. win% · rounds · health lost per fight`);
for (const key of CHECKS) {
  const s = snaps[key]; if (!s) continue;
  console.log(`\n${key} ${s.quest.name} (${s.quest.enemies.join(', ')}) · hero level ${s.hero.level}, hands d${s.hero.strength.W}/d${s.hero.strength.E}`);
  for (const kind of ['attack', 'shield']) {
    for (const [style, fn] of Object.entries(STYLES)) {
      setScore(fn); const r2 = makeRng(777); let wins = 0; let rounds = 0; let lost = 0;
      for (let i = 0; i < N; i++) {
        const h = withLoadout(s.hero, kind, r2); const b = newBattle(h, s.quest, r2, 1); const start = b.hp; let g = 0;
        while (!b.outcome && g++ < 60) botRound(b, r2);
        if (b.outcome === 'victory') wins++; rounds += b.round; lost += start - Math.max(0, b.hp);
      }
      console.log(`  ${kind === 'attack' ? 'sword + spear ' : 'sword + shield'}  ${style.padEnd(12)}  ${(100 * wins / N).toFixed(0).padStart(3)}%  ${(rounds / N).toFixed(1).padStart(4)} rds  ${(lost / N).toFixed(0).padStart(3)} hp`);
    }
  }
}
setScore(null);
