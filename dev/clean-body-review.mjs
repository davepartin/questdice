// Four shared body dice: actual battle throws, geometry/art reuse and camp.
// DICE_BASELINE optionally points to the unmodified dice.js for comparison.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out = 'shots/clean-body'; fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', '8135']);
await new Promise(r => server.stdout.once('data', r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
  for (const mode of process.env.DICE_BASELINE ? ['before', 'satin'] : ['satin']) {
    const p = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
    const oldMarkRequests = []; p.on('request', r => { if (/\/assets\/dice\/(heads|knight)\//.test(r.url())) oldMarkRequests.push(r.url()); });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/, r => r.abort());
    if (mode === 'before') await p.route('**/js/gfx/dice/dice.js*', r => r.fulfill({ path: process.env.DICE_BASELINE, contentType: 'text/javascript' }));
    await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
    const pump = async seconds => p.evaluate(async seconds => { for (let i = 0; i < seconds * 20; i++) { window.QD.world.stage.simulate(.05, .033); await new Promise(r => setTimeout(r, 0)); } }, seconds);
    await p.goto('http://127.0.0.1:8135/?debug&manual&q=low');
    await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
    await p.evaluate(async () => {
      const { E, S, showBoard } = window.QD;
      const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 9; h.dice = null;
      S.hero = h; S.company = { members: [h] };
      const SV = await import('./js/save.js'); await SV.createSave(h, 'testpass'); showBoard();
      window.QD.startQuest({ ...E.questsFor(h)[0], enemies: ['spider'], kind: 'boss' });
    });
    for (let i = 0; i < 100; i++) { await pump(.5); if (await p.evaluate(() => window.QD.B3.battleState.bw && !window.QD.B3.battleState.busy)) break; }
    for (const size of [4, 6, 8, 10]) {
      await p.evaluate(size => {
        const { E, S, B3 } = window.QD; const B = B3.battleState;
        S.hero.mind = { N: size }; S.hero.strength.W = size; S.hero.strength.E = size; S.hero.speed.S = size;
        B.bw.tray.setHero(S.hero);
        B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.busy = false;
        B.bw.tray.setWaiting(false); B.bw.tray.show(B.b.board); B3.renderShape();
      }, size);
      await pump(2);
      const snapshot = await p.evaluate(() => {
        const B = window.QD.B3.battleState; const tray = B.bw.tray;
        return { board: JSON.parse(JSON.stringify(B.b.board)), info: tray.info(), dice: Object.entries(tray._S).filter(([, s]) => s.die && !s.vacant).map(([slot, s]) => ({ slot, sides: s.die.sides, label: s.value, read: s.die.poly ? s.die.spec.labels[s.value - 1] : null, side: s.die.uniforms.uSide.value, triangles: s.die.mesh.geometry.index?.count ?? s.die.mesh.geometry.attributes.position.count })) };
      });
      await p.evaluate(() => window.QD.world.stage.step(1));
      await p.screenshot({ path: `${out}/${mode}-d${size}.png`, timeout: 60000 });
      // A real tray throw must settle to precisely the engine's requested values.
      const settled = await p.evaluate(async () => {
        const { E, S, B3 } = window.QD; const B = B3.battleState; const tray = B.bw.tray;
        const next = E.rollBoard(S.hero, E.makeRng(31)); let done = false;
        tray.roll(next, { seed: 31 }).then(() => { done = true; });
        for (let i = 0; i < 400 && !done; i++) { window.QD.world.stage.simulate(.05, .033); await new Promise(r => setTimeout(r, 0)); }
        return { done, matches: Object.entries(next).filter(([s]) => tray._S[s]?.die && !tray._S[s].vacant).every(([s, face]) => tray._S[s].value === face.v) };
      });
      assert.equal(settled.done, true); assert.equal(settled.matches, true);
      results.push({ mode, size, ...snapshot, settled });
    }
    const shared = await p.evaluate(async () => {
      const { dieSpecs, createDie } = await import('./js/gfx/dice/dice.js');
      const atlases = new Map(); let reused = 0;
      for (const cls of ['knight', 'wizard', 'ranger', 'dwarf', 'bard']) for (const size of [4, 6, 8, 10]) {
        const hero = window.QD.E.newHero({ name: 'Shared art', cls, seed: 7 });
        const specs = dieSpecs(hero, { N: size, W: size, E: size, S: size });
        for (const slot of ['N', 'W', 'E', 'S']) {
          const spec = specs[slot];
          if (spec.labels.some(f => f.bodyWm || f.cornerMark || f.wm)) throw Error('Body identifier remains');
          const die = createDie({ spec, quality: 'low' });
          if (!atlases.has(size)) atlases.set(size, die.atlas);
          if (atlases.get(size) !== die.atlas || atlases.get(size).geo !== die.mesh.geometry) throw Error('Art or mesh is not reused');
          die.dispose(); reused++;
        }
      }
      return { canonicalAtlases: atlases.size, reusedInstances: reused };
    });
    assert.deepEqual(shared, { canonicalAtlases: 4, reusedInstances: 80 });
    await p.evaluate(() => { window.QD.B3.stop(); window.QD.showCamp({ fromBoard: true }); });
    await p.waitForFunction(() => document.querySelectorAll('.cw-cell .cw-rendered.ready').length === 9, null, { timeout: 90000 });
    assert.equal(await p.locator('.cw-slot-mark').count(), 0);
    await p.evaluate(() => window.QD.world.stage.step(1));
    await p.screenshot({ path: out + '/camp.png', timeout: 60000 });
    assert.deepEqual(oldMarkRequests, []);
    results.push({ shared, oldMarkRequests });
    assert.deepEqual(errors, []); await p.close();
  }
  for (const after of results.filter(r => r.mode === 'satin')) {
    const before = results.find(r => r.mode === 'before' && r.size === after.size);
    if (before) { assert.deepEqual(after.board, before.board); assert.deepEqual(after.info, before.info); assert.deepEqual(after.dice.map(d => d.triangles), before.dice.map(d => d.triangles)); }
  }
  fs.writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
  console.log('PASS: four shared ivory atlases/geometries across 80 class/slot/size instances; no identity marks or watermark downloads; real d4/d6/d8/d10 battle throws and screenshots; camp portraits; no page errors.');
} finally { await browser.close(); server.kill(); }
