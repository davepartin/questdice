// "Share battle report" (T10): the small secondary action on the victory and defeat screens, and the sheet it opens.
// The report is built and kept by js/battlereport.js, on this device only. Here the player reads a short preview and chooses to
// share it: the phone's own share sheet where there is one, otherwise copy to the clipboard or download a text file.
import { h, toast, modal, closeModal } from '../dom.js';
import { sfx } from '../audio.js';
import * as BR from '../battlereport.js';

const NOTE = 'Stored on this device only (the last three fights). Shared only when you choose.';

// The quiet row under a result screen: one small button and one honest line. The screen's own actions stay the prominent ones.
export function reportRow(storage) {
  const have = BR.loadReports(storage);
  if (!have.length) return null;
  return h('div', { class: 'br-row' },
    h('button', { class: 'br-open', type: 'button', onclick: () => { sfx.click?.(); openReports({ storage }); } }, 'Share battle report'),
    h('small', {}, NOTE));
}

// ---- what a share does, with its fallbacks (each can fail without troubling the game)
export async function copyText(text) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through to the old way */ }
  try {
    const ta = h('textarea', { 'aria-hidden': 'true', style: { position: 'fixed', top: '-1000px', opacity: '0' } }); ta.value = text;
    document.body.append(ta); ta.focus(); ta.select(); const ok = document.execCommand?.('copy'); ta.remove(); return !!ok;
  } catch { return false; }
}
export function downloadText(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = h('a', { href: url, download: name, style: { display: 'none' } }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); return true;
  } catch { return false; }
}
// true: shared; false: could not (the caller offers copy and download); null: the player closed the share sheet
export async function nativeShare(report) {
  const text = BR.exportText(report); const title = `Quest Dice battle report: ${BR.titleOf(report)}`;
  try {
    if (typeof File === 'function' && navigator.canShare) {
      const file = new File([text], BR.exportName(report), { type: 'text/plain' });
      // no `text` beside the file: apps such as Notes and Messages insert both, which doubled the heading (real iPhone, 24 October)
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return true; }
    }
    if (navigator.share) { await navigator.share({ title, text }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return null; }
  return false;
}
export const canShareNatively = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

// ---- the sheet
export function openReports({ onClose, storage } = {}) {
  const list = BR.loadReports(storage); const entries = BR.pickerEntries(storage); if (!list.length) { toast('No battle report on this device yet.'); return; }
  let pick = 0;
  const preview = h('pre', { class: 'br-preview', tabindex: '0', 'aria-label': 'Report preview' });
  const choices = h('div', { class: 'br-list', role: 'radiogroup', 'aria-label': 'Which fight' });
  const draw = () => {
    const r = list[pick];
    preview.textContent = BR.summaryText(r).split('\n').slice(0, 14).join('\n') + '\n…';
    choices.replaceChildren(...entries.map((x, i) => h('button', { class: `br-pick ${i === pick ? 'on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(i === pick), onclick: () => { pick = i; draw(); } },
      h('b', {}, x.title), h('small', {}, `${x.mode} · ${x.rounds} round${x.rounds === 1 ? '' : 's'}${x.trimmed ? ' · trimmed' : ''} · ${new Date(x.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`))));
  };
  draw();
  const done = (ok, what) => { if (ok === null) return; if (ok) toast(what); else toast('That did not work here. Try another option below.', 'bad'); };
  const act = (fn, what) => async () => { sfx.click?.(); done(await fn(list[pick]), what); };
  const share = h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { sfx.click?.(); const r = await nativeShare(list[pick]); if (r === false) toast('Sharing is not available here. Use Copy or Download.', 'bad'); } }, 'Share');
  const close = () => { closeModal(); onClose?.(); };
  const sheet = h('div', { class: 'form br-sheet' },
    h('h2', {}, 'Share battle report'),
    h('p', { class: 'muted br-note' }, NOTE),
    h('div', { class: 'br-main' }, choices, preview),
    h('div', { class: 'br-actions' },
      canShareNatively() ? share : null,
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: act((r) => copyText(BR.exportText(r)), 'Copied. Paste it where Dave can read it.') }, 'Copy'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: act((r) => downloadText(BR.exportName(r), BR.exportText(r)), 'Saved a text file.') }, 'Download')),
    h('div', { class: 'row end' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { sfx.click?.(); close(); } }, 'Close')));
  modal(sheet);
}
