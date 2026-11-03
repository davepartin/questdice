import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.env.CAMP_OUT || '/workspace/camp-implementation'; fs.mkdirSync(out,{recursive:true});
const server = spawn(process.execPath,['dev/serve.mjs','8221'],{stdio:['ignore','pipe','inherit']});
await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
p.setDefaultTimeout(60000);
const errors=[],results=[]; p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/,r=>r.abort());
await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const setup=async(cls='knight',gold=420,size=4)=>p.evaluate(async({cls,gold,size})=>{
  const Q=window.QD,h=Q.E.newHero({name:'Camp'+cls,cls,seed:7});h.level=9;h.gold=gold;h.campaign.act=2;h.dice=null;h.special={SW:size,SE:4};
  const SV=await import(new URL('js/save.js',document.baseURI));if(!SV.heroExists(h.name))await SV.createSave(h,'testpass');
  Q.S.hero=h;Q.S.company={members:[h]};Q.S.seat=0;Q.S.tab='forge';Q.S.campPage='dice';Q.showCamp();
},{cls,gold,size}).then(()=>p.locator('[data-camp-page="dice"]').click());
const shot=async name=>{await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1100);await p.screenshot({path:`${out}/${name}.png`});};
const root='http://127.0.0.1:8221/';
try {
  await p.goto(root+'?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});
  await setup();assert.equal(await p.evaluate(()=>window.QD.E.campTrainingOn()),false);
  for(const tab of ['dice','powers','gear','store','hero','dice','hero']){
    console.log('TAB',tab);await p.locator(`[data-camp-page="${tab}"]`).click();assert.equal(await p.evaluate(()=>window.QD.S.campPage),tab);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await p.locator('[data-camp-page="store"]').click();const store=await p.locator('.cst-store').innerText();
  assert(!/One fight of help|Sharpening Oil|Borrowed Boots|Rented Tower Shield|War Paint|Strong Tea|Hearty Stew/.test(store));assert(store.includes('Healing potion'));await shot('store');
  await p.locator('[data-camp-page="dice"]').click();await p.locator('.cu-open').click();assert.equal(await p.locator('.cu-training').count(),0);await shot('overview-live');
  for(const cls of ['knight','bard','wizard','ranger','dwarf']){
    await setup(cls);await p.locator('[data-camp-page="hero"]').click();assert.equal(await p.locator('.herotab').count(),1);
    assert(!(await p.locator('.herotab').innerText()).includes('PROPOSED'));results.push({hero:cls,rendered:true});
  }
  await setup('wizard');await p.evaluate(()=>{const Q=window.QD;Q.S.hero.campaign.act=3;Q.S.hero.powerLevel={polymorph:2};Q.S.campPage='powers';Q.showCamp();});
  await p.locator('.cp-slots [data-slot="B"]').click();assert((await p.locator('.cp-meta').innerText()).includes('3 magic'));assert((await p.locator('.cp-meta').innerText()).includes('Rank III'));
  await setup();await p.locator('[data-camp-page="powers"]').click();await p.evaluate(()=>{for(const e of document.querySelectorAll('.sx-side,.sx-camp-scroll'))e.scrollTop=e.scrollHeight;});await p.locator('[data-camp-page="hero"]').click();await shot('hero-after-scroll');
  results.push(await p.evaluate(()=>({heroHeaderY:document.querySelector('.ht-id').getBoundingClientRect().top,viewport:innerHeight,scroll:document.querySelector('.sx-camp-scroll').scrollTop,side:document.querySelector('.sx-side').scrollTop})));
  for(const [width,height] of [[390,844],[430,932],[375,667]]){
    await p.setViewportSize({width,height});await setup();await p.locator('.cw-cell.s-SW').click();await shot(`talent-${width}`);
    assert.equal(await p.locator('.tw-symbol').count(),5);assert.equal(await p.locator('.tw-grow summary').count(),1); // the real-dice growth is back (Dave, 3 Nov 2026)
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const boxes=await p.evaluate(()=>({growth:document.querySelector('.tw-workshop').getBoundingClientRect().toJSON(),palette:document.querySelector('.tw-symbols').getBoundingClientRect().toJSON(),viewport:innerHeight}));/* (the restored TALENTS card sits above the palette, so the palette is reached by scrolling: Dave, 3 Nov 2026) */assert(boxes.growth.top >= 0);results.push({width,height,...boxes});
  }
  await p.setViewportSize({width:390,height:844});await setup('knight',420);
  await p.locator('.cw-cell.s-SW').click();await p.locator('.tw-symbol[data-symbol="magic"]').click();const before=await p.evaluate(()=>window.QD.S.hero.gold);
  await p.locator('.tw-purchase .sh-buy').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),before-10);
  await p.evaluate(()=>{const d=document.querySelector('.tw-grow');if(d)d.open=true;});await p.locator('.tw-grow .sh-buy').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.special.SW),6);assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),before-70);
  assert.equal(await p.evaluate(()=>window.QD.S.hero.talent.SW[0][0]),'magic');
  // At larger text, controls remain reachable without page width overflow.
  await p.addStyleTag({content:'html{font-size:20px!important}'});await shot('talent-large-text');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.goto(root+'preview/camp-training/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});await setup();
  assert.equal(await p.evaluate(()=>window.QD.E.campTrainingOn()),true);await p.locator('.cu-open').click();await shot('training-preview');
  assert.equal(await p.locator('.cu-training').count(),3);const hp=await p.evaluate(()=>window.QD.E.maxHpOf(window.QD.S.hero));
  await p.locator('[data-training="health"] button').click();assert.equal(await p.evaluate(()=>window.QD.E.maxHpOf(window.QD.S.hero)),hp+4);assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),370);
  await p.locator('[data-training="start"] button').click();await p.locator('[data-training="capacity"] button').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),255);await shot('training-bought');
  results.push(await p.evaluate(()=>({namespace:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).filter(x=>x.includes('preview-camp-training')),training:window.QD.S.hero.training,gold:window.QD.S.hero.gold})));
  assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
} catch(e) { console.error('CHECK FAILED',e); console.log('Errors',errors); await p.screenshot({path:out+'/failure.png',timeout:10000}).catch(()=>{}); throw e; } finally {await browser.close();server.kill();}
