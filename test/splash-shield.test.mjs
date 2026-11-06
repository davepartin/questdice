// Approved rule: splash meets every other monster's guard, including its Shield Special.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { applyRelease } from '../js/release.js';
applyRelease();
const quest={id:'splash-shield',enemies:['goblin','skeleton'],kind:'battle',step:1,hpMult:1,flat:0,rewardMult:1};
const board=()=>Object.fromEntries(['NW','N','NE','W','C','E','SW','S','SE'].map(s=>[s,{v:1,bound:false}]));
function tame(b){for(const e of b.enemies){e.hp=e.maxHp=10000;e.special=null;e.armor=null;e.flat=e.teamFlat=0;e.intent={n:'Quiet guard',v:'guard',f:0,m:0};e.buff=0;}b.enemies[1].special={id:'shield',goal:40,block:20};return b;}
function solo(cls='knight'){
 const h=E.newHero({name:'Splash',cls,seed:3});const b=tame(E.newBattle(h,quest,E.makeRng(2)));E.startRoll(b);b.board=board();b.hp=b.maxHp=1000;return b;
}
const offDamage=b=>{const before=b.enemies[1].hp;E.resolve(b,{target:0});return before-b.enemies[1].hp;};
test('solo off-target Shield blocks splash and passes only the overflow; splash cannot break its Attack goal',()=>{
 for(const [splash,expected]of[[3,0],[20,0],[23,3]]){
  const b=solo();b.mods.splash=splash;assert.equal(offDamage(b),expected);assert.ok(!b.enemies[1].special.broken);
 }
});
test('a broken Shield stops no splash; ordinary guard and armour still combine with an intact Shield',()=>{
 const broken=solo();broken.enemies[1].special.broken=true;broken.mods.splash=3;assert.equal(offDamage(broken),3);
 const combined=solo();combined.enemies[1].intent.f=2;combined.enemies[1].armor={n:1,s:4};combined.rng=()=>0;combined.mods.splash=26;
 assert.equal(offDamage(combined),3,'26 minus 20 Shield, 2 guard and 1 armour');
});
test('a high attack aimed at another monster does not break the off-target Shield',()=>{
 const b=solo();b.mods.atk=200;b.mods.splash=3;assert.equal(offDamage(b),0);assert.ok(!b.enemies[1].special.broken);
});
test('the Shield pool is spent once across power splash and a real Fire arrow',()=>{
 const b=solo('ranger');b.hero.loadout.NW={uid:'fire-review',id:'quiver',ammo:'fire',rarity:0,size:4};b.board.NW.v=4;b.board.W.v=4;
 const fire=E.evaluate(b.hero,b.board).fire;assert.ok(fire>0);b.enemies[1].special.block=3;b.mods.splash=2;
 assert.equal(offDamage(b),Math.max(0,2+fire-3));
});
test('solo and party both protect an off-target Shield from small splash',()=>{
 const one=solo();one.mods.splash=3;assert.equal(offDamage(one),0);
 const hs=[0,1].map(i=>E.newHero({name:'Splash'+i,cls:'knight',seed:3+i}));const b=tame(E.newPartyBattle(hs,quest,E.makeRng(2)));
 for(let i=0;i<2;i++){E.startFighter(b,i);b.board=board();E.commitFighter(b);}E.focusFighter(b,0);b.mods.splash=3;E.commitFighter(b);
 const before=b.enemies[1].hp;E.resolveParty(b);assert.equal(before-b.enemies[1].hp,0);
});
test('finishers retain their separately approved all-enemy damage through the Shield',()=>{
 const b=solo();b.mods.aoe=3;assert.equal(offDamage(b),3);
});
