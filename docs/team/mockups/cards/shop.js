// Camp Store v1 (Crockpot / Grok Bot, 26 Oct 2026). MOCKUP ONLY; the live store (js/g3/scrui.js storeTab) is unchanged.
// Every item and price on this page comes from the game's own code: E.shopStock (4 weapons), E.storeTonics (2 specials), E.bundleOffer
// (mystery bundle), E.petOffer (pet), E.potionBuyInfo (potions, sold from camp's status bar today). Charms are out of the game: not shown.
// Demo hero: a new Knight, Act I camp 1, seed 7, 180 gold, one potion drunk. ?gold= ?seed= ?act= to try other camps.
import * as E from '../../../../js/engine.js';
import * as D from '../../../../js/data.js';
import { drawIcon, drawSym, hasIcon } from '../../../../js/gfx/dice/faces.js';
const Q = new URLSearchParams(location.search);
const hero = E.newHero({ name: 'Dave', cls: 'knight', seed: +(Q.get('seed') || 7) });
hero.gold = +(Q.get('gold') || 180); hero.potions = 1; hero.campaign.act = +(Q.get('act') || 1);
const COL = { atk: '#ff3b3b', block: '#3aa4ff', magic: '#a64dff', gold: '#ffd21a', heal: '#38e87a', pierce: '#ff9a2a' };
const ink = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 112; const g = c.getContext('2d'); g.lineJoin = 'round'; draw(g); return c; };
const icon = (name, col) => ink((g) => { g.fillStyle = col; g.strokeStyle = '#1a1208'; drawIcon(g, hasIcon(name) ? name : 'sword', 56, 56, 92, { stroke: 7 }); });
const sym = (k) => ink((g) => { g.fillStyle = COL[k]; g.strokeStyle = '#1a1208'; drawSym(g, k === 'block' ? 'def' : k, 56, 56, 90, 6, true); });
const METAL = ['#c98a4a', '#d8e2ea', '#ffd24a'];
const tag = (price) => `<span class="tag ${hero.gold < price ? 'poor' : ''}"><i class="coin"></i>${price}</span>`;
const card = ({ cls = '', art, title, lines = [], price, extra = '' }) => { const el = document.createElement('div'); el.className = `cb ${cls}`; el.dataset.chk = '1';
  el.innerHTML = `${extra}<div class="art"></div><b>${title}</b>${lines.map((l) => `<small>${l}</small>`).join('')}${price != null ? tag(price) : ''}`; el.querySelector('.art').append(art); return el; };
const stock = E.shopStock(hero); const tonics = E.storeTonics(hero); const bo = E.bundleOffer(hero); const pet = E.petOffer(hero); const pot = E.potionBuyInfo(hero);
const best = stock.map((it, i) => ({ it, i })).sort((a, b) => b.it.price - a.it.price)[0];
const m = document.getElementById('m');
m.innerHTML = `<header class="sign" data-chk="1"><h1>CAMP STORE</h1><p>New stock every camp</p><span class="purse"><i></i>${hero.gold}</span></header>
<section class="zone"><h2>Today's specials</h2><p class="sub">One fight of help. Bought today, used in your next fight, gone after.</p><div class="counter"><div class="cards" id="sp"></div></div></section>
<section class="zone"><h2>On the shelf</h2><p class="sub">Weapons. What you buy goes in your pack.</p><div class="cards two" id="sh"></div></section>
<section class="zone"><h2>Odds and ends</h2><div class="row" id="od"></div></section>
<p class="foot">Mockup · every item and price read from the game code · Crockpot (Grok Bot)</p>`;
const sp = m.querySelector('#sp');
for (const t of tonics) sp.append(card({ art: t.icon === 'boot' ? icon('boots', '#c98a4a') : sym(t.icon === 'block' ? 'block' : t.icon), title: t.name, lines: [t.text], price: t.price }));
if (bo) sp.append(card({ cls: 'parcel', art: ink((g) => { g.font = '900 84px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#1a1208'; g.strokeText('?', 56, 60); g.fillStyle = '#c84a3a'; g.fillText('?', 56, 60); }), title: 'Mystery bundle', lines: ['A weapon wrapped in a tablecloth.', `<span class="odds">${bo.odds.map((o, i) => `<span style="background:${['#8a5a2a', '#7a8894', '#b8860b'][i]}">${Math.round(o * 100)}%</span>`).join('')}</span>`], price: bo.price }));
const sh = m.querySelector('#sh');
stock.forEach((it, i) => { const w = D.WEAPONS[it.inst.id]; const r = it.inst.rarity | 0; const isBest = i === best.i;
  const extra = `<span class="band"></span>${isBest ? `<span class="ribbon">WORTH SAVING FOR</span>` : ''}`;
  const lines = [`<span class="metal">${it.inst.diamond ? 'Diamond' : D.RARITY[r]}</span>`, `${w.hands === 2 ? 'Two hands' : 'One hand'}`];
  if (isBest) lines.push(`<span class="bar" style="display:block"><i style="width:${Math.min(100, hero.gold / it.price * 100)}%"></i></span>`, hero.gold >= it.price ? 'You can afford it now.' : `${hero.gold} of ${it.price} gold`);
  sh.append(card({ cls: `r${r} ${isBest ? 'save' : ''}`, art: icon(it.inst.id, METAL[r]), title: w.name, lines, price: it.price, extra })); });
const od = m.querySelector('#od');
if (pet) { const img = new Image(); img.src = `../../../../assets/pets/${D.PETS[pet.type].img}.webp`; img.alt = D.PETS[pet.type].name;
  od.append(card({ art: img, title: `${D.PETS[pet.type].name}, a pet`, lines: ['Rolls one more die beside your board.'], price: pet.price })); }
od.append(card({ art: sym('heal'), title: 'Healing potion', lines: [`Heals ${E.potionHpOf(hero)}. Belt ${pot.have} of ${pot.max}.`, '(sold from the camp bar today)'], price: pot.price }));
await document.fonts.ready; await new Promise((r) => setTimeout(r, 300)); document.body.dataset.done = '1';
