// Run from the repo root with Playwright available and CHROMIUM_PATH set to a local Chromium binary.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.cwd(),out=root+'/shots';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8135'],{cwd:root});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await browser.newPage({viewport:{width:390,height:740},deviceScaleFactor:2,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const setup=async({cls='knight',gold=420,act=2,full=true,hand=6,name='Dave'}={})=>p.evaluate(async o=>{const {S,E,showCamp}=window.QD;const hero=E.newHero({name:o.name,cls:o.cls,seed:7});hero.level=9;hero.gold=o.gold;hero.campaign.act=o.act;if(o.full)hero.dice=null;hero.strength={W:o.hand,E:o.hand};S.hero=hero;S.company={members:[hero]};S.seat=0;S.tab='forge';S.campPage='dice';const SV=await import('./js/save.js');if(!SV.heroExists(hero.name))await SV.createSave(hero,'testpass');showCamp();}, {cls,gold,act,full,hand,name});
const settle=async()=>{await p.waitForFunction(()=>[...document.querySelectorAll('.cw-weapon-art img')].every(x=>x.complete&&x.naturalWidth>0),null,{timeout:30000});await p.waitForTimeout(150);};
const shot=async name=>{await settle();await p.screenshot({path:out+'/'+name+'.png'});};
const results=[];
try{
 await p.goto('http://127.0.0.1:8135/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:90000});await setup();await shot('camp-art-phone');
 assert.equal(await p.locator('.cw-cell').count(),9);results.push('Nine visible board positions and complete weapon images');
 await p.locator('.cw-cell.s-E').click();await shot('camp-art-upgrade');
 assert.equal(await p.locator('.cw-cell.s-E.selected').count(),1);
 await p.locator('.cw-inspector .sh-buy').click();
 assert.deepEqual(await p.evaluate(()=>({die:window.QD.S.hero.strength.E,gold:window.QD.S.hero.gold})),{die:8,gold:320});
 assert.match(await p.locator('.cw-cell.s-E').getAttribute('aria-label'),/d8/);await shot('camp-art-purchased');
 const saved=await p.evaluate(async()=>{const SV=await import('./js/save.js');const h=await SV.openHero('Dave','testpass');return{die:h.strength.E,gold:h.gold};});assert.deepEqual(saved,{die:8,gold:320});results.push('Actual upgrade d6 to d8, 100 gold, board refresh, local save round trip');
 await p.locator('.cw-inspector .sh-x').click();assert.equal(await p.evaluate(()=>document.activeElement?.classList.contains('s-E')),true);assert.equal(await p.locator('.cw-inspector').count(),0);results.push('Close restores focus and removes inspector');
 for(const [label,selector] of [['Powers','.zn-powers'],['Gear','.gear'],['Supplies','.cw-supplies'],['Hero','.herotab'],['Dice','.cw-board']]){await p.locator('.cw-nav button').filter({hasText:new RegExp('^'+label+'$')}).click();assert.equal(await p.locator(selector).count(),1);}results.push('All five camp categories reachable');
 await p.locator('.cw-nav button[data-camp-page="store"]').click();assert.ok(await p.locator('.cw-storepage').count() >= 1);assert.ok(await p.locator('.cw-nav').count() >= 1);await p.locator('.cw-nav button[data-camp-page="dice"]').click();results.push('Store and return');
 await setup({gold:45,name:'Poor hero'});await p.locator('.cw-cell.s-E').click();assert.equal(await p.locator('.cw-inspector .sh-buy').isDisabled(),true);assert.match(await p.locator('.cw-inspector').innerText(),/Need 55 more/);await shot('camp-art-unaffordable');results.push('Unaffordable upgrade disabled with correct shortage');
 await setup({gold:420,act:3,hand:10,name:'Max hero'});await p.locator('.cw-cell.s-E').click();assert.match(await p.locator('.cw-inspector').innerText(),/Biggest size/i);assert.equal(await p.locator('.cw-inspector .sh-buy').count(),0);results.push('Maximum die has no invalid purchase');
 await setup({full:false,name:'New hero'});const locked=await p.evaluate(()=>window.QD.D.SLOTS.find(s=>!window.QD.E.isActive(window.QD.S.hero,s)));if(locked){await p.locator('.cw-cell.s-'+locked).click();assert.match(await p.locator('.cw-inspector').innerText(),/Add this die/);results.push('Locked slot inspectable');}
 await setup({name:'Weapon hero'});await p.locator('.cw-cell.s-NW').click();assert.match(await p.locator('.cw-inspector').innerText(),/Forge/i);assert.match(await p.locator('.cw-inspector').innerText(),/Train/i);await shot('camp-art-weapon');results.push('Existing weapon forge and train controls retained');
 await p.locator('.cw-cell.s-SW').click();assert.ok(await p.locator('.cw-inspector .sh-faces').count());results.push('Talent editor reachable');
 await setup();for(const [w,h,name]of[[375,600,'short'],[393,852,'tall'],[844,390,'landscape'],[1280,800,'desktop']]){
   await p.setViewportSize({width:w,height:h});await p.evaluate(()=>window.QD.showCamp());await shot('camp-art-'+name);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.locator('.cw-cell.s-E').click();await p.locator('.cw-inspector .sh-buy').first().scrollIntoViewIfNeeded();await shot('camp-art-'+name+'-inspect');assert.equal(await p.locator('.cw-cell').count(),9);await p.locator('.cw-inspector .sh-x').click();
 }results.push('Short/tall/landscape/desktop layouts without document horizontal overflow');
 await p.setViewportSize({width:390,height:740});await p.emulateMedia({reducedMotion:'reduce'});await setup();for(let i=0;i<8;i++){await p.locator('.cw-cell.s-E').click();await p.locator('.cw-inspector .sh-x').click();}assert.equal(await p.locator('.cw-board').count(),1);assert.equal(await p.locator('.cw-inspector').count(),0);results.push('Reduced motion and repeated open/close leave one board');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));fs.writeFileSync(root+'/shots/check-results.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();server.kill();}
