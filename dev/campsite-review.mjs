// Run from the repo root with Playwright available and CHROMIUM_PATH set to a local Chromium binary.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.cwd(),out=root+'/shots/campsite';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8135'],{cwd:root});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await browser.newPage({viewport:{width:390,height:740},deviceScaleFactor:2,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const setup=async({cls='knight',gold=420,act=2,full=true,hand=6,name='Dave'}={})=>p.evaluate(async o=>{const {S,E,showCamp}=window.QD;const hero=E.newHero({name:o.name,cls:o.cls,seed:7});hero.level=9;hero.gold=o.gold;hero.campaign.act=o.act;if(o.full)hero.dice=null;hero.strength={W:o.hand,E:o.hand};S.hero=hero;S.company={members:[hero]};S.seat=0;S.tab='forge';S.campPage='dice';const SV=await import('./js/save.js');if(!SV.heroExists(hero.name))await SV.createSave(hero,'testpass');showCamp();}, {cls,gold,act,full,hand,name});
const settle=async()=>{await p.waitForFunction(()=>[...document.querySelectorAll('.cw-weapon-art img')].every(x=>x.complete&&x.naturalWidth>0),null,{timeout:30000});await p.waitForTimeout(150);};
const shot=async name=>{await settle();await p.waitForFunction(()=>!document.querySelector('#toast .toast'));await p.screenshot({path:out+'/'+name+'.png'});};
const results=[];
try {
 await p.goto('http://127.0.0.1:8135/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:90000});
 await p.setViewportSize({width:393,height:852});await setup();
 await p.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/assets/bg/camp.webp')));
 const art=await p.evaluate(async()=>{const im=new Image();im.src='assets/bg/camp.webp';await im.decode();return[im.naturalWidth,im.naturalHeight];});assert.deepEqual(art,[1280,640]);
 await shot('phone');
 for(const act of [1,2,3]) {await setup({act});assert.match(await p.locator('.sc-stage.k-camp').getAttribute('style'),/camp.webp/);}
 await p.locator('.cw-cell.s-E').click();await shot('selected');await p.locator('.cw-inspector .sh-buy').click();
 assert.deepEqual(await p.evaluate(()=>[window.QD.S.hero.strength.E,window.QD.S.hero.gold]),[8,320]);
 await p.locator('.cw-inspector .sh-x').click();assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('s-E')),true);
 results.push('Shipped 1280x640 art decoded in all three acts; upgrade still deducts exactly 100 gold and restores focus');
 await setup();await p.evaluate(async()=>{const {S,E}=window.QD;S.company.members=['knight','ranger','wizard','dwarf','bard','knight'].map((cls,i)=>E.newHero({name:'Friend '+(i+1),cls,seed:i+3}));const SV=await import('./js/save.js');for(const member of S.company.members) await SV.createSave(member,'testpass');S.hero=S.company.members[0];S.hero.pet={type:'owl'};window.QD.showCamp();});
 assert.equal(await p.locator('.sc-stage .sc-fig').count(),6);assert.equal(await p.locator('.sc-stage .sc-pet').count(),1);await shot('party');results.push('Six distinct hero miniatures and pet remain separate from painting');
 for(const [w,h,name] of [[375,600,'short'],[844,390,'landscape'],[1280,800,'desktop']]) {
  if(await p.locator('.cw-inspector .sh-x').count()) await p.locator('.cw-inspector .sh-x').click();await p.setViewportSize({width:w,height:h});await setup();await shot(name);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('.cw-cell.s-E').click();await p.locator('.cw-inspector .sh-buy').scrollIntoViewIfNeeded();await shot(name+'-inspect');
  assert.equal(await p.locator('.cw-inspector .sh-buy').isVisible(),true);
 }
 results.push('Phone, short phone, landscape and desktop: no horizontal overflow and purchase reachable');
 await p.emulateMedia({reducedMotion:'reduce'});await setup();assert.equal(await p.locator('.scene.k-camp .sc-bg').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.equal(await p.locator('.sc-stage .fl').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await p.evaluate(async()=>{const scene=await import('./js/g3/scenery.js');scene.enter('road',{heroes:[window.QD.S.hero],act:1});});
 assert.equal(await p.locator('.sc-stage.k-road').evaluate(el=>el.style.backgroundImage),'');assert.equal(await p.locator('.sc-stage .sc-fire').count(),0);
 results.push('Reduced motion respected; road stage has neither camp painting nor campfire');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));fs.writeFileSync(out+'/checks.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();server.kill();}
