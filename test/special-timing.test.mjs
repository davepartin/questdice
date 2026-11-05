import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SPECIALS } from '../js/data.js';
import { applyRelease } from '../js/release.js';
applyRelease();
function fight(id='ogre') {
  const h=E.newHero({name:'Rhythm',cls:'knight',seed:14});h.level=9;h.campaign.step=5;
  const b=E.newBattle(h,{id:'rhythm',kind:'elite',step:5,enemies:[id]},E.makeRng(14));
  b.hp=b.maxHp=99999;b.enemies[0].hp=b.enemies[0].maxHp=99999;return b;
}
function round(b,attack=0) {E.startRoll(b);for(const die of Object.values(b.board))die.v=1;b.mods.atk=attack;E.resolve(b);}

test('Slam timing follows real Wind-Up, Slam and Normal turns without changing battle state',()=>{
 const b=fight(),e=b.enemies[0];e.special.goal=99999;
 for(const phase of ['windup','slam','normal','windup']) {
  const before=JSON.stringify(e);const v=E.specialTiming(b,e);assert.equal(v.phase,phase);assert.equal(JSON.stringify(e),before);
  assert.equal(v.steps.filter(s=>s.current).length,1);
  assert.equal(v.steps.find(s=>s.current).label,{windup:'Wind-Up',slam:'Slam',normal:'Normal'}[phase]);
  if(phase==='normal'){assert.equal(v.active,false);assert.equal(v.next,'Wind-Up next round.');}
  round(b);
 }
});
test('interrupting Slam skips the big step and truthfully forecasts another Wind-Up',()=>{
 const b=fight(),e=b.enemies[0];e.special.goal=1;
 assert.equal(E.specialTiming(b,e).phase,'windup');assert.match(E.specialTiming(b,e).next,/unless interrupted/);
 round(b,100);assert.equal(E.specialTiming(b,e).phase,'normal');assert.equal(e.intent.double,undefined);
 assert.equal(E.specialTiming(b,e).next,'Wind-Up next round.');round(b);assert.equal(E.specialTiming(b,e).phase,'windup');
});
test('Inferno uses its own name in the shared cycle; the helper is read-only',()=>{
 const b=fight('vharaxis'),e=b.enemies[0];const before=JSON.stringify(e);
 const v=E.specialTiming(b,e);assert.equal(v.name,'Inferno');assert.deepEqual(v.steps.map(s=>s.label),['Wind-Up','Inferno','Normal']);assert.match(v.next,/Inferno next/);assert.equal(JSON.stringify(e),before);
});
test('summon limits count successful summons, not elapsed rounds, and respect the actual minion',()=>{
 const b=fight('lich'),e=b.enemies[0];
 let v=E.specialTiming(b,e);assert.equal(v.badge,'Every round');assert.equal(v.remaining,3);assert.match(v.line,/Bone Soldier/);
 e.special.spawned=1;v=E.specialTiming(b,e);assert.equal(v.remaining,2);assert.equal(v.active,true);
 e.special.spawned=3;v=E.specialTiming(b,e);assert.equal(v.remaining,0);assert.equal(v.active,false);assert.equal(v.phase,'spent');
 e.special.max=5;assert.equal(E.specialTiming(b,e).remaining,2);
});
test('constant, completed and conditional Specials communicate their real duration',()=>{
 const b=fight(),e=b.enemies[0];
 e.special={id:'regrow',goal:14};let v=E.specialTiming(b,e);assert.equal(v.badge,'Every round');assert.match(v.line,/14 damage or it heals 14/);
 e.special={id:'shield',goal:40,block:20};v=E.specialTiming(b,e);assert.equal(v.badge,'Until broken');assert.equal(v.active,true);
 e.special.broken=true;v=E.specialTiming(b,e);assert.equal(v.active,false);assert.equal(v.line,'Shield broken.');
 e.special={id:'bounty',left:2,gold:15};assert.equal(E.specialTiming(b,e).badge,'2 rounds left');e.special.left=1;assert.equal(E.specialTiming(b,e).badge,'1 round left');e.special.left=0;assert.equal(E.specialTiming(b,e).phase,'expired');
 e.special={id:'sleeping',awake:false};v=E.specialTiming(b,e);assert.equal(v.badge,'Until hit');assert.match(v.line,/Leave it alone/);e.special.awake=true;assert.equal(E.specialTiming(b,e).line,'Double attacks until defeated.');
});
test('timing reveals no Special for plain, fallen or disabled monsters',()=>{
 const b=fight(),e=b.enemies[0];const sp=e.special;e.special=null;assert.equal(E.specialTiming(b,e),null);e.special=sp;e.hp=0;assert.equal(E.specialTiming(b,e),null);e.hp=1;
 try{SPECIALS.on=false;assert.equal(E.specialTiming(b,e),null);}finally{SPECIALS.on=true;}
});
