// Phone ↔ table. Two kinds of table:
//   cloud: the game on GitHub Pages; rooms live in Firebase (cloud.js). This is the normal one.
//   local: someone runs node server.mjs on a laptop and every phone opens that address.
// The seat (room code, token, kind) stays in this browser tab.
const KEY = 'questdice.seat';

let auth = null;
let source = null;
let cloud = null;
const Cloud = () => (cloud ||= import('./cloud.js'));

// The seat is kept on the phone (a closed tab, or a phone that put the page to sleep, still finds its way back).
const stores = () => [() => localStorage, () => sessionStorage];
export function savedSeat() {
  for (const get of stores()) { try { const v = JSON.parse(get().getItem(KEY) || 'null'); if (v) return v; } catch { /* next store */ } }
  return null;
}
function remember(code, token, kind, about = {}) { // about: { table, hero } names, for the Rejoin button
  auth = { code, token, kind, ...about };
  for (const get of stores()) { try { get().setItem(KEY, JSON.stringify(auth)); } catch { /* next store */ } }
}
// Keep the table's and hero's names with the seat (seats saved before names were kept get them the next time the table opens).
// `where` is how far the table has come (Act I · step 4), so the Rejoin button can say the game is waiting right there.
export function tagSeat(about = {}) { const s = seat(); if (!s) return; if (about.where === s.where && (!about.table || about.table === s.table) && (!about.hero || about.hero === s.hero)) return; remember(s.code, s.token, s.kind, { table: about.table || s.table || '', hero: about.hero || s.hero || '', where: about.where || s.where || '' }); }
// The Rejoin button's words: the table's name (its code if an older phone never kept it), whose seat it is, and where it waits.
export function seatLabel(seat = savedSeat()) {
  if (!seat) return null;
  return { title: `Rejoin ${seat.table || seat.code}`, sub: `Table ${seat.code}${seat.hero ? ` · ${seat.hero}'s seat` : ' · your seat is kept'}${seat.where ? ` · saved at ${seat.where}` : ''}` };
}
export function clearSeat() {
  disconnect();
  auth = null;
  for (const get of stores()) { try { get().removeItem(KEY); } catch { /* next store */ } }
}
function seat() {
  if (auth) return auth;
  auth = savedSeat();
  return auth;
}

// Served by node server.mjs? Then use it; otherwise the cloud.
let kindP = null;
function tableKind() {
  return (kindP ||= fetch('/api/ping', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && d.questdice ? 'local' : 'cloud'))
    .catch(() => 'cloud'));
}
export async function isCloud() { return (await tableKind()) === 'cloud'; }

async function post(body) {
  let res;
  try {
    res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('The table server is not answering.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'The table did not answer.');
  return data;
}

export async function createSeat({ name, cls, table, hero, difficulty, pack }) {
  const kind = await tableKind();
  const data = kind === 'cloud' ? await (await Cloud()).createSeat({ name, cls, table, hero, difficulty, pack }) : await post({ op: 'create', name, cls, table, hero, difficulty, pack });
  remember(data.code, data.token, kind, { table: data.view?.name || table || '', hero: name });
  return data;
}
export async function joinSeat({ code, name, cls, hero, reclaim = false }) {
  const kind = await tableKind();
  const data = kind === 'cloud' ? await (await Cloud()).joinSeat({ code, name, cls, hero, reclaim }) : await post({ op: 'join', code, name, cls, hero, reclaim });
  remember(data.code, data.token, kind, { table: data.view?.name || '', hero: name });
  return data;
}
export async function send(cmd) {
  const s = seat();
  if (!s) throw new Error('This phone has no seat.');
  if (s.kind === 'cloud') return (await Cloud()).send(s.code, cmd);
  return post({ op: 'act', code: s.code, token: s.token, cmd });
}
export async function snapshot() {
  const s = seat();
  if (!s) return null;
  if (s.kind === 'cloud') return (await Cloud()).snapshot(s.code);
  let res;
  try {
    res = await fetch(`/api/room/${s.code}?token=${encodeURIComponent(s.token)}`);
  } catch {
    throw new Error('The table server is not answering.');
  }
  if (res.status === 404 || res.status === 401) return { missing: true };
  if (!res.ok) throw new Error('The table did not answer.');
  return res.json();
}
export function connect(onView) {
  const s = seat();
  if (!s) return;
  disconnect();
  if (s.kind === 'cloud') { Cloud().then((C) => C.connect(s.code, onView)); return; }
  source = new EventSource(`/api/room/${s.code}/events?token=${encodeURIComponent(s.token)}`);
  source.onmessage = (ev) => {
    try { onView(JSON.parse(ev.data)); } catch { /* ignore a bad frame */ }
  };
}
export function disconnect() {
  if (source) { source.close(); source = null; }
  if (cloud) cloud.then((C) => C.disconnect());
}
