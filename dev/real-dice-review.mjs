// Run from the repo root with Playwright available and CHROMIUM_PATH set to a local Chromium binary.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.cwd(),out=root+'/shots/real-dice';fs.mkdirSync(out,{recursive:true});
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
 assert.equal(await p.locator('.cw-cell .cw-rendered.ready').count(),9);assert.equal(await p.locator('.cw-weapon-art').count(),0);
 const tops=await p.evaluate(async()=>{const {campSpec}=await import('./js/g3/campart.js');return [...document.querySelectorAll('.cw-cell .cw-rendered')].every(el=>{const spec=campSpec(window.QD.S.hero,el.dataset.slot,+el.dataset.sides);const value=f=>Number.isFinite(parseFloat(f.text))?parseFloat(f.text):-Infinity;return value(spec.labels[+el.dataset.face-1])===Math.max(...spec.labels.map(value));});});assert.equal(tops,true);
 await p.locator('.cw-cell.s-E').click();await shot('selected');await p.locator('.cw-inspector .sh-buy').click();assert.deepEqual(await p.evaluate(()=>[window.QD.S.hero.strength.E,window.QD.S.hero.gold]),[8,320]);await shot('upgraded');
 const saved=await p.evaluate(async()=>{const SV=await import('./js/save.js');const h=await SV.openHero('Dave','testpass');return[h.strength.E,h.gold];});assert.deepEqual(saved,[8,320]);

 await p.locator('.cw-cell.s-SW').click();await shot('talent');
 await p.locator('.cw-cell.s-NW').click();assert.equal(await p.locator('.ww-modes button').count(),2);await shot('weapon');
 await setup({act:3,hand:10});await p.locator('.cw-cell.s-E').click();await shot('d10');
 await p.setViewportSize({width:375,height:600});await setup();await p.locator('.cw-cell.s-E').click();await p.locator('.cw-inspector .sh-buy').scrollIntoViewIfNeeded();await shot('short');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: nine actual die portraits; weapon/talent access; d6 to d8 purchase/save; d10; short phone; zero page errors');
}finally{await browser.close();server.kill();}
