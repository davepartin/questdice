// Grok (Crockpot) magic-screen BEFORE shots, adapted from dev/battle-powers-review.mjs and dev/camp-powers-review.mjs (read-only; nothing saved to the cloud).
// node docs/team/mockups/cards/magic/shoot-before.mjs   (run from the repo root)
import {chromium} from '/workspace/pw/node_modules/playwright/index.mjs';import {spawn} from 'node:child_process';import fs from 'node:fs';
const root=process.cwd(),out=process.env.OUT||'/workspace/card-previews-diceboard-v2';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8136'],{cwd:root});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});p.on('pageerror',e=>console.log('ERR',e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const pump=async seconds=>p.evaluate(async seconds=>{for(let i=0;i<seconds*20;i++){window.QD.world.stage.simulate(.05,.033);await new Promise(r=>setTimeout(r,0));}},seconds);
const shot=async name=>{await pump(.2);await p.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:84,timeout:60000});};
try {
 await p.goto('http://127.0.0.1:8136/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});await p.setViewportSize({width:390,height:844});
 await p.evaluate(async()=>{const {S,E,showBoard}=window.QD;const h=E.newHero({name:'Magic Dave',cls:'wizard',seed:5});h.dice=null;h.level=9;S.hero=h;S.company={members:[h]};const SV=await import('./js/save.js');await SV.createSave(h,'testpass');showBoard();const q={...E.questsFor(h)[0],enemies:['goblin'],kind:'boss'};window.QD.startQuest(q);});
 for(let i=0;i<100;i++){await pump(.5);if(await p.evaluate(()=>window.QD.B3.battleState.bw&&!window.QD.B3.battleState.busy))break;}
 await p.evaluate(()=>{const {B3,E,S}=window.QD;const B=B3.battleState;B.b.board=E.rollBoard(S.hero,E.makeRng(5));B.b.phase='shape';B.b.magic=12;B.b.hp=B.b.maxHp-10;B.busy=false;B3.renderShape();});
 await p.locator('.b3-powers').first().click();await shot('magic-before-battle-overview_390x844');
 await p.locator('[data-power="arcbolt"]').click();await shot('magic-before-battle-selected_390x844');
 const slot=async s=>p.locator('.cp-slots [data-slot="'+s+'"]').click();
const setup=async({cls='knight',gold=420,level=9,max=false}={})=>{
 await p.evaluate(async o=>{const {S,E,showCamp}=window.QD;const h=E.newHero({name:'Powers test',cls:o.cls,seed:7});h.level=o.level;h.gold=o.gold;h.campaign.act=3;h.dice=null;if(o.max)h.powerLevel=Object.fromEntries(E.cardsOf(h).map(k=>[k.id,E.powerLevelsOf(h)]));S.hero=h;S.company={members:[h]};S.seat=0;S.tab='forge';S.campPage='powers';const SV=await import('./js/save.js');if(!SV.heroExists(h.name))await SV.createSave(h,'testpass');showCamp();},{cls,gold,level,max});await slot('A');};
 await p.goto('http://127.0.0.1:8136/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});
 await setup({cls:'wizard'});await p.evaluate(()=>document.querySelector('.sx-side').scrollTop=0);await shot('magic-before-camp-powers_390x844');
 await p.evaluate(()=>{const side=document.querySelector('.sx-side'),panel=document.querySelector('.cp-detail');if(panel)side.scrollTop+=panel.getBoundingClientRect().top-80;});await shot('magic-before-camp-powers-detail_390x844');
} finally {await browser.close();server.kill();}
