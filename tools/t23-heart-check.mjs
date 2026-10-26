// T23 matched encounter diagnostic. Real release rules; heuristic policies, not human win rates.
// RELEASE=1 node tools/t23-heart-check.mjs [seeds=3] > docs/team/tasks/T23-results.json
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { applyRelease } from '../js/release.js';
import { smartActs } from './sim.mjs';
applyRelease(); E.useHeartUpgrades();
const mid = JSON.parse(fs.readFileSync(new URL('../docs/team/tasks/T19/fixtures/mid-act2.json',import.meta.url)));
const late = JSON.parse(fs.readFileSync(new URL('../docs/team/tasks/T19/fixtures/strong-step8.json',import.meta.url)));
const seeds=+(process.argv[2] || 3); const rows=[];
function score(b, board, policy) {
 const v=E.evaluate(b.hero,board,{hushed:b.hushedNow});
 const basic=v.atk+v.pierce+Math.min(v.block,20)*0.9+Math.min(v.heal,b.maxHp-b.hp)*0.8+v.magic*0.6+v.gold*0.2;
 return basic+(policy==='ordinary'?0:policy==='magic'?v.magic*3:policy==='heal'?v.heal*3+v.magic*2:v.gold*4);
}
function shape(b,policy) {
 for(let a=0;a<3;a++) {
  const info=E.rerollInfo(b); if(info.kind==='none')break;
  const base=score(b,b.board,policy); const options=[];
  for(const s of E.activeSlots(b.hero)) {
   if(!E.canReroll(b,[s]))continue;
   let expected=0; const sides=E.sidesOf(b.hero,s);
   for(let v=1;v<=sides;v++)expected+=score(b,{...b.board,[s]:{v}},policy)/sides;
   options.push({s,gain:expected-base-info.perDie*1.5});
  }
  const slots=options.sort((a,b)=>b.gain-a.gain).filter(x=>x.gain>0.8).slice(0,Math.min(info.dice,info.perDie?Math.floor(b.magic/info.perDie):info.dice)).map(x=>x.s);
  if(!slots.length || !E.reroll(b,slots))break;
 }
 // One legal adjacent turn, at the actual three-magic price. Hush and once/round enforced by engine.
 let best=null; const base=score(b,b.board,policy);
 for(const dir of [-1,1]) {const v=b.board.C.v+dir;if(v<1||v>6)continue;const gain=score(b,{...b.board,C:{...b.board.C,v}},policy)-base;if(gain>4.5&&(!best||gain>best.gain))best={dir,gain};}
 if(best)E.nudge(b,best.dir);
 if(policy==='heal'||policy==='magic')while(b.hp<b.maxHp&&E.healSpend(b)){}
 return smartActs(b);
}
for(const cls of ['knight','ranger','wizard'])for(const stage of ['early','mid','late'])for(const count of [1,2,4,6])for(const policy of ['ordinary','magic','heal','gold'])for(let seed=0;seed<seeds;seed++)for(const rank of [1,2,3]) {
 const original=stage==='early'?E.newHero({name:cls,cls,seed:700+seed}):stage==='mid'?mid[cls].filter(Boolean)[seed%mid[cls].filter(Boolean).length]:late[Object.keys(late).filter(k=>k.startsWith(cls+':')&&late[k])[seed%Object.keys(late).filter(k=>k.startsWith(cls+':')&&late[k]).length]];
 const hs=Array.from({length:count},(_,i)=>{const h=structuredClone(original);h.name=cls+i;h.heartRank=rank;h.difficulty='normal';h.campaign.act=stage==='early'?1:stage==='mid'?2:3;h.campaign.step=stage==='early'?2:10;h.campaign.nemeses=[];h.campaign.nextEnemies=null;return h;});
 const rng=E.makeRng(93000+seed);const q=E.questsFor(hs[0])[0];const party=count>1;
 const b=party?E.newPartyBattle(hs,q,rng):E.newBattle(hs[0],q,rng);
 const r={cls,stage,count,policy,seed,rank,counterfactual:stage==='early'&&rank>1||stage==='mid'&&rank>2,earned:0,overflow:0,spent:0,turnSpent:0,healSpent:0,magicHealing:0,directHealing:0,overheal:0,blocked:0,dealt:0,gold:0,rounds:0,bossOnlyRounds:0,falls:0};
 E.CAST_HOOK.magic=(x,kind,n)=>{r.spent+=n;if(kind==='nudge')r.turnSpent+=n;if(kind==='heal'){r.healSpent+=n;r.magicHealing+=Math.min(E.healAmountOf(x.hero),x.maxHp-x.hp);}};
 E.CAST_HOOK.on=(x,cast)=>{r.spent+=cast.cost||0;};
 E.CAST_HOOK.income=(x,inc)=>{r.earned+=inc.earned;r.overflow+=inc.over;};
 for(let guard=0;!b.outcome&&guard<80;guard++) {
  r.rounds++;const living=b.enemies.filter(e=>e.hp>0);if(living.length===1&&living[0].tier==='boss')r.bossOnlyRounds++;
  if(party) {
   for(let i=0;i<count;i++){if(!E.startFighter(b,i))continue;const opts=shape(b,policy);E.commitFighter(b);Object.assign(b.fighters[i],opts,{locked:true});}
   const before=b.fighters.map(f=>({magic:f.magic,hp:f.hp}));E.resolveParty(b);
   b.fighters.forEach((f,i)=>{if(!f.T)return;const taken=b.report.fighters.find(x=>x.name===f.hero.name);r.earned+=f.T.magic;r.overflow+=Math.max(0,before[i].magic+f.T.magic-(b.report.fighters[0]?.name===f.hero.name?(b.report.magicStolen||0):0)-E.magicCapOf(f.hero));r.directHealing+=taken?.healed||0;r.overheal+=Math.max(0,f.T.heal-(taken?.healed||0));r.blocked+=taken?.absorbed||0;r.dealt+=f._dealt||0;r.gold+=taken?.gold||0;f.locked=false;});
  } else {
   E.startRoll(b);const opts=shape(b,policy);const direct=E.evaluate(b.hero,b.board).heal+(b.mods.heal||0);E.resolve(b,opts);const rep=b.report;r.directHealing+=rep.healed||0;r.overheal+=Math.max(0,direct-(rep.healed||0));r.blocked+=rep.absorbed||0;r.gold+=rep.T.gold||0;
  }
 }
 const fighters=party?b.fighters:[b];r.falls=fighters.filter(f=>f.hp<=0).length;r.outcome=b.outcome||'timeout';r.hp=fighters.map(f=>f.hp);if(!party)r.dealt=b.stats.dealt||0;
 rows.push(r);
}
console.log(JSON.stringify({note:'Matched existing Normal encounter smoke checks, heuristic legal rerolls/turns. Ranks above act gate are diagnostic only. Cloned equal parties; no campaign economy or confidence estimate. Not proof of absence of sustain exploits.',seeds,rows},null,2));
