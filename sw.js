// Quest Dice service worker: keeps the game on the phone so it opens fast and works without a signal for solo play (Dave, 27 Oct 2026).
// BUILD is rewritten by tools/stamp.mjs. Rules, in order of how much a mistake here would hurt:
//   - the page itself (navigations): network first, the saved copy only when the network fails or takes more than 4 seconds
//   - files whose address carries ?v=<build> (the scripts and stylesheets) never change, so they are served from the saved copy first
//   - everything else under this folder (pictures, fonts, 3D files): saved copy first, refreshed in the background
//   - never touched: other websites (Firebase), /api/ (the local table server), preview/ pages, range requests, anything but GET
// Open the game with ?nosw to remove this worker and every saved file (js/pwa.js).
const BUILD = '20261028gear2';
const CACHE = 'qd-static-1';
const SCOPE = new URL(self.registration.scope);
let off = false; // set by js/pwa.js removeAll(): stop saving and serving while the worker is being removed
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'off') off = true; });

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) { const v = new URL(req.url).searchParams.get('v'); if (v && v !== BUILD) await cache.delete(req); } // old builds' scripts and styles
    await self.clients.claim();
  })());
});

const keep = async (req, res) => { if (res && res.status === 200 && res.type === 'basic') { try { await (await caches.open(CACHE)).put(req, res.clone()); } catch { /* storage full: play on without saving */ } } return res; };

async function pageFirst(req) {
  const home = new Request(SCOPE.href); // every address of the page shares one saved copy
  const saved = await caches.match(home, { ignoreSearch: true });
  const net = fetch(req, { cache: 'no-cache' }).then((res) => { if (res.ok) keep(home, res.clone()); return res; });
  if (!saved) return net;
  return Promise.race([net.catch(() => saved), new Promise((resolve) => setTimeout(() => resolve(saved), 4000))]);
}
async function savedFirst(req, event) {
  const saved = await caches.match(req);
  if (saved) return saved;
  return keep(req, await fetch(req));
}
async function refreshing(req, event) {
  const saved = await caches.match(req);
  const net = fetch(req).then((res) => keep(req, res)).catch(() => saved);
  if (saved) { event.waitUntil(net); return saved; }
  return net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request; if (off || req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url); if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const rel = url.pathname.slice(SCOPE.pathname.length);
  if (rel.startsWith('api/') || rel.startsWith('preview/') || rel.startsWith('docs/') || rel === 'sw.js' || rel === 'offline-files.json' || rel === 'version.json') return;
  if (req.mode === 'navigate') { if (rel === '' || rel === 'index.html') event.respondWith(pageFirst(req)); return; }
  event.respondWith(url.searchParams.has('v') ? savedFirst(req, event) : refreshing(req, event));
});
