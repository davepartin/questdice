// Production monster cards: three Special patterns, all states, phone layouts, and a real battle screenshot.
// The wide comparison simply lays the same card DOM side by side for Dave; gameplay keeps its overlapping picker.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.argv[2]||'shots/special-rhythms';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8261'],{stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];
try {
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/js/main.js*',r=>r.abort());await p.goto('http://127.0.0.1:8261/');
 const fixture=await p.evaluate(async()=>{
  const E=await import('./js/engine.js'),D=await import('./js/data.js'),MC=await import('./js/g3/minicard.js'),B3=await import('./js/g3/battle3d.js');(await import('./js/release.js')).applyRelease();
  for(let seed=1;seed<=200;seed++) {
   const h=E.newHero({name:'SpecialRhythms',cls:'knight',seed});h.level=9;h.campaign.act=2;h.campaign.step=6;
   const quest={id:'timing-example',name:'The monsters’ plan',kind:'battle',step:6,enemies:['ogre','lich','skeleton']};
   const b=E.newBattle(h,quest,E.makeRng(14));if(b.enemies[2].special?.id!=='shield')continue;
   window.example={b,h,quest};window.renderExample=(first=0)=>{
    const plans=Object.fromEntries(b.enemies.map(e=>[e.uid,E.specialView(b,e)]).filter(([,v])=>v));
    document.querySelector('#app').replaceChildren(MC.open({enemies:b.enemies,facts:e=>B3.cardFactsOf(e,b),plans,owns:E.specialsOwned(b),imgOf:e=>D.MONSTERS[e.id].img,kid:e=>D.MONSTERS[e.special?.minion||D.SPECIALS.minion].name,first:b.enemies[first].uid,pick:'Attack & Roll'},uid=>window.chosen=uid));
   };window.renderExample();return {seed,quest};
  }throw Error('No example shield assignment found');
 });
 for(const [width,height,zoom]of[[390,844,1],[430,932,1],[375,667,1],[375,548,1],[390,844,1.25]]){
  await p.setViewportSize({width,height});
  for(const phase of ['windup','slam','normal','shield-broken','spawn-spent','regrow','bounty','asleep','awake']){
   const check=await p.evaluate(async({phase,zoom})=>{
    const E=await import('./js/engine.js');const {b}=window.example;const [o,l,s]=b.enemies;
    document.documentElement.style.fontSize=zoom===1?'':`${16*zoom}px`;
    o.special={id:'slam',name:'Slam',goal:28,wait:0};o.windup=false;o.intent={n:'Wind-Up',v:'charge',f:0,m:0};o.face=null;
    l.special={id:'spawn',name:'Raise Dead',minion:'skeleton',spawned:0};s.special={id:'shield',goal:40,block:20};
    if(phase==='slam'){o.windup=true;E.rollIntent(o,()=>.5);}
    if(phase==='normal'){o.special.wait=1;E.rollIntent(o,()=>.4);}
    if(phase==='shield-broken')s.special.broken=true;
    if(phase==='spawn-spent')l.special.spawned=3;
    if(phase==='regrow')s.special={id:'regrow',goal:14};
    if(phase==='bounty')s.special={id:'bounty',left:1,gold:15};
    if(phase==='asleep'||phase==='awake')s.special={id:'sleeping',awake:phase==='awake'};
    window.renderExample(phase.startsWith('shield')||['regrow','bounty','asleep','awake'].includes(phase)?2:phase==='spawn-spent'?1:0);
    const c=document.querySelector('.mnc-card.top'),f=c.querySelector('.mnc-timing');f.scrollIntoView({block:'nearest'});
    const r=f.getBoundingClientRect(),button=document.querySelector('.mnc-pick').getBoundingClientRect();
    return{phase,footer:!!f,readable:r.top>=-1&&r.bottom<=innerHeight+1,button:button.top>=0&&button.bottom<=innerHeight+1,horizontal:c.scrollWidth>c.clientWidth+1,text:f.textContent,current:c.querySelector('.mnc-cycle .current')?.textContent};
   },{phase,zoom});
   assert(check.footer&&check.readable&&check.button&&!check.horizontal,JSON.stringify({width,height,zoom,...check}));
   if(phase==='normal'){assert.equal(check.current,'Normal');assert.match(check.text,/Wind-Up next round/);}
   results.push({width,height,zoom,...check});
  }
 }
 // Restore a real initial example, then make a side-by-side screenshot using the production card markup.
 await p.setViewportSize({width:760,height:720});
 await p.evaluate(async()=>{
  const E=await import('./js/engine.js');const {h,quest}=window.example;const fresh=E.newBattle(h,quest,E.makeRng(14));Object.assign(window.example.b,fresh);document.documentElement.style.fontSize='24px';window.renderExample();
  const cards=[...document.querySelectorAll('.mnc-card')];document.querySelector('#app').innerHTML='<div class="rhythm-proof"><h1>Monster Specials</h1><div class="rhythm-cards"></div></div>';document.querySelector('.rhythm-cards').append(...cards);
 });
 await p.addStyleTag({content:'body{margin:0}#app{position:fixed;inset:0;padding:0!important;margin:0!important;max-width:none!important;display:block!important;overflow:visible!important}.rhythm-proof{padding:26px 20px;background:radial-gradient(ellipse at top,#302235,#100c13 65%);min-height:100vh;box-sizing:border-box}.rhythm-proof h1{font:700 1.3rem var(--disp,serif);color:#f3d584;text-align:center;margin:0 0 26px}.rhythm-cards{--w:8.6rem;display:flex;gap:24px;justify-content:center}.rhythm-cards .mnc-card{position:relative;left:auto;top:auto;transform:none!important;filter:none!important;flex:none;height:23rem;max-height:none;overflow:visible}.rhythm-cards .mnc-card.top{box-shadow:inset 0 0 0 3px var(--c),0 8px 18px #000c}'});
 await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await p.screenshot({path:`${out}/three-monsters.png`});
 await p.close();
 // Real battle: same valid seeded fight, actual D4 results and live footer hookup.
 const live=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});live.on('pageerror',e=>errors.push(e.message));
 await live.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/,r=>r.abort());
 await live.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
 await live.goto('http://127.0.0.1:8261/?debug&manual&q=low');await live.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:240000});
 await live.evaluate(async({seed,quest})=>{
  const{S,E,showBoard}=window.QD;const h=E.newHero({name:'SpecialRhythms',cls:'knight',seed});h.level=9;h.campaign.act=2;h.campaign.step=6;S.hero=h;S.company={members:[h]};
  await(await import('./js/save.js')).createSave(h,'testpass');showBoard();window.QD.startQuest(quest);
 },fixture);
 for(let i=0;i<700;i++){
  await live.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Decline')?.click();for(let j=0;j<10;j++)window.QD.world.stage.simulate(.05,.033);});
  if(await live.locator('.mnc-veil').count())break;await live.waitForTimeout(150);
 }
 await live.waitForSelector('.mnc-veil');await live.waitForFunction(()=>!document.querySelector('.mnc-pick').disabled);await live.waitForTimeout(600);
 assert.equal(await live.locator('.mnc-timing').count(),3);assert.deepEqual(await live.locator('.mnc-cadence').allTextContents(),['3-step cycle','Every round','Until broken']);
 for(let i=0;i<3;i++){
  await live.locator('.mnc-card').nth(i).evaluate(c=>c.click());await live.waitForTimeout(350);await live.evaluate(()=>window.QD.world.stage.step(1));
  await live.screenshot({path:`${out}/${['ogre','lich','skeleton'][i]}-phone.png`});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({fixture,layouts:results,actualBattle:true,errors},null,2));
 console.log('PASS 45 phone/state/text layouts, real three-monster battle, actual footer readouts and screenshots');
}finally{await browser.close();server.kill();}
