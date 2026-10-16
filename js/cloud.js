// Online rooms and solo hero saves on Firebase (QuestDice's own project). There is no game server:
// a room is one Firestore document, qdRooms/{CODE}, holding the whole table as text. A move runs the
// game's own rules (table.js) on this phone inside a transaction and writes the new table back; every
// other phone hears the change. A solo hero is qdHeroes/{hash(name+password)} plus a name marker so
// two people cannot take the same name. qdHeroPublic lists name, class, level and act/step so a
// phone can pick a hero without remembering the exact spelling; it never holds the hash or the save.
// Each phone signs in as an anonymous guest; that guest id is its seat at the table.
import { firebaseConfig } from './firebase-config.js';
import { createTable, joinTable, command, playerByToken, playerView, saveTable, savePublic, loadTable } from './table.js';
import * as SV from './save.js';

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
  view.state = savePublic(table); // the whole table as text (no seat tokens): this phone rebuilds it and the 3D screens read it (js/session.js)
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

export async function createSeat({ name, cls, table: tableName, hero, difficulty }) {
  await ready();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  for (let tries = 0; tries < 6; tries++) {
    const code = makeCode();
    const table = createTable({ code, seed, name: tableName || 'Company', difficulty: difficulty || hero?.difficulty });
    const joined = joinTable(table, { name, cls, token: fb.uid, hero });
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

export async function joinSeat({ code: raw, name, cls, hero }) {
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
      const joined = joinTable(table, { name, cls, token: fb.uid, hero });
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

// ------------------------------------------------------------------------------------------------ solo hero cloud saves
const nameRef = (id) => fb.fs.doc(fb.db, 'qdHeroNames', id);
const publicRef = (id) => fb.fs.doc(fb.db, 'qdHeroPublic', id);
const heroRef = (id) => fb.fs.doc(fb.db, 'qdHeroes', id);
const collision = (message) => Object.assign(told(message), { collision: true });

function parseHero(data) {
  if (!data?.hero) throw told('That cloud save is empty.');
  let hero; try { hero = JSON.parse(data.hero); } catch { throw told('That cloud save is damaged.'); }
  if (!hero?.name || !hero.cls || !hero.campaign) throw told('That cloud save is incomplete.');
  if (!(data.v >= SV.SAVE_V)) throw told('That cloud save is from the test builds, before the beta. Forge a fresh hero.');
  SV.migrateHero(hero);
  return hero;
}

// Create or update a hero. The phone that knows the password can always write its own document.
// A different password under the same name is a collision (the name is already taken).
export async function putHero(hero, password, { create = false } = {}) {
  if (!hero?.name) throw told('Give your hero a name.');
  await ready();
  const nameId = await SV.cloudNameId(hero.name);
  const id = await SV.cloudHeroId(hero.name, password);
  try {
    return await fb.fs.runTransaction(fb.db, async (tx) => {
      const nRef = nameRef(nameId); const hRef = heroRef(id); const pRef = publicRef(nameId);
      const [nameSnap, heroSnap] = await Promise.all([tx.get(nRef), tx.get(hRef)]);
      if (!heroSnap.exists() && String(password || '').length < SV.MIN_PASSWORD) {
        throw told('Choose a password of at least 3 characters.');
      }
      if (nameSnap.exists() && !heroSnap.exists()) throw collision('A hero with that name already lives in the cloud. Open them, or pick another name.');
      if (create && heroSnap.exists()) throw collision('A hero with that name already lives in the cloud. Open them, or pick another name.');
      if (!nameSnap.exists()) {
        tx.set(nRef, { taken: true, nameKey: SV.nameKey(hero.name), created: fb.fs.serverTimestamp() });
      }
      const rec = await SV.cloudRecord(hero, password, heroSnap.exists() ? heroSnap.data() : null);
      if (rec.hero.length >= 200000) throw told('This hero is too large to keep in the cloud.');
      tx.set(hRef, { ...rec, updated: fb.fs.serverTimestamp() });
      tx.set(pRef, { ...SV.cloudPublic(hero), updated: fb.fs.serverTimestamp() });
      return { ok: true, created: !heroSnap.exists() };
    });
  } catch (e) {
    if (e && e.qd) throw e;
    if (e?.code === 'permission-denied') throw told('The cloud would not take this save. The latest Firestore rules may not be published yet.');
    throw oops(e, 'Could not save this hero to the cloud.');
  }
}

export async function listCloudHeroes() {
  await ready();
  try {
    const col = fb.fs.collection(fb.db, 'qdHeroPublic');
    let snap;
    try {
      snap = await fb.fs.getDocs(fb.fs.query(col, fb.fs.orderBy('updated', 'desc')));
    } catch {
      snap = await fb.fs.getDocs(col);
    }
    const out = [];
    snap.forEach((doc) => {
      const card = SV.readPublicHero(doc.data());
      if (card) out.push(card);
    });
    return out;
  } catch (e) {
    if (e?.code === 'permission-denied') return [];
    throw oops(e, 'Could not list cloud heroes.');
  }
}

export async function getHero(name, password) {
  if (String(name || '').trim().length < 2) throw told('Give your hero a name (2–16 characters).');
  if (String(password || '').length < 1) throw told('Enter your password.');
  await ready();
  const nameId = await SV.cloudNameId(name);
  const id = await SV.cloudHeroId(name, password);
  try {
    const snap = await fb.fs.getDocFromServer(heroRef(id)).catch(() => fb.fs.getDoc(heroRef(id)));
    if (snap.exists()) {
      const data = snap.data();
      if ((await SV.hashText(data.salt + password)) !== data.hash) throw told('Wrong password.');
      return parseHero(data);
    }
    const taken = await fb.fs.getDoc(nameRef(nameId));
    if (taken.exists()) throw told('Wrong password.');
    throw told('No hero by that name in the cloud.');
  } catch (e) {
    if (e && e.qd) throw e;
    if (e?.code === 'permission-denied') throw told('The cloud would not open this save. The latest Firestore rules may not be published yet.');
    throw oops(e, 'Could not open that cloud save.');
  }
}

// ---- the daily challenge's leaderboard: qdDaily/{YYYY-MM-DD}/scores/{guest uid}, one entry per phone per day, kept at its best.
// Needs the qdDaily block of firestore.rules published; until then these fail quietly and the day is still played on the phone.
const dailyRef = (day, uid) => fb.fs.doc(fb.db, 'qdDaily', day, 'scores', uid);
export async function submitDaily(day, { name, cls, score, fights }) {
  try {
    await ready();
    const ref = dailyRef(day, fb.uid); const had = await fb.fs.getDoc(ref).catch(() => null);
    if (had?.exists?.() && (had.data().score || 0) >= score) return { ok: true, kept: had.data().score };
    await fb.fs.setDoc(ref, { name: String(name || 'Hero').slice(0, 24), cls, score: Math.max(0, Math.min(99999, Math.round(score))), fights: Math.max(0, Math.min(5, fights | 0)), at: Date.now() });
    return { ok: true };
  } catch (e) { return { ok: false, why: String(e?.message || e) }; }
}
export async function topDaily(day, n = 10) {
  try {
    await ready();
    const col = fb.fs.collection(fb.db, 'qdDaily', day, 'scores');
    const snap = await fb.fs.getDocs(fb.fs.query(col, fb.fs.orderBy('score', 'desc'), fb.fs.limit(n)));
    return { ok: true, me: fb.uid, rows: snap.docs.map((d) => ({ uid: d.id, ...d.data() })) };
  } catch (e) { return { ok: false, rows: [], why: String(e?.message || e) }; }
}
