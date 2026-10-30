# Resale loop check, live rule (tool tools/t17-resale.mjs)

Live rule: growing a size costs {"4":50,"6":100,"8":200}; a sale pays 0.5 × (the weapon's worth when first grown + gold paid for sizes). 1728 loops: 8 weapons × 3 metals × 3 bought sizes × 6 store price modifiers × 0–3 growths.

| Store price (share of worth) | Loops | Best net for the player | Loops that pay |
|---|---|---|---|
| 0.4 | 288 | 26 | 72 |
| 0.5 | 288 | 0 | 0 |
| 0.6 | 288 | -2 | 0 |
| 0.8 | 288 | -5 | 0 |
| 1 | 288 | -9 | 0 |
| 1.25 | 288 | -14 | 0 |

Every paying loop is a weapon bought at the cheapest store price and sold back at once (yes: all of them are mod 0.4 and nothing grown); growing a size never pays at any price, because each size returns half of itself. The best case is +26 gold on a Gold d8. Nothing in the live game sets a store discount (campFlags is never written), so the store always sells at the full worth and no loop pays today; the 0.4 floor in shopStock is a latent hole if a discount is ever added: cap a sale at what was paid, or keep any discount under 50%.
