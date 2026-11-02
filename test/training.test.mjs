import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { CLASSES } from '../js/data.js';
import { applyRelease } from '../js/release.js';
import { migrateHero } from '../js/save.js';
applyRelease();
const hero = cls => { const h = E.newHero({name: 'Training', cls: cls || 'knight', seed: 7}); h.gold = 2000; return h; };
const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle', perilous: false };
test('candidate training is disabled at the live root, even with saved ranks', () => {
  const h = hero(), hp = E.maxHpOf(h), gold = h.gold;
  h.training = {health: 3, start: 3, capacity: 3};
  assert.equal(E.maxHpOf(h), hp);
  assert.equal(E.trainingInfo(h, 'health').why, 'Preview only');
  assert.equal(E.buyTraining(h, 'health', 0, 'camp'), false);
  assert.equal(h.gold, gold);
});
test('migration defaults and bounds ranks while retaining perks, bonus HP and paid effects', () => {
  const h = hero(); delete h.training; h.perks = ['vitality']; h.bonusHp = 8;
  h.campaign.blessings = [{id:'store-tea', startMagic:3, fights:1}];
  const before = structuredClone(h); migrateHero(h);
  assert.deepEqual(h.training, {health:0,start:0,capacity:0});
  assert.deepEqual(h.perks, before.perks); assert.equal(h.bonusHp,8); assert.deepEqual(h.campaign.blessings,before.campaign.blessings);
  h.training = {health:99,start:-1,capacity:'2',junk:3}; migrateHero(h);
  assert.deepEqual(h.training, {health:3,start:0,capacity:0});
});
test('candidate enforces exact payment, expected rank, phase and act gates', () => {
  E.useCampTraining(); const h = hero(); h.gold = 50;
  for (const [kind,rank,phase] of [['health',0,'battle'],['health',1,'camp'],['unknown',0,'camp'],['__proto__',0,'camp']]) assert.equal(E.buyTraining(h,kind,rank,phase),false);
  assert.equal(h.gold,50); assert.equal(E.buyTraining(h,'health',0,'camp'),true); assert.equal(h.gold,0);
  h.gold=1000; assert.equal(E.buyTraining(h,'health',0,'camp'),false); assert.equal(E.buyTraining(h,'health',1,'camp'),false);
  h.campaign.act=2; assert.equal(E.buyTraining(h,'health',1,'camp'),true); assert.equal(h.gold,900);
  h.campaign.act=3; assert.equal(E.buyTraining(h,'health',2,'camp'),true); assert.equal(h.gold,720);
  assert.equal(E.buyTraining(h,'health',3,'camp'),false);
  const poor=hero();poor.gold=49;assert.equal(E.buyTraining(poor,'health',0,'camp'),false);assert.equal(poor.gold,49);
});
test('training preserves class and perk differences and feeds solo and party battle stats', () => {
  E.useCampTraining();
  for (const cls of Object.keys(CLASSES)) {
    const h=hero(cls);h.perks=['vitality','reserve','deepwell'];h.bonusHp=4;
    const hp=E.maxHpOf(h),start=E.startMagicOf(h),cap=E.magicCapOf(h);
    for(const kind of ['health','capacity','start']) assert.equal(E.buyTraining(h,kind,0,'camp'),true);
    assert.equal(E.maxHpOf(h),hp+4);assert.equal(E.startMagicOf(h),start+1);assert.equal(E.magicCapOf(h),cap+2);
    const b=E.newBattle(h,quest,E.makeRng(3)); assert.equal(b.maxHp,hp+4);assert.equal(b.magic,Math.min(start+1,cap+2));
    const p=E.newPartyBattle([h,hero('knight')],quest,E.makeRng(4));assert.equal(p.fighters[0].maxHp,hp+4);assert.equal(p.fighters[0].magic,Math.min(start+1,cap+2));
  }
});
test('starting magic cannot be bought for zero immediate benefit', () => {
  E.useCampTraining();const h=hero('wizard');h.perks=Array(50).fill('reserve');
  const before=structuredClone(h); assert.equal(E.trainingInfo(h,'start').why,'Increase magic capacity first');
  assert.equal(E.buyTraining(h,'start',0,'camp'),false);assert.deepEqual(h,before);
});
test('candidate rejects invalid gold and does not give authority over another seat', async () => {
  E.useCampTraining();
  for (const gold of [NaN,Infinity,-1]) { const h=hero();h.gold=gold;assert.equal(E.buyTraining(h,'health',0,'camp'),false); }
  const {createTable,joinTable,command}=await import('../js/table.js');
  const t=createTable({code:'TRAIN',seed:7,name:'Camp'});
  const a=joinTable(t,{name:'Ada',cls:'knight',token:'training-ada'}).player;
  const b=joinTable(t,{name:'Bea',cls:'bard',token:'training-bea'}).player;
  a.hero=hero();b.hero=hero('bard');a.ready=true;b.ready=true;t.phase='battle';
  const cmd={type:'op',op:'buyTraining',args:['health',0,'camp']};
  assert.equal(command(t,a.id,cmd).ok,false);
  t.phase='camp'; assert.equal(command(t,'unknown',cmd).ok,false);
  const before=structuredClone(b.hero);
  assert.equal(command(t,a.id,{...cmd,hero:b.hero}).ok,true);
  assert.equal(a.hero.training.health,1);assert.equal(a.hero.gold,1950);assert.deepEqual(b.hero,before);
  assert.equal(a.ready,false);assert.equal(command(t,a.id,cmd).ok,false);assert.equal(a.hero.gold,1950);
  assert.equal(command(t,b.id,{type:'op',op:'buyTonic',args:['tea']}).ok,false);
});
