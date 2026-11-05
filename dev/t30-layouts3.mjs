// T30 mockups, round 3 (Dave, 5 Nov 2026: "I love this last set. Now add the weapon name and metal back on the card. Be creative.")
// Round 2's four layouts, each carrying the name and metal its own way, the metal in its own colour.
// Four layouts, every face the real 3D die face (faceShot), grouped by size: the d4's four faces, then the two each bigger die adds.
// No words: only the die sizes and the prices. Mockups only. Headless Chromium, not Safari.
//   node dev/t30-layouts3.mjs [out=shots/t30c] [weapon=sword] [metal=2] [owned=6]      SPLASH=splashSpray|splashWave|splashFork
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/t30c'; const WID = process.argv[3] || 'sword'; const METAL = +(process.argv[4] ?? 2); const OWNED = +(process.argv[5] || 6);
fs.mkdirSync(OUT, { recursive: true }); const port = 8263;
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });

// the card is 360 x 526 px: 100 cqi wide, 146 cqi tall
const CSS = `
#t30{position:fixed;inset:0;z-index:99999;overflow:auto;background:#120c18;display:flex;flex-direction:column;align-items:center;gap:30px;padding:20px 0}
.t30m{width:360px;height:526px;flex:none;position:relative;container-type:inline-size;border-radius:4.5cqi;overflow:hidden;font-family:var(--font-number);color:#2a1a0a;
  background:linear-gradient(180deg,#2b1f15,#160f0a);box-shadow:inset 0 0 0 .8cqi #c9a35a,inset 0 0 0 1.6cqi #24180e,0 10px 24px #000c}
.t30m img.f{display:block;width:100%;filter:drop-shadow(0 .7cqi 1cqi #0009)}
.t30m .ghost{opacity:.5;filter:grayscale(1) brightness(.8) drop-shadow(0 .5cqi .7cqi #0006)!important}
.t30m .qd-price{font-size:5.2cqi}
.t30m .sz{font:900 4.6cqi/1 var(--font-number);color:#1a1030;background:#f2c14e;border-radius:1.6cqi;padding:.8cqi 1.4cqi;box-shadow:0 .4cqi 0 #8a6a2a}
.t30m .sz.off{background:#5a3d1c;color:#ffe9b8;box-shadow:0 .4cqi 0 #2a1a0a}
.t30m .felt{background:radial-gradient(ellipse at 50% 40%,#f5ead2,#e6d3ad 75%,#d4bb8a)}
.t30m .coin{border-radius:50%;overflow:hidden;background:#1a120c url(assets/cards/scene-forge.webp) center 60%/cover;box-shadow:0 0 0 1cqi #c9a35a,0 0 0 1.7cqi #3a2414,0 1cqi 2.4cqi #000a}
.t30m .coin img{width:100%;height:100%;object-fit:contain;display:block}
.veil{position:absolute;inset:0;border-radius:2.6cqi;background:repeating-linear-gradient(135deg,#5a3d1c66 0 1.6cqi,#4a301866 1.6cqi 3.2cqi);box-shadow:inset 0 0 0 .5cqi #c9a35a;display:flex;align-items:center;justify-content:center;z-index:2}

/* E. The stack: one row per size, dice from the left, big; the right end of each pair row holds the sword (d6 row) or the price */
.t3E .in{position:absolute;inset:2.4cqi;border-radius:3cqi;padding:2.6cqi 2.6cqi;display:flex;flex-direction:column;gap:1.6cqi}
.t3E .r{position:relative;flex:1;display:flex;align-items:center;gap:2cqi;padding:0 1.4cqi;border-radius:2.6cqi;background:#00000010}
.t3E .r .sz{position:absolute;left:-.6cqi;top:-.8cqi;z-index:3;font-size:3.8cqi;padding:.6cqi 1.1cqi}
.t3E .r.d4{gap:1.4cqi}.t3E .r.d4 img.f{width:20.2cqi}.t3E .r:not(.d4) img.f{width:28cqi}
.t3E .r .end{margin-left:auto;display:flex;align-items:center;justify-content:center;width:30cqi}
.t3E .r .end .coin{width:26cqi;height:26cqi}
.t3E .r.locked .veil{left:auto;width:36cqi;right:0;background:none;box-shadow:none}

/* F. The quarters: one corner per size, the sword as a coin where they meet */
.t3F .q{position:absolute;display:grid;place-items:center;border-radius:3cqi;padding:2cqi}
.t3F .q .sz{position:absolute;top:1.2cqi;z-index:3}.t3F .q.l .sz{left:1.2cqi}.t3F .q.r .sz{right:1.2cqi}
.t3F .q.t{top:2.4cqi;height:calc(50% - 3.2cqi)}.t3F .q.b{bottom:2.4cqi;height:calc(50% - 3.2cqi)}.t3F .q.l{left:2.4cqi;width:calc(50% - 3.2cqi)}.t3F .q.r{right:2.4cqi;width:calc(50% - 3.2cqi)}
.t3F .q .g{display:grid;gap:2cqi;justify-items:center}
.t3F .q.d4 .g{grid-template-columns:1fr 1fr;width:100%}.t3F .q.d4 img.f{width:21cqi}
.t3F .q:not(.d4) img.f{width:28cqi}.t3F .q.d6 .g{transform:translateY(-2cqi)}
.t3F .hub{position:absolute;left:50%;top:50%;width:22cqi;height:22cqi;transform:translate(-50%,-50%);z-index:4}

/* G. Two big columns: the dice two across in five rows, sizes down the left edge, prices down the right */
.t3G .in{position:absolute;inset:2.4cqi;border-radius:3cqi;display:grid;grid-template-columns:13cqi 1fr 1fr 6cqi;grid-template-rows:repeat(5,1fr);gap:.8cqi 1.6cqi;padding:2cqi 1.6cqi;align-items:center;justify-items:center}
.t3G img.f{width:27cqi}
.t3G .lft{grid-column:1;display:flex;flex-direction:column;align-items:center;gap:2cqi}
.t3G .rgt{grid-column:4}
.t3G .coin{width:11cqi;height:11cqi}
.t3G .bar{grid-column:2/4;height:100%;width:100%;position:relative;z-index:2}
.t3G .rule{grid-column:1/5;height:.4cqi;width:100%;background:#c9a35a66}
.t3G .price{grid-column:4;writing-mode:vertical-rl}
.t3G .price .qd-price{writing-mode:horizontal-tb;font-size:4.2cqi}

/* H. Stairs: each size's dice drawn a little bigger than the last, on the dice felt; the sword small in the corner */
.t3H .in{position:absolute;inset:2.4cqi;border-radius:3cqi;padding:3cqi 3cqi 2cqi;display:flex;flex-direction:column;justify-content:space-between}
.t3H .r{position:relative;display:flex;align-items:flex-end;gap:2.4cqi}
.t3H .r .sz{margin-right:.6cqi;align-self:center}
.t3H .r.d4 img.f{width:17.5cqi}.t3H .r.d6 img.f{width:22cqi}.t3H .r.d8 img.f{width:24.5cqi}.t3H .r.d10 img.f{width:25.5cqi}
.t3H .r .coin{width:20cqi;height:20cqi;margin-left:auto;align-self:center}
.t3H .r .pr{margin-left:auto;align-self:center}
.t3H .step{height:.5cqi;border-radius:.5cqi;background:linear-gradient(90deg,#c9a35a,#c9a35a00)}
/* the metals: a polished plate in each metal's colour, with the name stamped into it */
.t30m{--m1:#fff3b0;--m2:#f2c14e;--m3:#a8701a;--m4:#f7dc84;--ink:#4a2c06}
.t30m.mt-silver{--m1:#ffffff;--m2:#cfd6e0;--m3:#7d8796;--m4:#eef2f7;--ink:#2a3140}
.t30m.mt-bronze{--m1:#ffd9b0;--m2:#cf8f50;--m3:#7a4a22;--m4:#e8b07a;--ink:#3a1c06}
.plate{background:linear-gradient(180deg,var(--m1),var(--m2) 42%,var(--m3) 58%,var(--m4));box-shadow:inset 0 .4cqi 0 #fff8,inset 0 -.5cqi 0 #0005,0 .8cqi 1.6cqi #0007}
.stamp{color:var(--ink);text-shadow:0 .35cqi 0 #fff7,0 -.2cqi 0 #0004}
.nmS{font:700 9.4cqi/1 var(--font-title);letter-spacing:.02em}
.mtS{font:900 3.6cqi/1 var(--font-number);letter-spacing:.32em;text-transform:uppercase}
.rivet{width:2.4cqi;height:2.4cqi;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--m2) 45%,var(--m3));box-shadow:0 .2cqi .3cqi #0008}

/* E: a riveted nameplate bolted across the top */
.t3E .plq{flex:none;height:15.5cqi;border-radius:2.4cqi;display:flex;align-items:center;justify-content:space-between;padding:0 2.4cqi;margin-bottom:.6cqi}
.t3E .plq .mid{display:flex;flex-direction:column;align-items:center;gap:1cqi;padding-top:.6cqi}
.t3E .in{gap:1.3cqi}
/* F: a ribbon across the middle seam, the coin between the metal and the name */
.t3F .ribbon{position:absolute;left:-1cqi;right:-1cqi;top:50%;height:11cqi;transform:translateY(-50%);z-index:3;display:grid;grid-template-columns:1fr 26cqi 1fr;align-items:center;
  background:linear-gradient(180deg,#2a1a50,#1a1030);box-shadow:inset 0 .6cqi 0 #c9a35a,inset 0 -.6cqi 0 #c9a35a,0 1cqi 2cqi #000a}
.t3F .ribbon .l{text-align:right;padding-right:1cqi}.t3F .ribbon .r{text-align:left;padding-left:1cqi}
.t3F .ribbon .mtS{font-size:4.6cqi;background:linear-gradient(180deg,var(--m1),var(--m2) 45%,var(--m3) 60%,var(--m4));-webkit-background-clip:text;background-clip:text;color:transparent}
.t3F .ribbon .nmS{font-size:8.4cqi;color:#f2c14e}
.t3F .q.t .g{transform:translateY(-3cqi)}.t3F .q.b .g{transform:translateY(3.4cqi)}.t3F .q.d6 .g{transform:translateY(-2cqi)}.t3F .q.d6 img.f{width:26cqi}
.t3F .q.t .sz{top:1.2cqi}.t3F .q.b .sz{top:auto;bottom:1.2cqi}
/* G: a metal spine down the right edge, like the name on a book's spine */
.t3G .in{grid-template-columns:12cqi 1fr 1fr 13cqi;right:2.4cqi}
.t3G img.f{width:25.5cqi}
.t3G .spine{grid-column:4;grid-row:1/6;align-self:stretch;justify-self:stretch;border-radius:2.4cqi;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:2cqi 0}
.t3G .spine .txt{writing-mode:vertical-rl;display:flex;align-items:center;gap:2.4cqi}
.t3G .spine .nmS{font-size:44px!important;line-height:1}.t3G .spine .mtS{font-size:15px!important;line-height:1}.t3G .spine .txt{gap:16px!important}.t3G .spine .txt{margin:auto 0}
.t3G .bar{grid-column:2/4}
/* H: the stairs come down to a metal plinth with the name cut into it */
.t3H .in{bottom:2.4cqi;padding-bottom:0}
.t3H .plinth{flex:none;margin:1cqi -3cqi 0;height:18cqi;clip-path:polygon(6% 0,94% 0,100% 100%,0 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8cqi;border-radius:0 0 3cqi 3cqi}
.t3H .plinth .nmS{font-size:9.4cqi}.t3H .plinth{padding-top:1.4cqi}
.t3H .r.d4 img.f{width:16.5cqi}.t3H .r.d6 img.f{width:20.5cqi}.t3H .r.d8 img.f{width:22.5cqi}.t3H .r.d10 img.f{width:23.5cqi}.t3H .r .coin{width:18cqi;height:18cqi}

`;

const names = await p.evaluate(async ({ CSS, WID, METAL, OWNED, SPLASH }) => {
  if (SPLASH) (await import('./js/gfx/dice/faces.js')).setSplashIcon(SPLASH); // dev: try a splash shape
  const DI = await import('./js/gfx/dice/dice.js'); const PR = await import('./js/g3/price.js'); const E = window.QD.E; const D = await import('./js/data.js');
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const wrap = document.createElement('div'); wrap.id = 't30'; document.body.append(wrap);
  const inst = E.makeWeapon(WID, METAL, () => 0.5, OWNED); const metal = ['Bronze', 'Silver', 'Gold'][METAL];
  const art = `assets/cards/weapons/${WID === 'staff' ? 'staff-wide' : `${WID}-${metal.toLowerCase()}-512`}.webp`;
  const groups = [[4, 0, 4], [6, 4, 6], [8, 6, 8], [10, 8, 10]].map(([s, a, b]) => {
    const faces = E.weaponFaces({ ...inst, size: s }, s); const spec = DI.weaponSpec({ ...inst, size: s }, s);
    return { s, owned: s <= OWNED, price: D.WEAPON_TRAINING.prices[{ 6: 4, 8: 6, 10: 8 }[s]] || 0, imgs: faces.slice(a, b).map((f, i) => DI.faceShot(spec, a + i + 1, 240)) };
  });
  const img = (src, g) => `<img class="f${g.owned ? '' : ' ghost'}" src="${src}" alt="">`;
  const sz = (g) => `<span class="sz${g.owned ? '' : ' off'}">d${g.s}</span>`;
  const wname = D.WEAPONS3?.names?.[WID] || D.WEAPONS[WID].name;
  const coin = `<div class="coin"><img src="${art}" alt=""></div>`;
  const price = (g) => PR.priceChipHtml(g.price);
  const card = (cls, html) => { const d = document.createElement('div'); d.className = `t30m t3${cls} mt-${metal.toLowerCase()}`; d.innerHTML = html; wrap.append(d); return cls; };

  card('E', `<div class="in felt"><div class="plq plate"><i class="rivet"></i><div class="mid"><span class="mtS stamp">${metal}</span><span class="nmS stamp">${wname}</span></div><i class="rivet"></i></div>${groups.map((g) => `<div class="r d${g.s}${g.owned ? '' : ' locked'}">${sz(g)}${g.imgs.map((s) => img(s, g)).join('')}
    ${g.s === 4 ? '' : `<div class="end">${g.s === 6 ? coin : price(g)}</div>`}</div>`).join('')}</div>`);

  const corner = ['t l', 't r', 'b l', 'b r'];
  card('F', `${groups.map((g, i) => `<div class="q felt ${corner[i]} d${g.s}">${sz(g)}<div class="g">${g.imgs.map((s) => img(s, g)).join('')}</div>${g.owned ? '' : `<div class="veil">${price(g)}</div>`}</div>`).join('')}<div class="ribbon"><span class="l mtS">${metal}</span><span></span><span class="r nmS">${wname}</span></div><div class="hub">${coin.replace('class="coin"', 'class="coin" style="width:100%;height:100%"')}</div>`);

  const rows = [[groups[0], groups[0].imgs.slice(0, 2), true], [groups[0], groups[0].imgs.slice(2, 4), false], ...groups.slice(1).map((g) => [g, g.imgs, true])];
  card('G', `<div class="in felt">${rows.map(([g, pair, first], i) => `<div class="lft" style="grid-row:${i + 1}">${i === 0 ? coin : ''}${first ? sz(g) : ''}</div>${pair.map((s, j) => `<div style="grid-row:${i + 1};grid-column:${j + 2};width:100%;display:grid;place-items:center">${img(s, g)}</div>`).join('')}${!g.owned ? `<div class="bar" style="grid-row:${i + 1}"><div class="veil">${price(g)}</div></div>` : ''}`).join('')}<div class="spine plate"><i class="rivet"></i><div class="txt"><span class="mtS stamp">${metal}</span><span class="nmS stamp">${wname}</span></div><i class="rivet"></i></div></div>`);

  card('H', `<div class="in felt">${groups.map((g, i) => `${i ? '<div class="step"></div>' : ''}<div class="r d${g.s}">${sz(g)}${g.imgs.map((s) => img(s, g)).join('')}${g.s === 6 ? '' : ''}${g.s === 4 ? '' : g.owned ? (g.s === 6 ? coin : '') : `<span class="pr">${price(g)}</span>`}</div>`).join('')}<div class="plinth plate"><span class="mtS stamp">${metal}</span><span class="nmS stamp">${wname}</span></div></div>`);
  await new Promise((r) => setTimeout(r, 600));
  return ['E', 'F', 'G', 'H'];
}, { CSS, WID, METAL, OWNED, SPLASH: process.env.SPLASH || '' });
for (const n of names) { const el = await p.$(`#t30 .t30m.t3${n}`); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await el.screenshot({ path: `${OUT}/${n}.png` }); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
