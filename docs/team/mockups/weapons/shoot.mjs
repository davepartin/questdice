import { chromium, webkit } from '/workspace/pw/node_modules/playwright/index.mjs';
for (const [eng,tag] of [[chromium,'chromium'],[webkit,'webkit']]) {
  const b = await eng.launch(eng===chromium?{executablePath:'/usr/bin/google-chrome'}:{});
  for (const [w,h] of [[390,664],[375,548]]) { const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});
    await p.goto('file://'+process.cwd()+'/weapon-front.html'); await p.waitForTimeout(1200);
    await p.screenshot({path:`png/weapon-front_${w}x${h}_${tag}.png`}); const sh=await p.evaluate(()=>document.documentElement.scrollHeight);
    if (sh>h) await p.screenshot({path:`png/weapon-front_${w}x${h}_${tag}_full.png`,fullPage:true}); console.log(tag,w,h,sh); await p.close(); }
  if (tag==='chromium') { const p=await b.newPage({viewport:{width:1200,height:900}}); await p.goto('file://'+process.cwd()+'/pilot.html'); await p.waitForTimeout(1200); await p.screenshot({path:'png/pilot-sheet.png',fullPage:true}); }
  await b.close(); }
