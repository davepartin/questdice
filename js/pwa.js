// Keep the game on this phone (Dave, 27 Oct 2026): a service worker (sw.js) saves what the game loads, "Install" puts it on the home screen, and
// "Download the game to this phone" saves every file at once so solo play works with no signal. A shared table still needs the internet.
const CACHE = 'qd-static-1'; // the same store sw.js uses
const KEY = 'qd.offline';
const here = typeof location !== 'undefined' ? location : null;
const supported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';
// Preview copies (preview/<name>/) keep their own saves and never get the worker.
const eligible = () => !!here && supported() && (here.protocol === 'https:' || here.hostname === 'localhost' || here.hostname === '127.0.0.1') && !/\/preview\//.test(here.pathname);

let deferred = null; // Chrome's install prompt, kept until the player taps Install
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; });
}

export async function startPwa() {
  if (!eligible()) return;
  if (/[?&]nosw\b/.test(here.search)) { await removeAll(); return; } // the way out if a saved copy ever misbehaves
  const go = () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* the game works without it */ });
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}
export async function removeAll() {
  try {
    for (const r of await navigator.serviceWorker.getRegistrations()) { (r.active || r.waiting || r.installing)?.postMessage({ type: 'off' }); await r.unregister(); }
    await caches.delete(CACHE); localStorage.removeItem(KEY);
    setTimeout(() => { caches.delete(CACHE).catch(() => {}); }, 1000); // a file that was still on its way in when the worker was told to stop
  } catch { /* nothing to remove */ }
}

export const isInstalled = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };
export const canPromptInstall = () => !!deferred;
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred; deferred = null; e.prompt();
  try { return (await e.userChoice).outcome; } catch { return 'dismissed'; }
}
export const platformHelp = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'In Safari, tap the Share button, then "Add to Home Screen".';
  if (/Android/i.test(ua)) return 'In Chrome, tap the ⋮ menu, then "Install app" (or "Add to Home screen").';
  return 'Use your browser\'s install button in the address bar, or its menu.';
};

export const offlineState = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const mb = (b) => `${(b / 1048576).toFixed(b < 10485760 ? 1 : 0)} MB`;
export const formatSize = mb;
// Fetch every file in offline-files.json into the store, six at a time. onProgress({ done, total, bytes }). Resolves with the saved summary; throws if the network fails part-way
// (what was saved stays saved, so trying again only fetches the rest).
export async function downloadAll(onProgress = () => {}) {
  if (!supported()) throw new Error('This browser cannot save the game.');
  const list = await (await fetch('offline-files.json', { cache: 'no-store' })).json();
  const cache = await caches.open(CACHE); const base = new URL('./', here.href);
  let done = 0; let bytes = 0; const total = list.files.length; const queue = list.files.slice(); let failed = null;
  onProgress({ done, total, bytes, size: list.bytes });
  const worker = async () => {
    while (queue.length && !failed) {
      const f = queue.shift(); const url = new URL(f.u, base).href;
      try {
        if (!(await cache.match(url))) { const res = await fetch(url); if (!res.ok) throw new Error(`${f.u}: ${res.status}`); await cache.put(url, res); }
        bytes += f.s;
      } catch (e) { failed = e; }
      done++; onProgress({ done, total, bytes, size: list.bytes });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (failed) throw failed;
  try { await navigator.storage?.persist?.(); } catch { /* the phone decides */ }
  const home = new Request(base.href); // the page itself, so a start with no signal still opens
  try { const res = await fetch(base.href, { cache: 'no-cache' }); if (res.ok) await cache.put(home, res); } catch { /* the worker saves it on the next normal visit */ }
  const state = { build: list.build, files: total, bytes: list.bytes, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  return state;
}
