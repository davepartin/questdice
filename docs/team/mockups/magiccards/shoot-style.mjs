// t415 art style sample: renders one card to png/all/<name>.png
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
const [p, name] = process.argv.slice(2); const OUT = new URL('./png/all/', import.meta.url).pathname;
const br = await chromium.launch({ executablePath: process.env.CHROME }); const pg = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pg.goto(`http://localhost:8190/docs/team/mockups/magiccards/magic.html?h=ranger&p=${p}&d=3`); await pg.waitForSelector('body[data-ready]'); await pg.waitForTimeout(600);
await pg.screenshot({ path: `${OUT}${name}.png` }); await br.close();
