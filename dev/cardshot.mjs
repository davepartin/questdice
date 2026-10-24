// Cards preview: the approved card family on the real screens, at phone sizes. Spoils, pack, store, full card, Bonus Challenge, wager and secret objective.
//   node dev/cardshot.mjs <port or https://host> <path>      OUT=docs/team/tasks/T15/screens  SIZES=375x548,390x664
// Set CA_SPKI (base64 SHA-256 of the sandbox proxy's CA key) to trust that one CA for a hosted run; certificate checking is never turned off.
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const port = process.argv[2] || 8143; const base = process.argv[3] || '/'; const OUT = process.env.OUT || 'docs/ingame/cards'; fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '375x548,390x664').split(',').map((s) => s.split('x').map(Number));
const url = (q) => (/^http/.test(port) ? `${port}${base}${q}` : `http://localhost:${port}${base}${q}`);
const launch = { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] };
if (process.env.CA_SPKI) launch.args.push(`--ignore-certificate-errors-spki-list=${process.env.CA_SPKI}`);
if (process.env.HTTPS_PROXY && /^http/.test(port)) launch.proxy = { server: process.env.HTTPS_PROXY };
const b = await chromium.launch(launch); const log = [];
for (const [w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200)); });
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
  const tag = `${w}x${h}`; const res = { tag };
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const shot = async (name) => { await pump(0.5); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}_${tag}.png` }); };
  const scrollTo = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return false; e.scrollIntoView({ block: 'start' }); return true; }, sel);
  await p.goto(url('?debug&manual&q=low')); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  // a hero with a mixed pack: a d10 Silver Dagger, Fire Arrows (Silver, d10), a Gold Sword d8, a Bronze Bow; gold to spend
  await p.evaluate(async () => { const { S, E, showBoard } = window.QD; const SV = await import('./js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'ranger', seed: 5 }); h.gold = 400; h.level = 5;
    const mk = (id, r, size, ex = {}) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...ex });
    h.bag = [mk('dagger', 1, 10), mk('quiver', 1, 10, { ammo: 'fire' }), mk('sword', 2, 8)];
    await SV.createSave(h, 'pw12'); S.hero = h; S.company = { members: [h] }; showBoard(); });
  await pump(1);
  const snap = () => p.evaluate(() => { const h = window.QD.S.hero; return JSON.stringify({ bag: h.bag, loadout: h.loadout, gold: h.gold, diamonds: h.diamonds || null }); });
  // spoils (a real victory, then the spoils set to a d10 dagger and Frost arrows)
  await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!window.QD.world.battle && !!document.querySelector('#b3-roll'))) break; await p.evaluate(() => [...document.querySelectorAll('.env-btns button, .sx-envelope button')].find((x) => /decline|continue/i.test(x.innerText))?.click()); await pump(0.5); }
  await p.evaluate(() => { const { S, E, B3, showVictory } = window.QD; const bt = S.battle; bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.startRoll(bt); E.resolve(bt, { target: 0 }); B3.stop(); showVictory(); }); await pump(2);
  for (let i = 0; i < 14 && !(await p.evaluate(() => !!document.querySelector('.vc-title, .df-title'))); i++) { await p.evaluate(() => [...document.querySelectorAll('.sx-side button, .sx-cta button')].find((x) => /continue|onward|next|go on/i.test(x.innerText))?.click()); await pump(1.5); }
  const before = await snap(); // after the real fight (which wears weapons by the game's own rule); everything below only draws
  await p.evaluate(() => { const { S, E, renderVictory } = window.QD; const mk = (id, r, size, ex = {}) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...ex }); S.rewards.drops = [mk('dagger', 1, 10), mk('quiver', 1, 10, { ammo: 'frost' })]; S.rewards.picked = null; S.rewards.sold = false; renderVictory(); }); await pump(1);
  await scrollTo('.sx-loot'); await shot('1_spoils');
  res.spoils = await p.evaluate(() => ({ cards: document.querySelectorAll('.sx-loot .cw-spoil .qc').length, buttons: [...document.querySelectorAll('.sx-loot button')].map((x) => x.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean), overflowX: document.documentElement.scrollWidth > innerWidth }));
  await p.evaluate(() => document.querySelector('.sx-loot .cw-spoil .qc').click()); await pump(0.5); await p.waitForTimeout(500); await shot('2_spoils_full_card_d10');
  res.modalFits = await p.evaluate(() => { const c = document.querySelector('.modal-card, .modal .form'); const r = (document.querySelector('.cw-modal') || c).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, closeInView: !!([...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.innerText)) && [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.innerText)).getBoundingClientRect().bottom <= innerHeight) }; });
  await p.evaluate(() => [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.innerText))?.click()); await pump(0.5);
  await p.evaluate(() => { const els = [...document.querySelectorAll('.sx-loot .cw-spoil')]; els[1]?.scrollIntoView({ block: 'center' }); }); await shot('3_spoils_arrows');
  // camp: the gear page (pack rows)
  await p.evaluate(() => { const { S, showCamp } = window.QD; S.tab = 'gear'; showCamp({ fromBoard: true }); }); await pump(2);
  await scrollTo('#zn-pack, .zn-pack'); await shot('4_pack');
  res.pack = await p.evaluate(() => ({ rows: document.querySelectorAll('.cw-row').length, labels: [...document.querySelectorAll('.cw-row .act')].map((x) => x.innerText.replace(/\s+/g, ' ')), overflowX: document.documentElement.scrollWidth > innerWidth }));
  await p.evaluate(() => [...document.querySelectorAll('.cw-row')].find((r) => /quiver|arrows/i.test(r.innerText))?.click()); await pump(0.5); await p.waitForTimeout(500); await shot('5_pack_arrows_full_card');
  await p.evaluate(() => [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.innerText))?.click()); await pump(0.5);
  // the store: a d10 Axe and Fire arrows on the shelf
  await p.evaluate(() => { const { S, E, showCamp } = window.QD; const hero = S.hero; const st = E.shopStock(hero); const mk = (id, r, size, ex = {}) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...ex });
    st[0] = { inst: mk('axe', 2, 10), price: E.weaponValue(mk('axe', 2, 10)), sold: false }; st[1] = { inst: mk('quiver', 1, 6, { ammo: 'pierce' }), price: E.weaponValue(mk('quiver', 1, 6)), sold: false };
    S.tab = 'store'; showCamp({ fromBoard: true }); }); await pump(2);
  await scrollTo('.zn-shelf, #zn-shelf'); await shot('6_store');
  res.store = await p.evaluate(() => ({ rows: document.querySelectorAll('.cw-row, .cw-spoil').length, labels: [...document.querySelectorAll('.cw-row .act')].map((x) => x.innerText.replace(/\s+/g, ' ')), buyButtons: [...document.querySelectorAll('.zn-shelf button, #zn-shelf button')].length, overflowX: document.documentElement.scrollWidth > innerWidth }));
  res.noWear = { unchanged: (await snap()) === before };
  // objectives and envelopes: the Bonus Challenge (solo), an offered bribe (wager) and a secret objective
  const env = (kind) => p.evaluate(async (kind) => { const SC = await import('./js/g3/scrui.js'); const S = await import('./js/secrets.js'); const { S: st, E } = window.QD; const hero = st.hero; hero.gold = kind === 'poor' ? 0 : 400;
    let card; let o = { questName: 'The Night Raid', solo: kind === 'bonus' || kind === 'poor', bonus: kind === 'bonus' || kind === 'poor', onAnswer() {} };
    if (kind === 'bonus' || kind === 'poor') { const c = { seed: 7, act: 2, step: 3 }; const g = S.dealBonusGoal({ c, hero }); if (kind === 'poor') { g.id = 'nopotion'; g.name = S.BONUS_GOALS.nopotion.name; g.rule = S.BONUS_GOALS.nopotion.rule; } else { g.id = 'nopotion'; g.name = S.BONUS_GOALS.nopotion.name; g.rule = S.BONUS_GOALS.nopotion.rule; } card = S.bonusView(g); }
    else { const names = ['Dave', 'Bea', 'Cy']; const hs = names.map((n, i) => ({ ...E.newHero({ name: n, cls: ['ranger', 'wizard', 'bard'][i], seed: 9 + i }) })); for (const x of hs) x.campaign = { ...hero.campaign, act: 2 }; const e = S.dealEnvelopes({ c: hs[0].campaign, heroes: hs });
      e.cards.Dave = kind === 'wager' ? { id: 'slacker', mode: 'offer' } : { id: 'lead' }; card = S.cardView(e, 'Dave'); }
    SC.envelope(card, o); }, kind);
  for (const kind of ['bonus', 'poor', 'wager', 'secret']) { await env(kind); await pump(1.5); await shot(`7_${kind}`);
    res[kind] = await p.evaluate(() => { const c = document.querySelector('.cw-obj .qc'); const r = c?.getBoundingClientRect(); const cta = document.querySelector('.env-cta')?.getBoundingClientRect(); const box = document.querySelector('.cw-obj .obox'); const side = document.querySelector('.sx-side');
      return { kind: c?.dataset.kind, card: r && { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }, ctaTop: cta && Math.round(cta.top), vh: innerHeight, buttons: [...document.querySelectorAll('.env-btns button')].map((x) => x.innerText.trim()), boxOverflow: box ? box.scrollHeight > box.clientHeight + 1 : null, sideScrolls: side ? side.scrollHeight > side.clientHeight + 2 : null, rows: [...document.querySelectorAll('.cw-obj .sr')].map((x) => x.innerText.replace(/\s+/g, ' ')) }; }); }
  await p.evaluate(() => window.QD.showCreate()); await pump(2); await shot('8_create'); res.create = await p.evaluate(() => ({ rows: document.querySelectorAll('.ci-weapons .cw-row').length, overflowX: document.documentElement.scrollWidth > innerWidth }));
  res.build = await p.evaluate(async () => (await import('./js/previewtag.js').then(() => document.querySelector('.lab-tag')?.textContent || null)));
  res.keys = await p.evaluate(() => Object.keys(localStorage).sort());
  log.push(res); await ctx.close();
}
fs.writeFileSync(`${OUT}/cards.json`, JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close();
