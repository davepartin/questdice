// T30 mockups (Dave, 5 Nov 2026): one weapon card drawn four ways, every face the real 3D die face (faceShot), grouped by size:
// the d4's four faces, then the two each bigger die adds (d6, d8, d10); sizes not bought yet sit under a cover with the price.
// Mockups only: nothing in the game uses these. Headless Chromium, not Safari.
//   node dev/t30-layouts.mjs [out=shots/t30] [weapon=sword] [metal=2] [owned=6]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/t30'; const WID = process.argv[3] || 'sword'; const METAL = +(process.argv[4] ?? 2); const OWNED = +(process.argv[5] || 6);
fs.mkdirSync(OUT, { recursive: true }); const port = 8261;
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });

const CSS = `
#t30{position:fixed;inset:0;z-index:99999;overflow:auto;background:#120c18;display:flex;flex-direction:column;align-items:center;gap:30px;padding:20px 0}
.t30m{width:360px;height:526px;flex:none;position:relative;container-type:inline-size;border-radius:4.5cqi;overflow:hidden;font-family:var(--font-body);color:#2a1a0a;
  background:linear-gradient(180deg,#2b1f15,#160f0a);box-shadow:inset 0 0 0 .8cqi #c9a35a,inset 0 0 0 1.6cqi #24180e,0 10px 24px #000c}
.t30m img.f{display:block;filter:drop-shadow(0 .5cqi .7cqi #0008)}
.t30m .nm{font:700 10cqi/1 var(--font-title);color:#f2c14e;white-space:nowrap}
.t30m .pitch{font:900 6cqi/1.1 var(--font-body);color:#2a1a0a}
.t30m .key{display:flex;gap:3cqi;flex-wrap:wrap;font:800 4.8cqi/1 var(--font-body);color:#3b2a14}.t30m .key span{display:inline-flex;align-items:center;gap:1cqi}.t30m .key svg{width:5.4cqi;height:5.4cqi}
.t30m .qd-price{font-size:4.6cqi}
.t30m .art{background:#1a120c url(assets/cards/scene-forge.webp) center 60%/cover}.t30m .art{position:relative}.t30m .art img{position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:contain!important;object-position:50% 50%!important}
.t30m .sz,.t30m .tag,.t30m .arc{font-family:var(--font-number)!important}
.cover{position:absolute;inset:0;border-radius:2.4cqi;background:repeating-linear-gradient(135deg,#5a3d1ccc 0 1.4cqi,#4a3018cc 1.4cqi 2.8cqi);box-shadow:inset 0 0 0 .5cqi #c9a35a,inset 0 0 2cqi #0008;
  display:flex;align-items:center;justify-content:center;gap:2cqi;color:#ffe9b8;font:900 5cqi/1 var(--font-body);text-shadow:0 .3cqi 0 #0009}
.ghost{opacity:.55;filter:grayscale(1) brightness(.75)!important}

/* A. The bookmark: a leather strip down the left holds the dice, 2 across: two rows of d4, then a pair each of d6, d8, d10 */
.t3A .strip{position:absolute;left:3.2cqi;top:3.2cqi;bottom:3.2cqi;width:36cqi;border-radius:3cqi;background:linear-gradient(90deg,#3a2414,#4d311b 50%,#3a2414);
  box-shadow:inset 0 0 0 .5cqi #c9a35a,inset 0 0 0 1.4cqi #3a2414,inset 0 0 0 1.7cqi #8a6a3a;display:flex;flex-direction:column;padding:2.6cqi 2.4cqi;gap:1.2cqi}
.t3A .band{flex:1;align-content:center;justify-items:center;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:1cqi 1.6cqi;padding:1.2cqi 1.4cqi 1.2cqi 1.4cqi;border-radius:2cqi;background:#00000024}
.t3A .band img.f{width:100%;max-width:13.5cqi}
.t3A .band .sz{position:absolute;left:-1.4cqi;top:-1.2cqi;font:900 3.8cqi/1 var(--font-body);color:#1a1030;background:#f2c14e;border-radius:1.4cqi;padding:.6cqi 1.2cqi;z-index:2}
.t3A .band.locked .cover{flex-direction:column;gap:1cqi;font-size:4.2cqi;background:repeating-linear-gradient(135deg,#5a3d1c88 0 1.4cqi,#4a301888 1.4cqi 2.8cqi)}
.t3A .side{position:absolute;left:42cqi;right:3.2cqi;top:3.2cqi;bottom:3.2cqi;display:flex;flex-direction:column;gap:2.4cqi}
.t3A .art{flex:1;border-radius:3cqi;overflow:hidden;box-shadow:inset 0 0 0 .5cqi #c9a35a}
.t3A .art img{width:100%;height:100%;object-fit:cover;object-position:50% 40%}
.t3A .nm{text-align:center;font-size:9.4cqi;white-space:normal;line-height:1}
.t3A .info{background:#efe2c4;border-radius:3cqi;padding:3cqi 3cqi;display:flex;flex-direction:column;gap:2.4cqi;box-shadow:inset 0 0 0 .5cqi #c9a35a}
.t3A .info .pitch{font-size:5.6cqi}
.t3A .row{display:flex;justify-content:space-between;align-items:center;font:900 5cqi/1 var(--font-body)}

/* B. The ledger: painting on top, then one line per size, dice from the left, the right side says what that size gives (or sells it) */
.t3B .art{height:34%;margin:2.4cqi 2.4cqi 0;border-radius:3cqi 3cqi 0 0;overflow:hidden}.t3B .art img{width:100%;height:100%;object-fit:cover;object-position:50% 45%}
.t3B .band{margin:0 2.4cqi;padding:1.6cqi 2cqi;background:#1a1030;box-shadow:inset 0 -.5cqi 0 #c9a35a;display:flex;justify-content:space-between;align-items:baseline}
.t3B .panel{position:absolute;left:2.4cqi;right:2.4cqi;bottom:2.4cqi;top:calc(34% + 15cqi);background:#efe2c4;border-radius:0 0 3cqi 3cqi;padding:2cqi 3cqi 2.4cqi;display:flex;flex-direction:column;gap:1.2cqi}
.t3B .ln{position:relative;display:flex;align-items:center;gap:1.4cqi;min-height:13cqi;border-bottom:.3cqi dashed #c9b28a;padding-bottom:1.4cqi}
.t3B .ln:nth-last-child(2){border:0}.t3B .bkey{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:1.2cqi}.t3B .bkey .pitch{font-size:5.2cqi}
.t3B .ln .sz{width:9cqi;font:900 5.4cqi/1 var(--font-body);color:#7a5a2c}
.t3B .ln img.f{width:12.6cqi}
.t3B .ln .say{margin-left:auto;text-align:right;font:900 4.8cqi/1.1 var(--font-body);color:#3b2a14}
.t3B .ln .say small{display:block;font:700 3.6cqi/1.1 var(--font-body);color:#7a5a2c}
.t3B .ln.locked .cover{left:9cqi;right:0;bottom:1.4cqi;justify-content:space-between;padding:0 3cqi}

/* C. The weapon rack: the painting across the top; four columns underneath, one per size, growing left to right like a ruler */
.t3C .art{position:absolute!important;left:2.4cqi;right:2.4cqi;top:2.4cqi;height:40%;border-radius:3cqi;overflow:hidden}.C .art img{width:100%;height:100%;object-fit:cover;object-position:50% 45%}
.t3C .art .nm{position:absolute;left:0;right:0;bottom:0;padding:6cqi 3cqi 2.4cqi;background:linear-gradient(180deg,transparent,#000d);text-align:left;font-size:9cqi}
.t3C .art .pitchw{position:absolute;left:3cqi;top:2.4cqi;font:900 4.6cqi/1 var(--font-body);color:#fff;background:#0009;border-radius:2cqi;padding:1.2cqi 2cqi}
.t3C .rack{position:absolute;left:2.4cqi;right:2.4cqi;top:calc(40% + 4cqi);bottom:2.4cqi;background:#efe2c4;border-radius:3cqi;padding:3cqi 2.4cqi 2cqi;display:flex;flex-direction:column}
.t3C .cols{flex:1;display:grid;grid-template-columns:2.1fr 1fr 1fr 1fr;gap:1.6cqi;align-items:stretch}
.t3C .col{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:1.4cqi;border-radius:2.4cqi;background:#00000010;padding:1.6cqi 1cqi}
.t3C .col.d4{display:grid;grid-template-columns:1fr 1fr;align-content:start}
.t3C .col img.f{width:100%;max-width:16cqi}
.t3C .col .tag{position:absolute;bottom:1.2cqi;left:0;right:0;text-align:center;font:900 5.6cqi/1 var(--font-body);color:#7a5a2c}
.t3C .col.locked .cover{flex-direction:column;gap:1.4cqi;font-size:4.4cqi;writing-mode:horizontal-tb}
.t3C .ruler{height:1.6cqi;margin:1.6cqi 1cqi 0;border-radius:1cqi;background:linear-gradient(90deg,#c9a35a 0 50%,#c9a35a55 50%)}
.t3C .key{margin-top:1.8cqi;justify-content:center}

/* D. The medallion: the weapon in a round frame in the middle, the ten faces in a ring around it, the sizes as arcs */
.t3D .nmb{position:absolute;left:2.4cqi;right:2.4cqi;top:2.4cqi;padding:2cqi;background:#1a1030;box-shadow:inset 0 -.5cqi 0 #c9a35a;text-align:center;border-radius:3cqi 3cqi 0 0}
.t3D .disc{position:absolute;left:2.4cqi;right:2.4cqi;top:15cqi;bottom:26.4cqi;background:radial-gradient(circle at 50% 50%,#f5ead2,#e6d3ad 70%,#d4bb8a);}
.t3D .med{position:absolute;left:50%;top:50%;width:34cqi;height:34cqi;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.2cqi #c9a35a,0 0 0 2cqi #5a3d1c,0 1cqi 3cqi #0008}
.t3D .med img{width:100%;height:100%;object-fit:cover}
.t3D .dot{position:absolute;width:15cqi;transform:translate(-50%,-50%)}
.t3D .dot img.f{width:100%}
.t3D .dot.locked img.f{filter:grayscale(1) brightness(.35) drop-shadow(0 .5cqi .7cqi #0008)!important;opacity:.55}
.t3D .arc{position:absolute;z-index:3;transform:translate(-50%,-50%);font:900 4.2cqi/1 var(--font-body);color:#1a1030;background:#f2c14e;border-radius:1.6cqi;padding:.8cqi 1.4cqi;white-space:nowrap}
.t3D .arc.locked{background:#5a3d1c;color:#ffe9b8;display:flex;gap:1cqi;align-items:center}
.t3D .grow{font-family:var(--font-number)!important;color:#7a5a2c}.t3D .key{gap:2.4cqi;justify-content:center}
.t3D .foot .pitch{font-size:5.4cqi}.t3D .foot{position:absolute;left:2.4cqi;right:2.4cqi;bottom:2.4cqi;height:24cqi;background:#efe2c4;border-radius:0 0 3cqi 3cqi;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4cqi;box-shadow:inset 0 .5cqi 0 #c9a35a}
`;

const names = await p.evaluate(async ({ CSS, WID, METAL, OWNED }) => {
  const DI = await import('./js/gfx/dice/dice.js'); const CW = await import('./js/g3/cards.js'); const PR = await import('./js/g3/price.js'); const E = window.QD.E; const D = await import('./js/data.js');
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const wrap = document.createElement('div'); wrap.id = 't30'; document.body.append(wrap);
  const inst = E.makeWeapon(WID, METAL, () => 0.5, OWNED); const metal = ['Bronze', 'Silver', 'Gold'][METAL];
  const name = `${metal} ${D.WEAPONS[WID].name}`; const pitch = D.WEAPONS3.short[WID];
  const art = `assets/cards/weapons/${WID === 'staff' ? `staff-${metal.toLowerCase()}-wide` : `${WID}-${metal.toLowerCase()}-512`}.webp`;
  // the groups: the d4's faces, then the two each bigger die adds; every picture cut from that size's real 3D die
  const groups = [[4, 0, 4], [6, 4, 6], [8, 6, 8], [10, 8, 10]].map(([s, a, b]) => {
    const faces = E.weaponFaces({ ...inst, size: s }, s); const spec = DI.weaponSpec({ ...inst, size: s }, s);
    return { s, owned: s <= OWNED, price: D.WEAPON_TRAINING.prices[{ 6: 4, 8: 6, 10: 8 }[s]] || 0, faces: faces.slice(a, b), imgs: faces.slice(a, b).map((f, i) => DI.faceShot(spec, a + i + 1, 200)), top: Math.max(...faces.map((f) => f.v)) };
  });
  const fxs = [...new Set(groups.flatMap((g) => g.faces.flatMap((f) => Object.keys(f.fx || {}))))].map((k) => (k === 'loot' ? 'gold' : k));
  const NAME = { gold: 'Gold', pierce: 'Pierce', splash: 'Splash', magic: 'Magic', heal: 'Heal' };
  const key = `<div class="key">${fxs.map((k) => `<span>${CW.ico(k)}${NAME[k] || k}</span>`).join('')}</div>`;
  const img = (src, cls = '') => `<img class="f ${cls}" src="${src}" alt="">`;
  const cover = (g, label = true) => `<div class="cover">${label ? `<span>d${g.s}</span>` : ''}${PR.priceChipHtml(g.price)}</div>`;
  const card = (cls, html) => { const d = document.createElement('div'); d.className = `t30m t3${cls}`; d.innerHTML = html; wrap.append(d); return cls; };

  card('A', `<div class="strip">${[groups[0], ...groups].map((g, i) => { const part = i === 0 ? g.imgs.slice(0, 2) : i === 1 ? g.imgs.slice(2, 4) : g.imgs;
      return `<div class="band${g.owned ? '' : ' locked'}">${i !== 1 ? `<span class="sz">d${g.s}</span>` : ''}${part.map((s) => img(s, g.owned ? '' : 'ghost')).join('')}${g.owned ? '' : `<div class="cover"><span>Grow to d${g.s}</span>${PR.priceChipHtml(g.price)}</div>`}</div>`; }).join('')}</div>
    <div class="side"><div class="nm">${name}</div><div class="art"><img src="${art}" alt=""></div>
      <div class="info"><div class="pitch">${pitch}</div>${key}<div class="row"><span>One hand</span><span>d${OWNED}</span></div></div></div>`);

  card('B', `<div class="art"><img src="${art}" alt=""></div><div class="band"><span class="nm">${name}</span><span class="pitch" style="color:#f2c14e;font-size:5cqi">d${OWNED}</span></div>
    <div class="panel">${groups.map((g) => `<div class="ln${g.owned ? '' : ' locked'}"><span class="sz">d${g.s}</span>${g.imgs.map((s) => img(s, g.owned ? '' : 'ghost')).join('')}
      ${g.owned ? `<span class="say">${g.s === 4 ? 'Start' : `+2 faces`}<small>best ${g.top}</small></span>` : `<div class="cover"><span>Grow · best ${g.top}</span>${PR.priceChipHtml(g.price)}</div>`}</div>`).join('')}<div class="bkey"><span class="pitch">${pitch}</span>${key}</div></div>`);

  card('C', `<div class="art"><img src="${art}" alt=""><span class="pitchw">${pitch}</span><div class="nm">${name}</div></div>
    <div class="rack"><div class="cols">${groups.map((g) => `<div class="col d${g.s}${g.owned ? '' : ' locked'}">${g.imgs.map((s) => img(s, g.owned ? '' : 'ghost')).join('')}<span class="tag">d${g.s}</span>${g.owned ? '' : `<div class="cover"><span>d${g.s}</span>${PR.priceChipHtml(g.price)}</div>`}</div>`).join('')}</div>
    <div class="ruler" style="background:linear-gradient(90deg,#c9a35a 0 ${OWNED === 4 ? 40 : OWNED === 6 ? 60 : OWNED === 8 ? 80 : 100}%,#c9a35a44 0)"></div>${key}</div>`);

  // D: ten spots round a circle, clockwise from the top; the size badges sit just outside each group
  const all = groups.flatMap((g) => g.imgs.map((s) => ({ s, g }))); const R = 35; const cx = 50; const cy = 50;
  const ang = (i) => -Math.PI / 2 + (i - 1.5) * (2 * Math.PI / 10); const pos = (i) => { const a = ang(i); return [cx + R * Math.cos(a), cy + R * 1.04 * Math.sin(a)]; };
  let k = 0; const dots = all.map((d) => { const [x, y] = pos(k++); return `<div class="dot${d.g.owned ? '' : ' locked'}" style="left:${x}%;top:${y}%">${img(d.s)}</div>`; }).join('');
  let at = 0; const arcs = groups.map((g) => { const n = g.imgs.length; const mid = at + (n - 1) / 2; at += n; const a = ang(mid); const r = 21.5;
    return `<span class="arc${g.owned ? '' : ' locked'}" style="left:${cx + r * Math.cos(a)}%;top:${cy + r * 1.04 * Math.sin(a)}%">d${g.s}</span>`; }).join('');
  card('D', `<div class="nmb"><span class="nm">${name}</span></div><div class="disc"><div class="med"><img src="${art}" alt=""></div>${dots}${arcs}</div><div class="foot"><div class="pitch">${pitch}</div>${key}<div class="key">${groups.filter((g) => !g.owned).map((g) => `<span class="grow">d${g.s} ${PR.priceChipHtml(g.price)}</span>`).join('')}</div></div>`);
  await new Promise((r) => setTimeout(r, 600));
  return ['A', 'B', 'C', 'D'];
}, { CSS, WID, METAL, OWNED });
for (const n of names) { const el = await p.$(`#t30 .t30m.t3${n}`); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await el.screenshot({ path: `${OUT}/${n}.png` }); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
