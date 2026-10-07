// Phone ↔ table. Two kinds of table:
//   cloud: the game on GitHub Pages; rooms live in Firebase (cloud.js). This is the normal one.
//   local: someone runs node server.mjs on a laptop and every phone opens that address.
// The seat (room code, token, kind) stays in this browser tab.
const KEY = 'questdice.seat';

let auth = null;
let source = null;
let cloud = null;
const Cloud = () => (cloud ||= import('./cloud.js'));

export function savedSeat() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function remember(code, token, kind) {
  auth = { code, token, kind };
  sessionStorage.setItem(KEY, JSON.stringify(auth));
}
export function clearSeat() {
  disconnect();
  auth = null;
  sessionStorage.removeItem(KEY);
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

export async function createSeat({ name, cls, table }) {
  const kind = await tableKind();
  const data = kind === 'cloud' ? await (await Cloud()).createSeat({ name, cls, table }) : await post({ op: 'create', name, cls, table });
  remember(data.code, data.token, kind);
  return data;
}
export async function joinSeat({ code, name, cls }) {
  const kind = await tableKind();
  const data = kind === 'cloud' ? await (await Cloud()).joinSeat({ code, name, cls }) : await post({ op: 'join', code, name, cls });
  remember(data.code, data.token, kind);
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
