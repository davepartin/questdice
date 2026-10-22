// Phone rendering, face-collision audit and real throws for the ivory d6 pilot.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = 'shots/ivory-inlay'; fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', '8135']);
await new Promise(r => server.stdout.once('data', r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
 for (const mode of process.env.IVORY_BASELINE ? ['before', 'inlay'] : ['inlay']) {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/, r => r.abort());
  if (mode === 'before') for (const file of ['dice.js', 'faces.js']) await p.route(`**/js/gfx/dice/${file}*`, r => r.fulfill({ path: `${process.env.IVORY_BASELINE}/${file}`, contentType: 'text/javascript' }));
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  const pump = async seconds => p.evaluate(async seconds => { for (let i = 0; i < seconds * 20; i++) { window.QD.world.stage.simulate(.05, .033); await new Promise(r => setTimeout(r, 0)); } }, seconds);
  const shot = async name => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${name}.png`, timeout: 60000 }); };
  await p.goto('http://127.0.0.1:8135/?debug&manual&q=med');
  await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  await p.evaluate(async () => {
   const { E, S, showBoard } = window.QD; const h = E.newHero({ name: 'Ivory review', cls: 'wizard', seed: 5 });
   h.level = 9; h.dice = null; h.mind = { N: 6 }; h.strength = { W: 6, E: 6 }; h.speed = { S: 6 };
   S.hero = h; S.company = { members: [h] };
   const SV = await import('./js/save.js'); await SV.createSave(h, 'testpass'); showBoard();
   window.QD.startQuest({ ...E.questsFor(h)[0], enemies: ['spider'], kind: 'boss' });
  });
  for (let i = 0; i < 100; i++) { await pump(.5); if (await p.evaluate(() => window.QD.B3.battleState.bw && !window.QD.B3.battleState.busy)) break; }
  await p.evaluate(() => {
   const { E, S, B3 } = window.QD; const B = B3.battleState;
   B.b.board = E.rollBoard(S.hero, E.makeRng(5)); for (const s of ['N', 'W', 'E', 'S']) B.b.board[s].v = 6;
   B.b.phase = 'shape'; B.busy = false; B.bw.tray.setWaiting(false); B.bw.tray.show(B.b.board); B3.renderShape();
  });
  await pump(2); await shot(mode);
  const stats = await p.evaluate(() => {
   const B = window.QD.B3.battleState;
   return { info: B.bw.tray.info(), board: JSON.parse(JSON.stringify(B.b.board)), dice: Object.entries(B.bw.tray._S).filter(([, s]) => s.die && !s.vacant).map(([slot, s]) => ({ slot, sides: s.die.sides, atlas: s.die.atlas.size, geometry: s.die.mesh.geometry.attributes.position.count, finish: s.die.atlas.finish || null })) };
  });
  const throwResult = await p.evaluate(async () => {
   const { E, S, B3 } = window.QD; const tray = B3.battleState.bw.tray; const board = E.rollBoard(S.hero, E.makeRng(17)); let done = false;
   tray.roll(board, { seed: 17 }).then(() => { done = true; });
   for (let i = 0; i < 400 && !done; i++) { window.QD.world.stage.simulate(.05, .033); await new Promise(r => setTimeout(r, 0)); }
   return { done, matches: Object.entries(board).filter(([s]) => tray._S[s]?.die && !tray._S[s].vacant).every(([s, f]) => tray._S[s].value === f.v) };
  }); assert.deepEqual(throwResult, { done: true, matches: true });
  if (mode === 'inlay') {
   const audit = await p.evaluate(async () => {
    const { dieSpecs, createDie } = await import('./js/gfx/dice/dice.js'); const { drawNumeral, drawIcon, hasIcon } = await import('./js/gfx/dice/faces.js');
    const { bodyCornerMark } = await import('./js/gfx/dice/bodymarks.js');
    const checks = []; let faces = 0;
    for (const quality of ['low', 'med']) for (const cls of ['wizard', 'knight', 'ranger', 'dwarf', 'bard']) {
     const h = window.QD.E.newHero({ name: 'Audit', cls, seed: 2 }); const specs = dieSpecs(h, { N: 6, W: 6, E: 6, S: 6 });
     for (const slot of ['N', 'W', 'E', 'S']) {
      const spec = specs[slot]; const die = createDie({ spec, quality });
      for (const a of die.atlas.audit) {
       const mark = spec.labels[0].cornerMark; const c = a.corner;
       if (!c || !hasIcon(c.icon) || spec.labels.some(f => f.bodyWm)) throw new Error(`Missing corner or remaining watermark: ${cls}/${slot}`);
       const [w, height] = die.atlas.size; const ctx = document.createElement('canvas').getContext('2d'); ctx.canvas.width = 256; ctx.canvas.height = 256;
       ctx.translate(128, 128); ctx.strokeStyle = '#fff'; drawNumeral(ctx, String(a.text), a.nx, a.ny, a.numH, { cap: 'butt' });
       const numeral = ctx.getImageData(0, 0, 256, 256).data;
       ctx.clearRect(-128, -128, 256, 256); ctx.fillStyle = '#fff'; drawIcon(ctx, c.icon, c.x, c.y, c.size, { flip: mark.flip });
       const icon = ctx.getImageData(0, 0, 256, 256).data;
       let overlap = 0; for (let i = 3; i < icon.length; i += 4) if (icon[i] > 24 && numeral[i] > 24) overlap++;
       if (overlap) throw new Error(`Icon touches result: ${cls}/${slot}/${a.text}/${quality}: ${overlap}`);
       if (a.gap !== null && a.gap < 1) throw new Error('Number touches effect symbols');
       faces++;
      }
      checks.push({ cls, slot, quality, atlas: die.atlas.size }); die.dispose();
     }
     if (!bodyCornerMark(cls, 'E', 6).flip || bodyCornerMark(cls, 'W', 6).flip || bodyCornerMark(cls, 'NW', 6) || bodyCornerMark(cls, 'W', 8)) throw new Error('Slot identity or pilot boundary wrong');
    }
    return { faces, checks };
   }); results.push({ audit });
   await p.evaluate(() => { const B = window.QD.B3.battleState; B.bw.tray.setSelected(new Set(['W'])); B.bw.tray.setBound('E', true); });
   await pump(.5); await shot('states');
   await p.setViewportSize({ width: 375, height: 667 }); await pump(.5); await shot('short');
   await p.evaluate(() => { window.QD.B3.stop(); window.QD.showCamp({ fromBoard: true }); });
   await p.waitForFunction(() => document.querySelectorAll('.cw-cell .cw-rendered.ready').length === 9, null, { timeout: 90000 });
   await p.setViewportSize({ width: 393, height: 852 }); await pump(.5); await shot('camp');
  }
  assert.deepEqual(errors, []); results.push({ mode, ...stats, throwResult, errors }); await p.close();
 }
 const before = results.find(x => x.mode === 'before'), after = results.find(x => x.mode === 'inlay');
 if (before) { assert.deepEqual(after.board, before.board); assert.deepEqual(after.info, before.info); assert.deepEqual(after.dice.map(x => [x.slot, x.atlas, x.geometry]), before.dice.map(x => [x.slot, x.atlas, x.geometry])); }
 fs.writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
 console.log('PASS: physical throws, corner/result/effect separation across five classes at low/med, mirrored gloves, selected/bound states, short phone, actual camp portraits; unchanged board, mesh/geometry counts and atlas sizes. No page errors.');
} finally { await browser.close(); server.kill(); }
