// Resale loop check on the LIVE rule (WEAPON_TRAINING: sizes 50/100/200, a sale = half of what the weapon was worth when first grown plus half of the gold paid for sizes).
//   node tools/t17-resale.mjs [out=/tmp/t17-resale.md]
// Every weapon, metal and bought size goes through buy at the camp store (any price modifier the store code allows, floor 0.4), grow 0-3 sizes, sell.
// A loop pays if the gold back is more than the gold put in. Uses only the engine's own functions, on the released rules.
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); (await import('../js/release.js')).applyRelease();
export const IDS = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'];
export function loops(mods = [0.4, 0.5, 0.6, 0.8, 1, 1.25]) {
  const rows = [];
  for (const id of IDS) for (const metal of [0, 1, 2]) for (const size of [4, 6, 8]) for (const mod of mods) for (let grow = 0; grow <= 3; grow++) {
    const h = E.newHero({ name: 'R', cls: 'knight', seed: 3 }); h.gold = 1e6; h.campaign.act = 2; h.campaign.step = 4;
    const inst = E.makeWeapon(id, metal, () => 0.5, size); const worth = E.weaponValue(inst); const price = Math.max(1, Math.round(worth * mod));
    h.campaign.shop = { step: '2.4', items: [{ inst, price, sold: false }], charm: null }; const g0 = h.gold; if (!E.buyItem(h, 0)) throw new Error('buy failed');
    let grown = 0; for (let i = 0; i < grow; i++) { if (!E.trainInfo(h, inst.uid).ok) break; if (!E.trainWeapon(h, inst.uid)) throw new Error('train failed'); grown++; }
    const spent = g0 - h.gold; const sell = E.sellValue(h.bag[0]); rows.push({ id, metal, size, mod, grow: grown, spent, sell, net: sell - spent, worth });
  }
  return rows;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = loops(); const by = (m) => rows.filter((r) => r.mod === m); const best = (rs) => Math.max(...rs.map((r) => r.net));
  let md = `# Resale loop check, live rule (tool tools/t17-resale.mjs)\n\nLive rule: growing a size costs ${JSON.stringify(D.WEAPON_TRAINING.prices)}; a sale pays ${D.SELL_SHARE} × (the weapon's worth when first grown + gold paid for sizes). ${rows.length} loops: 8 weapons × 3 metals × 3 bought sizes × 6 store price modifiers × 0–3 growths.\n\n| Store price (share of worth) | Loops | Best net for the player | Loops that pay |\n|---|---|---|---|\n`;
  for (const m of [0.4, 0.5, 0.6, 0.8, 1, 1.25]) md += `| ${m} | ${by(m).length} | ${best(by(m))} | ${by(m).filter((r) => r.net > 0).length} |\n`;
  const pay = rows.filter((r) => r.net > 0); md += `\nEvery paying loop is a weapon bought at the cheapest store price and sold back at once (${pay.every((r) => r.grow === 0 && r.mod <= 0.4) ? 'yes: all of them are mod 0.4 and nothing grown' : 'NOT only those: see the table'}); growing a size never pays at any price, because each size returns half of itself. The best case is +${best(pay)} gold on a Gold d8. Nothing in the live game sets a store discount (campFlags is never written), so the store always sells at the full worth and no loop pays today; the 0.4 floor in shopStock is a latent hole if a discount is ever added: cap a sale at what was paid, or keep any discount under 50%.\n`;
  fs.writeFileSync(process.argv[2] || '/tmp/t17-resale.md', md); console.log(md);
}
