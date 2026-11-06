// A bought Talent Splash face uses the existing blocked, off-target Splash resource in solo and co-op.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as T from '../js/table.js';
import {pack,unpack} from '../js/pack.js';
import {applyRelease} from '../js/release.js';
applyRelease();
const hero=(name='Splash')=>{const h=E.newHero({name,cls:'knight',seed:3});h.gold=1000;return h;};
const board=(v=4)=>Object.fromEntries(['NW','N','NE','W','C','E','SW','S','SE'].map(s=>[s,{v:s==='SW'?v:1,bound:false}]));
const quest={id:'talent-splash',enemies:['goblin','skeleton','wolf'],kind:'battle',step:1,hpMult:1,flat:0,rewardMult:1};
function tame(b,shield=0){for(const e of b.enemies){e.hp=e.maxHp=10000;e.special=null;e.armor=null;e.flat=e.teamFlat=0;e.intent={n:'Quiet guard',v:'guard',f:0,m:0};e.buff=0;}if(shield)b.enemies[1].special={id:'shield',goal:40,block:shield};return b;}
function one(splash=true,shield=0,q=quest){const h=hero();if(splash)assert(E.addTalent(h,'SW',0,'splash'));const b=tame(E.newBattle(h,q,E.makeRng(2)),shield);E.startRoll(b);b.board=board();return b;}
test('Splash uses normal face prices, caps at two per die, and requires clearing before replacing',()=>{
 const h=hero();h.special.SW=6;assert(E.addTalent(h,'SW',0,'splash'));assert(E.addTalent(h,'SW',1,'splash'));
 assert.equal(h.gold,1000-D.talentFaceCost(4)-D.talentFaceCost(5));const gold=h.gold;
 assert.equal(E.addTalent(h,'SW',2,'splash'),false);assert.equal(E.addTalent(h,'SW',0,'heal'),false);assert.equal(h.gold,gold);
 assert(E.removeTalent(h,'SW',0));assert.equal(h.gold,gold);assert(E.addTalent(h,'SW',2,'splash'));
 const poor=hero();poor.gold=9;assert.equal(E.addTalent(poor,'SW',0,'splash'),false);assert.equal(poor.gold,9);
});
test('each numbered Splash face pays its printed value, preserves other totals and survives packing',()=>{
 for(const n of[4,6,8,10]){const h=hero();h.special.SW=n;const before=E.evaluate(h,board(n));assert(E.addTalent(h,'SW',n-4,'splash'));const after=E.evaluate(h,board(n));
  assert.equal(after.splash-before.splash,n);for(const k of['atk','block','pierce','heal','magic','gold'])assert.equal(after[k],before[k],k);
  const restored=unpack(pack(h));assert.deepEqual(E.specialFace(restored,'SW',n),['splash']);assert.equal(E.evaluate(restored,board(n)).splash,after.splash);
 }
});
test('real solo resolution splashes every other monster, never adds damage to the chosen target',()=>{
 const plain=one(false),splash=one();E.resolve(plain,{target:0});E.resolve(splash,{target:0});assert.equal(splash.enemies[0].hp,plain.enemies[0].hp);
 assert.equal(plain.enemies[1].hp-splash.enemies[1].hp,4);assert.equal(plain.enemies[2].hp-splash.enemies[2].hp,4);
 const single={...quest,enemies:['goblin']},a=one(false,0,single),b=one(true,0,single);E.resolve(a,{target:0});E.resolve(b,{target:0});assert.equal(a.enemies[0].hp,b.enemies[0].hp,'no other monster means no Splash damage');
});
test('off-target guard and Shield protect against rolled Talent Splash, passing only the overflow',()=>{
 for(const [guard,expected]of[[2,2],[4,0],[6,0]]){const b=one();b.enemies[1].intent.f=guard;E.resolve(b,{target:0});assert.equal(10000-b.enemies[1].hp,expected);}
 const shield=one(true,3);E.resolve(shield,{target:0});assert.equal(10000-shield.enemies[1].hp,1);assert.ok(!shield.enemies[1].special.broken);
});
test('party resolution receives the bought face through fighter evaluation and applies the same Shield rule',()=>{
 const h=hero('Ada'),mate=hero('Bea');assert(E.addTalent(h,'SW',0,'splash'));const b=tame(E.newPartyBattle([h,mate],quest,E.makeRng(2)),3);
 for(let i=0;i<2;i++){E.startFighter(b,i);b.board=board();E.commitFighter(b);}
 E.resolveParty(b);assert.equal(b.fighters[0].ev.splash,4);assert.equal(b.fighters[1].ev.splash,0);assert.equal(10000-b.enemies[1].hp,1);assert.equal(10000-b.enemies[2].hp,4);
});
test('authoritative camp op buys Splash, rejects duplicates, preserves it in table saves and refuses combat purchases',()=>{
 const t=T.createTable({code:'TSPL',seed:5,name:'Splash'}),p=T.joinTable(t,{name:'Ada',cls:'knight',token:'aaa'}).player;t.phase='camp';p.hero=hero('Ada');p.hero.gold=100;p.ready=true;
 const cmd={type:'op',op:'addTalent',args:['SW',0,'splash']};assert.equal(T.command(t,p.id,cmd).ok,true);assert.equal(p.hero.gold,90);assert.equal(p.ready,false);
 assert.equal(T.command(t,p.id,cmd).ok,false);assert.equal(p.hero.gold,90);const back=T.loadTable(T.saveTable(t));assert.deepEqual(back.players[0].hero.talent.SW[0],['splash']);
 t.phase='battle';p.hero.special.SW=6;assert.equal(T.command(t,p.id,{...cmd,args:['SW',1,'splash']}).ok,false);assert.equal(p.hero.gold,90);
});
