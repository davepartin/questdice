// Bounded render fixtures using the real sheet renderer and engine-derived rank values.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const heroClass=process.env.HERO || 'knight';
const out=process.argv[2]||'shots/knight-templates';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8208']);await new Promise(r=>server.stdout.once('data',r));let br;
try{br=await chromium.launch({executablePath:process.env.CHROME,args:['--no-sandbox','--use-angle=swiftshader']});
for(const [width,height] of [[375,667],[390,844]]){
const p=await br.newPage({viewport:{width,height},deviceScaleFactor:1});await p.route('**/js/main.js*',r=>r.abort());await p.goto('http://localhost:8208/',{waitUntil:'domcontentloaded'});
for(const id of (process.env.CARDS || 'cleave,judgment,shieldwall,riposte,press,rally,secondwind').split(',')) for(let rank=0;rank<3;rank++){
await p.evaluate(async ({rank,id,heroClass})=>{const {sheet}=await import('./js/g3/magiccard.js');const {glyph}=await import('./js/g3/powers.js');const {h}=await import('./js/dom.js');const E=await import('./js/engine.js');const D=await import('./js/data.js');const k=D.CLASSES[heroClass].cards.find(k=>k.id===id);const hero=E.newHero({name:'Rally',cls:heroClass,seed:5});hero.powerLevel={[id]:rank};const ctx={hero,b:{hero,magic:6,round:3,usedRound:{}},reset:false,selected:id,powers:[{k,st:{},stored:2,level:rank,x:E.powerCost(k,k.cost,rank)}],utils:[],select(){},step(){},use(){}};document.body.classList.add('in-battle');document.querySelector('#app').replaceChildren();const root=document.querySelector('#b3');root.className='b3-layer on';root.replaceChildren(h('div',{class:'b3-sheet open'},h('div',{class:'sh-head'},h('b',{},'Magical Powers'),h('button',{},'Close')),sheet(ctx,{glyph,detailPanel(){},tally:h('div',{class:'pw-tally'},h('b',{},'Magic 6'),h('b',{},'Health 66 / 66'))})));},{rank,id,heroClass});
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
const result=await p.evaluate(()=>{const c=document.querySelector('.mc-card'),act=c.querySelector('.mc-lv.act'),r=c.getBoundingClientRect();return{bad:[...c.querySelectorAll('.mc-dot,.mc-cp,.mc-cd')].filter(e=>{const b=e.getBoundingClientRect();return b.right>r.right||b.bottom>r.bottom}).length,body:act.innerText,title:c.querySelector('.mc-plaque').textContent,tag:c.querySelector('.mc-ptag'),or:document.querySelector('.mc-or')?.textContent,coins:[...c.querySelectorAll('.mc-cp b')].map(e=>e.textContent),artLoaded:c.querySelector('.mc-paint img').naturalWidth>0,bottom:r.bottom,vh:innerHeight};});assert.equal(result.bad,0);assert.ok(result.artLoaded);assert.ok(result.title.length);assert.equal(result.tag,null);assert.equal(result.or,['rally','secondwind','coil','light','volley','vanish'].includes(id)?'OR':undefined);assert.ok(!/CHARGED|Level/.test(result.body));assert.ok(result.bottom<=result.vh+1);assert.deepEqual(result.coins,['50','90'].slice(rank));await p.screenshot({path:`${out}/${id}-${width}-rank${rank+1}.png`});console.log('PASS',id,width,height,'rank',rank+1);
}await p.close();}
}finally{await br?.close();server.kill();}
