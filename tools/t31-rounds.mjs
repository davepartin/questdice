// T31: what one point of each colour is worth, measured ONE ROUND AT A TIME (whole fights drift apart on different dice and bury the
// effect; T31 note). The bot campaign plays Acts I to III with real heroes (levelling, shopping, upgrading). At every round, after the
// bot has rolled, rerolled and cast its powers, the battle is copied and that one round is resolved again with +AMT of one colour, on
// the same dice. Offence (attack, pierce, splash) is scored by the monster health it removes; defence (block, heal) by the hero
// health it saves. Measurement only; nothing in the game changes.
//   node tools/t31-rounds.mjs [campaigns a class = 4] [bonus = 3]
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs, botCamp } from './sim.mjs';
applyRelease();
const C = +(process.argv[2] || 4); const AMT = +(process.argv[3] || 3);
const CLASSES = (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',');
const KINDS = ['atk', 'pierce', 'splash', 'block', 'heal'];
const copy = (b) => { const r = b.rng; delete b.rng; const c = structuredClone(b); b.rng = r; return c; };
const monsterHp = (b) => b.enemies.reduce((t, e) => t + Math.max(0, e.hp), 0);
// tallies by group: rounds, and for each colour the total gain over the rounds
const T = {}; const tally = (g, kind, v) => { const t = (T[g] ||= { rounds: 0 }); if (kind == null) t.rounds++; else t[kind] = (t[kind] || 0) + v; };
for (const cls of CLASSES) for (let s = 0; s < C; s++) {
  const rng = E.makeRng(9100 + s); const hero = E.newHero({ name: 'Real', cls, seed: 9100 + s });
  for (let i = 0; i < D.QUESTS_PER_ACT * 3 + 6 && hero.campaign.act <= 3; i++) {
    const quest = E.questsFor(hero)[0]; if (!quest) break; let b = null;
    for (let t = 0; t < 4 && b?.outcome !== 'victory'; t++) {
      b = E.newBattle(hero, quest, rng, 1); let g = 0;
      while (!b.outcome && g++ < 60) {
        E.startRoll(b); botShape(b, rng); const opts = smartActs(b);
        if (t === 0) { // probe this round (first try only)
          const alive = b.enemies.filter((e) => e.hp > 0).length; const groups = ['all', alive === 1 ? 'one monster left' : alive === 2 ? 'two monsters left' : 'three or more left', `Act ${['I', 'II', 'III'][b.quest?.act - 1] || ['I', 'II', 'III'][hero.campaign.act - 1]}`, quest.kind === 'boss' ? 'bosses' : null].filter(Boolean);
          const seed = Math.floor(rng() * 1e9); const base = copy(b); base.rng = E.makeRng(seed); const m0 = monsterHp(base); E.resolve(base, opts); const dm0 = m0 - monsterHp(base); const hp0 = base.hp;
          for (const gname of groups) tally(gname);
          for (const k of KINDS) {
            const c = copy(b); c.rng = E.makeRng(seed); c.mods[k] = (c.mods[k] || 0) + AMT; const m1 = monsterHp(c); E.resolve(c, opts);
            const v = k === 'block' || k === 'heal' ? c.hp - hp0 : (m1 - monsterHp(c)) - dm0;
            for (const gname of groups) tally(gname, k, v);
          }
        }
        E.resolve(b, opts);
      }
    }
    if (b.outcome !== 'victory') break;
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
const say = (t) => process.stdout.write(t + '\n');
say(`Real heroes (${CLASSES.join(', ')}, ${C} bot campaigns each, Acts I–III). Each round replayed with +${AMT} of one colour, same dice.`);
say('What ONE point adds in a round, on average: offence = monster health removed, defence = your health saved.');
for (const [g, t] of Object.entries(T)) {
  const per = (k) => (t[k] / t.rounds / AMT).toFixed(2);
  say(`${g.padEnd(20)} ${String(t.rounds).padStart(5)} rounds | attack ${per('atk')} · pierce ${per('pierce')} · splash ${per('splash')} | block ${per('block')} · heal ${per('heal')}`);
}
