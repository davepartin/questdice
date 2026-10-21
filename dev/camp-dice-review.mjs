// Run from the repo root with Playwright available and CHROMIUM_PATH set to a local Chromium binary.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.cwd(),out=root+'/shots/camp-dice';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8135'],{cwd:root});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await browser.newPage({viewport:{width:390,height:740},deviceScaleFactor:2,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const setup=async({cls='knight',gold=420,act=2,full=true,hand=6,name='Dave'}={})=>p.evaluate(async o=>{const {S,E,showCamp}=window.QD;const hero=E.newHero({name:o.name,cls:o.cls,seed:7});hero.level=9;hero.gold=o.gold;hero.campaign.act=o.act;if(o.full)hero.dice=null;hero.strength={W:o.hand,E:o.hand};S.hero=hero;S.company={members:[hero]};S.seat=0;S.tab='forge';S.campPage='dice';const SV=await import('./js/save.js');if(!SV.heroExists(hero.name))await SV.createSave(hero,'testpass');showCamp();}, {cls,gold,act,full,hand,name});
const settle=async()=>{await p.waitForFunction(()=>[...document.querySelectorAll('.cw-rendered')].every(x=>x.classList.contains('ready')),null,{timeout:90000});await p.waitForTimeout(150);};
const shot=async name=>{await settle();await p.waitForFunction(()=>!document.querySelector('#toast .toast'));await p.screenshot({path:out+'/'+name+'.png'});};
const results=[];
try {
 await p.goto('http://127.0.0.1:8135/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:90000});await p.setViewportSize({width:393,height:852});await setup();await shot('board');
 const audit=await p.evaluate(async()=>{
  const {campSpec}=await import('./js/g3/campart.js');const {dieSpecs}=await import('./js/gfx/dice/dice.js');const {E,D}=window.QD;
  let checked=0;
  for(const cls of ['knight','ranger','wizard','dwarf','bard'])for(const slot of ['N','W','E','S','SW','SE','C'])for(const size of slot==='C'?[6]:[4,6,8,10]) {
   const hero=E.newHero({name:'Preview',cls,seed:1});hero.dice=null;
   const before=JSON.stringify(hero);const spec=campSpec(hero,slot,size);
   if(JSON.stringify(hero)!==before)throw Error('Preview mutated hero');
   const copy=structuredClone(hero);copy.loadout.NE ||= {id:'fists',rarity:0};if(slot==='SW'||slot==='SE')copy.special[slot]=size;
   const expected=dieSpecs(copy,{[slot]:size})[slot];
   if(JSON.stringify(spec.labels)!==JSON.stringify(expected.labels)||spec.sides!==size)throw Error('Face mismatch');checked++;
  } return checked;
 });assert.equal(audit,125);results.push('125 class/slot/size previews match battle specs without mutating heroes');
 await p.locator('.cw-cell.s-E').click();await shot('selected');await p.locator('.cw-all-faces summary').click();
 assert.equal(await p.locator('.cw-face-list[data-sides="6"] figure').count(),6);assert.equal(await p.locator('.cw-face-list[data-sides="8"] figure').count(),8);
 await p.locator('.cw-all-faces').scrollIntoViewIfNeeded();await shot('faces');
 await p.locator('.cw-inspector .sh-buy').click();assert.deepEqual(await p.evaluate(()=>[window.QD.S.hero.strength.E,window.QD.S.hero.gold]),[8,320]);
 const saved=await p.evaluate(async()=>{const SV=await import('./js/save.js');const h=await SV.openHero('Dave','testpass');return[h.strength.E,h.gold];});assert.deepEqual(saved,[8,320]);results.push('Current six and next eight faces readable; purchase and save retain exact size/cost');
 await p.locator('.cw-cell.s-C').click();assert.equal(await p.locator('.cw-face-list figure').count(),6);await p.locator('.cw-face-list').scrollIntoViewIfNeeded();await shot('heart');
 const descriptions=await p.locator('.cw-face-list figcaption').allTextContents();assert.deepEqual(descriptions,['Boost heal','Boost pierce','Boost magic','Boost gold','Boost block','Boost attack']);results.push('Heart preview includes all six actual boost symbols');
 await p.locator('.cw-cell.s-SW').click();await p.locator('.tw-overview').scrollIntoViewIfNeeded();await shot('talent');assert.ok(await p.locator('.tw-faces').count());
 await p.setViewportSize({width:375,height:600});await setup();await p.locator('.cw-cell.s-E').click();await p.locator('.cw-inspector .sh-buy').scrollIntoViewIfNeeded();await shot('short');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));fs.writeFileSync(out+'/checks.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();server.kill();}
