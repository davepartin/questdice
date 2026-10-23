// Perk offers with exact effects and this hero's before and after (the teamwork pass, ?lab). node dev/perkpreview.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?lab&debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
for (const [cls, offer] of [['wizard', ['reserve', 'deepwell', 'keen']], ['dwarf', ['vitality', 'piercer', 'linebreaker']], ['bard', ['greed', 'ward', 'reserve']]]) {
  await p.evaluate(({ cls, offer }) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Perky', cls, seed: 5 }); h.level = 6; h.gold = 100; h.campaign.act = 2; h.campaign.step = 4; h.pendingPerks = 1;
    S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'hero'; S.perkOffer = offer; S.perkFor = h.name; showCamp({ fromBoard: true }); }, { cls, offer });
  await p.waitForTimeout(1200);
  const cards = await p.evaluate(() => [...document.querySelectorAll('.sx-perk')].map((c) => c.innerText.replace(/\s+/g, ' ')));
  console.log(cls, JSON.stringify(cards, null, 1));
  await p.evaluate(() => document.querySelector('.sx-perk')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/perks-${cls}.png` });
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
