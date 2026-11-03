// Frog Morph (Dave, 3 Nov 2026): 3 magic loads two numbered dice; the same round can Use them.
import test from 'node:test';import assert from 'node:assert/strict';
import {applyRelease} from '../js/release.js';import * as E from '../js/engine.js';
applyRelease();
const wiz=(level=0)=>{const h=E.newHero({name:'Frog',cls:'wizard',seed:7,full:true});h.level=9;h.powerLevel={polymorph:level};return h;};
const card=E.cardsOf(wiz()).find(k=>k.id==='polymorph');
const fight=(level=0)=>{const h=wiz(level),b=E.newBattle(h,{...E.questsFor(h)[0],enemies:['ogre','goblin'],kind:'battle'},E.makeRng(7));E.startRoll(b);b.magic=20;return b;};
const next=b=>{b.round++;b.usedRound={};};
test('saved polymorph identity is retained under Frog Morph, with six low-numbered matching faces',()=>{
 assert.equal(card.name,'Frog Morph');assert.equal(card.cost,3);assert.equal(card.frogLoad,2);assert.equal(card.max,3);
 for(let rank=0;rank<4;rank++)for(let n=1;n<=3;n++){assert.equal(E.frogLoaded(card,n),2*n);assert.equal(E.powerCost(card,card.cost,rank),3);assert.equal(E.frogNeed(card,n,rank),7-2*n);}
 assert.deepEqual([0,1,2,3].map(n=>E.frogMatchRange(card,n)),['none','1–2','1–4','1–6']);
});
test('loading never locks a target; using does',()=>{assert.equal(E.usesTarget(card),false);assert.equal(E.usesTarget(card,{release:true}),true);});
test('load and use work in the same round, charge once and use once, without a second magic payment',()=>{
 const b=fight();assert.ok(E.castPower(b,'polymorph'));assert.equal(b.magic,17);assert.equal(b.charge.polymorph,1);
 const r=E.castPower(b,'polymorph',{release:true});assert.ok(r);assert.equal(r.loaded,2);assert.equal(r.cost,0);assert.equal(b.magic,17);assert.equal(b.charge.polymorph,0);
 assert.equal(E.castPower(b,'polymorph'),null);assert.equal(E.castPower(b,'polymorph',{release:true}),null);
});
test('every roll matches exactly the loaded faces at every rank; all six still roll a d6',()=>{
 for(let rank=0;rank<4;rank++)for(let charges=1;charges<=3;charges++)for(let face=1;face<=6;face++){
  const b=fight(rank);b.charge={polymorph:charges};let calls=0;b.rng=()=>{calls++;return(face-.5)/6;};
  const r=E.castPower(b,'polymorph',{release:true});assert.equal(r.total,face);assert.equal(r.frog,face<=charges*2);assert.equal(r.match,`1–${charges*2}`);assert.equal(calls,1);assert.equal(b.charge.polymorph,0);assert.equal(!!b.mods.frog,r.frog);
 }
});
test('three rounds cost exactly nine magic and cannot overfill or charge twice in a round',()=>{
 const b=fight();for(let n=1;n<=3;n++){assert.ok(E.castPower(b,'polymorph'));assert.equal(E.castPower(b,'polymorph'),null);assert.equal(b.charge.polymorph,n);next(b);}
 assert.equal(b.magic,11);assert.equal(E.castPower(b,'polymorph'),null);assert.equal(b.magic,11);
 b.rng=()=>.999;assert.equal(E.castPower(b,'polymorph',{release:true}).frog,true);
});
test('a miss spends all loaded dice, and a new round can load the first pair again',()=>{
 const b=fight();b.rng=()=>.99;E.castPower(b,'polymorph');assert.equal(E.castPower(b,'polymorph',{release:true}).frog,false);assert.equal(b.charge.polymorph,0);next(b);assert.ok(E.castPower(b,'polymorph'));assert.equal(E.frogLoaded(card,b.charge.polymorph),2);
});
test('insufficient magic and empty use do not mutate state; other charge powers retain store-or-use rule',()=>{
 const b=fight();b.magic=2;const before=structuredClone({...b,rng:null});assert.equal(E.castPower(b,'polymorph'),null);assert.equal(E.castPower(b,'polymorph',{release:true}),null);assert.deepEqual({...b,rng:null},before);
 b.magic=20;assert.ok(E.castPower(b,'coil'));assert.equal(E.castPower(b,'coil',{release:true}),null);
});
test('a frog stops a Slam but retains armor and a defensive guard move',()=>{
 const b=fight();b.charge={polymorph:3};const e=b.enemies[0];e.hp=e.maxHp=999;e.intent={n:'Slam',v:'strike',f:9,m:9,slam:true,double:true};E.castPower(b,'polymorph',{release:true});const rep=E.resolve(b,{target:0});assert.equal(rep.frog,e.uid);assert.ok(!rep.acts.some(a=>a.uid===e.uid&&!a.frog));
 const g=fight();g.charge={polymorph:3};const guard=g.enemies[0];guard.hp=guard.maxHp=999;guard.arm=7;guard.mag=20;guard.intent={n:'Guard',v:'guard',f:20,m:0};g.mods.atk=15;E.castPower(g,'polymorph',{release:true});const rg=E.resolve(g,{target:0});assert.ok(rg.guarded>=15);assert.ok(rg.acts.some(a=>a.uid===guard.uid&&a.v==='guard'));
});
test('party frog defense and same-round loading/use work through the fighter state',()=>{
 const heroes=[wiz(),E.newHero({name:'Friend',cls:'knight',seed:9,full:true})];const b=E.newPartyBattle(heroes,{...E.questsFor(heroes[0])[0],enemies:['ogre','goblin'],kind:'battle'},E.makeRng(9));
 E.startFighter(b,0);b.magic=12;assert.ok(E.castPower(b,'polymorph'));assert.ok(E.castPower(b,'polymorph',{release:true}));assert.equal(b.magic,9);E.commitFighter(b);
 assert.equal(b.fighters[0].charge.polymorph,0);assert.ok(b.fighters[0].usedRound['polymorph:release']);
});
test('only the meaningful pierce upgrade is offered, with existing saved higher ranks preserved',()=>{
 const h=wiz();h.gold=500;assert.equal(E.powerUpgradeInfo(h,'polymorph').next,1);assert.equal(E.upgradePower(h,'polymorph'),true);assert.equal(h.gold,450);assert.equal(E.upgradePower(h,'polymorph'),false);h.powerLevel.polymorph=3;assert.equal(E.powerLevel(h,'polymorph'),3);assert.equal(E.powerUpgradeInfo(h,'polymorph').why,'max');
});
test('online commands enforce phase, ownership, duplicate loading and use with one exact payment',async()=>{
 const {createTable,joinTable,command}=await import('../js/table.js');const t=createTable({code:'FROG',seed:7,name:'Frogs'});
 const a=joinTable(t,{name:'Ada',cls:'wizard',token:'frog-ada'}).player,b=joinTable(t,{name:'Bea',cls:'knight',token:'frog-bea'}).player;
 a.hero=wiz();b.hero=E.newHero({name:'Bea',cls:'knight',seed:9,full:true});t.company={members:[a.hero,b.hero],campaign:a.hero.campaign};
 t.battle=E.newPartyBattle([a.hero,b.hero],{...E.questsFor(a.hero)[0],enemies:['ogre'],kind:'battle'},E.makeRng(9));E.beginPartyRound(t.battle);E.startFighter(t.battle,0);E.commitFighter(t.battle);t.battle.fighters[0].magic=12;
 const load={type:'card',id:'polymorph'};t.phase='camp';assert.equal(command(t,a.id,load).ok,false);t.phase='battle';assert.equal(command(t,'unknown',load).ok,false);assert.equal(command(t,b.id,load).ok,false);
 const other=structuredClone(t.battle.fighters[1]);assert.equal(command(t,a.id,load).ok,true);assert.equal(t.battle.fighters[0].magic,9);assert.equal(command(t,a.id,load).ok,false);assert.equal(command(t,a.id,{...load,release:true}).ok,true);assert.equal(command(t,a.id,{...load,release:true}).ok,false);assert.equal(t.battle.fighters[0].magic,9);assert.deepEqual(t.battle.fighters[1],other);
});
test('the transformation ends at the next round',()=>{
 const b=fight();for(const e of b.enemies)e.hp=e.maxHp=999;b.charge={polymorph:3};assert.ok(E.castPower(b,'polymorph',{release:true}).frog);E.resolve(b,{target:0});E.beginReset(b);assert.equal(!!b.mods.frog,false);
});

test('saved probability upgrades return their gold exactly once without removing owned ranks or bonuses',async()=>{
 const SV=await import('../js/save.js');
 for(const [rank,refund] of [[0,0],[1,0],[2,90],[3,230]]){
  const h=wiz(rank);h.gold=41;h.perks=['focus'];const before=structuredClone(h);
  assert.equal(SV.migrateFrogMorph(h),refund);assert.equal(h.gold,41+refund);assert.equal(h.powerLevel.polymorph,rank);assert.deepEqual(h.loadout,before.loadout);assert.deepEqual(h.perks,before.perks);
  assert.equal(SV.migrateFrogMorph(h),0);assert.equal(h.gold,41+refund);
 }
 const h=E.newHero({name:'Other',cls:'knight'});h.powerLevel={polymorph:3};const before=structuredClone(h);assert.equal(SV.migrateFrogMorph(h),0);assert.deepEqual(h,before);
 const h2=wiz(3);h2.gold=0;SV.migrateHero(h2);SV.migrateHero(h2);assert.equal(h2.gold,230);assert.equal(h2.powerLevel.polymorph,3);
});
test('table refunds wait until camp and migrate both company and player copies only once',async()=>{
 const {migrateTable}=await import('../js/table.js');const hero=wiz(3);hero.gold=10;
 const t={phase:'battle',company:{members:[hero]},players:[{id:'a',hero:structuredClone(hero)}]};migrateTable(t);assert.equal(hero.gold,10);assert.equal(t.players[0].hero.gold,10);
 t.phase='camp';migrateTable(t);assert.equal(hero.gold,240);assert.equal(t.players[0].hero.gold,240);migrateTable(t);assert.equal(hero.gold,240);assert.equal(t.players[0].hero.gold,240);
});
