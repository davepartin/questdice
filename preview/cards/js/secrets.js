// Secret objectives (Dave, Oct 2026; docs/SECRET_OBJECTIVES.md). Before every battle each hero opens an envelope: a card only they
// can see. Most help the team (cover cards), some race a friend who does not know it (rivalries), some are a small side quest
// (challenges), and now and then one is a bribe: bad for the team, good for you, offered (Accept / Decline) or forced ("you have
// been chosen"). Nobody votes; after the battle every card is revealed, and the cards pay out. Pure rules, no DOM: the battle keeps
// a round log (engine logRound), and judge() reads it.
import { hashSeed, makeRng, mindSize, isActive } from './engine.js';
import { voiceOf } from './campaigns.js';

export const G_BY_ACT = [40, 70, 100];
export const gOf = (act) => G_BY_ACT[Math.min(3, Math.max(1, act | 0)) - 1];
const r5 = (n) => Math.max(5, Math.round(n / 5) * 5);
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);

// Every card that battle carries the same line, so saying it proves nothing.
export const COVER_LINES = [
  'Mine’s about winning the fight. Let’s go.',
  'Mine says keep everyone standing and win.',
  'Mine just wants us to win, and quickly.',
  'Mine’s a team one. Win the battle.',
];
// The voice that leans in. A writer's pack may give its own (pack.voice = { name, scenes: [...] }; campaigns.js voiceOf).
export const VOICE = {
  name: 'Old Whisper',
  scenes: [
    'Old Whisper, a ghost who runs a pawn shop, hands you a sealed envelope. Read it. Don’t show the others.',
    'A small grey ghost drifts between you and holds out one envelope each. Read yours. No peeking.',
    'Old Whisper slips a sealed envelope into your hand. Read it. Keep it to yourself.',
    'Old Whisper counts out one envelope each. Read yours. Do not look at anyone else’s.',
  ],
};

// kind: cover (helps the team), rival (dealt to two or more; the best wins), challenge (yours alone), bribe (bad for the team).
// mode for bribes: offer (Accept / Decline) or forced. team: only at a table of two or more. pay: a share of G (gold by act).
export const CARDS = {
  // ---- cover cards
  lead: { kind: 'cover', name: 'Lead the Charge', flavor: 'Win this fight. That is the job.', rule: 'Win this battle.', pay: 0.5, check: (x) => x.won },
  shield: { kind: 'cover', team: true, name: 'The Shield', flavor: 'Stand at the front. Draw the hits.', rule: 'Be the monsters’ target in 2 or more rounds and still be standing at the end.', pay: 1, check: (x) => x.me.filter((r) => r.leader).length >= 2 && x.F.hp > 0 },
  medic: { kind: 'cover', team: true, name: 'Field Medic', flavor: 'Keep the others on their feet.', rule: 'Heal your friends for 15 or more health (thrown potions, revives).', pay: 1, check: (x) => (x.F.stats?.healGiven || 0) >= 15 },
  together: { kind: 'cover', team: true, name: 'No One Left Behind', flavor: 'Nobody goes down today.', rule: 'No hero is down when the battle ends.', pay: 1, check: (x) => Object.values(x.fighters).every((f) => f.hp > 0) },
  quick: { kind: 'cover', name: 'Quick Work', flavor: 'Finish this fight fast.', rule: 'Win in 4 rounds or fewer.', pay: 1, check: (x) => x.rounds <= 4 },
  spark: { kind: 'cover', team: true, name: 'Spark Plug', flavor: 'Share your magic. The others need it.', rule: 'Share magic with a friend twice.', pay: 0.5, check: (x) => (x.F.stats?.shares || 0) >= 2 },
  // ---- rivalries (never hinted: the card does not say anyone else has it)
  goldrush: { kind: 'rival', name: 'Gold Rush', what: 'gold', flavor: 'Take more gold than anyone else.', rule: 'Earn more gold this battle than anyone. Win and your gold is doubled.', score: (x) => sum(x.me, (r) => r.gold), doubles: true },
  arcane: { kind: 'rival', name: 'Arcane Ace', what: 'magic damage', flavor: 'Deal the most damage with magic.', rule: 'Deal the most damage with your magic powers.', score: (x) => sum(x.me, (r) => r.magic) },
  finisher: { kind: 'rival', name: 'The Finisher', what: 'killing blows', flavor: 'Land the last hit more than anyone.', rule: 'Land the most killing blows.', score: (x) => sum(x.me, (r) => r.kills.length) },
  wall: { kind: 'rival', name: 'Stone Wall', what: 'blocks', flavor: 'Block more damage than anyone.', rule: 'Block the most damage.', score: (x) => sum(x.me, (r) => r.blocked) },
  bigswing: { kind: 'rival', name: 'Big Swing', what: 'the biggest round', flavor: 'Have the biggest single round of damage.', rule: 'Deal the most damage in a single round.', score: (x) => Math.max(0, ...x.me.map((r) => r.dealt)) },
  lucky: { kind: 'rival', name: 'Lucky Streak', what: 'triples', flavor: 'Roll more triples than anyone.', rule: 'Roll the most triples.', score: (x) => sum(x.me, (r) => r.triples) },
  straights: { kind: 'rival', name: 'Straight Shooter', what: 'straights', flavor: 'Roll more straights than anyone.', rule: 'Roll the most straights.', score: (x) => x.me.filter((r) => r.straight).length },
  fleet: { kind: 'rival', name: 'Fleet Foot', what: 'feet rolls', flavor: 'Roll your feet die higher than anyone.', rule: 'Roll the highest total on your feet die across the battle.', score: (x) => sum(x.me, (r) => r.S) },
  strongarm: { kind: 'rival', name: 'Strong Arm', what: 'hand rolls', flavor: 'Roll your hand dice higher than anyone.', rule: 'Roll the highest total on your hand dice across the battle.', score: (x) => sum(x.me, (r) => r.W + r.E) },
  bright: { kind: 'rival', name: 'Bright Spark', what: 'head rolls', flavor: 'Roll your head die higher than anyone.', rule: 'Roll the highest total on your head die across the battle.', score: (x) => sum(x.me, (r) => r.N) },
  crowd: { kind: 'rival', name: 'Crowd Favourite', what: 'battle points', flavor: 'Score the most battle points.', rule: 'Score the most battle points.', score: (x) => x.F.points || 0 },
  // ---- challenges (yours alone)
  thrice: { kind: 'challenge', name: 'Three Times Lucky', flavor: 'Hit a triple in three different rounds.', rule: 'Roll a triple in 3 different rounds.', pay: 1, check: (x) => x.me.filter((r) => r.triples > 0).length >= 3 },
  mittens: { kind: 'challenge', name: 'Matching Mittens', flavor: 'Match both hand dice, twice.', rule: 'Both hand dice show the same number, in 2 rounds.', pay: 0.5, check: (x) => x.me.filter((r) => r.W && r.W === r.E).length >= 2 },
  thinker: { kind: 'challenge', name: 'Big Thinker', flavor: 'Roll the top face of your head die.', rule: 'Roll your head die’s top face.', pay: 0.5, check: (x) => x.me.some((r) => r.N === mindSize(x.F.hero)) },
  neverlast: { kind: 'challenge', team: true, name: 'Never Last', flavor: 'Do not be the slowest. The slowest gets hit.', rule: 'Never be the slowest hero (the monsters’ target).', pay: 0.5, check: (x) => !x.me.some((r) => r.leader) },
  teetotal: { kind: 'challenge', name: 'Teetotaler', flavor: 'Win without a potion.', rule: 'Win without drinking a potion.', pay: 0.5, check: (x) => (x.F.potions0 ?? 0) - (x.F.potions ?? 0) - (x.F.stats?.potionsThrown || 0) <= 0 },
  biggame: { kind: 'challenge', name: 'Big Game Hunter', flavor: 'Finish the toughest monster yourself.', rule: 'Land the killing blow on the toughest monster.', pay: 1, check: (x) => x.me.some((r) => r.kills.includes(x.toughest)) },
  thrifty: { kind: 'challenge', name: 'Thrifty', flavor: 'Do not spend magic on rerolls.', rule: 'Use no magic rerolls.', pay: 0.5, check: (x) => x.me.every((r) => !r.paid) },
  heartmatch: { kind: 'challenge', name: 'Heart Match', flavor: 'Match your heart die to your head die.', rule: 'Your heart die matches your head die in some round.', pay: 0.5, check: (x) => x.me.some((r) => r.C && r.C === r.N) },
  cliffhanger: { kind: 'challenge', name: 'Cliffhanger', flavor: 'Win with 5 health or less.', rule: 'Win while at 5 health or less.', pay: 1, check: (x) => x.F.hp > 0 && x.F.hp <= 5 },
  saver: { kind: 'challenge', name: 'Saver', flavor: 'End with more magic than you started.', rule: 'End the battle with more magic than you started with.', pay: 0.5, check: (x) => (x.F.magic ?? 0) > (x.F.magic0 ?? 0) },
  talentshow: { kind: 'challenge', name: 'Talent Show', flavor: 'Get both talent dice to pay in one round.', rule: 'Both talent dice pay in the same round.', pay: 0.5, needs: (hero) => isActive(hero, 'SW') && isActive(hero, 'SE'), check: (x) => x.me.some((r) => r.talents >= 2) },
  // ---- bribes: offered (Accept / Decline), the brutal ones
  slacker: { kind: 'bribe', mode: 'offer', name: 'The Slacker', flavor: 'Let the others do the work. Deal the least damage.', rule: 'Deal the least damage of anyone.', check: (x) => x.others.every((n) => sum(x.rows[n], (r) => r.dealt) >= sum(x.me, (r) => r.dealt)) },
  glass: { kind: 'bribe', mode: 'offer', name: 'Glass Shield', flavor: 'Drop your guard. No block, twice.', rule: 'Have no block at all in 2 rounds.', check: (x) => x.me.filter((r) => !r.blk).length >= 2 },
  cold: { kind: 'bribe', mode: 'offer', name: 'Cold Shoulder', flavor: 'Help nobody this fight.', rule: 'Help nobody: no thrown potion, no shared magic, no revive.', check: (x) => !(x.F.stats?.potionsThrown || x.F.stats?.shares || x.F.stats?.revives) },
  longfight: { kind: 'bribe', mode: 'offer', name: 'The Long Fight', flavor: 'Make the fight last five rounds or more.', rule: 'The battle lasts 5 rounds or more.', check: (x) => x.rounds >= 5 },
  pact: { kind: 'bribe', mode: 'offer', name: 'The Pact', flavor: 'The monster will not knock you out. You deal half damage.', rule: 'You cannot be knocked out this battle, but you deal half damage.', check: () => true },
  fall: { kind: 'bribe', mode: 'offer', name: 'Someone Has to Fall', flavor: 'Someone on your side has to fall. Not you.', rule: 'Another hero is knocked out at least once (a revive still counts).', check: (x) => x.others.some((n) => x.rows[n].some((r) => r.hp <= 0)) || x.others.some((n) => x.fighters[n]?.hp <= 0) },
  laststand: { kind: 'bribe', mode: 'offer', name: 'Last One Standing', flavor: 'End with more health than every teammate.', rule: 'End the battle with more health than every teammate.', check: (x) => x.others.every((n) => (x.fighters[n]?.hp ?? 0) < x.F.hp) },
  // ---- bribes: forced ("you have been chosen"), milder; they look exactly like an ordinary card
  goldfumble: { kind: 'bribe', mode: 'forced', name: 'Golden Fumble', flavor: 'You have been chosen. Take gold from every straight you roll.', rule: 'Take the Gold side of every straight you roll (and roll at least one).', check: (x) => x.me.some((r) => r.straight) && x.me.every((r) => !r.straight || r.straight === 'gold') },
  spare: { kind: 'bribe', mode: 'forced', name: 'Spare That One', flavor: 'You have been chosen. Let that monster fall last.', rule: 'Let {spare} be the last monster to fall.', check: (x) => { // any length of fight (a short one could never reach "round 4"); the same round counts
    const rows = Object.values(x.rows).flat(); const k = rows.find((r) => r.kills.includes(x.card.spare)); if (!k) return true;
    return rows.every((r) => r.kills.every((uid) => uid === x.card.spare || r.r <= k.r));
  } },
  hoarder: { kind: 'bribe', mode: 'forced', name: 'The Hoarder', flavor: 'You have been chosen. Keep 6 magic unspent.', rule: 'End the battle with 6 or more magic unspent.', check: (x) => (x.F.magic ?? 0) >= 6 },
  lonewolf: { kind: 'bribe', mode: 'forced', name: 'Lone Wolf', flavor: 'You have been chosen. Never hit the same monster as a teammate.', rule: 'Never attack the monster a teammate attacks that round.', check: (x) => x.me.every((r) => r.target == null || !x.others.some((n) => x.rows[n].some((o) => o.r === r.r && o.target === r.target))) },
};
const ids = (kind, team) => Object.keys(CARDS).filter((id) => CARDS[id].kind === kind && (team || !CARDS[id].team));

// How often a bribe and a rivalry turn up, by the number of heroes.
const BRIBE_CHANCE = { 2: 1 / 6, 3: 1 / 3, 4: 1 / 3, 5: 1 / 2, 6: 1 / 2 };
const RIVAL_CHANCE = { 2: 0.35, 3: 0.7, 4: 0.75, 5: 0.85, 6: 0.9 };

// Deal the envelopes for one battle. heroes: the company (hero objects); enemies: the battle's monsters; c: the campaign.
// The scene and the cover line are the same for everyone; the cards are private.
// Fewer, bigger secrets (the bots' playtest, Oct 2026): ordinary fights deal cover cards, rivalries and challenges, and only now
// and then a bribe; an elite, a boss or a perilous road (big: true) is where the bribes and the harsh cards come out.
const HARSH = new Set(['cliffhanger']); // challenges that only make sense in a fight worth sweating
export function dealEnvelopes({ c, heroes, enemies = [], salt = '', big = false }) {
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'envelopes', salt));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const n = heroes.length; const team = n > 1;
  const voice = c.voice || voiceOf(c) || VOICE;
  const env = { act: c.act, voice: voice.name, scene: pick(voice.scenes || VOICE.scenes), cover: pick(COVER_LINES), cards: {}, answered: {} };
  const fits = (id, hero) => !CARDS[id].needs || CARDS[id].needs(hero);
  const open = [...heroes].sort(() => rng() - 0.5);
  const give = (hero, id, extra = {}) => { env.cards[hero.name] = { id, ...extra }; open.splice(open.indexOf(hero), 1); };
  if (team) {
    // a bribe, now and then (never to the same hero two battles running)
    if (rng() < Math.min(0.9, (BRIBE_CHANCE[Math.min(6, n)] || 0) * (big ? 2 : 0.3))) {
      const who = open.find((h) => h.name !== c.lastBribed);
      const spareable = enemies.filter((e) => e.tier !== 'boss' && e.hp > 0);
      const bribes = [...ids('bribe', true)].filter((id) => id !== 'spare' || spareable.length >= 2);
      if (who) {
        const offered = rng() < 0.6; const list = bribes.filter((id) => CARDS[id].mode === (offered ? 'offer' : 'forced'));
        const id = pick(list.length ? list : bribes); const extra = { mode: CARDS[id].mode };
        if (id === 'spare') { const e = pick(spareable); extra.spare = e.uid; extra.spareName = e.name; }
        give(who, id, extra); c.lastBribed = who.name;
      }
    } else c.lastBribed = null;
    // a rivalry (two or more heroes chasing the same thing, each thinking it is theirs alone)
    const pairs = n >= 6 && rng() < 0.4 ? 2 : 1;
    for (let p = 0; p < pairs; p++) {
      if (open.length < 2 || rng() >= (RIVAL_CHANCE[Math.min(6, n)] || 0)) break;
      const used = Object.values(env.cards).map((x) => x.id);
      const id = pick(ids('rival', true).filter((x) => !used.includes(x)));
      const size = n >= 5 && open.length >= 3 && rng() < 0.35 ? 3 : 2;
      for (const h of open.slice(0, size)) give(h, id);
    }
  }
  // solo heroes get a Bonus Goal instead (dealBonusGoal); everyone at a table of 2+ gets a cover card or a challenge
  if (team) {
    for (const h of [...open]) {
      const cover = rng() < 0.4;
      const list = ids(cover ? 'cover' : 'challenge', true).filter((id) => fits(id, h) && (big || !HARSH.has(id)));
      give(h, pick(list));
    }
  }
  return env;
}

// What this hero sees (their card only), for the Envelope screen.
export function cardView(env, name) {
  const mine = env?.cards?.[name]; if (!mine) return null; const d = CARDS[mine.id];
  return { id: mine.id, kind: d.kind, mode: mine.mode || null, name: d.name, flavor: d.flavor, rule: d.rule.replace('{spare}', mine.spareName || 'that monster'), reward: rewardLine(env, mine, Object.keys(env.cards).length > 1), stakes: rewardChips(env, mine), terms: rewardTerms(env, mine), scene: env.scene, cover: env.cover, voice: env.voice, answered: !!env.answered[name], accepted: mine.accepted ?? null };
}
// The sums behind an accepted offer, for the card's labelled rows (null for every other card).
export function rewardTerms(env, mine) {
  if (CARDS[mine.id].kind !== 'bribe' || mine.mode !== 'offer') return null;
  const G = gOf(env.act); return { win: 2 * G, fail: Math.round(G / 2), crooks: Math.round(G / 2), honor: [r5(G / 4), r5(G / 2)] };
}
// The prize as one or two chips for the card itself ("Win 40 gold", "Lose 10"); rewardLine has the full sentence for "More".
export function rewardChips(env, mine) {
  const G = gOf(env.act); const d = CARDS[mine.id];
  if (d.kind === 'rival') return [d.doubles ? `Win: double gold (up to ${2 * G})` : `Win ${G} gold`];
  // an accepted offer: done and won pays 2G; won without doing it pays nothing; a team defeat costs G/2, and G/2 more when every offered bribe was taken (the "crooks" clause in judge(), below)
  if (d.kind === 'bribe' && mine.mode === 'offer') return [`Done and won: ${2 * G} gold`, 'Won, not done: nothing', `Team defeated: pay ${Math.round(G / 2)}, ${Math.round(G / 2)} more if every bribe was taken`];
  if (d.kind === 'bribe') return [`Win ${G} gold`];
  return [`Win ${r5((d.pay || 1) * G)} gold`];
}
// The prize, in one plain line (the same sums judge() pays).
function rewardLine(env, mine, team) {
  const G = gOf(env.act); const d = CARDS[mine.id]; const win = team ? 'if the team wins' : 'if you win';
  if (d.kind === 'rival') return d.doubles ? `Double the gold you earn (up to ${2 * G}), ${win}.` : `${G} gold, ${win}.`;
  if (d.kind === 'bribe' && mine.mode === 'offer') return `Pull it off and win, and you get ${2 * G} gold. Win without pulling it off and you get nothing. If the team is defeated you pay ${Math.round(G / 2)}, done or not, and ${Math.round(G / 2)} more if every offered bribe was taken. Or say no for a little Honor gold.`;
  if (d.kind === 'bribe') return `${G} gold, ${win}.`;
  return `${r5((d.pay || 1) * G)} gold, ${win}.`;
}
export function answer(env, name, { accept } = {}) {
  const mine = env?.cards?.[name]; if (!mine) return false;
  if (mine.mode === 'offer') mine.accepted = !!accept;
  env.answered[name] = true;
  return true;
}
export const everyoneAnswered = (env, names) => names.every((n) => env.answered[n]);
// A bribe still counts only if it was accepted (a forced one always counts).
const inPlay = (card) => card.mode !== 'offer' || card.accepted;

// After the battle: who did what, and what it pays. battle: the finished battle (secretLog, fighters or the solo hero);
// won: did the team win. Returns { results: [{ name, id, kind, mode, accepted, met, gold, line }], crooks }.
export function judge(env, battle, { won }) {
  const G = gOf(env.act);
  const log = battle.secretLog || [];
  const fighters = battle.fighters ? Object.fromEntries(battle.fighters.map((f) => [f.hero.name, f])) : { [battle.hero.name]: { hero: battle.hero, hp: battle.hp, maxHp: battle.maxHp, magic: battle.magic, magic0: battle.magic0, potions: battle.potions, potions0: battle.potions0, stats: battle.stats, points: battle.points } };
  const names = Object.keys(env.cards);
  const rows = Object.fromEntries(names.map((n) => [n, log.filter((r) => r.name === n)]));
  const rounds = Math.max(0, ...log.map((r) => r.r));
  const toughest = [...(battle.enemies || [])].sort((a, b) => (b.maxHp || 0) - (a.maxHp || 0))[0]?.uid;
  const ctxOf = (name) => ({ me: rows[name], rows, others: names.filter((n) => n !== name), F: fighters[name] || {}, fighters, won, rounds, toughest, card: env.cards[name] });
  const results = [];
  // rivalries first: group the holders of each rivalry card
  const rivals = {};
  for (const n of names) { const c = env.cards[n]; if (CARDS[c.id].kind === 'rival') (rivals[c.id] ||= []).push(n); }
  const rivalWin = {};
  for (const [id, who] of Object.entries(rivals)) {
    const scores = who.map((n) => ({ n, s: CARDS[id].score(ctxOf(n)) }));
    const best = Math.max(...scores.map((x) => x.s));
    const winners = best > 0 ? scores.filter((x) => x.s === best).map((x) => x.n) : [];
    rivalWin[id] = { scores, winners };
  }
  let offered = 0; let accepted = 0;
  for (const n of names) {
    const card = env.cards[n]; const d = CARDS[card.id]; const x = ctxOf(n);
    let met = false; let gold = 0;
    if (d.kind === 'rival') {
      const w = rivalWin[card.id]; met = w.winners.includes(n);
      if (won && met) gold = d.doubles ? Math.min(2 * G, Math.max(5, CARDS.goldrush.score(x))) : r5(G / w.winners.length);
    } else if (d.kind === 'bribe') {
      met = inPlay(card) && !!d.check(x);
      if (card.mode === 'offer') {
        offered++; if (card.accepted) accepted++;
        if (card.accepted) gold = won ? (met ? 2 * G : 0) : -Math.round(G / 2);
        else gold = won ? r5(G / 4) : r5(G / 2); // Honor
      } else gold = won && met ? G : 0;
    } else {
      met = !!d.check(x);
      gold = won && met ? r5((d.pay || 1) * G) : 0;
    }
    results.push({ name: n, id: card.id, kind: d.kind, mode: card.mode || null, accepted: card.accepted ?? null, met, gold });
  }
  const crooks = !won && offered > 0 && accepted === offered;
  if (crooks) for (const r of results) r.gold -= Math.round(G / 2);
  for (const r of results) r.line = revealLine(env, r, rivalWin, crooks, won);
  return { results, crooks, rivals: rivalWin, won };
}

// The Reveal: one line for each hero (names, never "he" or "she").
function revealLine(env, r, rivalWin, crooks, won) {
  const d = CARDS[r.id]; const v = env.voice || VOICE.name; const g = r.gold;
  const coin = g > 0 ? ` ${r.name} receives ${g} gold.` : g < 0 ? ` ${r.name} loses ${-g} gold.` : '';
  const rule = d.rule.replace('{spare}', env.cards[r.name]?.spareName || 'that monster').replace(/\.$/, '');
  // a rule that speaks to its holder ("you") is quoted as the card says it, so the Reveal never reads "Theo: you cannot..."
  const card = /\byour?\b/i.test(rule) ? `${d.name}: “${rule}.”` : `${d.name}: ${rule.charAt(0).toLowerCase()}${rule.slice(1)}.`;
  if (d.kind === 'cover') return `${r.name} had an honest card, ${card} ${r.met ? 'Done.' : 'Not this time.'}${coin}`;
  if (d.kind === 'challenge') return `${r.name} had a secret challenge, ${card} ${r.met ? (won ? 'Done!' : 'Done, but the battle was lost.') : 'Not this time.'}${coin}`;
  if (d.kind === 'rival') {
    const w = rivalWin[r.id]; const others = w.scores.filter((x) => x.n !== r.name);
    const vs = others.map((o) => `${o.n} (${o.s})`).join(' and ');
    return `${r.name} was secretly chasing ${d.what} (${d.name}), and so was ${vs}! ${r.name} scored ${w.scores.find((x) => x.n === r.name)?.s ?? 0}. ${r.met ? (w.winners.length > 1 ? 'A tie at the top.' : `${r.name} wins it.`) : 'Not the winner this time.'}${won ? '' : ' The battle was lost, so no prize.'}${coin}`;
  }
  if (r.mode === 'forced') return `${r.name} was chosen by ${v}. ${card} ${r.met ? (won ? `${r.name} managed it.` : `${r.name} managed it, but the battle was lost.`) : `${r.name} could not manage it.`}${coin}`;
  if (r.accepted) {
    const tail = crooks ? ` Every bribe was taken and the battle lost: ${v} calls you a fine bunch of crooks.` : '';
    if (!won) return `${r.name} took the bribe from ${v}! ${card} The team lost, and ${v} takes a cut.${coin}${tail}`;
    return `${r.name} took the bribe from ${v}! ${card} ${r.met ? `${r.name} pulled it off.` : `${r.name} could not do it.`}${coin}`;
  }
  return `${r.name} was offered a bribe by ${v} (${d.name}) and said no. Honor${won ? '' : ', even in defeat'}.${coin}`;
}

// Solo (1 hero): no envelopes. The campaign gold-giver offers one hard Bonus Goal on a fight or elite, as a wager (Dave, Oct 2026:
// "you pay gold to attempt it, or you can decline it... if you pay to attempt it, it's worth the chance"). Put down the act's stake
// to try: pull it off and win, and you get BONUS_RETURN times the stake back; miss it (or lose the fight) and the stake is gone.
// Saying no costs and pays nothing. A hero who cannot afford the stake may try for free, for a small prize (the stake itself).
export const BONUS_STAKE = [10, 20, 30];
export const BONUS_RETURN = 3;
export const bonusStake = (act) => BONUS_STAKE[Math.min(3, Math.max(1, act | 0)) - 1];
export const bonusG = (act) => bonusStake(act) * BONUS_RETURN; // what a paid Bonus Goal returns
export const BONUS_G = BONUS_STAKE.map((s) => s * BONUS_RETURN);
export const BONUS_HONOR = 0;
export const wantsBonus = (kind) => kind === 'battle' || kind === 'elite';
export const BONUS_GOALS = {
  nopotion: { name: 'No potions', rule: 'Win without using a potion.', check: (x) => (x.F.potions0 ?? 0) - (x.F.potions ?? 0) - (x.F.stats?.potionsThrown || 0) <= 0 },
  block40: { name: 'Hold the line', rule: 'Block 40 damage this fight.', check: (x) => sum(x.me, (r) => r.blocked) >= 40 },
  magic40: { name: 'Spark storm', rule: 'Deal 40 magic damage this fight.', check: (x) => sum(x.me, (r) => r.magic) >= 40 },
  noreroll: { name: 'First rolls', rule: 'Win without using a magic reroll.', check: (x) => x.me.every((r) => !r.paid) },
  deal50: { name: 'Heavy hitter', rule: 'Deal 50 damage this fight.', check: (x) => sum(x.me, (r) => r.dealt) >= 50 },
};
export function dealBonusGoal({ c, hero, salt = '' }) {
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'bonus', salt));
  const keys = Object.keys(BONUS_GOALS);
  const id = keys[Math.floor(rng() * keys.length)];
  const voice = c.voice || voiceOf(c) || VOICE;
  const stake = bonusStake(c.act);
  const free = !!hero && (hero.gold || 0) < stake; // short of gold: a small free one instead
  return {
    kind: 'bonus', id, act: c.act, voice: voice.name,
    scene: `${voice.name} has a hard extra job for you this fight.`,
    name: BONUS_GOALS[id].name, rule: BONUS_GOALS[id].rule, stake: free ? 0 : stake, free, gold: free ? stake : stake * BONUS_RETURN, honor: BONUS_HONOR, answered: false, accepted: null,
  };
}
export function bonusView(goal) {
  if (!goal) return null;
  const reward = goal.free
    ? `You are short of gold, so this one is free. Pull it off and win, and you get ${goal.gold} gold. Or say no.`
    : `Put down ${goal.stake} gold to try. Pull it off and win, and you get ${goal.gold} back. Miss it, and the ${goal.stake} is gone. Or say no; it costs nothing.`;
  return {
    id: goal.id, kind: 'bonus', mode: 'offer', name: goal.name,
    flavor: goal.free ? `${goal.voice} offers you a small job, on the house.` : `${goal.voice} will take a wager on it.`,
    rule: goal.rule, reward, stake: goal.stake || 0, gold: goal.gold || 0, free: !!goal.free,
    scene: goal.scene, cover: '', voice: goal.voice, answered: !!goal.answered, accepted: goal.accepted,
  };
}
// Accepting a paid Bonus Goal takes its stake from the hero's purse (if the purse has fallen short since, it is free after all).
export function answerBonus(goal, { accept, hero } = {}) {
  if (!goal) return false;
  goal.accepted = !!accept;
  goal.answered = true;
  if (goal.accepted && goal.stake && hero) {
    if ((hero.gold || 0) >= goal.stake) { hero.gold -= goal.stake; goal.paid = goal.stake; }
    else { goal.free = true; goal.gold = goal.stake; goal.stake = 0; }
  }
  return true;
}
function soloFighter(battle) {
  if (battle.fighters) return battle.fighters[0];
  return { hero: battle.hero, hp: battle.hp, maxHp: battle.maxHp, magic: battle.magic, magic0: battle.magic0, potions: battle.potions, potions0: battle.potions0, stats: battle.stats, points: battle.points };
}
export function judgeBonus(goal, battle, { won }) {
  const d = BONUS_GOALS[goal.id]; const F = soloFighter(battle); const log = (battle.secretLog || []).filter((r) => r.name === F.hero.name);
  const x = { me: log, F, won, rounds: Math.max(0, ...log.map((r) => r.r)) };
  const met = !!goal.accepted && won && !!d.check(x);
  let gold = 0; let line;
  const who = F.hero.name;
  const lost = goal.paid ? ` The ${goal.paid} gold stake is gone.` : '';
  if (!goal.accepted) {
    gold = goal.honor || 0;
    line = `${goal.voice} offered a Bonus Goal (${goal.name}) and ${who} said no.${gold ? ` Honor. ${who} receives ${gold} gold.` : ' No harm done.'}`;
  } else if (won && met) {
    gold = goal.gold;
    line = `${who} took the Bonus Goal: ${goal.rule.replace(/\.$/, '')}. Done. ${who} receives ${gold} gold${goal.paid ? ` (for a stake of ${goal.paid})` : ''}.`;
  } else if (won) {
    line = `${who} took the Bonus Goal: ${goal.rule.replace(/\.$/, '')}. Not this time.${lost}`;
  } else {
    line = `${who} took the Bonus Goal. The fight was lost, so no prize.${lost}`;
  }
  return { results: [{ name: who, id: goal.id, kind: 'bonus', mode: 'offer', accepted: goal.accepted, met, gold, line }], voice: goal.voice, won };
}
export function payBonus(judged, hero) {
  const r = judged.results[0]; if (!r || !hero) return;
  hero.gold = Math.max(0, (hero.gold || 0) + r.gold);
  const rec = ((hero.record ||= {}).secrets ||= { done: 0, rivalries: 0, bribesTaken: 0, bribesDeclined: 0, forced: 0, honor: 0 });
  if (!r.accepted) rec.honor++;
  else if (r.met && judged.won) rec.done++;
}

// Pay the results to the heroes and keep score in the Hall of Fame.
export function payOut(judged, heroesByName) {
  for (const r of judged.results) {
    const h = heroesByName[r.name]; if (!h) continue;
    h.gold = Math.max(0, (h.gold || 0) + r.gold);
    const rec = ((h.record ||= {}).secrets ||= { done: 0, rivalries: 0, bribesTaken: 0, bribesDeclined: 0, forced: 0, honor: 0 });
    // rivalries and challenges count in the Hall of Fame only when they paid: the team has to win (docs/SECRET_OBJECTIVES.md)
    if (r.kind === 'rival' && r.met && judged.won) rec.rivalries++;
    else if ((r.kind === 'cover' || r.kind === 'challenge') && r.met && judged.won) rec.done++;
    if (r.kind === 'bribe') { if (r.mode === 'forced') rec.forced++; else if (r.accepted) rec.bribesTaken++; else { rec.bribesDeclined++; rec.honor++; } }
  }
}
