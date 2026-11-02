import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.CAMP_POWERS_OUT || '/workspace/camp-powers';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8222'],{stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});p.setDefaultTimeout(60000);
const errors=[],renders=[],battleRenders=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
try {
  await p.route('**/js/main.js*',r=>r.abort());await p.goto('http://127.0.0.1:8222/',{waitUntil:'domcontentloaded'});
  const ids=process.env.CAMP_UI_ONLY ? [] : await p.evaluate(async()=>{const D=await import('./js/data.js');return Object.entries(D.CLASSES).flatMap(([cls,c])=>c.cards.map(k=>({cls,id:k.id})));});
  for(const [width,height] of [[390,844],[430,932],[375,667]]){
    await p.setViewportSize({width,height});
    for(const {cls,id} of ids)for(let rank=0;rank<4;rank++){
      const result=await p.evaluate(async({cls,id,rank})=>{
        const E=await import('./js/engine.js'),{applyRelease}=await import('./js/release.js');applyRelease();
        const {campCard}=await import('./js/g3/magiccard.js'),{glyph}=await import('./js/g3/powers.js'),{h}=await import('./js/dom.js');
        const hero=E.newHero({name:'Card',cls,seed:7});hero.powerLevel={[id]:rank};const before=JSON.stringify(hero);
        document.getElementById('app').className='sx-screen camp';
        document.getElementById('app').replaceChildren(h('div',{class:'cp-card-stage',style:{width:'calc(100% - 24px)',margin:'12px auto',alignItems:'flex-start'}},campCard(hero,id,{glyph})));
        const c=document.querySelector('.mc-card'),active=c.querySelector('.mc-lv.act'),box=c.getBoundingClientRect(),a=active.getBoundingClientRect();
        const k=(await import('./js/data.js')).CLASSES[cls].cards.find(k=>k.id===id);
        const error=[...active.querySelectorAll('.mc-sy>*')].filter(el=>{const b=el.getBoundingClientRect();return b.left<a.left-2||b.right>a.right+2||b.top<a.top-2||b.bottom>a.bottom+2;}).map(el=>({cls:el.className,text:el.textContent}));
        return {id,cls,rank,width:innerWidth,ratio:box.height/box.width,active:active.textContent,cost:c.querySelector('.mc-cast-cost').textContent.trim(),expectedCost:E.powerCost(k,k.cost,rank),ranks:c.querySelectorAll('.mc-lv').length,mutation:before!==JSON.stringify(hero),error,horizontal:box.left<0||box.right>innerWidth,art:c.querySelector('.mc-paint img').src};
      },{cls,id,rank});
      assert(Math.abs(result.ratio-1052/720)<.01,JSON.stringify(result));assert.equal(result.mutation,false);assert.equal(result.ranks,4);assert.equal(result.cost,String(result.expectedCost));assert.equal(result.horizontal,false);
      assert.deepEqual(result.error,[],JSON.stringify(result));
      if(id==='grudge')assert(result.active.includes('Hurt')&&!result.active.includes('+0'));
      if(id==='meteor')assert(result.active.includes('×Round'));if(id==='polymorph')assert(result.active.includes(rank<2?'4–6':'3–6')&&!/CHARGED/.test(result.active));
      if(['rally','coil','stonehide','ballad'].includes(id))assert(result.active.includes('charges')&&!/CHARGED/.test(result.active));
      renders.push(result);
      if(width===390&&rank===0&&['cleave','rally','grudge','meteor','polymorph','finale','luckyverse'].includes(id)){
        await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${out}/card-${id}.png`});
      }
    }
  }
  // The existing battle sheet must still show a legal purchased fourth rank.
  for(const [width,height] of [[390,844],[430,932],[375,667]]) {
  await p.setViewportSize({width,height});
  for(const {cls,id} of ids)for(let rank=0;rank<4;rank++){
    const result=await p.evaluate(async({cls,id,rank})=>{
      const E=await import('./js/engine.js'),D=await import('./js/data.js'),{sheet}=await import('./js/g3/magiccard.js'),{glyph}=await import('./js/g3/powers.js'),{h}=await import('./js/dom.js');
      const hero=E.newHero({name:'Battle',cls,seed:7}),k=D.CLASSES[cls].cards.find(k=>k.id===id);hero.powerLevel={[id]:rank};
      const ctx={hero,b:{hero,magic:12,round:3,lastHurt:7,usedRound:{}},reset:false,selected:id,powers:[k,...D.CLASSES[cls].cards.filter(c=>c.start&&c.slot!==k.slot)].map(c=>({k:c,level:rank,x:E.powerCost(c,c.cost,rank),stored:2,st:{spent:false,early:false}})),utils:[{id:'u:bigheal',name:'Potion',cost:0},{id:'u:heal',name:'Heal',cost:2},{id:'u:heart',name:'Heart Change',cost:3}],select:()=>{},step:()=>{},use:()=>{}};
      document.getElementById('app').className='';document.getElementById('app').replaceChildren(h('div',{class:'b3-sheet open'},h('header',{class:'b3-sheet-head'},h('h2',{},'Magical powers')),h('div',{class:'b3-cards'},sheet(ctx,{glyph,tally:h('div',{class:'pw-tally',style:{height:'32px'}},'Magic 12'),detailPanel:()=>null}))));
      const c=document.querySelector('.mc-card'),a=c.querySelector('.mc-lv.act'),r=a.getBoundingClientRect();
      return {id,width:innerWidth,height:innerHeight,rank:a.querySelector('.mc-rn').textContent,body:a.textContent,overflow:[...a.querySelectorAll('.mc-sy>*')].filter(e=>{const b=e.getBoundingClientRect();return b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2;}).map(e=>e.className)};
    },{cls,id,rank});
    assert.equal(result.rank,['I','II','III','IV'][rank]);assert.deepEqual(result.overflow,[],JSON.stringify(result));if(id==='grudge'&&rank===3)assert(result.body.includes('+13'));battleRenders.push(result);
  }}
  // Preserve the separately shipped potion-tray fix while sharing its renderer.
  for(const [width,height] of [[390,844],[430,932],[375,667]]){
    await p.setViewportSize({width,height});
    const positions=await p.evaluate(async()=>{
      const E=await import('./js/engine.js'),{sheet}=await import('./js/g3/magiccard.js'),{glyph}=await import('./js/g3/powers.js'),{h}=await import('./js/dom.js');
      const hero=E.newHero({name:'Potion',cls:'knight',seed:7});
      const render=note=>{const u={id:'u:bigheal',name:'Health Potion',cost:0,actions:[{label:'Drink',fn:()=>{}}],...(note?{note:{icon:'heal',big:'+10',text:'health · now 30 / 38 · 1 left'}}:{})};
        const ctx={hero,b:{hero,magic:6,round:2,potions:note?1:2},selected:u.id,powers:[],utils:[u],select:()=>{}};
        document.getElementById('app').className='';document.getElementById('app').replaceChildren(h('div',{class:'b3-sheet open'},h('header',{class:'b3-sheet-head'},h('h2',{},'Magical powers')),h('div',{class:'b3-cards'},sheet(ctx,{glyph,tally:h('div',{class:'pw-tally',style:{height:'32px'}},'Magic 6'),detailPanel:()=>null}))));
        return document.querySelector('.mc-potion-tray').getBoundingClientRect().top;
      };return{before:render(false),after:render(true)};
    });
    assert(Math.abs(positions.before-positions.after)<1,JSON.stringify({width,height,...positions}));
  }
  if(process.env.CAMP_RENDER_ONLY){fs.writeFileSync(out+'/render-results.json',JSON.stringify({renders,battleRenders,errors},null,2));console.log('PASS',renders.length,'camp layouts and',battleRenders.length,'battle layouts');} else {
  await p.unroute('**/js/main.js*');
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
  await p.goto('http://127.0.0.1:8222/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});
  const setup=async(cls='knight',gold=500,level=9)=>p.evaluate(async({cls,gold,level})=>{const Q=window.QD,h=Q.E.newHero({name:'Powers'+cls,cls,seed:7});h.gold=gold;h.level=level;h.dice=null;const SV=await import('./js/save.js');if(!SV.heroExists(h.name))await SV.createSave(h,'testpass');Q.S.hero=h;Q.S.company={members:[h]};Q.S.seat=0;Q.S.tab='forge';Q.S.campPage='powers';Q.showCamp();},{cls,gold,level});
  await p.setViewportSize({width:390,height:844});await setup();
  const before=await p.evaluate(()=>JSON.stringify(window.QD.S.hero));
  await p.locator('.cp-library [data-power="judgment"]').click();assert.equal(await p.evaluate(()=>JSON.stringify(window.QD.S.hero)),before);
  assert.equal(await p.locator('.cp-detail .mc-card[data-card="judgment"]').count(),1);
  await p.locator('.cp-actions .sh-buy').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),450);assert.equal(await p.evaluate(()=>window.QD.E.cardsOf(window.QD.S.hero)[0].id),'judgment');
  await p.locator('.cp-actions .sh-buy').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),400);assert.equal(await p.evaluate(()=>window.QD.E.powerLevel(window.QD.S.hero,'judgment')),1);
  await p.locator('.cp-library [data-power="cleave"]').click();await p.locator('.cp-actions .sh-buy').click();assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),400);assert.equal(await p.evaluate(()=>window.QD.E.cardsOf(window.QD.S.hero)[0].id),'cleave');
  assert.equal(await p.locator('.mc-use').count(),0,'no battle actions');
  const saved=await p.evaluate(async()=>{const SV=await import('./js/save.js');return SV.openHero(window.QD.S.hero.name,'testpass');});
  assert.equal(saved.gold,400);assert.equal(saved.powerLevel.judgment,1);assert.equal(saved.powers.A,'cleave');
  for(const cls of ['knight','bard','wizard','ranger','dwarf']){
    await setup(cls);await p.locator('.cp-slots [data-slot="B"]').click();await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${out}/camp-${cls}.png`});await p.locator('.cp-card-stage .mc-card').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/camp-card-${cls}.png`});
    const art=await p.locator('.cp-card-stage .mc-paint img').evaluate(e=>({loaded:e.complete&&e.naturalWidth>0,src:e.src}));assert.equal(art.loaded,true,JSON.stringify(art));
  }
  await setup('wizard');await p.evaluate(()=>{const Q=window.QD;Q.S.hero.powerLevel={polymorph:3};Q.showCamp();});await p.locator('.cp-slots [data-slot="B"]').click();assert.equal(await p.locator('.mc-cast-cost').innerText(),'1');assert.equal(await p.locator('.mc-lv.act .mc-rn').innerText(),'IV');
  await setup('knight',0,1);await p.locator('.cp-library [data-power="judgment"]').click();assert.equal(await p.locator('.cp-actions button:not(:disabled)').count(),0);assert.equal(await p.evaluate(()=>window.QD.S.hero.gold),0);
  await setup('knight',0);await p.locator('.cp-library [data-power="cleave"]').click();assert.equal(await p.locator('.cp-actions button:not(:disabled)').count(),0);
  for(const [width,height] of [[390,844],[430,932],[375,667]]){
    await p.setViewportSize({width,height});await setup('bard');await p.locator('.cp-slots [data-slot="B"]').click();
    await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${out}/integrated-${width}.png`});
    const layout=await p.evaluate(()=>{const c=document.querySelector('.cp-card-stage .mc-card').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,ratio:c.height/c.width,smallControls:[...document.querySelectorAll('.cp-slots button,.cp-library button,.cp-actions button')].filter(e=>e.getBoundingClientRect().height<44).length};});
    assert.equal(layout.overflow,false);assert(Math.abs(layout.ratio-1052/720)<.01);assert.equal(layout.smallControls,0);
  }
  await p.addStyleTag({content:'html{font-size:20px!important}'});await p.screenshot({path:out+'/camp-large-text.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+(process.env.CAMP_UI_ONLY ? '/ui-results.json' : '/results.json'),JSON.stringify({renders,battleRenders,errors,transactions:'Learn 50 / upgrade 50 / equip free; inspection unchanged; save/reopen verified; integrated three phone sizes and large text; gates and zero gold; fourth-rank Polymorph 1 magic and charge success ranges'},null,2));
  console.log('PASS',renders.length,'camp card layouts; navigation and transactions; zero page errors');
  }
} finally {await browser.close();server.kill();}
