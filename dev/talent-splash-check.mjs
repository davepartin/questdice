// Buy and save the sixth Talent symbol, then verify its real die portrait and compact face row.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';
const out=process.argv[2]||'shots/talent-dialog';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8265'],{stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];let p,sequence=0;
try{
 p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
 await p.goto('http://127.0.0.1:8265/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:240000});
 const setup=async({gold=420,size=4,act=3,filled=[],both=true,cls='knight'}={})=>{
  await p.evaluate(async cfg=>{const Q=window.QD,h=Q.E.newHero({name:'TalentUI'+cfg.seq,cls:cfg.cls,seed:7});h.level=9;h.gold=cfg.gold;h.campaign.act=cfg.act;h.special.SW=cfg.size;h.talent.SW=cfg.filled;
   if(cfg.both)h.dice=[...new Set([...(h.dice||[]),'SW','SE'])];Q.S.hero=h;Q.S.company={members:[h]};Q.S.seat=0;Q.S.tab='forge';Q.S.campPage='dice';await(await import('./js/save.js')).createSave(h,'testpass');Q.showCamp();
  },{gold,size,act,filled,both,cls,seq:++sequence});await p.locator('.cw-cell.s-SW').tap();await p.waitForTimeout(500);
 };
 const face=(f=0,s='SW')=>p.locator(`.td-face[data-slot="${s}"][data-face="${f}"]`);
 const scrolls=()=>p.evaluate(()=>({pop:document.querySelector('body>.cw-pop')?.scrollTop||0,side:document.querySelector('.sx-side')?.scrollTop||0,window:scrollY}));
 const fit=async()=>{const r=await p.locator('.td-dialog').boundingBox(),b=await p.locator('.td-confirm').boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=p.viewportSize().width+1&&r.y+r.height<=p.viewportSize().height+1,JSON.stringify(r));assert(b.y>=0&&b.y+b.height<=p.viewportSize().height+1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);};
 for(const cls of ['knight','bard','wizard','ranger','dwarf']){
  await p.setViewportSize({width:390,height:844});await setup({cls});await face().tap();assert.equal(await p.locator('.td-option').count(),6);await p.locator('.td-option[data-symbol="splash"]').tap();await fit();assert.match(await p.locator('.td-note').innerText(),/every other monster/);
  if(cls==='knight')await p.screenshot({path:out+'/splash-picker.png'});await p.locator('.td-confirm').tap();assert.match(await face().getAttribute('aria-label'),/Splash/);assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),410);
  const saved=await p.evaluate(async()=>{const Q=window.QD,SV=await import('./js/save.js');const h=await SV.openHero(Q.S.hero.name,'testpass');return{gold:h.gold,sym:h.talent.SW[0][0]};});assert.deepEqual(saved,{gold:410,sym:'splash'});
  results.push({cls,bought:true,saved:true});
 }
 await setup({size:6,both:false,filled:[['heal'],['gold'],['splash']]});await p.waitForFunction(()=>document.querySelector('.td-die-context .cw-die.ready'));await p.screenshot({path:out+'/splash-d6.png'});
 await setup({size:6,filled:[['splash'],['splash'],[]]});await face(2).tap();assert(await p.locator('.td-option[data-symbol="splash"]').isDisabled());await p.locator('.td-cancel').tap();results.push({twoSplashLimit:true});
 await p.setViewportSize({width:375,height:548});await p.addStyleTag({content:'html{font-size:20px!important}'});await setup({size:10,gold:1000});await face(6).tap();await p.locator('.td-option[data-symbol="splash"]').tap();await fit();await p.screenshot({path:out+'/splash-short-phone.png'});await p.locator('.td-confirm').tap();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),900);assert.equal(await p.evaluate(()=>window.QD.S.hero.talent.SW[6][0]),'splash');results.push({face10:true,shortPhoneAndLargeText:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));console.log('PASS Splash picker: six options, five heroes, saved purchase, real die portrait, two-per-die cap, d10 face and short phone');
}catch(e){await p?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();server.kill();}
