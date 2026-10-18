// Campaign packs (Dave, Oct 2026): every story is one pack. The Dawn Lantern is the original
// campaign; Rival Duo and That’s Not How It Went are two-hero packs with their own locked fights.
// Pure data and helpers: no DOM.

import { ACTS, MONSTERS, CLASSES } from './data.js';
import * as rivalDuo from './packs/rivalduo.js';
import * as balladPack from './packs/ballad.js';

export const DEFAULT_PACK = 'dawn';

const NAME_FALLBACK = {
  wizard: 'the wizard', dwarf: 'the dwarf', knight: 'the knight',
  bard: 'the bard', ranger: 'the ranger',
};

export function packIdOf(c) {
  if (!c) return DEFAULT_PACK;
  if (typeof c === 'string') return CAMPAIGNS[c] ? c : DEFAULT_PACK;
  if (CAMPAIGNS[c.pack]) return c.pack;
  if (CAMPAIGNS[c.id]) return c.id;
  return DEFAULT_PACK;
}
export function packOf(c) { return CAMPAIGNS[packIdOf(c)] || CAMPAIGNS.dawn; }
export function packList() { return Object.values(CAMPAIGNS); }
export function actsOf(c) { return packOf(c).acts || ACTS; }
export function beatsOf(c) { return packOf(c).beats || null; }
export function placesOf(c) { return packOf(c).places || null; }
export function stepsOf(c) { return packOf(c).steps || null; }
export function helpFightsOf(c) { return packOf(c).helpFights || null; }
export function bansOf(c) { return packOf(c).ban || []; }
export function helpOff(c) {
  const acts = actsOf(c);
  const act = acts[((c?.act || 1) - 1) % acts.length];
  return Array.isArray(act?.help) && act.help.length === 0;
}

// A campaign may rename a monster (display name + optional group) or define a new id with
// statsFrom: 'ogre' (stats and, unless overridden, art from that sheet). Difficulty still
// only changes toughness; the locked fight list stays the pack's.
export function monsterOf(id, camp) {
  if (!id) return null;
  const pack = packOf(camp);
  const over = pack.monsters?.[id];
  const baseId = over?.statsFrom || (MONSTERS[id] ? id : null);
  const base = baseId ? MONSTERS[baseId] : null;
  if (!base) return MONSTERS[id] || null;
  if (!over) return base;
  const out = { ...base };
  if (over.name != null) out.name = over.name;
  if (over.glyph != null) out.glyph = over.glyph;
  if (over.short != null) out.short = over.short;
  if (over.img != null) out.img = over.img;
  if (over.look != null) out.look = over.look;
  if (over.imgBase != null) out.imgBase = over.imgBase;
  if (over.group != null) out.group = over.group;
  return out;
}

// Display names sit beside the fight list, index for index. Boss (and elite) quest titles
// use names[0]. Battle minis still use the base sheet; only the label changes.
export function fightNamesOf(camp, act, step) {
  const acts = actsOf(camp);
  const a = acts[(act - 1) % acts.length];
  return a?.names?.[step - 1] || null;
}

// Story text may drop in {name}, {names}, {wizard}, {dwarf}, {knight}, {bard}, {ranger}.
// Dawn copy has none of these, so existing lines play unchanged. Apply to titles too.
export function fillNames(text, heroes = []) {
  if (text == null) return text;
  const list = (heroes || []).filter((h) => h && h.name);
  const byCls = {};
  for (const h of list) if (h.cls && !byCls[h.cls]) byCls[h.cls] = h.name;
  const names = list.map((h) => h.name);
  const joined = names.length <= 1 ? (names[0] || 'you')
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const sub = (s) => String(s).replace(/\{(names|name|wizard|dwarf|knight|bard|ranger)\}/g, (_, k) => {
    if (k === 'names') return joined;
    if (k === 'name') return names[0] || 'you';
    return byCls[k] || NAME_FALLBACK[k] || names[0] || 'you';
  });
  return Array.isArray(text) ? text.map(sub) : sub(text);
}

export function classLabel(id) { return CLASSES[id]?.name || id; }
export function forcedLine(pack) {
  const p = packOf(pack);
  if (!p.forcedClasses?.length) return '';
  return p.forcedClasses.map(classLabel).join(' + ');
}
export function partySize(pack) {
  const p = packOf(pack);
  const n = p.requiredHeroes || 1;
  const max = p.maxHeroes || n;
  if (n === max) return n === 1 ? '1 hero' : `${n} heroes`;
  return `${n}–${max} heroes`;
}
export function coverClasses(pack) {
  const p = packOf(pack);
  if (p.cover?.classes?.length) return p.cover.classes;
  if (p.cover?.cls) return [p.cover.cls];
  return p.forcedClasses?.length ? p.forcedClasses : ['knight'];
}

export function cloneDawnActs(names, tags) {
  return ACTS.map((a, i) => {
    const copy = structuredClone(a);
    if (names?.[i]) copy.name = names[i];
    if (tags?.[i]) copy.tag = tags[i];
    return copy;
  });
}

function filterIds(ids, ban) {
  if (!ban?.length) return ids;
  const drop = new Set(ban);
  return (ids || []).filter((id) => !drop.has(id));
}
function filterPool(pool, ban) {
  if (!ban?.length) return pool;
  return (pool || []).map((g) => filterIds(g, ban)).filter((g) => g.length);
}

// Overlay a writer's act spec on the Dawn land of the same index: keep pool/weather/places
// for painted backdrops, replace the locked fights, names, route, fightHp, help and gates.
export function finishActs(specs, ban = []) {
  return specs.map((spec, i) => {
    const dawn = structuredClone(ACTS[i]);
    const fights = (spec.fights || dawn.fights).map((g) => filterIds(g, ban));
    const elite = spec.elite ? spec.elite.map((g) => filterIds(g, ban)) : [fights[4]].filter((g) => g?.length);
    const boss = spec.boss ? filterIds(spec.boss, ban) : fights[9];
    const out = {
      ...dawn,
      ...spec,
      fights,
      names: spec.names || dawn.names,
      elite: elite.length ? elite : dawn.elite,
      boss: boss?.length ? boss : dawn.boss,
      pool: filterPool(spec.pool || dawn.pool, ban),
      help: spec.help || [],
    };
    if ('gates' in spec) out.gates = spec.gates;
    else delete out.gates;
    return out;
  });
}

const DAWN = {
  id: 'dawn',
  title: 'The Dawn Lantern',
  pitch: 'The Goblin King stole the flame that kept the Marches green. Bring the light home.',
  cover: { cls: 'knight', img: 'assets/miniatures/knight-blue.webp' },
  requiredHeroes: 1,
  maxHeroes: 6,
  forcedClasses: null,
  startMode: 'scaled',
  acts: ACTS,
  // beats + places live in story.js so existing tests and Dawn copy stay put
};

const RIVALDUO = {
  id: 'rivalduo',
  title: 'Rival Duo',
  pitch: 'A stuffy wizard and a dwarf who hates magic are snapped together by a Friendship Bangle. Gerald the cheese has been stolen. Apparently cheese counts.',
  cover: { classes: ['wizard', 'dwarf'] },
  requiredHeroes: 2,
  maxHeroes: 2,
  forcedClasses: ['wizard', 'dwarf'],
  startMode: 'fresh',
  // cultist / lich read as a wizard; ironwarden reads as a dwarf
  ban: ['cultist', 'lich', 'ironwarden'],
  acts: finishActs(rivalDuo.actSpecs, ['cultist', 'lich', 'ironwarden']),
  beats: rivalDuo.beats,
  steps: rivalDuo.steps,
};

const BALLAD = {
  id: 'ballad',
  title: 'That’s Not How It Went',
  pitch: 'A proud by-the-book knight and the bard who wrote a mocking hit about him are ordered to escort the Sunday Crown. Together. Ignore the chorus.',
  cover: { classes: ['knight', 'bard'] },
  requiredHeroes: 2,
  maxHeroes: 2,
  forcedClasses: ['knight', 'bard'],
  startMode: 'fresh',
  // dirgesinger reads as a bard; armoured humans with shields read as knights
  ban: ['dirgesinger', 'shieldbearer', 'ironwarden', 'fallenchampion'],
  acts: finishActs(balladPack.actSpecs, ['dirgesinger', 'shieldbearer', 'ironwarden', 'fallenchampion']),
  beats: balladPack.beats,
  steps: balladPack.steps,
};

export const CAMPAIGNS = {
  dawn: DAWN,
  rivalduo: RIVALDUO,
  ballad: BALLAD,
};
