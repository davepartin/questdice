// Review-only evidence: current card arithmetic and controlled one-round counterexamples.
// Does not edit the released rules. Run: node tools/t31-director-review.mjs > report.json
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { applyRelease } from '../js/release.js';
import { fourMoves } from '../js/monster-d4.js';
applyRelease();
const weights={atk:1,pierce:1.05,splash:1.16,block:.55,heal:.88};
const equiv=g=>Object.entries(g).reduce((a,[k,v])=>a+(weights[k]||0)*v,0);
function sumDist(n,s){let d=[1];for(let i=0;i<n;i++){const next=Array(d.length+s).fill(0);for(let a=0;a<d.length;a++)for(let face=1;face<=s;face++)next[a+face]+=d[a]/s;d=next;}return d;}
const halfMean=(n,s)=>sumDist(n,s).reduce((a,p,total)=>a+p*Math.floor(total/2),0);
const cards=[];
for(const[cls,c]of Object.entries(D.CLASSES))for(const k of c.cards)for(let lvl=0;lvl<4;lvl++){
 const row={cls,id:k.id,name:k.name,type:k.type,rank:lvl+1,start:!!k.start};
 if(k.dice){row.casts=[k.cost,E.scaleMax(k,lvl)].filter((v,i,a)=>a.indexOf(v)===i).map(x=>{
  const cost=E.powerCost(k,x,lvl),n=E.powerDice(k,cost,lvl),mean=n*(k.dice.s+1)/2;
  const gain=k.dice.to==='whirl'?{atk:mean,splash:mean}:{[k.dice.to]:mean};if(k.splash==='half')gain.splash=halfMean(n,k.dice.s);
  const gold=k.goldOn?n/k.dice.s*k.goldOn.gold:0;
  return{cost,n,s:k.dice.s,gain,gold,printedEquivalentsPerMagic:equiv(gain)/cost};
 });}
 else if(k.kind==='charge')row.releases=[1,4].map(n=>{const gain=E.chargeGain(k,n,lvl);if(k.splash==='half')gain.splash=Math.floor(gain.atk/2);return{charges:n,earliestReleaseRound:n+1,cost:n*k.cost,gain,printedEquivalentsPerMagic:equiv(gain)/(n*k.cost)};});
 else if(k.kind==='mix') {row.cost=E.powerCost(k,undefined,lvl);row.groups=E.mixGroups(k,lvl).map(g=>({to:g.to,n:g.n,s:g.s,mean:E.mixAverage(g,lvl),table:g.table||null}));}
 else if(k.kind==='luck'){
  row.cost=E.powerCost(k,undefined,lvl);const gains={atk:0,magic:0};
  for(let face=1;face<=6;face++){const h=E.newHero({name:'LuckReview',cls,seed:1});h.powerLevel={[k.id]:lvl};const b=E.newBattle(h,{id:'luck-review',enemies:['goblin'],kind:'battle',step:1},E.makeRng(1));b.magic=row.cost;b.rng=()=>(face-.5)/6;const before=b.magic;const cast=E.castPower(b,k.id);assert.ok(cast);gains.atk+=(b.mods.atk||0)/6;gains.magic+=(b.magic-before+cast.cost)/6;}
  row.expectedGainWithMagicSpace=gains;
 }
 else if(k.kind==='flat'){row.cost=E.powerCost(k,undefined,lvl);row.gain=Object.fromEntries(Object.entries(k.fx||{}).filter(([key])=>!['free','frog'].includes(key)).map(([key,v])=>[key,E.scaleNum(v,lvl)]));row.conditional=!!(k.riposte||k.grudge||k.markGold||k.fx?.free||k.fx?.weaken);}
 cards.push(row);
}
const board=()=>Object.fromEntries(['NW','N','NE','W','C','E','SW','S','SE'].map(s=>[s,{v:1,bound:false}]));
const quest={id:'review-controlled',enemies:['goblin','skeleton'],kind:'battle',step:1,hpMult:1,flat:0,rewardMult:1};
function tame(b){for(const e of b.enemies){e.hp=e.maxHp=10000;e.special=null;e.armor=null;e.flat=e.teamFlat=0;e.intent={n:'Quiet guard',v:'guard',f:0,m:0};e.buff=0;}return b;}
function solo(){const h=E.newHero({name:'Review',cls:'knight',seed:3});const b=tame(E.newBattle(h,quest,E.makeRng(2)));E.startRoll(b);b.board=board();b.hp=b.maxHp=1000;return b;}
function party(n=2,cls='knight'){
 const hs=Array.from({length:n},(_,i)=>E.newHero({name:'Review'+i,cls:i===0?cls:'knight',seed:3+i}));const b=tame(E.newPartyBattle(hs,quest,E.makeRng(2)));
 for(let i=0;i<n;i++){E.startFighter(b,i);b.board=board();b.hp=500;b.maxHp=1000;E.commitFighter(b);}E.focusFighter(b,0);return b;
}
function clone(b){const{rng,...plain}=b;const c=structuredClone(plain);c.rng=E.makeRng(444);return c;}
function outcome(b){const before=new Map(b.enemies.map(e=>[e.uid,e.hp]));const rep=b.fighters?E.resolveParty(b):E.resolve(b,{target:0});return{monsterDamage:[...before].reduce((a,[uid,hp])=>a+hp-(b.enemies.find(e=>e.uid===uid)?.hp||0),0),heroHp:b.fighters?b.fighters.reduce((a,f)=>a+f.hp,0):b.hp,byEnemy:Object.fromEntries([...before].map(([uid,hp])=>[uid,hp-(b.enemies.find(e=>e.uid===uid)?.hp||0)])),report:rep};}
function deltas(b,kind,amount=3){const a=outcome(clone(b)),c=clone(b);c.mods[kind]=(c.mods[kind]||0)+amount;const z=outcome(c);return{kind,amount,monsterDamage:z.monsterDamage-a.monsterDamage,heroHp:z.heroHp-a.heroHp};}
const shieldCase=b=>{b.enemies[1].special={id:'shield',goal:9999,block:20};b.mods.splash=3;return b;};
const one=shieldCase(solo()),two=shieldCase(party());
const oneUid=one.enemies[1].uid,twoUid=two.enemies[1].uid;
const soloShieldDamage=outcome(one).byEnemy[oneUid],partyShieldDamage=outcome(two).byEnemy[twoUid];
const expectLeak=!!process.env.EXPECT_SOLO_SHIELD_LEAK;
assert.equal(soloShieldDamage,expectLeak?3:0,'solo splash must respect the off-target Shield Special (historical leak only when explicitly requested)');assert.equal(partyShieldDamage,0,'the party guard pool protects the same off-target Shield Special');
const counter=solo();counter.riposte=true;const counterDelta=deltas(counter,'block');
assert.equal(counterDelta.heroHp,0);assert.equal(counterDelta.monsterDamage,3,'unused block returns as attack');
const defense=solo();defense.enemies[0].special={id:'shield',goal:9999,block:20};const colorAgainstShield=['atk','pierce','splash'].map(k=>deltas(defense,k));
assert.equal(colorAgainstShield[0].monsterDamage,0);assert.equal(colorAgainstShield[1].monsterDamage,3);
const support=[];
for(const n of[2,4,6]){
 const base=party(n,'bard');base.magic=100;E.commitFighter(base);
 const a=outcome(clone(base)),b=clone(base);b.rng=()=>.5;const cast=E.castPower(b,'mending',{x:1});E.commitFighter(b);b.rng=E.makeRng(444);const z=outcome(b);
 support.push({heroes:n,spell:cast.name,oneMagicHealRoll:cast.total,totalAdditionalHeroHp:z.heroHp-a.heroHp});
 assert.equal(z.heroHp-a.heroHp,n*cast.total);
}
const rankOne=cards.filter(r=>r.rank===1&&r.start);
const dieGuard=f=>['guard','ward'].includes(f.v);
const roster=Object.entries(D.MONSTERS).map(([id,m])=>({id,oldMoveGuardProbability:m.faces.filter(dieGuard).length/m.faces.length,d4MoveGuardProbability:fourMoves(id,m).filter(dieGuard).length/4}));
const charging=solo();charging.magic=100;const chargeSchedule=[];
for(let round=1;round<=4;round++){assert.equal(charging.round,round);const cast=E.castPower(charging,'rally');assert.ok(cast);assert.equal(E.castPower(charging,'rally',{release:true}),null);chargeSchedule.push({round,charged:charging.charge.rally,sameRoundRelease:false});if(charging.phase==='reset')E.startRoll(charging);E.resolve(charging,{target:0});}
assert.equal(charging.round,5);assert.ok(E.castPower(charging,'rally',{release:true}));chargeSchedule.push({round:charging.round,released:true});
const report={release:true,chargeSchedule,scope:'Exact card arithmetic and controlled diagnostic states; not a new campaign balance table.',oldPointWeights:weights,cards,rankOneStarters:rankOne,findings:{soloPartyShield:{offTargetSplash:3,specialBlock:20,soloShieldDamage,partyShieldDamage,leakReproduced:soloShieldDamage>0,parity:soloShieldDamage===partyShieldDamage},counterstrike:{...counterDelta,oldToolWouldRecordForBlue:counterDelta.heroHp},shieldMarginals:colorAgainstShield,partyMending:support},ordinaryMoveGuardProbabilities:roster};
console.log(JSON.stringify(report,null,2));
