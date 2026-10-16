// Character saves. A hero lives in localStorage behind a name + password, and (when the cloud is
// reachable) also in Firestore. The password is hashed (SHA-256 + salt) and gates opening a hero;
// it is NOT encryption. A "Soul Code" is a backup for moving a save by hand. See docs/DESIGN.md, Saving.

import { QUESTS_PER_ACT, normalizeDifficulty, WEAPONS, colorIdOf } from './data.js';

const PREFIX = 'questdice.hero.';
export const nameKey = (name) => String(name || '').trim().toLowerCase();
const key = (name) => PREFIX + nameKey(name);

export async function hashText(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) | 0; // fallback for insecure contexts
  return 'f' + (h >>> 0).toString(16);
}
const sha = hashText;
const randSalt = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

function store() { try { return window.localStorage; } catch { return null; } }
// The beta (Dave, Oct 2026): heroes and table seats saved by the test builds are retired once, the first time a device opens
// the beta, so every tester starts on today's rules. Returns how many heroes were retired.
const EPOCH_KEY = 'questdice.epoch'; const EPOCH = 'beta-1'; export const SAVE_V = 2;
export function startBeta() {
  const s = store(); if (!s) return 0;
  try {
    if (s.getItem(EPOCH_KEY) === EPOCH) return 0;
    const old = []; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k.startsWith(PREFIX) || k === 'questdice.seat') old.push(k); }
    old.forEach((k) => s.removeItem(k)); s.setItem(EPOCH_KEY, EPOCH);
    return old.filter((k) => k.startsWith(PREFIX)).length;
  } catch { return 0; }
}
export const canSave = () => { const s = store(); if (!s) return false; try { s.setItem('questdice.t', '1'); s.removeItem('questdice.t'); return true; } catch { return false; } };

export function listHeroes() {
  const s = store(); if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (!k.startsWith(PREFIX)) continue;
    try {
      const r = JSON.parse(s.getItem(k));
      out.push({ name: r.hero.name, cls: r.hero.cls, level: r.hero.level, act: r.hero.campaign.act, step: r.hero.campaign.step, saved: r.saved });
    } catch { /* skip corrupt entry */ }
  }
  return out.sort((a, b) => b.saved - a.saved);
}
export const heroExists = (name) => !!store()?.getItem(key(name));

export const MIN_PASSWORD = 3;
export function migrateHero(hero) {
  if (!hero || typeof hero !== 'object') return hero;
  hero.difficulty = normalizeDifficulty(hero.difficulty);
  hero.color = colorIdOf(hero);
  // closed mid-fight with a Diamond in hand: the fight is over, so it has shattered; the hands get their own weapons back
  if (hero.lent && hero.loadout) {
    const L = hero.lent; hero.loadout.NW = L.NW; if (L.NE) hero.loadout.NE = L.NE; else delete hero.loadout.NE;
    if (L.dice) hero.dice = L.dice; else delete hero.dice;
    delete hero.lent; delete hero.wielding;
  }
  // three metals now (Oct 2026): an old Diamond-tier weapon comes back as Gold, which has the same full die (legendaries and the new
  // one-fight Diamond weapons keep theirs)
  for (const w of [...Object.values(hero.loadout || {}), ...(hero.bag || [])]) if (w && (w.rarity | 0) > 2 && !w.diamond && !WEAPONS[w.id]?.legendary) w.rarity = 2;
  return hero;
}
export async function createSave(hero, password) {
  if (String(password || '').length < MIN_PASSWORD) throw new Error('Choose a password of at least 3 characters.');
  if (heroExists(hero.name)) throw new Error('A hero with that name already exists on this device.');
  migrateHero(hero);
  const salt = randSalt();
  const rec = { salt, hash: await sha(salt + password), hero, saved: Date.now(), v: SAVE_V };
  store().setItem(key(hero.name), JSON.stringify(rec));
  return rec;
}
export async function openHero(name, password) {
  const raw = store()?.getItem(key(name));
  if (!raw) throw new Error('No hero by that name.');
  const rec = JSON.parse(raw);
  if ((await sha(rec.salt + password)) !== rec.hash) throw new Error('Wrong password.');
  const before = rec.hero?.difficulty;
  migrateHero(rec.hero);
  if (rec.hero && rec.hero.difficulty !== before) {
    try { store()?.setItem(key(name), JSON.stringify(rec)); } catch { /* keep the in-memory hero even if rewrite fails */ }
  }
  return rec.hero;
}
export function saveHero(hero) {
  const s = store(); const raw = s?.getItem(key(hero.name));
  if (!raw) return false;
  migrateHero(hero);
  const rec = JSON.parse(raw); rec.hero = hero; rec.saved = Date.now();
  s.setItem(key(hero.name), JSON.stringify(rec)); return true;
}
export function deleteHero(name) { store()?.removeItem(key(name)); }

// Keep a copy on this device after a cloud load (or after forging at a table). Same name + password
// overwrites the local file; a different password on this device is a collision.
export async function keepHero(hero, password) {
  if (!heroExists(hero.name)) return createSave(hero, password);
  await openHero(hero.name, password);
  saveHero(hero);
  return true;
}

export function listSaves() {
  return listHeroes().map((h) => ({ ...h, kind: 'hero', size: 1, classes: [h.cls] })).sort((a, b) => b.saved - a.saved);
}
const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
export function exportCode(name) {
  const raw = store()?.getItem(key(name)); if (!raw) return null;
  return 'QD1.' + b64(raw);
}
export function importCode(code, { overwrite = false } = {}) {
  const t = code.trim();
  if (!t.startsWith('QD1.')) throw new Error('That does not look like a Soul Code.');
  let rec; try { rec = JSON.parse(unb64(t.slice(4))); } catch { throw new Error('The Soul Code is damaged.'); }
  if (!rec?.hero?.name || !rec.hash || !rec.salt) throw new Error('The Soul Code is incomplete.');
  if (!(rec.v >= SAVE_V)) throw new Error('That Soul Code is from the test builds, before the beta. Forge a fresh hero.');
  migrateHero(rec.hero);
  if (heroExists(rec.hero.name) && !overwrite) { const e = new Error('exists'); e.code = 'EXISTS'; e.name = rec.hero.name; throw e; }
  store().setItem(key(rec.hero.name), JSON.stringify(rec));
  return rec.hero.name;
}

// Cloud document ids. The hero id is derived from name + password, so a phone that does not know the
// password cannot even find the document. The name id only marks that a name is taken (it does not
// hold the password hash). A static prefix keeps these ids from colliding with anything else we store.
export async function cloudNameId(name) {
  return sha(`questdice.cloud.name.v1\n${nameKey(name)}`);
}
export async function cloudHeroId(name, password) {
  return sha(`questdice.cloud.v1\n${nameKey(name)}\n${String(password || '')}`);
}
export async function cloudRecord(hero, password, existing) {
  migrateHero(hero);
  const salt = existing?.salt || randSalt();
  const hash = existing?.hash || await sha(salt + password);
  return {
    nameKey: nameKey(hero.name),
    salt,
    hash,
    hero: JSON.stringify(hero),
    v: SAVE_V,
    saved: Date.now(),
  };
}

// Public card for the browsable cloud list: name, class, level, act/step only. Never the hash, salt, or hero blob.
export function cloudPublic(hero) {
  return {
    name: String(hero?.name || '').trim().slice(0, 16),
    nameKey: nameKey(hero?.name),
    cls: String(hero?.cls || ''),
    level: Math.max(1, hero?.level | 0),
    act: Math.max(1, hero?.campaign?.act | 0),
    step: Math.max(1, hero?.campaign?.step | 0),
  };
}
export function readPublicHero(data) {
  if (!data || typeof data !== 'object') return null;
  const name = String(data.name || '').trim().slice(0, 16);
  if (name.length < 2) return null;
  return {
    name,
    cls: String(data.cls || ''),
    level: Math.max(1, data.level | 0),
    act: Math.max(1, data.act | 0),
    step: Math.max(1, data.step | 0),
  };
}

// ------------------------------------------------------------------------------ campaign start picks
// A loaded hero may replay any step they have already reached, but they may not skip ahead.
// `campaign.reached` is the high-water mark (act, step). Older saves without it use where they stand.
export function further(a, b) {
  if (!a) return false;
  if (!b) return true;
  return a.act > b.act || (a.act === b.act && a.step > b.step);
}
export function reachedOf(hero) {
  const c = hero?.campaign || {};
  const cur = { act: Math.max(1, c.act | 0), step: Math.max(1, c.step | 0) };
  const r = c.reached;
  if (!r) return cur;
  const mark = { act: Math.max(1, r.act | 0), step: Math.max(1, r.step | 0) };
  return further(mark, cur) ? mark : cur;
}
export function markReached(hero) {
  const c = hero?.campaign; if (!c) return null;
  const cur = { act: Math.max(1, c.act | 0), step: Math.max(1, c.step | 0) };
  if (!c.reached || further(cur, c.reached)) c.reached = cur;
  return c.reached;
}
export function canStartAt(hero, act, step) {
  const a = act | 0; const s = step | 0;
  if (a < 1 || s < 1 || s > QUESTS_PER_ACT) return false;
  const r = reachedOf(hero);
  if (a < r.act) return true;
  return a === r.act && s <= r.step;
}
export function startChoices(hero) {
  const r = reachedOf(hero);
  const out = [];
  for (let act = 1; act <= r.act; act++) {
    const last = act < r.act ? QUESTS_PER_ACT : r.step;
    for (let step = 1; step <= last; step++) {
      if (canStartAt(hero, act, step)) out.push({ act, step });
    }
  }
  return out;
}
// Rewind the road to a step they have earned. Gear, gold, level and the high-water mark stay.
// Blessings, the open shop and an unfinished road scene belong to the old stretch, so they clear.
export function beginAt(hero, act, step) {
  if (!canStartAt(hero, act, step)) return false;
  const c = hero.campaign;
  const r = reachedOf(hero);
  c.reached = { act: r.act, step: r.step };
  c.act = act | 0;
  c.step = step | 0;
  c.road = null;
  c.shop = null;
  c.ambush = null;
  c.blessings = [];
  c.nextPlace = null;
  c.nextEnemies = null;
  return true;
}

// ------------------------------------------------------------------------------ first-clear tracking
// Per hero, not on the shared company campaign: in party play a first-clear hero still earns
// while a friend replaying the same step does not. Repeat clears withhold XP, gold, perks and
// weapon drops for that hero (drops still appear for first-clear friends).
export function stepKey(act, step) { return `${act | 0}.${step | 0}`; }
export function clearedOf(hero) {
  return Array.isArray(hero?.cleared) ? hero.cleared : [];
}
export function hasCleared(hero, act, step) {
  const a = act | 0; const s = step | 0;
  if (clearedOf(hero).includes(stepKey(a, s))) return true;
  const r = reachedOf(hero);
  const here = { act: a, step: s };
  if (further(r, here)) return true;
  return false;
}
export function markCleared(hero, act, step) {
  if (!hero) return null;
  const key = stepKey(act ?? hero.campaign?.act, step ?? hero.campaign?.step);
  hero.cleared = [...clearedOf(hero)];
  if (!hero.cleared.includes(key)) hero.cleared.push(key);
  return key;
}
// Winning a fight again (Dave, Oct 2026): a hero stuck at a hard fight can go back and earn a little more gold to grow their dice, but
// not forever. The second win at a step pays half its gold, the third a quarter, and so on. Still no XP or spoils on a repeat.
export function repeatShare(hero, act, step) { const n = (hero?.repeats || {})[stepKey(act, step)] || 0; return 1 / 2 ** (n + 1); }
export function markRepeat(hero, act, step) { if (!hero) return; const k = stepKey(act, step); hero.repeats = { ...(hero.repeats || {}), [k]: ((hero.repeats || {})[k] || 0) + 1 }; }
export const repeatGold = (gold, share) => (gold > 0 ? Math.floor(gold * share) : gold); // a thief's loss is never shrunk
const shareWord = (share) => (share >= 0.5 ? 'half' : share >= 0.25 ? 'a quarter of' : share >= 0.125 ? 'an eighth of' : 'a sliver of');
export const repeatNote = (share = 0.5) => `Been here. Won this. A repeat win pays ${shareWord(share)} the gold, and less each time after. No XP or spoils the second time round.`;
export const REPEAT_NOTE = repeatNote(0.5);
export const REPEAT_PARTY = 'You have already cleared this quest, so you earn less gold (half, then less each time) and no XP or spoils. Friends on a first clear still earn it all.';
