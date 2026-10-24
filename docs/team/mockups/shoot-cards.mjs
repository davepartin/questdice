import { chromium, webkit } from '/workspace/pw/node_modules/playwright/index.mjs';
const pages = ['weapon-card','weapon-card-d10','objective-front','objective-back'];
for (const [eng, tag] of [[chromium,'chromium'],[webkit,'webkit']]) {
  const b = await eng.launch(eng===chromium?{executablePath:'/usr/bin/google-chrome'}:{});
  for (const n of pages) for (const [w,h] of [[390,664],[375,548]]) {
    const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
    await p.goto('file://'+process.cwd()+'/'+n+'.html'); await p.waitForTimeout(1200);
    const sh = await p.evaluate(()=>document.documentElement.scrollHeight);
    const base = `png/${n}_${w}x${h}_${tag}`;
    await p.screenshot({ path:`${base}.png` });
    if (sh>h) await p.screenshot({ path:`${base}_full.png`, fullPage:true });
    console.log(tag,n,w,h,'scroll',sh);
    await p.close();
  }
  await b.close();
}
