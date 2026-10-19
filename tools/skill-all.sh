#!/bin/sh
# tools/skill.mjs for every class in parallel, one merged table: win rate by play style at every step, and an act summary.
#   SKILL=legendary sh tools/skill-all.sh [acts=3] [campaigns per class=2]      (PACK=starfall: a writer's campaign instead of the Dawn Lantern)
ACTS=${1:-3}; N=${2:-2}; D=$(mktemp -d)
for c in knight ranger wizard dwarf bard; do SIM_SAMPLES=${SIM_SAMPLES:-5} OUT=$D/$c.json node tools/skill.mjs $ACTS $N $c & done; wait
node --input-type=module -e "
import fs from 'fs'; const D='$D'; const R=fs.readdirSync(D).map(f=>JSON.parse(fs.readFileSync(D+'/'+f)));
const S=R[0].styles; const agg={}; let clears=0,total=0,retries=0;
for(const r of R){clears+=r.clears;total+=r.total;retries+=r.retries;for(const[k,A]of Object.entries(r.steps)){const T=(agg[k]||={kind:A.kind});for(const[f,v]of Object.entries(A))if(typeof v==='number')T[f]=(T[f]||0)+v;}}
console.log('difficulty ${SKILL:-normal}, driver ${DRIVER:-wise}: campaigns cleared '+clears+'/'+total+', retreats '+retries);
console.log('step   kind    '+S.map(s=>(s+' win').padStart(10)+'  hp').join('   '));
const keys=Object.keys(agg).sort(); const pct=(x)=>(100*x).toFixed(0).padStart(4)+'%';
for(const k of keys){const A=agg[k];console.log(k+'  '+A.kind.padEnd(6)+'  '+S.map(s=>'    '+pct(A['w_'+s]/A.n)+'   '+pct(A['h_'+s]/A.n)).join('   ')+(A.fell?'   fell '+A.fell:''));}
console.log('\\nact  ' + S.map(s=>(s+': fights / elite / boss').padStart(28)).join(' '));
for(const act of ['1','2','3']){const ks=keys.filter(k=>k.startsWith(act+'.'));if(!ks.length)continue;
 const avg=(f,s)=>{const z=ks.filter(f);const n=z.reduce((a,k)=>a+agg[k].n,0);return n?z.reduce((a,k)=>a+agg[k]['w_'+s],0)/n:NaN;};
 console.log(act+'    '+S.map(s=>{const o=avg(k=>agg[k].kind==='battle',s),e=avg(k=>agg[k].kind==='elite',s),b=avg(k=>agg[k].kind==='boss',s);return (pct(o)+' / '+pct(e)+' / '+pct(b)).padStart(28);}).join(' '));}
"
rm -rf $D
