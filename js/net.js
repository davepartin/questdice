// Phone ↔ table. The seat token stays in this browser tab.
const KEY = 'questdice.seat';

let auth = null;
let source = null;

export function savedSeat() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function remember(code, token) {
  auth = { code, token };
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

async function post(body) {
  let res;
  try {
    res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('No table server. The host runs node server.mjs, and every phone opens that address.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'The table did not answer.');
  return data;
}

export async function createSeat({ name, cls, table }) {
  const data = await post({ op: 'create', name, cls, table });
  remember(data.code, data.token);
  return data;
}
export async function joinSeat({ code, name, cls }) {
  const data = await post({ op: 'join', code, name, cls });
  remember(data.code, data.token);
  return data;
}
export async function send(cmd) {
  const s = seat();
  if (!s) throw new Error('This phone has no seat.');
  return post({ op: 'act', code: s.code, token: s.token, cmd });
}
export async function snapshot() {
  const s = seat();
  if (!s) return null;
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
  source = new EventSource(`/api/room/${s.code}/events?token=${encodeURIComponent(s.token)}`);
  source.onmessage = (ev) => {
    try { onView(JSON.parse(ev.data)); } catch { /* ignore a bad frame */ }
  };
}
export function disconnect() {
  if (source) { source.close(); source = null; }
}
