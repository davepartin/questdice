// Teamwork evaluation (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md, "Teamwork and balance evaluation"). The same parties,
// grown from the solo campaign to Act II quest 3 (one snapshot hero per class; a duplicate class is the same hero under another
// name), fight the same seeded encounters under three ways of choosing targets, each with and without Heart to Heart:
//   focus     everyone hits the weakest monster (the habit of finishing things off), whatever the others are doing
//   split     each hero takes a different monster, weakest first, going round again when there are more heroes than monsters
//   adaptive  each hero reads the threats (a monster winding up, a summoner about to call, then the weakest), and with Heart to
//             Heart on, joins a friend who has locked in with the same heart number (or turns its heart by one to match, if it
//             has the magic), taking that friend's target
// Monsters, weapons and classes are today's (charms resting in both arms, so only Heart to Heart differs). Bots are tools/sim.mjs's
// smart bot for dice, potions and powers; only the target and the heart turn are the policy's. Limits: bots do not talk, so this
// measures what coordinated choices are worth, not whether table talk is fun.
//   node tools/teamwork.mjs [fights=12]        (OUT=file writes rows; node tools/teamwork.mjs merge <dir> prints the table)
//   PARTY=knight,ranger;wizard,bard  ENCS=mixed,swarm4  POLICY=focus,adaptive  H2HS=0,1   narrow the run
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botCamp, botLoot, botShape, smartActs, PLAY, setScore } from './sim.mjs';

DATA.TEAMWORK.noCharms = true;
const ENCS = {
  mixed: { foes: ['bonewarden', 'ogre', 'goblin'], hurt: { 2: 0.5 } }, // a summoner, a heavy hitter that winds up, a weaker one already hurt
  swarm4: { foes: ['goblin', 'goblin', 'goblin', 'goblin'] },
  heavy: { foes: ['ogre'] },
  summoner: { foes: ['bonewarden'] },
};
const PARTIES = (process.env.PARTY || 'knight,ranger;wizard,bard;dwarf,dwarf;bard,bard;knight,wizard,bard;ranger,ranger,dwarf;knight,ranger,wizard,bard').split(';').map((p) => p.split(','));
const POLICIES = (process.env.POLICY || 'focus,split,adaptive').split(',');
const H2HS = (process.env.H2HS || '0,1').split(',').map(Number);
const encNames = (process.env.ENCS || Object.keys(ENCS).join(',')).split(',');
if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8')))); process.exit(0); }
const T = Number(process.argv[2] || 12);
const clone = (h) => JSON.parse(JSON.stringify(h));

// one snapshot hero per class: the solo campaign, wise bot, to Act II quest 3
const snaps = {};
function snapshot(cls) {
  if (snaps[cls]) return snaps[cls];
  PLAY.style = 'wise'; setScore(null);
  const seed = 8800 + cls.length; const rng = E.makeRng(seed);
  const hero = E.newHero({ name: cls, cls, seed }); hero.difficulty = 'normal';
  for (let n = 0; n < DATA.QUESTS_PER_ACT * 2; n++) {
    if (hero.campaign.act === 2 && hero.campaign.step === 3) break;
    const quest = E.questsFor(hero)[0]; let b; let t = 0;
    do { if (t) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, quest, rng, 1); t++; let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); botLoot(hero, rw.drops); E.advanceCampaign(hero); botCamp(hero, rng);
  }
  snaps[cls] = hero; return hero;
}

const ratio = (f) => f.hp / f.maxHp;
const threat = (e) => (['charge', 'stalk'].includes(e.intent?.v) || e.intent?.slam ? 3 : e.intent?.v === 'summon' ? 2 : 0);
function chooseTarget(b, i, policy, alive) {
  const byHp = [...alive].sort((x, y) => b.enemies[x].hp - b.enemies[y].hp);
  if (policy === 'split') { const order = b.fighters.map((f, k) => k).filter((k) => b.fighters[k].hp > 0); return byHp[order.indexOf(i) % byHp.length]; }
  const best = [...alive].sort((x, y) => threat(b.enemies[y]) - threat(b.enemies[x]) || b.enemies[x].hp - b.enemies[y].hp)[0];
  if (policy === 'focus') return b._focus ?? (b._focus = byHp[0]); // everyone on the weakest, ignoring threats
  return best; // adaptive, before any heart match
}
// one round: each standing hero shapes its dice, (adaptive + Heart to Heart) matches a friend's heart, uses powers, picks its target, locks
function playRound(b, rng, policy, h2h, log) {
  b._focus = null;
  for (let i = 0; i < b.fighters.length; i++) {
    if (!E.startFighter(b, i)) continue;
    botShape(b, rng);
    const alive = b.enemies.map((e, k) => k).filter((k) => b.enemies[k].hp > 0); if (!alive.length) break;
    let target = chooseTarget(b, i, policy, alive); let joined = null;
    if (policy === 'adaptive' && h2h) {
      const locked = b.fighters.filter((f, k) => k !== i && f.locked && f.hp > 0 && f.board && b.enemies[f.target]?.hp > 0);
      const v = b.board.C.v; const same = locked.find((f) => f.board.C.v === v);
      if (same) { target = same.target; joined = 'match'; }
      else { const near = locked.find((f) => Math.abs(f.board.C.v - v) === 1); if (near && b.magic >= DATA.NUDGE_COST + 1 && E.nudge(b, near.board.C.v > v ? 1 : -1)) { target = near.target; joined = 'turned'; } }
    }
    const o = smartActs(b); void o; E.commitFighter(b);
    const f = b.fighters[i]; f.target = target; f.straight = 'atk'; f.locked = true; f._joined = joined;
  }
  const hp0 = b.enemies.map((e) => e.hp); const intents = b.enemies.map((e) => ({ uid: e.uid, v: e.intent?.v, slam: !!e.intent?.slam }));
  if (process.env.DEBUG) console.log(policy, h2h, 'round', b.round, b.fighters.map((f) => `${f.hero.name}->${b.enemies[f.target]?.id}:${b.enemies[f.target]?.intent?.v}`).join(' '), '| foes', b.enemies.filter((e) => e.hp > 0).map((e) => `${e.id}:${e.intent?.v}:${e.hp}`).join(' '));
  E.resolveParty(b); const rep = b.report;
  for (const f of b.fighters) f.locked = false;
  // examples: a Heart to Heart group whose +10s made the kill, and a round a slam landed while the company hit something else
  for (const g of rep.hearts || []) {
    const k = b.enemies.findIndex((e) => e.uid === g.uid); const dealt = (rep.strikes || []).filter((s) => s.targetUid === g.uid).reduce((a, s) => a + (s.dealt || 0), 0);
    if (k >= 0 && b.enemies[k].hp <= 0 && hp0[k] > dealt - g.total && !log.helped) log.helped = `round ${rep.round}: ${g.names.join(' and ')} matched heart ${g.face} on ${b.enemies[k].name} (${hp0[k]} health left); ${dealt} damage with +${g.total} from Heart to Heart: the kill needed it`;
  }
  const slam = (rep.acts || []).find((a) => a.slam && a.mag > 0);
  if (slam && !log.hurt) { const hitWho = [...new Set((rep.strikes || []).map((s) => b.enemies.find((e) => e.uid === s.targetUid)?.name))].join(', '); if (!hitWho.includes(b.enemies.find((e) => e.uid === slam.uid)?.name)) log.hurt = `round ${rep.round}: the company hit ${hitWho} while ${b.enemies.find((e) => e.uid === slam.uid)?.name}'s wound-up slam landed for ${slam.mag}`; }
  return { rep, intents };
}
function fight(party, enc, policy, h2h, seed) {
  DATA.TEAMWORK.heartToHeart = !!h2h;
  const heroes = party.map((cls, i) => { const h = clone(snapshot(cls)); h.name = `${cls}${i}`; return h; });
  const q = { ...E.questsFor(heroes[0])[0], enemies: ENCS[enc].foes, kind: 'battle', foeNames: null };
  const rng = E.makeRng(seed); const b = E.newPartyBattle(heroes, q, rng);
  for (const [k, share] of Object.entries(ENCS[enc].hurt || {})) { const e = b.enemies[k]; if (e) e.hp = Math.max(1, Math.round(e.maxHp * share)); }
  const hp0 = b.fighters.map((f) => f.hp); const pot0 = b.fighters.map((f) => E.potionsLeft(f)); const mag0 = b.fighters.reduce((a, f) => a + f.magic, 0);
  const log = {}; let rounds = 0; let summons = 0; let windups = 0; let slams = 0; let h2hHeroes = 0; let heroRounds = 0; let joins = 0; let magicGained = 0;
  for (let g = 0; g < 40 && !b.outcome; g++) {
    const standing = b.fighters.filter((f) => f.hp > 0).length;
    windups += b.enemies.filter((e) => e.hp > 0 && e.intent?.v === 'charge').length;
    const { rep } = playRound(b, rng, policy, h2h, log); rounds++;
    summons += (rep.summoned || []).length; slams += (rep.acts || []).filter((a) => a.slam && a.mag > 0).length;
    h2hHeroes += (rep.hearts || []).reduce((a, x) => a + x.names.length, 0); heroRounds += standing;
    joins += b.fighters.filter((f) => f._joined).length; magicGained += (rep.fighters || []).reduce((a, x) => a + (x.magic || 0), 0);
  }
  const lost = b.fighters.reduce((a, f, i) => a + Math.max(0, hp0[i] - f.hp) + (pot0[i] - E.potionsLeft(f)) * E.potionHpOf(f.hero), 0);
  const st = (k) => b.fighters.reduce((a, f) => a + (f.stats[k] || 0), 0);
  return { party: party.join('+'), size: party.length, dup: new Set(party).size < party.length ? 1 : 0, enc, policy, h2h, win: b.outcome === 'victory' ? 1 : 0, defeat: b.outcome === 'defeat' ? 1 : 0, unfinished: b.outcome ? 0 : 1,
    rounds, lost, fell: b.fighters.filter((f) => f.hp <= 0).length, dealt: st('dealt'), blocked: st('blocked'), healed: st('healed') + st('healGiven'), potions: pot0.reduce((a, p, i) => a + p - E.potionsLeft(b.fighters[i]), 0),
    magicLeft: b.fighters.reduce((a, f) => a + f.magic, 0) - mag0, summons, windups, slams, h2hShare: heroRounds ? h2hHeroes / heroRounds : 0, joins, helped: log.helped || '', hurt: log.hurt || '' };
}

const rows = [];
for (const party of PARTIES) for (const enc of encNames) for (const policy of POLICIES) for (const h2h of H2HS) {
  for (let t = 0; t < T; t++) rows.push(fight(party, enc, policy, h2h, 4000 + t * 7919 + enc.length * 31 + party.length * 101));
  process.stderr.write(`${party.join('+')} ${enc} ${policy} h2h${h2h} · `);
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(rows)); else report(rows);

function report(all) {
  const mean = (r, k) => r.reduce((a, x) => a + x[k], 0) / (r.length || 1);
  const se = (r, k) => { const m = mean(r, k); return Math.sqrt(r.reduce((a, x) => a + (x[k] - m) ** 2, 0) / Math.max(1, r.length - 1) / Math.max(1, r.length)); };
  const conds = [...new Set(all.map((x) => `${x.policy}|${x.h2h}`))]; const encs = [...new Set(all.map((x) => x.enc))];
  console.log(`QuestDice teamwork · Act II heroes · smart bots · today's monsters and weapons · charms resting · ${all.length} fights`);
  console.log('Per fight, all heroes together: health lost (± standard error) · wins · rounds · summons allowed · slams that landed · heroes in a Heart to Heart group (share of hero-rounds)');
  for (const enc of encs) {
    console.log(`\n${enc}`);
    console.log(`${'policy'.padEnd(20)} ${'n'.padStart(4)}  ${'health lost'.padEnd(14)} win%  def%  unf%  rounds  dealt  block  heal  potions  summons  slams  H2H%`);
    for (const c of conds) {
      const [policy, h2h] = c.split('|'); const r = all.filter((x) => x.enc === enc && x.policy === policy && String(x.h2h) === h2h); if (!r.length) continue;
      console.log(`${`${policy}${h2h === '1' ? ' + H2H' : ''}`.padEnd(20)} ${String(r.length).padStart(4)}  ${`${mean(r, 'lost').toFixed(1)}±${se(r, 'lost').toFixed(1)}`.padEnd(14)} ${(100 * mean(r, 'win')).toFixed(0).padStart(4)}  ${(100 * mean(r, 'defeat')).toFixed(0).padStart(4)}  ${(100 * mean(r, 'unfinished')).toFixed(0).padStart(4)}  ${mean(r, 'rounds').toFixed(1).padStart(6)}  ${mean(r, 'dealt').toFixed(0).padStart(5)}  ${mean(r, 'blocked').toFixed(0).padStart(5)}  ${mean(r, 'healed').toFixed(0).padStart(4)}  ${mean(r, 'potions').toFixed(1).padStart(7)}  ${mean(r, 'summons').toFixed(1).padStart(7)}  ${mean(r, 'slams').toFixed(1).padStart(5)}  ${(100 * mean(r, 'h2hShare')).toFixed(0).padStart(4)}`);
    }
  }
  console.log('\nBy party (all encounters): health lost a fight, focus / split / adaptive, without and with Heart to Heart');
  for (const p of [...new Set(all.map((x) => x.party))]) {
    const cell = (policy, h2h) => { const r = all.filter((x) => x.party === p && x.policy === policy && x.h2h === h2h); return r.length ? `${mean(r, 'lost').toFixed(1)}±${se(r, 'lost').toFixed(1)}` : '-'; };
    console.log(`${p.padEnd(28)} ${['focus', 'split', 'adaptive'].map((po) => `${po} ${cell(po, 0)} / ${cell(po, 1)}`.padEnd(30)).join('')}`);
  }
  const ex = (k) => all.find((x) => x[k] && x.policy === 'adaptive')?.[k] || all.find((x) => x[k])?.[k];
  console.log('\nA decision that helped:', ex('helped') || '(none found)');
  console.log('A tempting decision that hurt:', ex('hurt') || '(none found)');
}
