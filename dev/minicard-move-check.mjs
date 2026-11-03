import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out = '/workspace/monster-card-dice'; fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', '8234'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => server.stdout.once('data', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
 const page = await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js*',r=>r.abort());await page.goto('http://127.0.0.1:8234/');
 for(const [width,height] of [[390,844],[430,932],[375,667],[375,548]]){
  await page.setViewportSize({width,height});
  for(let face=1;face<=6;face++){
   await page.evaluate(async face=>{const {open}=await import('./js/g3/minicard.js');const e={uid:'a',id:'goblin',name:'Goblin',hp:20,maxHp:20};const rows=Array.from({length:6},(_,i)=>({nums:[i+1],word:`MOVE ${i+1}`,icon:'atk',tone:'atk',lit:i+1===face}));const facts=()=>({hp:20,maxHp:20,block:'none',speed:'d4',move:{word:`MOVE ${face}`,icon:'atk'},die:{rolled:face,rows}});document.getElementById('app').replaceChildren(open({enemies:[e],facts},()=>{}));},face);
   const card=page.locator('.mnc-card'),die=card.locator('.mnc-picture-die');assert.equal(await die.locator('.pip').count(),face);assert.equal(await die.getAttribute('aria-label'),`Move die rolled ${face}`);assert((await card.locator('.mnc-face.on').innerText()).includes(`MOVE ${face}`));assert.equal(await card.locator('.mnc-face.on').count(),1);
   const bounds=await page.evaluate(()=>{const card=document.querySelector('.mnc-card').getBoundingClientRect(),pic=document.querySelector('.mnc-pic').getBoundingClientRect(),die=document.querySelector('.mnc-picture-die').getBoundingClientRect(),button=document.querySelector('.mnc-pick').getBoundingClientRect();return {overflow:card.left<0||card.right>innerWidth||button.bottom>innerHeight,corner:die.left>=pic.left&&die.top>=pic.top&&die.right<pic.left+pic.width/2&&die.bottom<=pic.bottom+2}});assert(!bounds.overflow,JSON.stringify({width,height,face,bounds}));assert(bounds.corner);
   if(width===390&&face===4)await page.screenshot({path:out+'/card.png'});
  }
 }
 await page.evaluate(async()=>{const {open}=await import('./js/g3/minicard.js');const e={uid:'a',name:'Ogre',hp:20,maxHp:20};const facts=()=>({hp:20,maxHp:20,block:'none',speed:'d4',move:{word:'SLAM',icon:'atk'},die:{rolled:null,rows:[{nums:[1],word:'STRIKE',icon:'atk',lit:false}]}});document.getElementById('app').replaceChildren(open({enemies:[e],facts},()=>{}));});assert.equal(await page.locator('.mnc-picture-die.unrolled').count(),1);assert.equal(await page.locator('.mnc-face.on').count(),0);assert((await page.locator('.mnc-move').innerText()).includes('SLAM'));
 assert.deepEqual(errors,[]);console.log('PASS 24 phone/face layouts, matching pips/highlights, forced move; no page errors');
} finally { await browser.close(); server.kill(); }
