// Real battle D4 picker, animation, target taps, and phone layout evidence. Chromium, not Safari.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.argv[2] || 'shots/monster-d4'; fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', '8254'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => server.stdout.once('data', r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], results = [];
try {
  for (const [width, height, reduced] of [[390,844,false], [430,932,false], [375,667,false], [375,548,true]]) {
    if (process.env.PHONE_ONLY && process.env.PHONE_ONLY !== `${width}x${height}`) continue;
    const p = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    p.on('pageerror', e => errors.push(e.message));
    await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('qd.hints','off'); localStorage.setItem('qd.tutorial.done','1'); });
    await p.goto('http://127.0.0.1:8254/?debug&manual&q=low');
    await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
    await p.evaluate(async () => {
      const { S, E, showBoard } = window.QD;
      const h = E.newHero({ name: 'D4Review', cls: 'knight', seed: 17 }); h.level = 9; h.campaign.step = 1;
      S.hero = h; S.company = { members: [h] };
      await (await import('./js/save.js')).createSave(h, 'testpass'); showBoard();
      window.QD.startQuest({ ...E.questsFor(h)[0], enemies: ['goblin','wolf','spider'], kind: 'battle', step: 1 });
    });
    for (let i=0;i<700;i++) {
      await p.evaluate(() => { const decline=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Decline'); decline?.click(); for(let j=0;j<10;j++) window.QD.world.stage.simulate(.05,.033); });
      if (await p.locator('.mnc-veil').count()) break;
      await p.waitForTimeout(150);
    }
    if (!await p.locator('.mnc-veil').count()) { await p.screenshot({path:`${out}/missing-picker.png`}); console.log(await p.evaluate(()=>({text:document.body.innerText, errors:window.QD.B3.battleState.b?.outcome, phase:window.QD.B3.battleState.b?.phase})),errors); }
    await p.waitForSelector('.mnc-veil');
    if (!reduced) {
      // Start a fresh reveal on the actual enemies so timing doesn't depend on the battle title.
      await p.evaluate(async () => {
        const v = document.querySelector('.mnc-veil');
        // Track the production reveal already in flight; the picker must stay disabled until it ends.
        window.d4StartedDisabled = v.classList.contains('mnc-revealing') && v.querySelector('.mnc-pick').disabled;
      });
      assert.equal(await p.evaluate(() => window.d4StartedDisabled), true, 'two-second reveal begins disabled');
      await p.waitForTimeout(700); assert.equal(await p.locator('.mnc-pick').isDisabled(), true, 'cannot attack midway through roll');
    }
    await p.waitForFunction(() => !document.querySelector('.mnc-pick')?.disabled);
    await p.waitForTimeout(550);
    const state = await p.evaluate(() => {
      const e = window.QD.B3.battleState.b.enemies;
      const rect = el => { const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}; };
      return [...document.querySelectorAll('.mnc-card')].map(c => {
        const foe=e.find(e=>e.uid===c.dataset.uid), die=c.querySelector('.mnc-picture-die');
        return {name:foe.name,faces:foe.faces.length,rolled:foe.face,shown:die.textContent,die:rect(die),art:rect(c.querySelector('.mnc-top')),rows:c.querySelectorAll('.mnc-face').length,lit:c.querySelectorAll('.mnc-face.on').length,highlight:c.querySelector('.mnc-face.on .mnc-n')?.textContent};
      });
    });
    for (const c of state) {
      assert.equal(c.faces,4); assert.equal(c.rows,4); assert.equal(c.lit,1);
      assert.equal(c.shown,String(c.rolled)); assert.equal(c.highlight,String(c.rolled));
      assert.ok(c.die.left > (c.art.left+c.art.right)/2, 'D4 is at top right');
      assert.ok(c.die.right <= c.art.right+3, 'die stays inside card');
    }
    const bounds=await p.locator('.mnc-pick').boundingBox(); assert.ok(bounds.y>=0&&bounds.y+bounds.height<=height,'button fits');
    await p.evaluate(()=>window.QD.world.stage.step(1));
    await p.screenshot({path:`${out}/${width}-${height}.png`});
    // A real touch selects the visible strip of the third card; action rolls onto the real grid.
    const point=await p.locator('.mnc-card').nth(2).evaluate(c=>{const r=c.getBoundingClientRect();return {x:r.right-8,y:r.top+r.height*.55};});
    await p.touchscreen.tap(point.x,point.y); await p.waitForTimeout(350);
    assert.ok(await p.locator('.mnc-card').nth(2).evaluate(c=>c.classList.contains('top')));
    await p.locator('.mnc-pick').tap();
    for (let i=0;i<100;i++) {
      await p.evaluate(()=>{for(let j=0;j<6;j++) window.QD.world.stage.simulate(.05,.033);}); await p.waitForTimeout(80);
      if(await p.evaluate(()=>{const B=window.QD.B3.battleState;return !B.busy&&B.b.phase==='shape'&&!!B.b.board;}))break;
    }
    assert.equal(await p.locator('.mnc-veil').count(),0);
    assert.equal(await p.evaluate(()=>window.QD.B3.battleState.b.phase),'shape');
    results.push({width,height,reduced,cards:state}); await p.close();
  }
  assert.deepEqual(errors,[]); fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
  console.log(`PASS ${results.length} phone layouts:` + ' actual D4 results and four rows, two-second reveal, target taps, Attack & Roll, reduced motion, no page errors');
} finally { await browser.close(); server.kill(); }
