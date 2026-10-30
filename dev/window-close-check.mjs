import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['dev/serve.mjs','8200']); await new Promise(r=>server.stdout.once('data',r));
let browser;
try {
 browser=await chromium.launch({executablePath:process.env.CHROME,args:['--no-sandbox','--use-angle=swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:660}});
 await p.goto('http://localhost:8200/',{waitUntil:'domcontentloaded'});
 const result=await p.evaluate(async()=>{
  const {h,modal,closeModal}=await import('./js/dom.js'); const results=[];
  for(const kind of ['bottom','icon','duplicate','missing']) {
   const done=()=>closeModal(); const c=h('div',{class:'form'},h('h2',{},'Window title'),h('p',{},'Reading stays clear of the button.'),kind==='missing'?null:h('div',{class:'row end'},h('button',{type:'button','aria-label':'Close',onclick:done},kind==='icon'?'✕':'Close'),kind==='duplicate'?h('button',{onclick:done},'Close'):null));
   modal(c); const buttons=c.querySelectorAll('.qd-close'); const b=buttons[0]; const r=b.getBoundingClientRect(); const header=b.closest('.qd-window-head'); const title=c.querySelector('h2').getBoundingClientRect(); const css=getComputedStyle(b);
   results.push({kind,count:buttons.length,width:r.width,height:r.height,header:!!header,clear:title.right<=r.left||title.bottom<=r.top,label:b.textContent,style:[css.backgroundImage,css.borderRadius,css.fontFamily,css.fontSize].join('|')}); b.click(); if(document.querySelector('#modal.open')) throw Error('Close did not dismiss');
  }
  return results;
 });
 for(const r of result){assert.equal(r.count,1);assert.equal(r.width,76);assert.equal(r.height,44);assert.ok(r.header&&r.clear);assert.equal(r.label,'Close');assert.equal(r.style,result[0].style);console.log('PASS',r.kind);}
} finally {await browser?.close();server.kill();}
