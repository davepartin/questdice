// T19: trace how the Wyrmwatch fight in Dave's report is built (read-only; changes nothing). Run: node tools/t19-trace.mjs
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
applyRelease();
const mkHero = (cls = 'knight', seed = 7, level = 13) => { const h = E.newHero({ name: 'Jasper', cls, seed }); h.level = level; h.campaign.act = 3; h.campaign.step = 8; return h; };
const out = {};
// 1) the quest as the game builds it for Act III step 8 with Vharaxis back as a nemesis and the two Call-for-Help foes
const h = mkHero(); const c = h.campaign;
c.nemeses = [{ id: 'vharaxis', name: 'Vharaxis, the Ember Queen', scar: 'blade', wound: 0.3, act: 3, step: 5, grudge: 0, bounty: 1.5 }];
c.nextPlace = 'Wyrmwatch'; c.nextEnemies = ['gloomstalker', 'dirgesinger'];
const qs = E.questsFor(h); const q = qs[0];
out.quest = { name: q.name, kind: q.kind, place: q.place, enemies: q.enemies, hpMult: q.hpMult, flat: q.flat, nemesis: !!q.nemesis, ambushed: !!q.ambushed };
const b = E.newBattle(h, q, E.makeRng(1), 1);
out.enemies = b.enemies.map((e) => ({ id: e.id, tier: e.tier, startHp: e.hp, maxHp: e.maxHp, flat: e.flat, power: e.powerDie, armor: e.armor, nemesis: !!e.nemesis }));
// 2) the same Vharaxis as the designed set pieces: step 5 elite and step 10 boss
const setPiece = (step) => { const hh = mkHero(); hh.campaign.step = step; const [qq] = E.questsFor(hh); const bb = E.newBattle(hh, qq, E.makeRng(1), 1); return { step, kind: qq.kind, hpMult: +qq.hpMult.toFixed(3), flat: qq.flat, enemies: bb.enemies.map((e) => ({ id: e.id, maxHp: e.maxHp, flat: e.flat })) }; };
out.setPieces = [5, 10].map(setPiece);
// 3) what the nemesis wound does: start health as a share of maximum
out.nemesisStart = [0.0, 0.3, 0.5, 0.65].map((w) => { const hh = mkHero(); const cc = hh.campaign; cc.nemeses = [{ ...c.nemeses[0], wound: w }]; cc.nextPlace = 'Wyrmwatch'; cc.nextEnemies = ['gloomstalker', 'dirgesinger']; const [qq] = E.questsFor(hh); const bb = E.newBattle(hh, qq, E.makeRng(1), 1); const v = bb.enemies.find((e) => e.id === 'vharaxis'); return { woundWhenItFled: w, startHp: v.hp, maxHp: v.maxHp, share: +(v.hp / v.maxHp).toFixed(2) }; });
// 4) the constants in play
out.constants = { ACT_HP: D.ACT_HP, ACT_FLAT: D.ACT_FLAT, STEP_HP: D.STEP_HP, SET_PIECE: D.SET_PIECE, fightHpAct3: D.CAMPAIGNS?.[2]?.fightHp, vharaxisBaseHp: D.MONSTERS.vharaxis.hp, gloomBaseHp: D.MONSTERS.gloomstalker.hp, dirgeBaseHp: D.MONSTERS.dirgesinger.hp };
console.log(JSON.stringify(out, null, 1));
