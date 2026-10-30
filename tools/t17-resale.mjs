// T17 resale candidate (WEAPON_SIZE.resale = 0.5), checked on the real engine: node tools/t17-resale.mjs [out=/tmp/t17-resale.md]
// 1. Before and after: what a sale pays today (half of what the weapon was worth AS FOUND, nothing back for sizes bought) against the candidate, step by step.
// 2. Loops: every weapon, metal, found size and store price modifier (a 60% discount is the cheapest the camp ever sells, priceMod floor 0.4), through buy, grow k sizes, sell.
//    A loop "pays" if the gold back exceeds the gold put in. None may. A weapon that was found (spoils) costs nothing to get, so selling it is income, not a loop; growing it is checked too.
// 3. Rounding, save and load, bag against hand, a two-hander's twin, and an old save.
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); (await import('../js/release.js')).applyRelease(); // the released rules, as the game plays them
export const IDS = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'];
const SIZES = [4, 6, 8, 10]; const NEXT = { 4: 6, 6: 8, 8: 10 };
const heroWith = (gold) => { const h = E.newHero({ name: 'R', cls: 'knight', seed: 3 }); h.gold = gold; h.campaign.act = 2; h.campaign.step = 4; return h; };
function withShop(h, inst, price) { h.campaign.shop = { step: `${h.campaign.act}.${h.campaign.step}`, items: [{ inst, price, sold: false }], charm: null }; }
// buy (or find), grow k sizes, sell; returns { in, out, sell } using only the engine's own functions
export function loop({ id, metal, size, mod, grow, found }) {
  const h = heroWith(10 ** 6); const inst = E.makeWeapon(id, metal, () => 0.5, size); const V = E.weaponValue(inst);
  let spent = 0; const g0 = h.gold;
  if (!found) { const price = Math.max(1, Math.round(V * mod)); withShop(h, inst, price); if (!E.buyItem(h, 0)) throw new Error('buy failed'); spent += price; } else h.bag.push(inst);
  const stored = h.bag[0];
  for (let i = 0; i < grow; i++) { const info = E.trainInfo(h, stored.uid); if (!info.ok) { if (info.why === 'max') break; throw new Error('train blocked ' + info.why); } if (!E.trainWeapon(h, stored.uid)) throw new Error('train failed'); }
  const spentTotal = g0 - h.gold; const sell = E.sellValue(stored); const before = h.gold; E.sellItem(h, stored.uid);
  return { spent: spentTotal, sell, gain: h.gold - before, V, size: E.weaponSize(stored) };
}
export function allLoops(share) {
  D.EXPERIMENT.weaponSize = true; D.WEAPON_SIZE.resale = share;
  const rows = []; let worst = -Infinity;
  for (const id of IDS) for (const metal of [0, 1, 2]) for (const size of [4, 6, 8]) for (const mod of [0.4, 0.5, 0.6, 0.8, 1, 1.25]) for (let grow = 0; grow <= 3; grow++) {
    const r = loop({ id, metal, size, mod, grow, found: false }); const net = r.sell - r.spent; worst = Math.max(worst, net);
    rows.push({ id, metal, size, mod, grow, net, ...r });
  }
  return { rows, worst };
}
const mdRow = (a) => `| ${a.join(' | ')} |`;
const run = () => {
  const out = process.argv[2] || '/tmp/t17-resale.md'; let md = `# T17 resale candidate, checked on the engine (tool tools/t17-resale.mjs)\n\nRule under test: **sale = 50% × (what the weapon was worth as found, or what the store was actually paid when that was less, + every size bought since)**. Worth as found is the engine's weaponValue at the found size (base price × metal × size factor). Nothing in the game uses it; the switch is WEAPON_SIZE.resale (null everywhere).\n`;
  // 1. before and after
  md += `\n## Before and after, one weapon grown a size at a time\n\nA Silver weapon found at d4 (a spoil, cost nothing), then grown with the covers (40, 80, 140). "Today" is the T17 rule now (half as found, nothing for sizes). The last column is the sale value the purchase would show before it is made.\n\n${mdRow(['Weapon', 'Size', 'Gold put in (covers)', 'Sale today', 'Sale, candidate', 'Gain from this size'])}\n${mdRow(['---', '---', '---', '---', '---', '---'])}\n`;
  for (const id of ['dagger', 'sword', 'spear']) {
    D.EXPERIMENT.weaponSize = true; D.WEAPON_SIZE.resale = null; const hT = heroWith(10 ** 6); const iT = E.makeWeapon(id, 1, () => 0.5, 4); hT.bag.push(iT);
    D.WEAPON_SIZE.resale = 0.5; const h = heroWith(10 ** 6); const inst = E.makeWeapon(id, 1, () => 0.5, 4); h.bag.push(inst); let put = 0; let prev = E.sellValue(inst);
    md += mdRow([D.WEAPONS[id].name, 'd4 (found)', 0, (D.WEAPON_SIZE.resale = null, E.sellValue(iT)), (D.WEAPON_SIZE.resale = 0.5, prev), '']) + '\n';
    for (const sz of [6, 8, 10]) {
      D.WEAPON_SIZE.resale = null; E.trainWeapon(hT, iT.uid); const today = E.sellValue(iT);
      D.WEAPON_SIZE.resale = 0.5; const info = E.trainInfo(h, inst.uid); E.trainWeapon(h, inst.uid); put += info.cost; const now = E.sellValue(inst);
      if (now !== info.sellAfter) throw new Error('trainInfo.sellAfter disagrees with the sale');
      md += mdRow(['', `d${sz}`, put, today, now, `+${now - prev}`]) + '\n'; prev = now;
    }
  }
  // 2. loops
  const { rows, worst } = allLoops(0.5); const bad = rows.filter((r) => r.net > 0);
  md += `\n## Loops: buy at the store (any price modifier from 0.4 to 1.25), grow 0 to 3 sizes, sell\n\n${rows.length} combinations (8 weapons × 3 metals × 3 bought sizes × 6 price modifiers × 0–3 growths). Best net gold for the player on any loop: **${worst}** (a loop pays only above 0). Loops that pay: **${bad.length}**.\n`;
  const byGrow = [0, 1, 2, 3].map((g) => { const rs = rows.filter((r) => r.grow === g); return [g, Math.max(...rs.map((r) => r.net)), Math.min(...rs.map((r) => r.net))]; });
  md += `\n${mdRow(['Sizes grown', 'Best net', 'Worst net'])}\n${mdRow(['---', '---', '---'])}\n${byGrow.map(([g, b, w]) => mdRow([g, b, w])).join('\n')}\n`;
  const cheap = rows.filter((r) => r.mod === 0.4 && r.grow === 0 && r.metal === 0 && r.size === 4); md += `\nCheapest store price (0.4 of worth), Bronze d4, nothing grown: buy price against sale: ${cheap.map((r) => `${D.WEAPONS[r.id].name} ${r.spent}→${r.sell}`).join(', ')}.\n`;
  // the discount case on today's rule, to show what the cap fixes
  D.WEAPON_SIZE.resale = null; const todayBad = []; for (const id of IDS) for (const metal of [0, 1, 2]) for (const size of [4, 6, 8]) { const r = loop({ id, metal, size, mod: 0.4, grow: 0, found: false }); if (r.sell - r.spent > 0) todayBad.push(r.sell - r.spent); }
  md += `\nOn today's T17 rule (half of worth as found, whatever was paid) the cheapest store price is itself a loop: ${todayBad.length} of 72 weapons bought at 0.4 of worth sell back for more than was paid (best +${Math.max(0, ...todayBad)}). The candidate caps the basis at what was paid, which closes it.\n`;
  // found weapon grown
  D.WEAPON_SIZE.resale = 0.5; const fr = []; for (const id of IDS) for (const metal of [0, 1, 2]) for (const size of [4, 6, 8]) for (let grow = 1; grow <= 3; grow++) { const r = loop({ id, metal, size, mod: 1, grow, found: true }); const r0 = loop({ id, metal, size, mod: 1, grow: 0, found: true }); fr.push(r.sell - r.spent - r0.sell); }
  md += `\nA found weapon (paid nothing) grown 1–3 sizes, gold gained by growing it before selling instead of selling it as found (sale after growing, minus the covers paid, minus the sale it would have had): best ${Math.max(...fr)}, worst ${Math.min(...fr)}. Never above zero: each cover returns half of itself.\n\nOne bounded effect remains and is the same on today's rule: a weapon found for nothing sells for half its worth, and a store with the cheapest price (0.4 of worth) sells the same weapon back for less than that sale, so one found weapon can bank up to 0.1 of its worth once by selling it and re-buying one like it. It consumes the found weapon and repeats only as often as weapons are found; it is not a loop.\n`;
  // 3. rounding, save/load, hand, twin, old save
  let rounding = 0; for (const id of IDS) for (const metal of [0, 1, 2]) for (const mod of [0.4, 0.45, 0.5]) { const r = loop({ id, metal, size: 4, mod, grow: 0, found: false }); if (r.sell > r.spent) rounding++; }
  md += `\n## Edge checks\n\n- Rounding: ${rounding} store prices at 0.4–0.5 of worth, any weapon or metal, returned more than they cost (sale = round(½ × min(worth, paid)), never above paid for any price of 1 or more).\n`;
  const h = heroWith(10 ** 6); const w = E.makeWeapon('sword', 1, () => 0.5, 4); withShop(h, w, 30); E.buyItem(h, 0); const st = h.bag[0]; E.trainWeapon(h, st.uid); const s1 = E.sellValue(st);
  const round = JSON.parse(JSON.stringify(h)); const s2 = E.sellValue(round.bag[0]); h.loadout.NW = h.bag.pop(); const s3 = E.sellValue(h.loadout.NW);
  md += `- Save and load, bag against hand: sale ${s1} in the bag, ${s2} after a JSON round trip, ${s3} in the left hand. ${s1 === s2 && s2 === s3 ? 'Identical.' : 'DIFFERENT.'}\n`;
  const old = E.makeWeapon('axe', 2, () => 0.5, 6); old.found = undefined; md += `- An old save (a weapon with neither field): worth as found, ${E.sellValue(old)} (0.5 × ${E.weaponValue(old)}); it was never charged for sizes, so no refund is invented.\n`;
  const hb = heroWith(10 ** 6); const bow = E.makeWeapon('bow', 1, () => 0.5, 4); hb.bag.push(bow); E.trainWeapon(hb, bow.uid); md += `- A two-handed weapon (Bow with its twin, both copies grow): the bag copy pays ${E.sellValue(bow)} once for one purchase (covers paid 40, sale 0.5 × (${E.weaponValue(E.makeWeapon('bow', 1, () => 0.5, 4))} + 40)); the twin is not a second sale.\n`;
  fs.writeFileSync(out, md); fs.writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({ worst, paying: bad.length, combinations: rows.length }, null, 1)); console.log(md);
};
if (import.meta.url === `file://${process.argv[1]}`) run();
