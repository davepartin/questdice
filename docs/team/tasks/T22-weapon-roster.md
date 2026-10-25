# T22: the weapon roster, checked before any card is finalised (Claude, 25 October 2026)

Dave's direction (and the Director's note of 25 Oct): settle the weapons first, then draw the cards. Start from the eight existing types, prove each has its own job, test whole loadouts, keep bot evidence apart from human play, and keep one dataset that the engine and the cards share. **Nothing in the game changed.** This is a first reading for Astra and Dave, with the questions it raises.

**The dataset.** [T22-weapons-dataset.json](T22-weapons-dataset.json) is generated from the engine by `node tools/t22-dataset.mjs --write`: every weapon, at every metal and size, with every ammunition for the Arrows, plus price and role. A test fails if the file and the engine ever disagree, so a card can read this and a face is typed in one place. It is a snapshot of what plays today, marked PROPOSED until the numbers are reviewed.

## What the eight weapons are today (Bronze, no icons)

The four offensive weapons have almost the same average hit and differ in how swingy they are, which is the right way to make weapons feel different without making one the best. At d4 the Dagger, Sword and Spear average about 1.75 to 2 and the Axe 2; at d10 they average 4.1 to 4.6. What differs is the spread: the Dagger is steady (one blank, standard deviation 1.3 at d4 and 2.8 at d10), the Sword balanced (1.5 and 3.0), the Spear riskier (1.6 and 3.6) and the Axe brutal (2.0 and 4.1, with four blanks on a d10). The Round Shield is the Sword with its colours swapped and the Tower Shield is the Axe swapped, so the defence pair has the same shapes: steady-ish and balanced for the Round Shield, all or nothing for the Tower Shield. The Bow is the small one (average 1.25 at d4, 2.8 at d10, half a Sword) and the Arrows the large one (2.25 and 5.0, the highest of all); together they come to 3.5 at d4 against a Sword with a Round Shield's 3.5, and 7.8 at d10 against 9.2.

## Where the variety is thin

1. **The Spear is the weak link.** It is a near twin of the Axe at the big sizes (the shape distance between them is 0.38 at d8 and 0.8 at d10, the smallest of any pair) and of the Dagger at d4 and d6 (0.25 and 0.33). In the fights below it is also the worst offensive weapon from Act II on (58% and 53% against 70 to 78% for the Sword and Axe), though with 40 fights a cell only gaps of about 20 points mean anything.
2. **The Silver and Gold icons are a short list.** Across all eight weapons the icons are only pierce, heal and magic; gold from fallen monsters and block-plus never appear on a released weapon. The Axe, Bow and Arrows are pierce and nothing else; the Round Shield and Tower Shield are both heal and magic. So a Gold Axe, Gold Bow and Gold Arrows look alike, and so do the two shields.
3. **Defence is two weapons, both mirrors of an offensive one.** There is no steady, many-small-blues shield, and nothing tells a Round Shield from a Tower Shield except how swingy it is.
4. **Metals add icons, never numbers**, which keeps Bronze, Silver and Gold equal in average hit. That is clean; the card just has to make the icon identity of each weapon readable.

## What the fights say (bots, 40 matched fights a cell, same hero and seeds)

Full tables: [T22-measured.md](T22-measured.md). The bot is the same everywhere, so this compares weapons with each other; it is not how a person plays, and 40 fights give about plus or minus 8 points, so only large gaps are readable.

Act I step 2 with Bronze d4: every set wins (95 to 100%), so the early fight does not separate weapons by winning; it separates them by cost. Two attacking weapons finish a fight about one round sooner (3.5 to 3.7 rounds against 4.1 to 4.6) and the hero leaves with 74 to 78% of their health against 84 to 88% with a shield. Act II step 5 with Silver d6: Sword and Round Shield wins 78%, Dagger and Round Shield 75%, Dagger and Tower Shield 75%, Sword and Sword 73%, the Arrows sets 65 to 73%, Axe and Axe 60%, Sword and Tower Shield 60% (a very slow fight, 17.8 rounds), Spear and Round Shield 58%. Act III step 8 with Gold d8: Sword with Tower Shield 73%, Axe with Round Shield 70%, Dagger with Tower Shield 65%, Sword and Round Shield 63%, Spear and Round Shield 53%, Frost Arrows 58%, and every two-offence set 40 to 45%.

**What I read from it.** A shield is worth having: by Act III every pair of two attackers loses 15 to 30 points of win rate to a pair with a shield, because they trade a little speed for much more damage taken. So "Bard with two daggers" is a real, aggressive playstyle and the fastest start, but it is not a free upgrade and it falls behind later; it makes a good optional start, not a better default. The Tower Shield is not worse than the Round Shield despite its blanks (73% with the Sword in Act III) and is slower. The Arrows' four ammunitions differ little in the early fights and Frost leads in Act III, on small samples. The one clear outlier is the Spear.

## Questions for Astra and Dave (nothing below is built)

1. **Keep eight types, add none** (the Director's rule), and give the Spear a job of its own. A candidate: the Spear is the reach weapon, few blanks and a pierce icon on most faces, with a lower top than the Axe, so it stops being a smaller Axe. I would test that on this same harness before proposing numbers.
2. **Give each weapon its own icon identity** for Silver and Gold so cards read differently: for example Dagger heals and gathers gold, Sword pierces, Axe adds block-breaking attack, Spear pierces, Round Shield heals, Tower Shield adds block, Bow adds magic, Arrows keep pierce, fire and frost. That uses icons the engine already knows plus gold, and needs no new rule.
3. **Starters:** keep the approved Bronze offence plus Bronze shield for every class, and decide whether the Bard's two-dagger start is offered as a choice. The data above says it is faster and riskier, not stronger.
4. **Resale:** a sale pays half of everything put into a weapon, its found worth plus the gold spent on sizes, so each upgrade returns half and there is no buy-and-sell profit. This replaces the as-found rule in the preview and is still only a candidate until measured against the price list.
5. **Cards for the dice:** the white dice (head, feet, the talent and the Heart) use existing numbers and can be drawn from the existing rules now; a Left and Right Hands card is a visual candidate with two independent purchases, and the camp's dice grid opens the card of the die you tap.
6. Next after your answers: the Spear and icon candidates measured on this harness, then whole loadouts against the real monsters (the data above is one hero shell), then human play.

## Dave's direction + Crockpot proposal - needs Astra ruling (Crockpot (Grok Bot), 25 Oct)

**Dave's answer to Q1 and Q3 (25 Oct, 6:13 PM CT, in his words summarised):**
- **No "reach weapon" role.** He doesn't want it. The Spear needs a different fix.
- **Each weapon should balance attack (red) and block (blue).**
- **The class only sets the STARTING weapons, all Bronze.** For example Knight sword and shield, Ranger bow and arrows, Wizard maybe a generic staff ("consider a few options").
- **No rules on which class can use which weapon.** Players start with Bronze basics and will probably buy and use a great Gold weapon as soon as they find one.

Q2 and Q4-Q6 are not answered here.

**PROPOSED starting-weapon options (Bronze only, the eight T22 types, existing card art where it exists).** Option A is the recommended default for each class.

| Class | A (default) | B | C | Art / notes |
|---|---|---|---|---|
| Knight | Sword + Round Shield (today) | Sword + Tower Shield | Spear + Round Shield | All art exists. |
| Ranger | Bow + Arrows, normal ammo (today) | Bow + Arrows, choose any ammo at start | Dagger + Round Shield (close-quarters hunter) | All art exists. Bow + Arrows has no blue hand; Dave's attack/block balance has to come from the Bow's own blue faces. |
| Wizard | Staff (two-handed, generic) | Dagger + Round Shield ("staff" stand-in) | Spear + Round Shield (quarterstaff stand-in) | **Gap:** the Staff is not one of the eight T22 types and has no Bronze/Silver/Gold card art (`assets/cards/weapons` has no staff-*). A = new art plus keeping the Staff as a 9th type. B and C use existing art. An "orb" would be a new type, so it is not proposed. |
| Dwarf | Axe + Tower Shield (today mace + tower; the Axe is the T22 name, art `axe-*`) | Axe + Round Shield | Sword + Tower Shield | All art exists. |
| Bard | Dagger + Round Shield (T21 default: every non-Ranger has a Bronze shield) | Dagger + Dagger (fast, risky, offered as a choice) | Sword + Round Shield | All art exists. The data model still has Dagger + Bracer; the Bracer has no card art and is not one of the eight. B has no blue hand: faster, but it fell behind by Act III in the measured fights. |

**Rules this proposal assumes (from Dave):**
- Every class can buy and use every weapon. The class only picks its Bronze starters.
- Every start includes at least one weapon with blue faces. The exceptions are Ranger A/B (the Bow's blue faces carry the block) and Bard B, which is the optional aggressive pick.

**Open for Astra:**
- Whether the Wizard keeps a Staff (a 9th type plus new art) or uses a stand-in.
- Whether "choose your start" (A/B/C) is offered at hero creation or the start stays fixed to A.

No numbers changed.

**Dave decision (25 Oct, 6:32 PM CT, recorded by Crockpot):** no weapon wear in the live game or the previews. Weapons last forever. Starters and loadouts assume no wear. Claude implements; details are in T17.md.
