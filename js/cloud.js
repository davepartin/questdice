// Online rooms on Firebase (QuestDice's own project). There is no game server: a room is one Firestore
// document, qdRooms/{CODE}, holding the whole table as text. A move runs the game's own rules (table.js)
// on this phone inside a transaction and writes the new table back; every other phone hears the change.
// Each phone signs in as an anonymous guest; that guest id is its seat at the table.
import { firebaseConfig } from './firebase-config.js';
import { createTable, joinTable, command, playerByToken, playerView, saveTable, loadTable } from './table.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let fb = null;
let stop = null;
let given = null;

// Tests only: hand in the Firebase SDK (from npm) and a name, so one process can be two phones.
export function useSdk(sdk, name) { given = { sdk, name }; }

async function ready() {
  if (fb) return fb;
  let app, auth, fs;
  try {
    const [A, U, F] = given ? given.sdk : await Promise.all([import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`), import(`${SDK}firebase-firestore.js`)]);
    app = given ? A.initializeApp(firebaseConfig, given.name) : A.initializeApp(firebaseConfig);
    auth = U.getAuth(app);
    await new Promise((resolve) => { const off = U.onAuthStateChanged(auth, () => { off(); resolve(); }); });
    if (!auth.currentUser) await U.signInAnonymously(auth);
    fs = F;
  } catch (e) {
    console.warn('QuestDice cloud:', e);
    throw new Error('Could not reach the online tables. Check your connection and try again.');
  }
  fb = { db: fs.getFirestore(app), fs, uid: auth.currentUser.uid };
  return fb;
}

const roomRef = (code) => fb.fs.doc(fb.db, 'qdRooms', code);
const cleanCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
function makeCode() {
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => ALPH[n % ALPH.length]).join('');
}
export function joinLink(code) {
  if (typeof location === 'undefined') return `?join=${code}`;
  return `${location.origin}${location.pathname}?join=${code}`;
}
function viewFor(table, uid) {
  const player = playerByToken(table, uid);
  if (!player) return null;
  const view = playerView(table, player.id);
  if (view.phase === 'lobby') view.links = [joinLink(table.code)];
  return view;
}
function doc(table, extra = {}) {
  return { ...extra, phase: table.phase, state: saveTable(table), seq: table.seq, updated: fb.fs.serverTimestamp() };
}
function oops(e, fallback) {
  if (e && e.qd) return e;
  if (e?.code === 'permission-denied') return new Error('That table will not let this phone in.');
  if (e?.code === 'unavailable') return new Error('You are offline. Check your connection.');
  return new Error(fallback);
}
const told = (message) => Object.assign(new Error(message), { qd: true });

export async function createSeat({ name, cls, table: tableName }) {
  await ready();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  for (let tries = 0; tries < 6; tries++) {
    const code = makeCode();
    const table = createTable({ code, seed, name: tableName || 'Company' });
    const joined = joinTable(table, { name, cls, token: fb.uid });
    if (!joined.ok) throw told(joined.error);
    try {
      const made = await fb.fs.runTransaction(fb.db, async (tx) => {
        const snap = await tx.get(roomRef(code));
        if (snap.exists()) return false;
        tx.set(roomRef(code), doc(table, { hostUid: fb.uid, seatUids: [fb.uid], created: fb.fs.serverTimestamp() }));
        return true;
      });
      if (made) return { code, token: fb.uid, playerId: joined.player.id, view: viewFor(table, fb.uid) };
    } catch (e) { throw oops(e, 'Could not open the table. Try again.'); }
  }
  throw told('Every code is taken. Try again.');
}

export async function joinSeat({ code: raw, name, cls }) {
  await ready();
  const code = cleanCode(raw);
  if (code.length !== 4) throw told('A table code is four letters.');
  try {
    return await fb.fs.runTransaction(fb.db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) throw told('No table with that code.');
      const data = snap.data();
      const table = loadTable(data.state);
      const mine = playerByToken(table, fb.uid);
      if (mine) return { code, token: fb.uid, playerId: mine.id, view: viewFor(table, fb.uid) }; // already seated: come back in
      const joined = joinTable(table, { name, cls, token: fb.uid });
      if (!joined.ok) throw told(joined.error);
      tx.update(roomRef(code), doc(table, { seatUids: [...data.seatUids, fb.uid] }));
      return { code, token: fb.uid, playerId: joined.player.id, view: viewFor(table, fb.uid) };
    });
  } catch (e) { throw oops(e, 'Could not join that table. Try again.'); }
}

export async function send(code, cmd) {
  await ready();
  try {
    return await fb.fs.runTransaction(fb.db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) throw told('That table is gone.');
      const table = loadTable(snap.data().state);
      const player = playerByToken(table, fb.uid);
      if (!player) throw told('This phone is not seated at that table.');
      const res = command(table, player.id, cmd);
      if (!res.ok) throw told(res.error);
      tx.update(roomRef(code), doc(table));
      return { ok: true, view: viewFor(table, fb.uid) };
    });
  } catch (e) { throw oops(e, 'The table did not answer. Try again.'); }
}

export async function snapshot(code) {
  await ready();
  const snap = await fb.fs.getDocFromServer(roomRef(code)).catch(() => fb.fs.getDoc(roomRef(code)));
  if (!snap.exists()) return { missing: true };
  return viewFor(loadTable(snap.data().state), fb.uid) || { missing: true };
}

export function connect(code, onView) {
  disconnect();
  let alive = true;
  stop = () => { alive = false; };
  ready().then(() => {
    if (!alive) return;
    const off = fb.fs.onSnapshot(roomRef(code), (snap) => {
      if (!snap.exists()) return;
      try { const view = viewFor(loadTable(snap.data().state), fb.uid); if (view) onView(view); } catch { /* skip a bad frame */ }
    }, () => { /* the listener reconnects on its own */ });
    stop = () => { alive = false; off(); };
  }).catch(() => {});
}
export function disconnect() {
  if (stop) { stop(); stop = null; }
}
