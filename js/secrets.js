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
    'The air goes cold and smells faintly of pawn shop. Old Whisper, a ghost who sells second-hand everything, leans in close to each of you in turn. Old Whisper is very bad at whispering.',
    'Before the first die is thrown, a small grey ghost with a price tag on one ear drifts between you. "Psst," says Old Whisper, to everyone, loudly. "Something for each of you."',
    'Old Whisper floats up out of a puddle, straightens a hat that is not there, and slips a sealed envelope into every hand. "Read it. Then eat it. Or don’t. I’m not your mother."',
    'A candle that was not there a moment ago flickers on a rock. Beside it, Old Whisper is counting envelopes. "One each. No peeking at your neighbour’s. Yes, you."',
  ],
};

// kind: cover (helps the team), rival (dealt to two or more; the best wins), challenge (yours alone), bribe (bad for the team).
// mode for bribes: offer (Accept / Decline) or forced. team: only at a table of two or more. pay: a share of G (gold by act).
export const CARDS = {
  // ---- cover cards
  lead: { kind: 'cover', name: 'Lead the Charge', flavor: 'No tricks this time. The voice just wants a good show, and a good show ends with the monsters running.', rule: 'Win this battle.', pay: 0.5, check: (x) => x.won },
  shield: { kind: 'cover', team: true, name: 'The Shield', flavor: 'Someone has to stand at the front. The voice thinks it should be you. It is very rarely wrong about faces.', rule: 'Be the monsters’ target in 2 or more rounds and still be standing at the end.', pay: 1, check: (x) => x.me.filter((r) => r.leader).length >= 2 && x.F.hp > 0 },
  medic: { kind: 'cover', team: true, name: 'Field Medic', flavor: 'You smell of herbs and good intentions. The voice wants you to use both.', rule: 'Heal your friends for 15 or more health (thrown potions, revives).', pay: 1, check: (x) => (x.F.stats?.healGiven || 0) >= 15 },
  together: { kind: 'cover', team: true, name: 'No One Left Behind', flavor: 'Nobody gets left on the ground today. Not one. The voice has had enough of funerals this week.', rule: 'No hero is down when the battle ends.', pay: 1, check: (x) => Object.values(x.fighters).every((f) => f.hp > 0) },
  quick: { kind: 'cover', name: 'Quick Work', flavor: 'The voice is late for lunch. Make it quick.', rule: 'Win in 4 rounds or fewer.', pay: 1, check: (x) => x.rounds <= 4 },
  spark: { kind: 'cover', team: true, name: 'Spark Plug', flavor: 'You have more magic than sense. Share some.', rule: 'Share magic with a friend twice.', pay: 0.5, check: (x) => (x.F.stats?.shares || 0) >= 2 },
  // ---- rivalries (never hinted: the card does not say anyone else has it)
  goldrush: { kind: 'rival', name: 'Gold Rush', what: 'gold', flavor: 'Gold glints in every corner of this fight. The voice wants you to pocket more of it than anyone. It also wants a cut, later.', rule: 'Earn more gold this battle than anyone. Win and your gold is doubled.', score: (x) => sum(x.me, (r) => r.gold), doubles: true },
  arcane: { kind: 'rival', name: 'Arcane Ace', what: 'magic damage', flavor: 'Show them what magic is for. The voice is keeping score.', rule: 'Deal the most damage with your magic powers.', score: (x) => sum(x.me, (r) => r.magic) },
  finisher: { kind: 'rival', name: 'The Finisher', what: 'killing blows', flavor: 'Anyone can wound a monster. The voice remembers who finished it.', rule: 'Land the most killing blows.', score: (x) => sum(x.me, (r) => r.kills.length) },
  wall: { kind: 'rival', name: 'Stone Wall', what: 'blocks', flavor: 'Let them hit you. Let them get tired of it.', rule: 'Block the most damage.', score: (x) => sum(x.me, (r) => r.blocked) },
  bigswing: { kind: 'rival', name: 'Big Swing', what: 'the biggest round', flavor: 'One round. One enormous round. Make it count.', rule: 'Deal the most damage in a single round.', score: (x) => Math.max(0, ...x.me.map((r) => r.dealt)) },
  lucky: { kind: 'rival', name: 'Lucky Streak', what: 'triples', flavor: 'Three of a kind, again and again. The voice loves a pattern.', rule: 'Roll the most triples.', score: (x) => sum(x.me, (r) => r.triples) },
  straights: { kind: 'rival', name: 'Straight Shooter', what: 'straights', flavor: 'One, two, three, four. The voice counts along.', rule: 'Roll the most straights.', score: (x) => x.me.filter((r) => r.straight).length },
  fleet: { kind: 'rival', name: 'Fleet Foot', what: 'feet rolls', flavor: 'Your boots itch to move. Roll fast.', rule: 'Roll the highest total on your feet die across the battle.', score: (x) => sum(x.me, (r) => r.S) },
  strongarm: { kind: 'rival', name: 'Strong Arm', what: 'hand rolls', flavor: 'Your hands are full of thunder. Prove it.', rule: 'Roll the highest total on your hand dice across the battle.', score: (x) => sum(x.me, (r) => r.W + r.E) },
  bright: { kind: 'rival', name: 'Bright Spark', what: 'head rolls', flavor: 'Use your head. No, really: roll it high.', rule: 'Roll the highest total on your head die across the battle.', score: (x) => sum(x.me, (r) => r.N) },
  crowd: { kind: 'rival', name: 'Crowd Favourite', what: 'battle points', flavor: 'The crowd is watching. Well, the voice is. Same thing.', rule: 'Score the most battle points.', score: (x) => x.F.points || 0 },
  // ---- challenges (yours alone)
  thrice: { kind: 'challenge', name: 'Three Times Lucky', flavor: 'Once is luck. Twice is talent. Three times is a story.', rule: 'Roll a triple in 3 different rounds.', pay: 1, check: (x) => x.me.filter((r) => r.triples > 0).length >= 3 },
  mittens: { kind: 'challenge', name: 'Matching Mittens', flavor: 'Your left hand and your right hand should get along better.', rule: 'Both hand dice show the same number, in 2 rounds.', pay: 0.5, check: (x) => x.me.filter((r) => r.W && r.W === r.E).length >= 2 },
  thinker: { kind: 'challenge', name: 'Big Thinker', flavor: 'Somewhere in your head is a very big number. Find it.', rule: 'Roll your head die’s top face.', pay: 0.5, check: (x) => x.me.some((r) => r.N === mindSize(x.F.hero)) },
  neverlast: { kind: 'challenge', team: true, name: 'Never Last', flavor: 'Do not be the slow one. The slow one gets hit.', rule: 'Never be the slowest hero (the monsters’ target).', pay: 0.5, check: (x) => !x.me.some((r) => r.leader) },
  teetotal: { kind: 'challenge', name: 'Teetotaler', flavor: 'No potions today. You are tougher than that. Probably.', rule: 'Win without drinking a potion.', pay: 0.5, check: (x) => (x.F.potions0 ?? 0) - (x.F.potions ?? 0) - (x.F.stats?.potionsThrown || 0) <= 0 },
  biggame: { kind: 'challenge', name: 'Big Game Hunter', flavor: 'Ignore the small fry. The big one is yours.', rule: 'Land the killing blow on the toughest monster.', pay: 1, check: (x) => x.me.some((r) => r.kills.includes(x.toughest)) },
  thrifty: { kind: 'challenge', name: 'Thrifty', flavor: 'Magic rerolls are for people who do not believe in themselves.', rule: 'Use no magic rerolls.', pay: 0.5, check: (x) => x.me.every((r) => !r.paid) },
  heartmatch: { kind: 'challenge', name: 'Heart Match', flavor: 'Your heart and your head should agree, just once.', rule: 'Your heart die matches your head die in some round.', pay: 0.5, check: (x) => x.me.some((r) => r.C && r.C === r.N) },
  cliffhanger: { kind: 'challenge', name: 'Cliffhanger', flavor: 'Win it at the very edge. The voice loves a close one.', rule: 'Win while at 5 health or less.', pay: 1, check: (x) => x.F.hp > 0 && x.F.hp <= 5 },
  saver: { kind: 'challenge', name: 'Saver', flavor: 'Spend wisely. End richer in magic than you began.', rule: 'End the battle with more magic than you started with.', pay: 0.5, check: (x) => (x.F.magic ?? 0) > (x.F.magic0 ?? 0) },
  talentshow: { kind: 'challenge', name: 'Talent Show', flavor: 'Both of your talents, at once, for an audience of one.', rule: 'Both talent dice pay in the same round.', pay: 0.5, needs: (hero) => isActive(hero, 'SW') && isActive(hero, 'SE'), check: (x) => x.me.some((r) => r.talents >= 2) },
  // ---- bribes: offered (Accept / Decline), the brutal ones
  slacker: { kind: 'bribe', mode: 'offer', name: 'The Slacker', flavor: 'Why work so hard? Let the others do it. Nobody will notice. Probably.', rule: 'Deal the least damage of anyone.', check: (x) => x.others.every((n) => sum(x.rows[n], (r) => r.dealt) >= sum(x.me, (r) => r.dealt)) },
  glass: { kind: 'bribe', mode: 'offer', name: 'Glass Shield', flavor: 'Lower your guard. Just for a little while. The voice wants to see what happens.', rule: 'Have no block at all in 2 rounds.', check: (x) => x.me.filter((r) => !r.blk).length >= 2 },
  cold: { kind: 'bribe', mode: 'offer', name: 'Cold Shoulder', flavor: 'They can look after themselves. You have your own problems.', rule: 'Help nobody: no thrown potion, no shared magic, no revive.', check: (x) => !(x.F.stats?.potionsThrown || x.F.stats?.shares || x.F.stats?.revives) },
  longfight: { kind: 'bribe', mode: 'offer', name: 'The Long Fight', flavor: 'Make it last. The voice has popcorn.', rule: 'The battle lasts 5 rounds or more.', check: (x) => x.rounds >= 5 },
  pact: { kind: 'bribe', mode: 'offer', name: 'The Pact', flavor: 'The monster makes you a promise: it will never knock you out today. In return, you go easy on it.', rule: 'You cannot be knocked out this battle, but you deal half damage.', check: () => true },
  fall: { kind: 'bribe', mode: 'offer', name: 'Someone Has to Fall', flavor: 'Not you. Never you. But someone on your side has to hit the ground before this is over.', rule: 'Another hero is knocked out at least once (a revive still counts).', check: (x) => x.others.some((n) => x.rows[n].some((r) => r.hp <= 0)) || x.others.some((n) => x.fighters[n]?.hp <= 0) },
  laststand: { kind: 'bribe', mode: 'offer', name: 'Last One Standing', flavor: 'When the dust settles, the voice wants you to be the healthiest one there.', rule: 'End the battle with more health than every teammate.', check: (x) => x.others.every((n) => (x.fighters[n]?.hp ?? 0) < x.F.hp) },
  // ---- bribes: forced ("you have been chosen"), milder; they look exactly like an ordinary card
  goldfumble: { kind: 'bribe', mode: 'forced', name: 'Golden Fumble', flavor: 'You have been chosen. Gold, gold, gold. You cannot help yourself.', rule: 'Take the Gold side of every straight you roll (and roll at least one).', check: (x) => x.me.some((r) => r.straight) && x.me.every((r) => !r.straight || r.straight === 'gold') },
  spare: { kind: 'bribe', mode: 'forced', name: 'Spare That One', flavor: 'You have been chosen. That one there is the voice’s cousin. Be nice.', rule: 'Leave {spare} alive until round 4.', check: (x) => { const k = Object.values(x.rows).flat().find((r) => r.kills.includes(x.card.spare)); return !k || k.r >= 4; } },
  hoarder: { kind: 'bribe', mode: 'forced', name: 'The Hoarder', flavor: 'You have been chosen. Keep your magic close. Do not spend it all.', rule: 'End the battle with 6 or more magic unspent.', check: (x) => (x.F.magic ?? 0) >= 6 },
  lonewolf: { kind: 'bribe', mode: 'forced', name: 'Lone Wolf', flavor: 'You have been chosen. Work alone. Never hit the same monster as a teammate.', rule: 'Never attack the monster a teammate attacks that round.', check: (x) => x.me.every((r) => r.target == null || !x.others.some((n) => x.rows[n].some((o) => o.r === r.r && o.target === r.target))) },
};
const ids = (kind, team) => Object.keys(CARDS).filter((id) => CARDS[id].kind === kind && (team || !CARDS[id].team));

// How often a bribe and a rivalry turn up, by the number of heroes.
const BRIBE_CHANCE = { 2: 1 / 6, 3: 1 / 3, 4: 1 / 3, 5: 1 / 2, 6: 1 / 2 };
const RIVAL_CHANCE = { 2: 0.35, 3: 0.7, 4: 0.75, 5: 0.85, 6: 0.9 };

// Deal the envelopes for one battle. heroes: the company (hero objects); enemies: the battle's monsters; c: the campaign.
// The scene and the cover line are the same for everyone; the cards are private.
export function dealEnvelopes({ c, heroes, enemies = [], salt = '' }) {
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
    if (rng() < (BRIBE_CHANCE[Math.min(6, n)] || 0)) {
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
  // everyone else: a cover card or a challenge
  for (const h of [...open]) {
    const cover = team && rng() < 0.4;
    const list = ids(cover ? 'cover' : 'challenge', team).filter((id) => fits(id, h));
    give(h, pick(list));
  }
  return env;
}

// What this hero sees (their card only), for the Envelope screen.
export function cardView(env, name) {
  const mine = env?.cards?.[name]; if (!mine) return null; const d = CARDS[mine.id];
  return { id: mine.id, kind: d.kind, mode: mine.mode || null, name: d.name, flavor: d.flavor, rule: d.rule.replace('{spare}', mine.spareName || 'that monster'), reward: rewardLine(env, mine, Object.keys(env.cards).length > 1), scene: env.scene, cover: env.cover, voice: env.voice, answered: !!env.answered[name], accepted: mine.accepted ?? null };
}
// The prize, in one plain line (the same sums judge() pays).
function rewardLine(env, mine, team) {
  const G = gOf(env.act); const d = CARDS[mine.id]; const win = team ? 'if the team wins' : 'if you win';
  if (d.kind === 'rival') return d.doubles ? `Double the gold you earn (up to ${2 * G}), ${win}.` : `${G} gold, ${win}.`;
  if (d.kind === 'bribe' && mine.mode === 'offer') return `Accept: ${2 * G} gold if you pull it off and the team wins; lose the battle and ${env.voice || VOICE.name} takes ${Math.round(G / 2)} of yours. Decline: a little gold for your Honor.`;
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
  return { results, crooks, rivals: rivalWin };
}

// The Reveal: one line for each hero (names, never "he" or "she").
function revealLine(env, r, rivalWin, crooks, won) {
  const d = CARDS[r.id]; const v = env.voice || VOICE.name; const g = r.gold;
  const coin = g > 0 ? ` ${r.name} receives ${g} gold.` : g < 0 ? ` ${r.name} loses ${-g} gold.` : '';
  const rule = d.rule.replace('{spare}', env.cards[r.name]?.spareName || 'that monster').replace(/\.$/, '');
  const card = `${d.name}: ${rule.charAt(0).toLowerCase()}${rule.slice(1)}.`;
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

// Pay the results to the heroes and keep score in the Hall of Fame.
export function payOut(judged, heroesByName) {
  for (const r of judged.results) {
    const h = heroesByName[r.name]; if (!h) continue;
    h.gold = Math.max(0, (h.gold || 0) + r.gold);
    const rec = ((h.record ||= {}).secrets ||= { done: 0, rivalries: 0, bribesTaken: 0, bribesDeclined: 0, forced: 0, honor: 0 });
    if (r.kind === 'rival' && r.met) rec.rivalries++;
    else if ((r.kind === 'cover' || r.kind === 'challenge') && r.met) rec.done++;
    if (r.kind === 'bribe') { if (r.mode === 'forced') rec.forced++; else if (r.accepted) rec.bribesTaken++; else { rec.bribesDeclined++; rec.honor++; } }
  }
}
