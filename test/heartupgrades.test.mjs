import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as SV from '../js/save.js';
import { slotPrice, slotCanBuy } from '../js/campbuy.js';
import { createTable, joinTable, command, saveTable, loadTable } from '../js/table.js';
import { applyRelease } from '../js/release.js';
applyRelease();
const hero = (act = 3, gold = 1000) => { const h = E.newHero({ name: 'Heart', cls: 'knight', seed: 5 }); h.campaign.act = act; h.gold = gold; return h; };
const board = (body, heart) => Object.fromEntries(D.SLOTS.map((s) => [s, { v: s === 'C' ? heart : ['N','W','E','S'].includes(s) ? body : 1 }]));

test('Heart ranks are live: 200 then 300 gold, no act gate', () => {
  assert.equal(D.EXPERIMENT.heartUpgrades, true);
  const h = hero(1, 199); assert.equal(E.heartRankOf(h), 1);
  assert.equal(slotPrice(h, 'C'), 200); assert.equal(slotCanBuy(h, 'C'), false); assert.equal(E.upgradeHeart(h, 2), false);
  h.gold = 200; assert.equal(E.upgradeHeart(h, 2), true); assert.equal(h.gold, 0);
  h.gold = 299; assert.equal(E.upgradeHeart(h, 3), false); h.gold = 300; assert.equal(E.upgradeHeart(h, 3), true); assert.equal(h.heartRank, 3);
});
test('exact funds, sequential ranks, max and repeated/stale commands', () => {
  E.useHeartUpgrades();
  const h = hero(1, 500);
  h.gold = 199;
  assert.equal(slotPrice(h, 'C'), 200); assert.equal(slotCanBuy(h, 'C'), false);
  assert.equal(E.upgradeHeart(h, 2), false);
  h.gold = 200; assert.equal(E.upgradeHeart(h, 2), true); assert.equal(h.gold, 0); assert.equal(h.heartRank, 2);
  h.gold = 299; assert.equal(E.upgradeHeart(h, 3), false); assert.equal(h.gold, 299);
  h.gold = 300; assert.equal(E.upgradeHeart(h, 2), false); assert.equal(E.upgradeHeart(h, '3'), false);
  assert.equal(E.upgradeHeart(h, 3), true); assert.equal(h.gold, 0); assert.equal(h.heartRank, 3);
  assert.equal(E.upgradeHeart(h, 3), false); assert.equal(E.upgradeHeart(h, 4), false);
  const ordered = hero(); assert.equal(E.upgradeHeart(ordered, 3), false);
  assert.equal(E.upgradeHeart(ordered, 2), true); assert.equal(E.upgradeHeart(ordered, 2), false);
  assert.equal(E.upgradeHeart(ordered, 3), true); assert.equal(ordered.gold, 500);
  for (const bad of [NaN, Infinity, -100, '1000']) { const x = hero(3, bad); assert.equal(E.upgradeHeart(x, 2), false); }
});
test('old and malformed ranks default safely, migration is idempotent and preserves possessions', () => {
  for (const bad of [undefined, null, 0, -1, 4, 2.5, '3', NaN, Infinity]) {
    const h = hero(); h.heartRank = bad; const gear = JSON.stringify(h.loadout); const gold = h.gold;
    SV.migrateHero(h); assert.equal(h.heartRank, 1); assert.equal(h.gold, gold); assert.equal(JSON.stringify(h.loadout), gear);
    const once = JSON.stringify(h); SV.migrateHero(h); assert.equal(JSON.stringify(h), once);
  }
  for (const rank of [1,2,3]) { const h = hero(); h.heartRank = rank; SV.migrateHero(h); assert.equal(h.heartRank, rank); }
});
test('all six faces use each hero rank, white symbols only, hush and fixed d6', () => {
  E.useHeartUpgrades();
  for (const rank of [1,2,3]) {
    const h = hero(); h.heartRank = rank;
    assert.equal(E.sidesOf(h, 'C'), 6);
    for (const [i,sym] of ['heal','pierce','magic','gold'].entries()) {
      const b = board(i+1,i+1); const out = E.evaluate(h,b);
      assert.equal(out.heartBoost.n, 4*(rank+1)); assert.equal(out.heartBoost.sym,sym);
      const hush = E.evaluate(h,b,{hushed:true}); assert.equal(hush.heartBoost, undefined);
      assert.equal(out[sym]-hush[sym],4*(rank+1));
      assert.equal(E.evaluate(h,board(((i+1)%4)+1,i+1)).heartBoost,undefined);
    }
    for (const hv of [5,6]) {
      const out=E.evaluate(h,board(1,hv));
      for(const lane of Object.values(out.lanes)) assert.equal(lane.amp,lane.color===(hv===5?'b':'r') ? 2*(rank+1) : 0);
      assert.ok(Object.values(out.lanes).some(l=>l.amp>0));
    }
  }
  const h=hero(); h.heartRank=3;
  for(const hv of [1,2,3,4]) {
    const sym=['heal','pierce','magic','gold'][hv-1];
    const out=E.evaluate(h,board(10,hv));
    assert.equal(out.heartBoost?.n || 0,D.FACE_PAY[10][sym] ? 16 : 0);
  }
});
test('authoritative camp operations reject battle, skipped ranks, duplicates and other players stay untouched', () => {
  const t=createTable({code:'HRT',seed:5});
  const p=joinTable(t,{name:'One',cls:'knight',token:'one12345'}).player;
  const q=joinTable(t,{name:'Two',cls:'bard',token:'two12345'}).player;
  p.hero=hero(3,1000); q.hero=hero(3,1000); t.company={members:[p.hero,q.hero],campaign:p.hero.campaign};
  const cmd={type:'op',op:'upgradeHeart',args:[2]};
  t.phase='battle'; assert.equal(command(t,p.id,cmd).ok,false);
  t.phase='camp'; assert.equal(command(t,p.id,{...cmd,args:[3]}).ok,false);
  assert.equal(command(t,p.id,cmd).ok,true); assert.equal(command(t,p.id,cmd).ok,false);
  assert.equal(p.hero.heartRank,2); assert.equal(p.hero.gold,800); assert.equal(q.hero.heartRank,1); assert.equal(q.hero.gold,1000);
  const restored=loadTable(saveTable(t)); const rp=restored.players.find(x=>x.id===p.id);
  assert.equal(rp.hero.heartRank,2); assert.equal(rp.hero.gold,800);
  assert.equal(command(restored,p.id,cmd).ok,false);
  assert.equal(command(restored,p.id,{...cmd,args:[3]}).ok,true); assert.equal(rp.hero.gold,500);
});
test('rank and gold survive local save/reopen and soul-code export/import', async () => {
  const mem=new Map(); globalThis.window={localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)}};
  const h=hero(); E.upgradeHeart(h,2); E.upgradeHeart(h,3);
  await SV.createSave(h,'pass'); const loaded=await SV.openHero(h.name,'pass');
  assert.equal(loaded.heartRank,3); assert.equal(loaded.gold,500);
  const code = SV.exportCode(h.name); SV.deleteHero(h.name); SV.importCode(code);
  const imported = await SV.openHero(h.name,'pass'); assert.equal(imported.heartRank,3); assert.equal(imported.gold,500);
});

test('real solo and party resolution use the owning hero rank without changing Heart to Heart', () => {
  E.useHeartUpgrades();
  const heroes=[1,3].map((rank,i)=>{const h=hero();h.name=`Rank${rank}`;h.heartRank=rank;return h;});
  const q=E.questsFor(heroes[0])[0];
  const solo=E.newBattle(structuredClone(heroes[1]),q,E.makeRng(8));E.startRoll(solo);solo.board=board(3,3);
  E.resolve(solo,{target:0,straight:'atk'});assert.equal(solo.report.ev.heartBoost.n,16);
  const party=E.newPartyBattle(heroes,q,E.makeRng(8));
  for(let i=0;i<2;i++){E.startFighter(party,i);party.board=board(3,3);E.commitFighter(party);party.fighters[i].locked=true;}
  E.resolveParty(party);
  assert.deepEqual(party.fighters.map(f=>f.ev.heartBoost.n),[8,16]);
  // Heart-to-Heart is an attack bonus. Equal Heart faces do not add rank-scaled magic.
  assert.deepEqual(party.fighters.map(f=>f.T.magic-f.ev.magic),[0,0]);
});

test('turning is still three magic, once per round, and hush stops it', () => {
  const h=hero();h.heartRank=3;const b=E.newBattle(h,E.questsFor(h)[0],E.makeRng(5));E.startRoll(b);b.magic=10;b.board.C.v=2;
  assert.equal(E.nudge(b,1),true);assert.equal(b.magic,7);assert.equal(E.nudge(b,1),false);
  delete b.board.nudged;b.board.C.hushed=true;assert.equal(E.nudge(b,1),false);assert.equal(b.magic,7);
});
