// Two menu entries for a slow or hot phone (Dave, 27 Oct 2026): "Graphics" (quality and Battery saver, saved on this device in js/gfx/settings.js, applied after a
// restart) and "Download game" (Install, Download for no-signal play and the version, js/pwa.js).
import { h } from './dom.js';
import { getGfx, setGfx, QUALITIES, QUALITY_NAME, autoQuality } from './gfx/settings.js';
import * as P from './pwa.js';

const DESC = {
  auto: () => `Picks for this phone: ${QUALITY_NAME[autoQuality()]}.`,
  low: () => 'Plainest picture. Coolest and fastest.',
  med: () => 'Soft edges and a gentle glow.',
  high: () => 'Everything on. Needs a strong phone.',
};
export function graphicsMenu({ modal, ghost, primary, persist }) {
  const start = getGfx(); let q = start.q; let saver = start.saver; let close = () => {};
  const body = h('div', { class: 'form dev-menu' });
  const changed = () => q !== start.q || saver !== start.saver;
  function render() {
    const picks = QUALITIES.map((k) => h('button', { type: 'button', class: `dev-pick ${q === k ? 'on' : ''}`, 'aria-pressed': String(q === k), onclick: () => { q = k; render(); } }, QUALITY_NAME[k]));
    body.replaceChildren(
      h('h2', {}, 'Graphics'),
      h('h3', {}, 'Picture quality'),
      h('div', { class: 'dev-picks', role: 'group', 'aria-label': 'Picture quality' }, ...picks),
      h('p', { class: 'muted' }, DESC[q]()),
      h('button', { type: 'button', class: `dev-saver ${saver ? 'on' : ''}`, 'aria-pressed': String(saver), onclick: () => { saver = !saver; render(); } },
        h('b', {}, `Battery saver: ${saver ? 'On' : 'Off'}`), h('small', {}, '30 frames a second, no shadows, a lighter picture. For a slow or hot phone.')),
      changed() ? h('p', { class: 'muted' }, 'Applying restarts the game. Your hero is saved; a fight in progress starts over.') : null,
      h('div', { class: 'row end' }, ghost('Close', () => close()), changed() ? primary('Apply and restart', () => { setGfx({ q, saver }); try { persist?.(); } catch { /* ignore */ } location.reload(); }) : null));
  }
  render(); close = modal(body); return close;
}
export const graphicsLabel = () => { const g = getGfx(); return `Graphics: ${g.saver ? 'Battery saver' : QUALITY_NAME[g.q]}`; };

export function downloadMenu({ modal, ghost, primary, toast }) {
  let close = () => {}; const body = h('div', { class: 'form dev-menu' });
  function render() {
    const state = P.offlineState(); const installed = P.isInstalled();
    const newer = P.updateReady(); const stale = state && P.latestBuild() && state.build !== P.latestBuild();
    const status = state ? `Saved on this phone: ${P.formatSize(state.bytes)}, ${state.files} files (version ${state.build}).${stale ? ' Newer files are available: download again.' : ''}` : 'Not saved yet.';
    const msg = h('p', { class: 'muted dev-status', role: 'status' }, status);
    const bar = h('div', { class: 'dev-bar', hidden: true }, h('i', {}));
    const dlBtn = primary(state ? 'Download again (get the newest)' : 'Download the game to this phone', async () => {
      dlBtn.disabled = true; bar.hidden = false; msg.textContent = 'Saving the game files… keep this screen open.';
      try {
        const s = await P.downloadAll(({ done, total }) => { bar.firstChild.style.width = `${Math.round((100 * done) / total)}%`; msg.textContent = `Saving the game files… ${done} of ${total}`; });
        msg.textContent = `Saved on this phone: ${P.formatSize(s.bytes)}, ${s.files} files. Solo play now works with no signal.`; toast('The game is saved on this phone.');
      } catch (e) { msg.textContent = 'Could not finish (no signal?). What was saved stays saved: tap again to continue.'; }
      dlBtn.disabled = false; bar.hidden = true;
    });
    const install = installed ? h('p', { class: 'muted' }, 'Installed: you are playing the app.')
      : P.canPromptInstall() ? primary('Install on the home screen', async () => { const r = await P.promptInstall(); if (r === 'accepted') toast('Installed. Look for Quest Dice on your home screen.'); render(); })
        : h('p', { class: 'muted' }, `To install: ${P.platformHelp()}`);
    const version = h('div', { class: 'dev-version' }, h('p', { class: 'muted' }, `Version ${P.RUNNING}`),
      newer ? h('p', { class: 'dev-new' }, `A newer version is ready (${P.latestBuild()}). `, h('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => location.reload() }, 'Restart')) : P.latestBuild() ? h('p', { class: 'muted' }, 'This is the newest version.') : null);
    body.replaceChildren(
      h('h2', {}, 'Download game'),
      h('p', { class: 'muted' }, 'A saved copy opens faster and uses less data, and solo play works with no signal. A shared table still needs the internet.'),
      install, h('div', { class: 'dev-dl' }, dlBtn, bar, msg), version,
      h('div', { class: 'row end' }, ghost('Close', () => close())));
  }
  P.checkLatest().then(() => { if (body.isConnected) render(); }); // the newest version, when there is a signal
  render(); close = modal(body); return close;
}
