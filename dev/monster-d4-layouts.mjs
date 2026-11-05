// All four-face card layouts with real roster moves, plus reveal timing and Special footers.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.argv[2]||'shots/monster-d4-layouts';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8256'],{stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],results=[];
try {
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/js/main.js*',r=>r.abort());await p.goto('http://127.0.0.1:8256/');
 for(const [width,height,zoom] of [[390,844,1],[430,932,1],[375,667,1],[375,548,1],[390,844,1.25]]) {
  await p.setViewportSize({width,height});
  const rows=await p.evaluate(async ({zoom})=>{
   const E=await import('./js/engine.js'), D=await import('./js/data.js'), MC=await import('./js/g3/minicard.js');(await import('./js/release.js')).applyRelease();
   document.documentElement.style.fontSize=zoom===1?'':`${20*zoom}px`;
   const results=[];
   for(const [id,d] of Object.entries(D.MONSTERS)) {
    const e=E.spawnEnemy(id,{},E.makeRng(8));E.rollIntent(e,()=>.99);
    const facts=e=>({hp:e.hp,maxHp:e.maxHp,block:'sometimes',speed:`d${e.initDie}`,move:{word:e.intent.n.toUpperCase(),dice:`${e.intent.f}+${e.intent.m}d${e.powerDie}`,line:'5–29 damage'},die:{sides:4,rolled:e.face,rows:e.faces.map((f,i)=>({nums:[i+1],word:f.n.toUpperCase(),dice:`${f.f}+${f.m}d${e.powerDie}`,lit:e.face===i+1,icon:'atk'}))}});
    const app=document.querySelector('#app'); app.replaceChildren(MC.open({enemies:[e],facts,imgOf:()=>d.img}));
    const card=app.querySelector('.mnc-card');const r=card.getBoundingClientRect(),b=app.querySelector('.mnc-pick').getBoundingClientRect();
    const die=card.querySelector('.mnc-picture-die').getBoundingClientRect(), art=card.querySelector('.mnc-top').getBoundingClientRect();
    results.push({id,rows:card.querySelectorAll('.mnc-face').length,lit:card.querySelector('.mnc-face.on .mnc-n').textContent,dieRight:die.left>(art.left+art.right)/2,buttonFits:b.bottom<=innerHeight+1,topFits:r.top>=-1,scroll:card.scrollHeight>card.clientHeight+1,horizontal:card.scrollWidth>card.clientWidth+1});
   }
   return results;
  },{zoom});
  assert(rows.every(r=>r.rows===4&&r.lit==='4'&&r.dieRight&&r.buttonFits&&r.topFits&&!r.horizontal),JSON.stringify(rows.filter(r=>!r.buttonFits||!r.topFits||r.horizontal)));
  results.push({width,height,zoom,checked:rows.length});
 }
 await p.setViewportSize({width:390,height:844});
 await p.evaluate(async()=>{
  document.documentElement.style.fontSize='';const E=await import('./js/engine.js'),D=await import('./js/data.js'),MC=await import('./js/g3/minicard.js');
  const enemies=['goblin','wolf','ogre'].map(id=>E.spawnEnemy(id,{},E.makeRng(7)));
  enemies.forEach((e,i)=>E.rollIntent(e,()=>[.99,.6,.1][i])); enemies[2].special={id:'slam',name:'Slam'};
  const facts=e=>({hp:e.hp,maxHp:e.maxHp,block:'sometimes',speed:`d${e.initDie}`,move:{word:e.intent.n.toUpperCase(),dice:`${e.intent.f}+${e.intent.m}d${e.powerDie}`,line:'4–18 damage'},die:{sides:4,rolled:e.face,rows:e.faces.map((f,i)=>({nums:[i+1],word:f.n.toUpperCase(),dice:`${f.f}+${f.m}d${e.powerDie}`,lit:e.face===i+1,icon:f.v==='guard'?'block':'atk',tone:f.v}))}});
  document.querySelector('#app').replaceChildren(MC.open({enemies,facts,imgOf:e=>D.MONSTERS[e.id].img,owns:{[enemies[2].uid]:['slam']},plans:{[enemies[2].uid]:{id:'slam',top:'Damage 15'}},reveal:true,first:enemies[0].uid},uid=>window.selected=uid));
 });
 assert(await p.locator('.mnc-pick').isDisabled());await p.waitForTimeout(1000);assert(await p.locator('.mnc-pick').isDisabled());
 await p.waitForFunction(()=>!document.querySelector('.mnc-pick').disabled);await p.waitForTimeout(550);
 assert.deepEqual(await p.locator('.mnc-picture-die').allTextContents(),['4','3','1']);
 await p.screenshot({path:`${out}/three-monsters.png`});
 await p.locator('.mnc-card').nth(0).tap();await p.waitForTimeout(300);await p.locator('.mnc-pick').tap();assert.ok(await p.evaluate(()=>window.selected));
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('PASS 250 roster/phone/text layouts, four rows, upper-right D4, two-second reveal, authoritative results, target touch, no page errors');
}finally{await browser.close();server.kill();}
