// Character saves. A hero lives in localStorage behind a name + password. The password is hashed
// (SHA-256 + salt) and gates opening a hero in this UI; it is NOT encryption. A "Soul Code" lets a
// hero travel between devices until cloud saves exist (see docs/DESIGN.md, Saving).

const PREFIX = 'questdice.hero.';
const CPREFIX = 'questdice.company.';
const key = (name) => PREFIX + name.trim().toLowerCase();
const ckey = (name) => CPREFIX + name.trim().toLowerCase();

export function bindCompany(company) {
  const c = company.campaign;
  c.blessings = c.blessings || [];
  c.seenRoads = c.seenRoads || [];
  c.chronicle = c.chronicle || [];
  c.campFlags = c.campFlags || {};
  for (const m of company.members) m.campaign = c;
  return company;
}

async function sha(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) | 0; // fallback for insecure contexts
  return 'f' + (h >>> 0).toString(16);
}
const randSalt = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

function store() { try { return window.localStorage; } catch { return null; } }
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

export async function createSave(hero, password) {
  if (heroExists(hero.name)) throw new Error('A hero with that name already exists on this device.');
  const salt = randSalt();
  const rec = { salt, hash: await sha(salt + password), hero, saved: Date.now(), v: 1 };
  store().setItem(key(hero.name), JSON.stringify(rec));
  return rec;
}
export async function openHero(name, password) {
  const raw = store()?.getItem(key(name));
  if (!raw) throw new Error('No hero by that name.');
  const rec = JSON.parse(raw);
  if ((await sha(rec.salt + password)) !== rec.hash) throw new Error('Wrong password.');
  return rec.hero;
}
export function saveHero(hero) {
  const s = store(); const raw = s?.getItem(key(hero.name));
  if (!raw) return false;
  const rec = JSON.parse(raw); rec.hero = hero; rec.saved = Date.now();
  s.setItem(key(hero.name), JSON.stringify(rec)); return true;
}
export function deleteHero(name) { store()?.removeItem(key(name)); }

function readCompany(raw) {
  const rec = JSON.parse(raw);
  bindCompany(rec.company);
  return rec;
}
export function listCompanies() {
  const s = store(); if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (!k?.startsWith(CPREFIX)) continue;
    try {
      const r = readCompany(s.getItem(k));
      const lead = r.company.members[0];
      out.push({
        kind: 'company', name: r.company.name, cls: lead.cls, level: lead.level,
        act: r.company.campaign.act, step: r.company.campaign.step, saved: r.saved,
        size: r.company.members.length,
        classes: r.company.members.map((m) => m.cls),
      });
    } catch { /* skip corrupt entry */ }
  }
  return out;
}
export function listSaves() {
  const heroes = listHeroes().map((h) => ({ ...h, kind: 'hero', size: 1, classes: [h.cls] }));
  return [...heroes, ...listCompanies()].sort((a, b) => b.saved - a.saved);
}
export const companyExists = (name) => !!store()?.getItem(ckey(name));
export async function createCompany(company, password) {
  if (companyExists(company.name)) throw new Error('A company with that name already exists on this device.');
  bindCompany(company);
  const salt = randSalt();
  const rec = { salt, hash: await sha(salt + password), company, saved: Date.now(), v: 2 };
  store().setItem(ckey(company.name), JSON.stringify(rec));
  return rec;
}
export async function openCompany(name, password) {
  const raw = store()?.getItem(ckey(name));
  if (!raw) throw new Error('No company by that name.');
  const rec = readCompany(raw);
  if ((await sha(rec.salt + password)) !== rec.hash) throw new Error('Wrong password.');
  return rec.company;
}
export function saveCompany(company) {
  const s = store(); const raw = s?.getItem(ckey(company.name));
  if (!raw) return false;
  const rec = JSON.parse(raw); bindCompany(company); rec.company = company; rec.saved = Date.now();
  s.setItem(ckey(company.name), JSON.stringify(rec)); return true;
}
export function deleteCompany(name) { store()?.removeItem(ckey(name)); }

const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
export function exportCode(name) {
  const raw = store()?.getItem(key(name)); if (!raw) return null;
  return 'QD1.' + b64(raw);
}
export function exportCompanyCode(name) {
  const raw = store()?.getItem(ckey(name)); if (!raw) return null;
  return 'QD2.' + b64(raw);
}
export function importCode(code, { overwrite = false } = {}) {
  const t = code.trim();
  const company = t.startsWith('QD2.');
  if (!t.startsWith('QD1.') && !company) throw new Error('That does not look like a Soul Code.');
  let rec; try { rec = JSON.parse(unb64(t.slice(4))); } catch { throw new Error('The Soul Code is damaged.'); }
  if (company) {
    if (!rec?.company?.name || !rec.hash || !rec.salt) throw new Error('The Soul Code is incomplete.');
    if (companyExists(rec.company.name) && !overwrite) { const e = new Error('exists'); e.code = 'EXISTS'; e.name = rec.company.name; throw e; }
    bindCompany(rec.company);
    store().setItem(ckey(rec.company.name), JSON.stringify(rec));
    return rec.company.name;
  }
  if (!rec?.hero?.name || !rec.hash || !rec.salt) throw new Error('The Soul Code is incomplete.');
  if (heroExists(rec.hero.name) && !overwrite) { const e = new Error('exists'); e.code = 'EXISTS'; e.name = rec.hero.name; throw e; }
  store().setItem(key(rec.hero.name), JSON.stringify(rec));
  return rec.hero.name;
}
