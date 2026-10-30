// Small DOM helpers shared by the UI.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } } // custom properties need setProperty
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  // Every dismiss action shares one label, hit area and visual treatment.
  if (tag === 'button' && (/^(?:[✕×]\s*)?Close$/i.test(el.textContent.trim()) || (/^[✕×x]$/i.test(el.textContent.trim()) && /^Close\b/i.test(el.getAttribute('aria-label') || el.title || '')))) {
    el.textContent = 'Close'; el.classList.add('qd-close');
  }
  // Build dismiss headers in one place, including forms rebuilt after an action.
  if (tag !== 'button') {
    const ownClose = [...el.children].find(c => c.matches?.('button.qd-close'));
    if (ownClose && (el.matches('.gv-head, .sh-head, .hc-top') || el.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > b'))) el.classList.add('qd-window-head');
    if (el.classList.contains('form')) alignWindowClose(el);
  }
  return el;
}
// Keep a single dismiss action in the title row, never floating over the title.
export function alignWindowClose(content) {
  const buttons = [...content.querySelectorAll('button.qd-close')];
  if (!buttons.length) return;
  const button = buttons[0];
  const existing = button.closest('.qd-window-head, .gv-head, .sh-head, .hc-top');
  if (existing) existing.classList.add('qd-window-head');
  else {
    const title = content.querySelector(':scope > h1, :scope > h2, :scope > h3') || content.querySelector('h1, h2, h3'); // a dialog whose heading sits one level down (the Rules) gets it in the title row too
    const header = document.createElement('header'); header.className = 'qd-window-head';
    if (title) header.append(title);
    const old = button.parentElement; header.append(button); content.prepend(header);
    if (old && old !== content && !old.textContent.trim() && !old.children.length) old.remove();
  }
  for (const duplicate of buttons.slice(1)) duplicate.remove();
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function toast(msg, kind = '') {
  const host = $('#toast');
  const t = h('div', { class: `toast ${kind}` }, msg);
  host.append(t);
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2700);
}
// Floating combat number anchored to an element.
export function floater(anchor, text, kind = '') {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const f = h('div', { class: `floater ${kind}`, style: { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height * 0.35}px` } }, text);
  document.body.append(f);
  setTimeout(() => f.remove(), 1300);
}
export const buzz = (ms = 15) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };
// Close any open dialog. Always use this (not emptying #modal by hand): an empty but still "open" #modal
// is an invisible full-screen layer that swallows every tap.
export function closeModal() { const host = $('#modal'); host.replaceChildren(); host.classList.remove('open'); }
export function modal(content, { dismiss = true, closeButton = false } = {}) {
  const host = $('#modal');
  const close = closeModal;
  if ((dismiss || closeButton) && !content.querySelector('button.qd-close')) content.append(h('button', { type: 'button', onclick: close }, 'Close'));
  alignWindowClose(content);
  const card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' }, content);
  const back = h('div', { class: 'modal-back', onclick: (e) => { if (dismiss && e.target === back) close(); } }, card);
  host.replaceChildren(back); host.classList.add('open');
  return close;
}
