# Quest Dice: Balance and Ideas Working Plan

20 October 2026 · Dave Partin (organized from Dave's voice notes; numbers measured on main at 52f9d7d)

Status: ideas and proposals only. Nothing here is built. No rule in `js/data.js` or `js/engine.js` has changed.

## How we work on this

The UI work keeps going on its own track; this plan is about the numbers underneath it, and nothing here ships to `main` until Dave says so.

- **UI lane:** camp, upgrades, the magic sheet, screens. Files under `css/` and the screen code in `js/g3/`.
- **Balance lane:** the rules and numbers in `js/data.js` and `js/engine.js`, the simulator in `tools/`, and `docs/BALANCE.md`. These files sit apart from the UI work, so the two lanes rarely touch the same lines.
- **Each balance change** goes on its own branch, is measured with the balance bot before and after, and comes to Dave as a short before/after note. Dave plays it on his phone before it merges.

## Dave's ideas, in his words (the short list)

1. Give magic an exchange rate against health and attack, and make piling everything into one thing worth less.
2. Straights come too often with talent dice; maybe 5 or 6 in a row should not count later on.
3. A Gold two-handed war hammer makes a Wizard hard to hurt on Normal, so every other weapon gets sold.
4. Triples feel special because they get rarer. Keep that.
5. The heart die should boost every white die showing its symbol (heal, pierce, magic, gold), not just its number, so it still matters with big dice.
6. Weapons could wear out with use (count uses, not damage), so swapping weapons becomes a real choice.
7. Growing magic powers (like the Wizard's charge) should start a step lower and climb, and must not outgrow the game.
8. Bonus Goals (secret objectives) could be a wager: pay gold to attempt, decline, or get a small free one when broke.
9. Keep the numbers readable: plan how much damage grows from Act I to Act III, so a hand going from d4 to d6 still matters.
10. Team campaign: a hero possessed by a parasite fights on the monsters' side for a battle; a "stay good or take the deal" choice; a heroes-against-heroes battle (2v2, 3v3).

## The damage curve

The dice themselves grow at a sensible pace; the big numbers come from powers, straights and triples stacked on top. Monster health grows about 1.5 times from Act I to Act II and about 2.2 times by Act III (`ACT_HP` in `js/data.js`), so a hero's ordinary round should grow about the same.

**Measured** (the real engine, one roll with no rerolls, no powers, 40,000 rolls each):

| Build | Attack from one roll | Monster health vs Act I |
| --- | --- | --- |
| Act I, new Knight (all d4) | 7 | 1.0x |
| End of Act I (d6 body, talent dice) | 12 | 1.0x |
| Act II Wizard, Gold war hammer d8, d6 talents | 23 | 1.5x |
| Act III, everything d10, two Gold swords | 23 | 2.2x |

So the dice alone go 7 to 23, about three times. That part is healthy. The 80-a-round turns come from the extras: a level-3 Storm Coil release is 65 attack plus 32 splash, a triple is 15 to 20, a straight 10 to 60.

**Proposed targets for an ordinary round** (dice, weapon, an every-round power; not a big release):

| Act | Ordinary round | Big moment ceiling |
| --- | --- | --- |
| Act I | 10 to 15 | about 30 |
| Act II | 15 to 25 | about 50 |
| Act III | 25 to 40 | about 80 |

**Rule of thumb:** a big moment (a triple, a power release, a long straight) should be worth about two ordinary rounds, never five. When a hand grows from a d4 to a d6, those extra 1 to 2 points a roll should still be a real share of the round.

**First measurement to add:** teach the balance bot to report per-round damage with powers and rerolls included, by act and class.

## An exchange rate for magic

Healing already sets the price: 2 magic heals 4 (`HEAL_COST`, `HEAL_AMOUNT`), so **1 magic is worth 2 health**. Today the upgraded powers pay up to eight times that rate, which is why magic stops feeling like your health and starts feeling like a cannon.

**What 1 magic buys today:**

| Use of magic | Base | At power level 3 |
| --- | --- | --- |
| Heal | 2 health | 2 health |
| Magic Missile (B, every round) | 2 pierce | 5 pierce |
| Barrier (B, every round) | 4 block | 10 block |
| Arc Bolt (A, dice) | about 2.3 attack | about 9 attack (2 magic rolls 4d8) |
| Storm Coil (C, 4 charges) | 6.5 attack + splash | 16 attack + 8 splash |

**Proposed rate card** (a target, to tune in play):

- 1 magic = 2 health = 2 attack = 1.5 pierce (pierce cannot be blocked, so it is worth more per point).
- Every-round powers (B) pay about the base rate.
- Charge powers (C) pay about 1.5 times the base rate (you wait several rounds and risk getting hurt while you save).
- Once-a-battle powers (A) pay about 2 times the base rate.
- Power levels add +25% of the base each, not +50% (`scaleNum` in `js/engine.js`). A level-3 power goes from 2.5 times its base to 1.75 times.

**Too much of one thing should be worth less:**

- Keep the magic cap (12, or 15 for the Wizard).
- A second cast of an every-round power costs 1 more after round 4, so a long fight leans on the dice again.
- Each extra Arc Bolt die costs a little more (2, 2, 3, 3) rather than a flat 2.
- Healing from magic in one round is capped at about a third of max health.

The goal is Dave's line: if you are getting hurt a lot, your magic is your health. That only feels true when spending magic on attack and on healing are close in value.

## Straights

Dave is right: a player who chases straights lands five in a row in more than half of all rounds. Triples get rarer as the dice grow (15% of rolls at the start, 5% in Act III), which is why they still feel special.

Today a straight needs 5 numbers in a row across up to nine dice and pays 10 / 18 / 30 / 45 / 60 for 5 / 6 / 7 / 8 / 9 in a row (`STRAIGHT` in `js/data.js`).

**How often a straight lands** when the player spends all three free rerolls (3 dice each) chasing it, 20,000 rounds per cell:

| Build | Minimum 5 | Minimum 6 | Minimum 7 |
| --- | --- | --- | --- |
| End of Act I (d6 body, d4 talent dice) | 77% | 45% | 0% |
| Act II Wizard (Gold war hammer, d6 talent dice) | 53% | 42% | 31% |
| Act III (everything d10, two swords) | 67% | 50% | 34% |

Without rerolls the rate is 15 to 24% a roll, so it is the reroll chase that makes straights routine.

**Options:**

1. **The minimum grows with your biggest die.** d4 and d6 boards need 5 in a row, d8 boards need 6, d10 boards need 7. Straights stay about one round in three all game. (Recommended.)
2. **The minimum grows with the act:** 5 in Act I, 6 in Act II, 7 in Act III. Simpler, but a d4 hero in Act II is punished.
3. **Keep 5, cut the prize:** 5 in a row pays 6, and the table climbs steeply from 7.

Either way, keep all nine dice in play for straights.

## The heart die: match the symbol, not the number

Today a heart of 1 to 4 adds +2 only for white dice showing that exact number (`HEART_AMP`), so as the white dice grow to d10 the heart matters less than half as much. Matching by symbol keeps it steady all game.

The white dice repeat one pattern (`FACE_PAY`): heal on 1, 5 and 9; pierce on 2, 6 and 9; magic on 3, 7 and 10; gold on 4, 8 and 10.

**The proposal:** heart 1 (heal) adds +2 heal for every white die showing a heal face (1, 5 or 9). Heart 2 does the same for pierce faces, 3 for magic, 4 for gold. Faces 9 and 10 carry two symbols and count for either. Hearts 5 and 6 stay as they are (+4 to blue or red weapons).

**Average heart bonus per roll** (four white dice, worked out from the face table):

| White dice | Today (match the number) | Proposed (match the symbol) |
| --- | --- | --- |
| All d4 | 1.3 | 1.3 |
| All d6 | 0.9 | 1.3 |
| All d8 | 0.7 | 1.3 |
| All d10 | 0.5 | 1.6 |

Small, so it will not break the balance, but it gives the heart a job in Act III and makes Heart Change (3 magic to turn the heart by 1) worth using late. Triples that use the heart still match by number. The battle screen needs to light the matching white dice.

## Weapons: wear, and a reason to swap

A Gold war hammer at the start of Act II means every weapon drop gets sold, and the loot stops being exciting.

**Why the hammer is so strong:** a d8 brutal weapon shows 0 on four faces and 7, 8, 8 and 8 (counting its attack icons) on the other four, before the Gold icons. The blank still adds the full d8 hand, and it is two-handed, so it rolls twice. The whole board averages about 23 attack a roll, on a 24-health Wizard who rarely gets hit.

**A wear rule (Dave's: count uses, not damage):**

- Every weapon has a wear track. Each round it is in your hands ticks it once, attack or guard, whatever it rolls.
- How long it lasts depends on its temperament: steady about 60 rounds, balanced 45, risky 35, brutal 25.
- A worn-out weapon is not destroyed. It drops one metal (Gold to Silver, Silver to Bronze) and its wear track refills.
- At camp, **Repair** refills the track for about a quarter of the weapon's forge price. A gold sink that grows with the weapon.
- Legendary weapons wear but never drop below Gold. Diamond weapons are already one-fight weapons, so they are left out.

**What this does:** the hammer stays great for about five fights, then you choose: repair it, or swap in the Silver spear you have been carrying. Showing wear (a small bar under each weapon) is a UI job once the rule is agreed.

## Powers that grow: the Wizard's Storm Coil

Each round, 1 magic stores a charge (up to 4); releasing them pays 5, 6, 7 and 8 attack, 26 in all, with half again splashing. Each power level adds half the total, so level 3 releases 65 attack and 32 splash for 4 magic.

**Dave's idea, made concrete:** start each charge lower and climb faster.

| Charges released | Today (level 0) | Proposed (level 0) | Today (level 3) | Proposed (level 3) |
| --- | --- | --- | --- | --- |
| 1 | 5 | 4 | 14 | 7 |
| 2 | 11 | 10 | 29 | 18 |
| 3 | 18 | 18 | 45 | 32 |
| 4 | 26 | 28 | 65 | 49 |

Proposed: charges pay 4, 6, 8, 10, and each power level adds +25% instead of +50%. A full charge is still the Wizard's best moment, but a level-3 release is about two good rounds, not five. Every class's charge power shares this rule (`chargeGain` in `js/engine.js`). Meteor (4 times the round number) needs its own check. Count splash at half value when weighing a power.

## Bonus Goals as a wager

Today the solo Bonus Goal is free and pays about 50 to 60 gold. Putting gold down turns it into a real decision.

- **Decline.** Nothing changes.
- **Small stake:** pay 10 in Act I (20 in Act II, 30 in Act III). Win the goal and get 2.5 times your stake back.
- **Big stake:** pay 30 in Act I (60, 90 later). Win the goal and get 3 times back.
- Miss it and the stake is gone. Hard goals pay one step more (3 times and 4 times).
- **When you are broke:** a hero with less than the small stake gets the goal for free at a small reward of about 15 gold.

If a typical player lands a goal about half the time, 2x only breaks even; 2.5 to 3 times is worth a try, but betting on goals that don't suit your hero loses gold. Knowing your hero earns gold. Tables keep their secret envelopes as they are.

## Team campaign ideas (design only)

The engine already resolves everyone at once after each player picks a target and locks in, so a hero on the other side needs new rules, not a new game.

1. **The Parasite.** A creature latches onto one hero for a battle; their miniature walks to the monsters' side. They keep their dice and target heroes. Nobody is knocked out by a friend: at a quarter of their health they shake it off and walk back. Killing the host monster frees them too. They score for damage dealt, and the reveal tells the story.
2. **Stay good, or take the deal.** An offered envelope: "Fight for the Hollow King this battle and keep half the spoils." Fits the bribes already in `docs/SECRET_OBJECTIVES.md`.
3. **Hall of Mirrors.** A rare battle where the company splits into two teams, 1v1 to 3v3, left side against right side. Fleet Dice's duel brought into the campaign; a good finale for a game night.

To decide first: how a turned hero's block works against friends, whether heals cross sides, and how a phone shows two teams.

## Order of work

- [ ] **Measure the real curve:** per-round damage with powers and rerolls, by act and class, and how often heroes drop below half health on Normal.
- [ ] **Powers and the exchange rate:** level scaling +50% to +25%, charge steps 4, 6, 8, 10, Arc Bolt dice priced up.
- [ ] **Straights:** minimum length grows with your biggest die.
- [ ] **Heart die by symbol.**
- [ ] **Re-check Normal difficulty** after the three changes above; only then touch monster health.
- [ ] **Weapon wear and Repair** (needs a save field and camp UI; waits for the camp UI work to settle).
- [ ] **Bonus Goal wagers.**
- [ ] **Team ideas:** design only; pick one to prototype after Act III has its own monsters.

Nothing here changes how the game starts or the class starting dice, which Dave asked to keep (10 Oct).

## How the game feels today (Dave, 20 Oct)

"Normal is easy and Hard is normal." Set beside the bots (docs/BALANCE.md, 16 Oct): on Normal the sensible bot wins about 90% of fights and 76-88% of bosses, the wise bot 96-99% and about 90%. Hard today is monster health x1.15 and +2 a hit; Legendary x1.6.

What this suggests:

- **The power creep is likely the cause, not the monster table.** The hammer, routine straights and +50% power levels are all things Dave plays with and the bots use less well. The three changes in "Order of work" (powers, straights, heart) should pull Normal down toward where Hard sits now, which is why monster health is touched only after them.
- **Measure how hurt you get, not only whether you win.** "Not even close to being hurt" is the real complaint. Win rates near 90% are fine for ordinary fights; the tension should come from health worn down across a quest. Add the lowest health per fight and per quest to the first measurement.
- **Dave is not a typical player.** He designed the game. The beta friends will play worse than Dave and probably worse than the wise bot, so the target is: Normal feels tense for a new player and comfortable for Dave, and Hard is where Dave should sweat.
- **The quick fallback, if wanted before the rule changes:** move every setting down one step (today's Hard numbers become Normal, Normal becomes Easy, Legendary stays the pro road). One line in `DIFFICULTY`; easy to undo.

## Monsters grow by dice, not by plus (Dave, 21 Oct)

Dave: make the game harder by giving monsters more dice instead of more base attack. "This boss has 30 attack + 1 die" takes the fun out; "it rolls 3d8" is scary, and the swing (some very low rolls, some very high) is the fun.

**Today:** every monster rolls one power die (d8 to d12) and adds a fixed part that grows: its own base, +0 / +2 / +5 by act (`ACT_FLAT`), +1 every three steps, +2 on Hard and Legendary. By Act III a typical blow is about 13 + d12, mostly fixed.

**What different dice really roll** (same average, worked out exactly):

| Blow | Average | Lowest to highest | 8 rolls in 10 land in |
| --- | --- | --- | --- |
| Today, Act III: 13 + d12 | 19.5 | 14 to 25 | 15 to 24 |
| 3d12 | 19.5 | 3 to 36 | 12 to 27 |
| 2d12 + 6 | 19 | 8 to 30 | 12 to 26 |
| 4d8 + 1 | 19 | 5 to 33 | 13 to 25 |
| 6d6 | 20 | 5 to 35 | 15 to 25 |
| Today, Act II: 5 + d10 | 10.5 | 6 to 15 | 6 to 14 |
| 2d10 | 11 | 2 to 20 | 5 to 16 |
| 3d6 + 1 | 11.5 | 4 to 19 | 8 to 15 |

**The surprise in the numbers:** a few big dice swing the most; many small dice settle near the middle (6d6 lands about where 13 + d12 does, and only its rare extremes differ). Pick the dice for the feeling: two or three big dice when a monster should be wild, a handful of small ones when it should look scary but stay fair.

**A shape to try:**

- Act I monsters roll one die, Act II two, Act III three (this replaces `ACT_FLAT`). A boss rolls one more than its act. A small base stays for a monster's character (the ogre is always strong).
- Difficulty adds a die instead of a plus: Hard gives every monster one more small die (a d4, worth about +2.5, close to today's +2); Legendary one more of the monster's own size.
- Keep the averages close to today's so the bots' balance holds; what changes is the feel and the spikes.

**How it would play:** blocking becomes a real read ("about 13, could be 20"), a lucky low roll is a breath of relief, and a spike is what finally hurts a frail Wizard on Normal, which helps with "Normal is easy" without raising monster health. Watch the top end: 3d12 can roll 36, so check how often a full-health hero falls in one round. The monster plate, info sheet and recap already show monster dice as red and blue die chips; "3d8" just needs room on them (UI lane, later).

## Weapon wear: Dave's call (21 Oct)

Dave: keep it. "If you're being offered a new weapon after every battle, a weapon finally breaking is no big deal, and you might have to downgrade, or you might hold onto a weapon you really like, especially if you know it only has so many rounds left." The fun is saving a favourite: use a spare on the easy fights and bring the good one out for the elite and the boss.

**Dave's numbers:** Bronze 15 rounds, Silver 20, Gold 25 (counting rounds the weapon is in your hands, not damage).

**What that means in play:** a solo win already offers two weapons (`battleRewards`: players + 1), and the pack holds four (`BAG_MAX`), so a replacement is never far away. Fights last about four rounds today (to be confirmed by tools/curve.mjs), so Bronze lasts about 4 fights, Silver 5, Gold 6. An act is 10 steps, so even a Gold weapon is gone by the end of the act unless you rest it. Counting rounds also rewards a strong weapon a little: it ends fights sooner, so it wears less per fight. If fights get longer after the balance changes, these numbers shorten in fights; keep an eye on it.

**Recommended answers to settle before building:**

1. **When it breaks:** never mid-fight. When its count runs out, it finishes that battle and breaks afterwards ("Your Gold War Hammer shattered after the fight").
2. **What counts:** each round a weapon is in your hands, attack or block, ticks once. A two-handed weapon ticks once (it is one weapon). Diamonds stay one-fight weapons, outside this rule.
3. **Forging and training:** forging up a metal refills the weapon to the new metal's count (so the forge is also the repair shop); training to a bigger die does not refill it. No separate Repair button, to keep camp simple.
4. **Legendary weapons:** last far longer (about 40 rounds) rather than never breaking, so even a legend is a choice.
5. **Never empty-handed:** if both hands break and the pack is empty, a plain Bronze weapon of your class's kind is waiting (and the traveller always has one).
6. **Selling:** a weapon sells for less the fewer rounds it has left.
7. **Choosing what to bring:** swapping happens at camp (Gear tab) as now. A quick swap on the quest card (like the Diamond strip) is the nicer later version.

**Who builds what:** the rule, the save field, the bot (it must learn to rest a good weapon for big fights) and the measurement are the balance lane. Showing "rounds left" on each weapon card and in battle is the UI builder's job; the rule should land first behind the scenes, then the display, so the two never edit the same screens at once.

## A second read (Claude, 20 Oct): checks, catches and two ideas

**Checked against the code on `main` (52f9d7d):** 2 magic heals 4; straights pay 10 / 18 / 30 / 45 / 60; the heart amplifies only the exact number today (`HEART_AMP`); Storm Coil pays 26 at level 0 and 65 + 32 splash at level 3; `scaleNum` is +50% a level; the Wizard has 24 health and holds 15 magic; `ACT_HP` is 1.05 / 1.55 / 2.35. The heart-die averages in the table above re-derive the same from `FACE_PAY`. The plan matches Dave's voice notes (below) point for point.

**Catches before anyone builds:**

- **Power levels have already flipped once.** Dave first asked for a steady climb (3, 4, 5, 6) and powers went to +25% a level; on 16 Oct they went to +50% ("stronger powers"). The +25% here is a return to Dave's first instinct. Decide it once so the bots stop trading it back and forth.
- **The Bonus Goal wager cuts gold as written.** Today the solo goal is free and pays about 50 to 60 gold; under the wager an Act I win on the small stake returns 25 (15 profit). Either scale the payouts to today's reward, or let the wager sit on top of the free goal. Gold was just tuned (the economy study), so this reaches camp prices.
- **The war hammer is the first suspect, not weapons in general.** Its blank faces still add the full hand and it rolls twice. Tame that one weapon, measure, and see whether swapping comes back on its own before adding wear tracks, repair and a bar on every weapon.
- **Straights tied to your biggest die need a screen line.** "Straight: 6 in a row" has to show somewhere, or five in a row paying nothing will feel like a bug.
- The team ideas wait "until Act III has its own monsters"; it has them now (the ten Act III miniatures, the elites, Vharaxis).

**Two ideas that grow from these:**

1. **Measure fights in rounds, not damage.** Dave's instinct (Act II about +50%, Act III about +100%) is the same as the monster health curve (1.5x, 2.2x). That means the real target is that an ordinary fight lasts about the same number of rounds in every act, so every hit is about the same share of a monster all game, and a d4 to d6 step still moves the fight. Teach the balance bot to report rounds-to-kill by act and class alongside per-round damage.
2. **The right weapon for the fight.** A gentler cousin of wear: some monsters shrug off one kind of blow (bones laugh at arrows, a ward eats magic, armour dulls blades). The quest card already shows the monsters before you go, and the Diamond strip already lets you choose what to bring, so the choice of weapon happens before the fight, without bookkeeping during it.

**First step to hand a builder:** the measurement in "Order of work" (per-round damage with powers and rerolls, rounds-to-kill, how often heroes fall below half on Normal). It only touches `tools/` and changes no rule, so it cannot collide with the UI lane.

## Dave's voice notes (20 Oct, as spoken)

> OK, to be honest, we have to recognize that ChatGPT 6.1 is doing a good job at the user interface. And one thing I want to do is just let it continue building the new look. But this morning I had ideas and I just wanna talk them out with you and let's not overly push to main too quickly to make sure that we don't step on each other's toes. But this is what I wanna process right now. Right now, GPT is working on user interface. What I want you to think about is the balance of attacks and how it progresses through the game. I was just thinking through if magic is worth a certain amount of health and the way that the magic power works that you can put magic into a building magic section, you can put magic into a one shot repetitive, you can put magic into that big mega blow once per battle, that we can almost assign magic is worth this many attack. But we also have to make sure that too much of anything has depreciating value. That's what makes these games fun. You can't just put all your eggs in one basket and win.
>
> Secondly, as I've been playing with the wizard and using talent dice, I'm getting a lot of straights. Almost too many straights, so I want to evaluate how many dice we should use for straights, because I like the idea of having all nine dice out there, but maybe straights should not be allowed at lower numbers like five in a row or even six in a row maybe. I'm currently using a golden weapon. It's like a two-handed, half the dice are zeros, but the other half are 6, 7, 8s and I'm doing a ton of damage as a wizard with my double-handed hammer. I'm playing on Normal and not getting even close to being hurt. I like the triples because they're more rare later in the game once you have lots of dice, so when you get them they're special.
>
> I also have this idea that the heart dice is currently tuned to only certain numbers for 1, 2, 3, 4, and I'm thinking the heart dice should continue to have power even when you have bigger dice. Because the white dice have basically health or pierce or gold or magic, that one through four on the heart dice should actually support all dice that have that side showing. For example the five also has health on it, so the health heart dice should support and cause value for the five and the one, so as you gain strength dice or head dice, you also can still use your heart dice to be helpful, because it makes you wanna roll your heart dice to match more often, even though you have the high numbers.
>
> I'm also wondering if the weapons should have a decay to them, because I'm using a golden hammer that might be the best attack weapon currently, but I just started Act II, and I never really feel like I need any other weapons; I'm just selling every weapon I find because this weapon's a monster. If there is a way to keep up with not so much the number of hits, but the number of times that you use your weapon as attack or defense (it doesn't matter how much damage it does or how much it blocks), there's almost a countdown. Minecraft has a decay of the weapon where you can't endlessly use it, and I think there are times where I would switch out my weapon, and that would be a good idea.
>
> So let's have a good balance of gold and magic and health and piercing, and I think magic is a key area to consider, what those powers do as they grow. For example, I'm using the wizard that has a growing power. If it gets so big, maybe it should start one attack less, so it's not very powerful the very first time you charge it, but then it increases after every charge. But then we need to balance: is it worth putting effort into having a lot of magic? If you're getting hurt a lot, your magic is basically your health, which I really like in this game. I think this game has a lot of potential.
>
> We've recently added some playful secret objectives, or in solo mode an objective to try a special achievement, and I think those special achievements per battle are good, but you should pay gold to attempt it, or you can decline it. If you pay to attempt it, it's worth the chance. I don't know if you pay 10 and get 30, or pay 20 and get 40, or if you're broke you just have a potential to have an achievement.
>
> Now I wanna dial the game in so it's not just "I'm doing 80 attack on my turn" and I lose track of what this little hit or that little hit is doing because it's such a big number. We need to think through the amount of attack you do in Act I and, as you gain magic abilities and perks going into Act II, are you doing 100% more damage, or should Act II be like 50% more and by Act III 100% or maybe 200% more? If numbers get really big, like 1,027 damage, I'm not even thinking what I'm doing anymore. But when I roll my strength from a one to a five, that's four more points and I wanna make sure those four points matter. Dice going from a d4 up to a d10 is substantial, and we should expect growing attack, but be ready for it: as magic grows, as weapons grow, we're doing more damage a lot.
>
> On a team game, it would be fun if there was a campaign where somebody gets possessed or gets a parasite, and for one of the battles fights on the enemy side: when the map opens up their character pops over to the evil side, the monsters play alongside that one character, and that character fights against the other heroes. Maybe there's even a level where the team battles itself, 2v2 or 3v3, because they're all possessed. If we're just choosing an enemy and locking in damage, it may not be too complicated visually: two teams, one on the left, one on the right, choosing who they fight, and then they fight it out. Ideas like this will make the game a lot of fun once you have a campaign and friends who understand the dice grid: spaces where friends have to decide to stay good or go to the monster side. Plus the upgrading, choosing strong defense, middle defense or no defense, and where to put your energy on die size or weapons. We have great bones in this game. I know we can't work on all of these right now, but store them in a working plan.
