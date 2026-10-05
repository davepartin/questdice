// HUD kit: small DOM builders for the 3D battle heads-up display. No emoji: every glyph is an inline SVG
// (duotone: a translucent body, a crisp rim, a white highlight) coloured by the semantic palette in hud.css.
// Pure builders and tiny updaters; the controller (battle3d.js) owns state and flow.
import { h, reduced, buzz } from '../dom.js';
import * as E from '../engine.js';

// ------------------------------------------------------------------------------------------------ icons
// 24x24 grid. Classes: f = duotone body, s = stroke only, h = highlight, p = solid.
const R45 = 'transform="rotate(45 12 12)"';
const ICONS = {
  atk: `<g ${R45}><path class="f" d="M12 1.6 L14.2 4.6 V15 H9.8 V4.6 Z"/><path class="h" d="M12 4.5 V13.5"/><path class="f" d="M6.6 15 H17.4 V17.3 H6.6 Z"/><path class="s" d="M12 17.3 V20.6"/><circle class="p" cx="12" cy="21.6" r="1.3"/></g>`,
  block: '<path class="f" d="M12 2.4 L20 5.4 V12 C20 17 16.6 20.4 12 22 C7.4 20.4 4 17 4 12 V5.4 Z"/><path class="h" d="M12 5 V19.6 M7.2 8.5 V12.5"/>',
  pierce: '<path class="f" d="M12 1.8 L19.4 12 L12 22.2 L4.6 12 Z"/><path class="h" d="M12 4.6 V19.4 M7.4 12 H16.6"/>',
  magic: '<path class="f" d="M12 1.8 L14.5 9.5 L22.2 12 L14.5 14.5 L12 22.2 L9.5 14.5 L1.8 12 L9.5 9.5 Z"/><path class="h" d="M12 5.5 V8.5"/>',
  heal: '<path class="f" d="M9.4 3 H14.6 V9.4 H21 V14.6 H14.6 V21 H9.4 V14.6 H3 V9.4 H9.4 Z"/><path class="h" d="M10.6 5 V10.6 H5"/>',
  gold: '<circle class="f" cx="12" cy="12" r="9.2"/><circle class="s" cx="12" cy="12" r="6" style="stroke-opacity:.55"/><path class="s" d="M12 8.4 V15.6 M9.8 10.2 H13.4 C14.4 10.2 14.4 12 13.4 12 H10.6 C9.6 12 9.6 13.8 10.6 13.8 H14.2" style="stroke-width:1.2"/>',
  stagger: '<path class="f" d="M12 1.2 L14 8 L21 5 L16.5 11 L23 14 L15.6 15.2 L16 22.6 L12 17.4 L8 22.6 L8.4 15.2 L1 14 L7.5 11 L3 5 L10 8 Z"/>',
  bind: '<g transform="rotate(-40 12 12)"><rect class="s" x="1.8" y="8.4" width="11.6" height="7.2" rx="3.6" style="stroke-width:2.1"/><rect class="s" x="10.6" y="8.4" width="11.6" height="7.2" rx="3.6" style="stroke-width:2.1"/></g>',
  drain: '<path class="f" d="M15.4 2.6 A9.6 9.6 0 1 0 21.6 15.8 A7.6 7.6 0 0 1 15.4 2.6 Z"/><path class="h" d="M11 5.4 A7 7 0 0 0 8 12"/>',
  pilfer: '<path class="f" d="M8.8 3 H15.2 L13.9 7 C17.8 8.8 20 12.8 20 16.2 C20 19.8 16.6 21.8 12 21.8 C7.4 21.8 4 19.8 4 16.2 C4 12.8 6.2 8.8 10.1 7 Z"/><path class="s" d="M9.4 7 H14.6"/><path class="h" d="M7 15.5 C7 13.5 8 12 9.5 11"/><circle class="p" cx="12" cy="15.8" r="1.6"/>',
  howl: '<path class="f" d="M2.6 9.6 V14.4 H6.8 L14.2 19.4 V4.6 L6.8 9.6 Z"/><path class="s" d="M17.4 8.6 C19 10.2 19 13.8 17.4 15.4 M19.8 5.8 C22.6 9 22.6 15 19.8 18.2"/>',
  summon: '<circle class="f" cx="12" cy="12" r="9.4"/><path class="s" d="M12 6.2 C16.4 6.2 18 11 15 13.6 C12.6 15.6 9 14 9.4 11 C9.7 9 12.2 8.6 13.2 10.2"/><path class="p" d="M12 11.4 L12.5 12 L12 12.6 L11.5 12 Z"/>',
  windup: '<path class="f" d="M13.8 1.8 L4.8 13.6 H11 L9.6 22.2 L19.4 9.8 H12.8 Z"/><path class="h" d="M13 5 L8.4 11"/>',
  slam: '<path class="f" d="M12 1.6 L14.6 7.6 L21 6.4 L17 11.6 L22 15 L15.4 15.6 L12 21.6 L8.6 15.6 L2 15 L7 11.6 L3 6.4 L9.4 7.6 Z"/><path class="s" d="M12 7 V15 M9 12.4 L12 15.4 L15 12.4" style="stroke-width:1.9"/>',
  heart: '<path class="f" d="M12 21.2 C5 15.6 2.4 12.2 2.4 8.6 C2.4 5.6 4.7 3.6 7.4 3.6 C9.4 3.6 11.2 4.7 12 6.3 C12.8 4.7 14.6 3.6 16.6 3.6 C19.3 3.6 21.6 5.6 21.6 8.6 C21.6 12.2 19 15.6 12 21.2 Z"/><path class="h" d="M6 8.4 C6 7 7 6 8.3 6"/>',
  dice: '<rect class="f" x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4"/><circle class="p" cx="8.6" cy="8.6" r="1.35"/><circle class="p" cx="15.4" cy="8.6" r="1.35"/><circle class="p" cx="12" cy="12" r="1.35"/><circle class="p" cx="8.6" cy="15.4" r="1.35"/><circle class="p" cx="15.4" cy="15.4" r="1.35"/>',
  lock: '<rect class="f" x="4.8" y="10.4" width="14.4" height="10.8" rx="2.6"/><path class="s" d="M8 10.4 V7.8 a4 4 0 0 1 8 0 V10.4"/><circle class="p" cx="12" cy="15.2" r="1.5"/><path class="s" d="M12 15.6 V18" style="stroke-width:1.4"/>',
  reroll: '<path class="s" d="M4.6 11 A7.6 7.6 0 0 1 18.2 6.4"/><path class="s" d="M18.8 2.8 V6.8 H14.8"/><path class="s" d="M19.4 13 A7.6 7.6 0 0 1 5.8 17.6"/><path class="s" d="M5.2 21.2 V17.2 H9.2"/>',
  menu: '<path class="s" d="M4.5 7 H19.5 M4.5 12 H19.5 M4.5 17 H19.5" style="stroke-width:2.2"/>',
  crown: '<path class="f" d="M3 18.6 L2.4 7.2 L8 12 L12 4.6 L16 12 L21.6 7.2 L21 18.6 Z"/><path class="s" d="M3.6 21.2 H20.4"/>',
  rank: '<path class="s" d="M5 10.4 L12 4.4 L19 10.4 M5 18 L12 12 L19 18" style="stroke-width:2.2"/>',
  star: '<path class="f" d="M12 2.2 L14.7 8.6 L21.6 9.2 L16.4 13.8 L18 20.6 L12 17 L6 20.6 L7.6 13.8 L2.4 9.2 L9.3 8.6 Z"/>',
  weaken: '<path class="f" d="M12 21.6 L4 12.8 H8.6 V3 H15.4 V12.8 H20 Z"/>',
  chev: '<path class="f" d="M12 18.4 L3.6 7 H20.4 Z"/>',
  // class glyphs
  knight: '<path class="f" d="M5 20.6 V10.6 C5 6 8 3 12 3 C16 3 19 6 19 10.6 V20.6 L16 18.4 H8 Z"/><path class="s" d="M7.4 11 H16.6" style="stroke-width:2"/><path class="s" d="M12 11 V17"/><path class="h" d="M8 7 C9 5.4 10.4 4.6 12 4.6"/>',
  ranger: '<path class="s" d="M7 3.4 C16.4 6.6 16.4 17.4 7 20.6"/><path class="h" d="M7 3.4 V20.6"/><path class="s" d="M3.6 12 H21 M17.4 8.4 L21 12 L17.4 15.6"/>',
  wizard: '<path class="f" d="M12 2.2 L18.4 19 H5.6 Z"/><path class="s" d="M3 19.8 H21"/><path class="p" d="M12 8.6 L12.9 10.9 L15.2 11.8 L12.9 12.7 L12 15 L11.1 12.7 L8.8 11.8 L11.1 10.9 Z"/>',
  dwarf: '<path class="s" d="M12 2.6 V21.4"/><path class="f" d="M12 5 C7 3.6 3.6 6.4 3.8 10.4 C6.4 11.8 9.6 11.6 12 10 Z"/><path class="f" d="M12 5 C17 3.6 20.4 6.4 20.2 10.4 C17.6 11.8 14.4 11.6 12 10 Z"/>',
  bard: '<path class="f" d="M9.6 11.6 C5.4 11.6 3.6 16 6 18.8 C8.4 21.6 13.8 20.8 15.2 16.4 C15.8 14.4 14.6 12.4 12.6 11.8 Z"/><path class="s" d="M13 12.6 L20.2 4.2 M18.6 2.8 L21.4 5.6"/><circle class="p" cx="9.6" cy="16" r="1.5"/>',
  note: '<path class="s" d="M9 18 V5 L19 3 V16"/><circle class="f" cx="6.8" cy="18" r="2.6"/><circle class="f" cx="16.8" cy="16" r="2.6"/>',
};
try { // display serif for names and titles, loaded without blocking the HUD stylesheet
  if (!document.getElementById('hud-font')) document.head.append(Object.assign(document.createElement('link'), { id: 'hud-font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&display=swap' }));
} catch { /* ignore */ }
const SVGNS = 'http://www.w3.org/2000/svg';
export function iconSvg(name, inner = true) { return ICONS[name] || ICONS.star; }
export function icon(name, cls = '') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `ic ic-${name} ${cls}`.trim()); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  s.innerHTML = ICONS[name] || ICONS.star;
  return s;
}
export const CLASS_ICON = { knight: 'knight', ranger: 'ranger', wizard: 'wizard', dwarf: 'dwarf', bard: 'bard' };

// Replace the emoji / glyphs that game text still carries (view.js strings) with inline icons.
const GLYPHS = { '🪙': 'gold', '✦': 'magic', '◆': 'pierce', '🛡': 'block', '⚔': 'atk', '✚': 'heal', '⚡': 'windup', '✸': 'stagger', '★': 'star' };
const GRE = /(🪙|✦|◆|🛡️?|⚔️?|✚|⚡|✸|★)/;
export function rich(text) {
  return String(text ?? '').split(GRE).map((part) => {
    if (!part) return null;
    const k = GLYPHS[part.replace(/️/g, '')];
    if (k) return h('span', { class: `rg t-${k}` }, icon(k));
    return part;
  });
}

// ------------------------------------------------------------------------------------------------ shapes & medallions
const SHAPES = {
  hex: 'M24 2.4 L43 13.2 V34.8 L24 45.6 L5 34.8 V13.2 Z',
  diamond: 'M24 1.6 L46.4 24 L24 46.4 L1.6 24 Z',
  shield: 'M24 2.4 L42.4 8.6 V24 C42.4 35.4 34.4 42.4 24 46 C13.6 42.4 5.6 35.4 5.6 24 V8.6 Z',
  circle: 'M24 3 A21 21 0 1 1 23.99 3 Z',
  octagon: 'M15.2 2.6 H32.8 L45.4 15.2 V32.8 L32.8 45.4 H15.2 L2.6 32.8 V15.2 Z',
};
export function medallion(shape, iconName, cls = '') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 48 48'); s.setAttribute('class', `med med-${shape} ${cls}`.trim()); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  s.innerHTML = `<path class="med-bg" d="${SHAPES[shape] || SHAPES.hex}"/><path class="med-in" d="${SHAPES[shape] || SHAPES.hex}"/><path class="med-rim" d="${SHAPES[shape] || SHAPES.hex}"/><g class="ic ic-${iconName}" transform="translate(11.5 11.5) scale(1)">${ICONS[iconName] || ''}</g>`;
  return s;
}

// ------------------------------------------------------------------------------------------------ intent view-model
const rng = (e) => { const r = E.intentRange(e); return r ? (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`) : ''; };
// What a monster means to do, as data: tone (colour language), shape, icon, a big figure, a unit, a hint.
export function intentView(e) {
  const i = e.intent; if (!i) return null;
  const r = rng(e);
  switch (i.v) {
    case 'strike': return i.slam
      ? { tone: 'slam', shape: 'octagon', icon: 'slam', title: i.n || 'Slam', fig: r, unit: 'dmg', hint: 'Block it, or burst the foe', call: { head: 'SLAM THIS ROUND', sub: 'brace with block' }, hazard: true }
      : { tone: 'strike', shape: 'hex', icon: 'atk', title: i.n, fig: r, unit: 'dmg', hint: 'block reduces it' };
    case 'pierce': return { tone: 'pierce', shape: 'diamond', icon: 'pierce', title: i.n, fig: r, unit: 'pierce', hint: 'ignores block' };
    case 'guard': return { tone: 'guard', shape: 'shield', icon: 'block', title: i.n, fig: r, unit: 'guard', hint: 'soaks non-pierce dmg' };
    case 'mend': return { tone: 'mend', shape: 'circle', icon: 'heal', title: i.n, fig: r, unit: 'heal', hint: 'heals itself' };
    case 'charge': return { tone: 'windup', shape: 'octagon', icon: 'windup', title: i.n || 'Wind-Up', fig: `${e.staggerAt}+`, unit: 'to break', hint: 'it does nothing this round', call: { head: 'SLAM NEXT ROUND', sub: `deal ${e.staggerAt} to break`, ico: 'stagger' }, hazard: true };
    case 'howl': return { tone: 'howl', shape: 'circle', icon: 'howl', title: i.n, fig: `+${i.k}`, unit: 'all hits', hint: 'the pack grows bolder' };
    case 'bind': return { tone: 'bind', shape: 'circle', icon: 'bind', title: i.n, fig: `${i.k}`, unit: i.k > 1 ? 'dice locked' : 'die locked', hint: 'cannot be rerolled next round' };
    case 'drain': return { tone: 'drain', shape: 'circle', icon: 'drain', title: i.n, fig: r, unit: 'dmg', hint: `steals ${i.k} magic`, subIcon: 'magic' };
    case 'pilfer': return { tone: 'pilfer', shape: 'hex', icon: 'pilfer', title: i.n, fig: r, unit: 'dmg', hint: 'steals gold if it hits', subIcon: 'gold' };
    case 'summon': return { tone: 'summon', shape: 'circle', icon: 'summon', title: i.n, fig: `+${i.k}`, unit: i.k > 1 ? 'foes' : 'foe', hint: 'reinforcements next round' };
    default: return { tone: 'strike', shape: 'hex', icon: 'atk', title: i.n || '?', fig: r, unit: '', hint: '' };
  }
}

// ------------------------------------------------------------------------------------------------ numbers
export function countTo(el, to, { dur = 460, from } = {}) {
  const start = from ?? (Number(el.dataset.v) || 0);
  el.dataset.v = String(to);
  cancelAnimationFrame(el._raf);
  if (reduced() || start === to) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur); const ease = 1 - (1 - k) ** 3;
    el.textContent = String(Math.round(start + (to - start) * ease));
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
export function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// ------------------------------------------------------------------------------------------------ bars & gems
// A health bar: ornate frame, a trailing damage ghost, segment ticks, a number.
export function bar({ cls = '', seg = 8, num = true } = {}) {
  const el = h('div', { class: `hbar ${cls}`, style: { '--seg': seg }, role: 'meter', 'aria-valuemin': '0' },
    h('i', { class: 'hbar-ghost' }), h('i', { class: 'hbar-fill' }), h('i', { class: 'hbar-ticks' }), num ? h('b', { class: 'hbar-num' }) : null);
  el._pct = null;
  return el;
}
export function setBar(el, cur, max, { label } = {}) {
  const pct = Math.max(0, Math.min(100, (cur / Math.max(1, max)) * 100));
  const fill = el.querySelector('.hbar-fill'); const ghost = el.querySelector('.hbar-ghost'); const num = el.querySelector('.hbar-num');
  const prev = el._pct;
  fill.style.width = `${pct}%`;
  if (prev == null || pct >= prev) { ghost.style.transition = 'none'; ghost.style.width = `${pct}%`; void ghost.offsetWidth; ghost.style.transition = ''; }
  else { clearTimeout(el._gt); el._gt = setTimeout(() => { ghost.style.width = `${pct}%`; }, 420); replay(el, 'hit'); }
  el._pct = pct;
  el.classList.toggle('low', pct > 0 && pct <= 30);
  el.classList.toggle('empty', pct <= 0);
  if (num) num.textContent = label ?? `${Math.max(0, Math.ceil(cur))}/${max}`;
  el.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(cur)))); el.setAttribute('aria-valuemax', String(max));
  return prev == null ? 0 : pct - prev;
}
export function gems(n) { return h('div', { class: 'gems', role: 'img' }, Array.from({ length: n }, (_, i) => h('i', { class: 'gem', style: { '--i': i } }))); }
export function setGems(el, v) {
  const prev = el._v ?? 0; const kids = [...el.children];
  kids.forEach((g, i) => {
    const on = i < v; const was = g.classList.contains('on');
    if (on !== was) { g.style.setProperty('--d', `${Math.abs(i - (on ? prev : v)) * 28}ms`); g.classList.toggle('on', on); replay(g, on ? 'gain' : 'spend'); }
  });
  el._v = v; el.setAttribute('aria-label', `Magic ${v} of ${kids.length}`);
}

// ------------------------------------------------------------------------------------------------ buttons
// Premium call-to-action and secondary buttons. `kind`: cta | reroll | ghost | mini.
export function button({ label, sub, icon: ic, onclick, kind = 'ghost', disabled = false, id, aria, cls = '', badge }) {
  const b = h('button', { class: `hb hb-${kind} ${cls}`, type: 'button', id, disabled, 'aria-label': aria || (typeof label === 'string' ? label : undefined) },
    ic ? h('span', { class: 'hb-ic' }, typeof ic === 'string' ? icon(ic) : ic) : null,
    label != null ? h('span', { class: 'hb-tx' }, h('b', {}, label), sub ? h('small', {}, sub) : null) : null,
    badge || null, h('i', { class: 'hb-shine' }));
  b.addEventListener('pointerdown', () => { if (!b.disabled) { buzz(8); replay(b, 'press'); } });
  b.addEventListener('click', (e) => { if (b.disabled) return; const r = b.getBoundingClientRect(); b.style.setProperty('--rx', `${e.clientX - r.left}px`); b.style.setProperty('--ry', `${e.clientY - r.top}px`); onclick?.(e); });
  return b;
}
export function costGem(n, cls = '') { return h('span', { class: `cost ${cls}` }, icon('magic'), h('b', {}, String(n))); }

// ------------------------------------------------------------------------------------------------ outcome strip (forecast)
const OUT = [['atk', 'attack', 'Attack'], ['pierce', 'pierce', 'Pierce'], ['block', 'block', 'Block'], ['magic', 'magic', 'Magic'], ['heal', 'heal', 'Heal'], ['gold', 'gold', 'Gold']];
export function forecastStrip() {
  const chips = {};
  const strip = h('div', { class: 'fs', role: 'group', 'aria-label': 'Outcome forecast' }, OUT.map(([k, ic, label]) => {
    const n = h('b', { class: 'fc-n' }, '0');
    chips[k] = h('div', { class: `fc t-${k} zero`, 'data-k': k, role: 'text', 'aria-label': `${label} 0` }, h('span', { class: 'fc-ic' }, icon(ic)), n, h('small', {}, label));
    chips[k]._n = n; chips[k]._label = label;
    return chips[k];
  }));
  const notes = h('div', { class: 'fs-notes', 'aria-live': 'polite' });
  const el = h('div', { class: 'b3-fc' }, notes, strip);
  el._chips = chips; el._notes = notes; el._seen = new Set();
  return el;
}
export function forecastValues(ev, mods) {
  return { atk: ev.atk + mods.atk, pierce: ev.pierce + mods.pierce, block: ev.block + mods.block, magic: ev.magic, heal: ev.heal + mods.heal, gold: ev.gold };
}
export function setForecast(el, vals) {
  for (const [k, c] of Object.entries(el._chips)) {
    const v = vals[k] ?? 0; const was = Number(c._n.dataset.v ?? 0);
    c.classList.toggle('zero', !v);
    if (v !== was || c._n.dataset.v == null) { countTo(c._n, v, { dur: 380 }); if (v > was) replay(c, 'bump'); }
    c.setAttribute('aria-label', `${c._label} ${v}`);
  }
}
// Synergy notes: proud banners. `notes` = [{ key, kind, icon, text, sub }]
export function setNotes(el, notes) {
  const seen = el._seen; const keys = new Set(notes.map((n) => n.key));
  el._notes.replaceChildren(...notes.map((n) => {
    const fresh = !seen.has(n.key);
    return h('div', { class: `fnote ${n.kind || ''} ${fresh ? 'fresh' : ''}` }, h('span', { class: 'fnote-ic' }, icon(n.icon || 'star')),
      h('span', { class: 'fnote-tx' }, h('b', {}, n.text), n.sub ? h('small', {}, n.sub) : null),
      n.kind === 'good' ? h('span', { class: 'sparkles', 'aria-hidden': 'true' }, h('i', {}), h('i', {}), h('i', {}), h('i', {})) : null);
  }));
  for (const k of [...seen]) if (!keys.has(k)) seen.delete(k);
  for (const k of keys) seen.add(k);
}
export function synergyList(ev, mods) {
  const out = [];
  if (ev.offense3) out.push({ key: 'o3', kind: 'good', icon: 'atk', text: 'TRIPLE!', sub: 'top row · +10 attack' });
  if (ev.defense3) out.push({ key: 'd3', kind: 'good', icon: 'block', text: 'TRIPLE!', sub: 'head · heart · feet · +10 block' });
  if (ev.straight) out.push({ key: `s${ev.straight}`, kind: 'good', icon: 'star', text: `${ev.straight}-STRAIGHT`, sub: `+${ev.straightBonus}` });
  if (ev.stagger + mods.stagger) out.push({ key: 'stg', kind: '', icon: 'stagger', text: `${ev.stagger + mods.stagger} stagger`, sub: '' });
  if (mods.weaken) out.push({ key: 'wk', kind: '', icon: 'weaken', text: `Foes hit ${mods.weaken} softer`, sub: '' });
  return out;
}

// ------------------------------------------------------------------------------------------------ ability cards
const FX_ICON = { atk: 'atk', block: 'block', pierce: 'pierce', heal: 'heal', magic: 'magic', stagger: 'stagger', weaken: 'weaken', free: 'dice' };
export function cardTone(fx) { return fx.heal ? 'heal' : fx.block && !fx.atk ? 'block' : fx.pierce ? 'pierce' : fx.atk ? 'atk' : fx.block ? 'block' : fx.free ? 'free' : fx.weaken ? 'weaken' : 'magic'; }
export function abilityCard(k, { spent, reset, afford, rechargeCost, onclick, disabled, fresh }) {
  const tone = cardTone(k.fx); const art = FX_ICON[Object.keys(k.fx)[0]] || 'magic';
  const chips = Object.entries(k.fx).map(([f, v]) => h('span', { class: `bc-chip t-${FX_ICON[f] === 'dice' ? 'free' : f}` }, icon(FX_ICON[f] || 'star'), h('b', {}, f === 'free' ? `${v}` : `+${v}`)));
  const state = spent ? (reset ? 'recharge' : 'spent') : (reset ? 'ready' : afford ? 'play' : 'low');
  const el = h('button', { class: `bcard tone-${tone} st-${state} ${fresh ? 'just' : ''}`, type: 'button', disabled, onclick, 'aria-label': `${k.name}. ${k.text} ${spent ? (reset ? `Recharge for ${rechargeCost} magic.` : 'Already used.') : `Costs ${k.cost} magic.`}`, title: k.text },
    h('span', { class: 'bc-art' }, icon(art), h('i', { class: 'bc-glint' })),
    h('span', { class: 'bc-body' }, h('b', { class: 'bc-name' }, k.name), h('span', { class: 'bc-chips' }, chips), h('small', { class: 'bc-text' }, k.text)),
    h('span', { class: 'bc-cost' }, spent && reset ? icon('reroll') : icon('magic'), h('b', {}, String(spent && reset ? rechargeCost : k.cost))),
    spent ? h('span', { class: 'bc-flag' }, reset ? 'RECHARGE' : 'SPENT') : null);
  el.addEventListener('pointerdown', () => { if (!el.disabled) { buzz(10); replay(el, 'press'); } });
  return el;
}

// ------------------------------------------------------------------------------------------------ hero medallion
export function heroMedal(cls, level) {
  return h('div', { class: 'hb-medal' }, h('div', { class: 'hb-core' }, icon(CLASS_ICON[cls] || 'knight')), h('b', { class: 'hb-lv', 'aria-label': `Level ${level}` }, String(level)));
}

// ------------------------------------------------------------------------------------------------ moments
const BANNER_ICON = [[/TRIPLE/i, 'dice'], [/STRAIGHT/i, 'star'], [/STAGGER/i, 'stagger'], [/ENRAGE/i, 'slam'], [/LAST STAND/i, 'heart'], [/VICTORY/i, 'crown']];
export function banner(host, text, kind = '', ico) {
  const name = ico || BANNER_ICON.find(([re]) => re.test(text))?.[1] || (kind === 'bad' ? 'slam' : 'magic');
  const sub = /TRIPLE/i.test(text) && /\+10/.test(text) ? '+10' : '';
  const label = text.replace(/\s*\+10\s*$/, '');
  const el = h('div', { class: `b3-banner ${kind}`, role: 'status' },
    h('i', { class: 'bn-rule l' }), h('div', { class: 'bn-core' }, icon(name, 'bn-ic'), h('b', {}, label), sub ? h('em', {}, sub) : null, icon(name, 'bn-ic r')), h('i', { class: 'bn-rule r' }),
    h('span', { class: 'sparkles big', 'aria-hidden': 'true' }, ...Array.from({ length: 8 }, () => h('i', {}))));
  host.append(el); setTimeout(() => el.remove(), 1700);
  return el;
}
export function roundFlourish(host, n) {
  const el = h('div', { class: 'b3-round-fl', 'aria-hidden': 'true' }, h('i', { class: 'rf-line' }), h('small', {}, 'ROUND'), h('b', {}, String(n)), h('i', { class: 'rf-line' }));
  host.append(el); setTimeout(() => el.remove(), 1700);
}
export function titleCard(name, sub, tier = 'elite') {
  const flour = '<svg viewBox="0 0 220 14" class="tc-flour" aria-hidden="true"><path d="M0 7 H86" class="tc-hair"/><path d="M134 7 H220" class="tc-hair"/><path d="M96 7 L110 1 L124 7 L110 13 Z" class="tc-gem"/><circle cx="90" cy="7" r="1.8"/><circle cx="130" cy="7" r="1.8"/></svg>';
  const el = h('div', { class: `b3-titlecard tier-${tier}`, 'aria-hidden': 'true' },
    h('div', { class: 'tc-bar top' }), h('div', { class: 'tc-bar bot' }), h('div', { class: 'tc-wash' }),
    h('div', { class: 'tc-copy' },
      h('small', { class: 'tc-eyebrow' }, icon(tier === 'boss' ? 'crown' : 'rank'), tier === 'boss' ? 'BOSS' : 'ELITE'),
      h('b', { class: 'tc-name' }, name), h('span', { class: 'tc-flour-w', html: flour }), h('small', { class: 'tc-sub' }, sub)));
  return el;
}
