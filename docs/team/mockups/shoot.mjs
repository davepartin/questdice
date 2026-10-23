import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const n of ['bonus-challenge','road-result']) for (const [w,h] of [[390,844],[360,640]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  await p.goto('file://'+process.cwd()+'/'+n+'.html'); await p.waitForTimeout(1500);
  await p.screenshot({ path:`${n}_${w}x${h}.png` });
  if (h===640) await p.screenshot({ path:`${n}_${w}x${h}_full.png`, fullPage:true });
  console.log(n,w,h, await p.evaluate(()=>document.documentElement.scrollHeight));
}
await b.close();
