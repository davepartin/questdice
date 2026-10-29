// t412 Ranger pass: 3 starting + 3 PROPOSED cards, plus cast frames
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
const OUT = new URL('./png/all/', import.meta.url).pathname;
const br = await chromium.launch({ executablePath: process.env.CHROME });
const H = process.env.HERO || 'ranger';
const SHOTS = { dwarf: [['anvil', 'd=3'], ['grudge', ''], ['stonehide', 'c=2'], ['avalanche', ''], ['bulwark', ''], ['vein', ''], ['anvil', 'd=3&cast=1', 'anvil-cast']], wizard: [['arcbolt', 'd=2'], ['polymorph', ''], ['coil', 'c=2'], ['meteor', ''], ['light', 'c=2'], ['bolt', ''], ['arcbolt', 'd=2&cast=1', 'arcbolt-cast']], knight: [['cleave', ''], ['shieldwall', ''], ['rally', 'c=2'], ['judgment', ''], ['riposte', ''], ['spoils', 'c=2'], ['cleave', 'cast=1', 'cleave-cast']] };
const shots = SHOTS[H] || [['mark', ''], ['aimed', 'd=3'], ['quickdraw', ''], ['volley', 'c=2'], ['mark', ''], ['herbs', ''], ['rain', ''], ['aimed', 'd=4', 'aimed-max'], ['aimed', 'd=3&cast=1', 'aimed-cast']];
for (const [p, x, n] of shots) { const pg = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`http://localhost:8190/docs/team/mockups/magiccards/magic.html?h=${H}&p=${p}&${x}`); await pg.waitForSelector('body[data-ready]', { timeout: 8000 }).catch(() => errs.push('timeout')); await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${OUT}${H}-${n || p}_390x844.png` }); console.log(p, errs.join('|') || 'ok'); await pg.close(); }
await br.close();
