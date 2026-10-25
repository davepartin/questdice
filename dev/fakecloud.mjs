// A stand-in for Firebase, so two (or more) real browser phones can play an ONLINE table in a sandbox that cannot reach Google.
// The game's own cloud code (js/cloud.js, session, table rules running on each phone inside a transaction) runs untouched: only the SDK it imports is replaced,
// by a small implementation of the calls cloud.js makes (doc, collection, getDoc, getDocFromServer, getDocs, query/orderBy/limit, setDoc, runTransaction with
// optimistic version checks, onSnapshot over server-sent events, serverTimestamp, anonymous auth with a per-browser uid).
// What this is NOT: real Firestore (no security rules, no real network, no SDK retry or offline behaviour) and not Safari.
// Test controls on every page: window.__fake = { paused (drop live snapshots for this phone, to model a stalled feed), reads (documents fetched on demand) }.
//   import { startFake, installFake } from './fakecloud.mjs';
import http from 'node:http';

export async function startFake() {
  const docs = new Map(); // path -> { data, version }
  const watchers = new Map(); // path -> Set(res)
  const stamp = (v) => (v && typeof v === 'object' ? (v.__st ? Date.now() : Array.isArray(v) ? v.map(stamp) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stamp(x)]))) : v);
  const push = (path) => { const d = docs.get(path); for (const res of watchers.get(path) || []) res.write(`data: ${JSON.stringify({ exists: !!d, data: d?.data ?? null, version: d?.version ?? 0 })}\n\n`); };
  const log = [];
  const server = http.createServer((req, res) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/watch') {
      const path = url.searchParams.get('path'); res.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      (watchers.get(path) || watchers.set(path, new Set()).get(path)).add(res); req.on('close', () => watchers.get(path)?.delete(res));
      const d = docs.get(path); res.write(`data: ${JSON.stringify({ exists: !!d, data: d?.data ?? null, version: d?.version ?? 0 })}\n\n`); return;
    }
    let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
      const m = body ? JSON.parse(body) : {}; const send = (o) => { res.writeHead(200, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (url.pathname === '/get') { const d = docs.get(m.path); log.push({ op: 'get', path: m.path }); return send({ exists: !!d, data: d?.data ?? null, version: d?.version ?? 0 }); }
      if (url.pathname === '/list') {
        let rows = [...docs.entries()].filter(([p]) => p.startsWith(`${m.col}/`) && !p.slice(m.col.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(m.col.length + 1), data: d.data }));
        if (m.orderBy) { const [f, dir] = m.orderBy; rows.sort((a, b) => (dir === 'desc' ? -1 : 1) * ((a.data[f] > b.data[f]) - (a.data[f] < b.data[f]))); }
        if (m.limit) rows = rows.slice(0, m.limit); return send({ docs: rows });
      }
      if (url.pathname === '/commit') {
        for (const [p, v] of Object.entries(m.reads || {})) if ((docs.get(p)?.version ?? 0) !== v) return send({ conflict: true });
        const touched = [];
        for (const w of m.writes) {
          const cur = docs.get(w.path); const data = stamp(w.data);
          if (w.op === 'update' && !cur) return send({ error: 'not-found' });
          docs.set(w.path, { data: w.op === 'update' ? { ...cur.data, ...data } : data, version: (cur?.version ?? 0) + 1 }); touched.push(w.path);
        }
        send({ ok: true }); touched.forEach(push); return;
      }
      send({ error: 'unknown' });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return { port, docs, log, read: (path) => docs.get(path)?.data ?? null, write: (path, data) => { const cur = docs.get(path); docs.set(path, { data, version: (cur?.version ?? 0) + 1 }); push(path); }, close: () => { server.closeAllConnections?.(); server.close(); } };
}

const appModule = `export function initializeApp(cfg, name) { return { cfg, name }; }`;
const authModule = `
export function getAuth() { return { currentUser: null }; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb(auth.currentUser), 0); return () => {}; }
export async function signInAnonymously(auth) { let uid = localStorage.getItem('fake.uid'); if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 12); localStorage.setItem('fake.uid', uid); } auth.currentUser = { uid }; return { user: auth.currentUser }; }`;
const fsModule = (port) => `
const BASE = 'http://127.0.0.1:${port}';
window.__fake = window.__fake || { paused: false, reads: 0, feed: 0 };
const rpc = async (p, body) => { const r = await fetch(BASE + p, { method: 'POST', body: JSON.stringify(body) }); return r.json(); };
const snap = (path, r) => ({ id: path.split('/').pop(), exists: () => !!r.exists, data: () => (r.exists ? JSON.parse(JSON.stringify(r.data)) : undefined), version: r.version });
export function getFirestore() { return {}; }
export const doc = (db, col, id) => ({ path: col + '/' + id });
export const collection = (db, col) => ({ col });
export const serverTimestamp = () => ({ __st: 1 });
export const orderBy = (f, dir = 'asc') => ({ orderBy: [f, dir] });
export const limit = (n) => ({ limit: n });
export const query = (c, ...cs) => Object.assign({ col: c.col }, ...cs);
export async function getDoc(ref) { window.__fake.reads++; return snap(ref.path, await rpc('/get', { path: ref.path })); }
export const getDocFromServer = getDoc;
export async function setDoc(ref, data) { const r = await rpc('/commit', { reads: {}, writes: [{ op: 'set', path: ref.path, data }] }); if (!r.ok) throw Object.assign(new Error('write failed'), { code: 'aborted' }); }
export async function getDocs(q) { const r = await rpc('/list', { col: q.col, orderBy: q.orderBy, limit: q.limit }); const docs = r.docs.map((d) => ({ id: d.id, data: () => d.data })); return { docs, forEach: (f) => docs.forEach(f), size: docs.length, empty: !docs.length }; }
export async function runTransaction(db, fn) {
  for (let tries = 0; tries < 8; tries++) {
    const reads = {}; const writes = [];
    const tx = { async get(ref) { window.__fake.reads++; const r = await rpc('/get', { path: ref.path }); reads[ref.path] = r.version; return snap(ref.path, r); }, set(ref, data) { writes.push({ op: 'set', path: ref.path, data }); }, update(ref, data) { writes.push({ op: 'update', path: ref.path, data }); } };
    const out = await fn(tx);
    if (!writes.length) return out;
    const r = await rpc('/commit', { reads, writes });
    if (r.ok) return out;
    if (r.error === 'not-found') throw Object.assign(new Error('not found'), { code: 'not-found' });
  }
  throw Object.assign(new Error('too much contention'), { code: 'aborted' });
}
export function onSnapshot(ref, next, err) {
  const es = new EventSource(BASE + '/watch?path=' + encodeURIComponent(ref.path));
  es.onmessage = (e) => { window.__fake.feed++; if (window.__fake.paused) return; const r = JSON.parse(e.data); next(snap(ref.path, r)); };
  es.onerror = () => {};
  return () => es.close();
}`;
// Route the Firebase SDK files for one browser context to the stand-in.
export async function installFake(ctx, port) {
  await ctx.route(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore)\.js/, (route) => {
    const kind = /firebase-(\w+)\.js/.exec(route.request().url())[1];
    route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: kind === 'app' ? appModule : kind === 'auth' ? authModule : fsModule(port) });
  });
  await ctx.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/, (r) => r.abort());
}
