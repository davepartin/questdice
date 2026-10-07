#!/bin/sh
# Run tools/progress.mjs for every class in parallel and print one merged table.
#   sh tools/progress-all.sh [acts=2] [campaigns per class=2] [policy=smart]
ACTS=${1:-2}; N=${2:-2}; POL=${3:-smart}; D=$(mktemp -d)
for c in knight ranger wizard dwarf bard; do SIM_SAMPLES=${SIM_SAMPLES:-5} TRIALS=${TRIALS:-6} OUT=$D/$c.json node tools/progress.mjs $ACTS $N $POL $c & done; wait
node --input-type=module -e "
import fs from 'fs'; const D='$D';
const files=fs.readdirSync(D).map(f=>JSON.parse(fs.readFileSync(D+'/'+f)));
const agg={}; let clears=0,total=0;
for(const r of files){clears+=r.clears;total+=r.total;for(const[k,A]of Object.entries(r.agg)){const T=(agg[k]||={kind:A.kind});for(const[f,v]of Object.entries(A))if(typeof v==='number')T[f]=(T[f]||0)+v;}}
console.log('policy $POL, $ACTS act(s): cleared '+clears+'/'+total);
console.log('step   kind    steady win  rounds  hp | perilous win  rounds  hp | took P | lvl  gold  str  wpn  dmg/rd | danger S/P');
for(const[k,A]of Object.entries(agg).sort(([a],[b])=>a<b?-1:1)){const f=(x,d=0)=>(x/A.n).toFixed(d);
console.log(k+'  '+A.kind.padEnd(6)+'  '+(100*A.sw/A.n).toFixed(0).padStart(5)+'%  '+f(A.sr,1).padStart(6)+' '+(100*A.shp/A.n).toFixed(0).padStart(3)+'% | '+(A.pw?(100*A.pw/A.n).toFixed(0).padStart(9)+'%':'        - ')+'  '+(A.pw?f(A.pr,1).padStart(6):'     -')+' '+(A.pw?(100*A.php/A.n).toFixed(0).padStart(3)+'%':'   -')+' | '+(100*A.took/A.n).toFixed(0).padStart(5)+'% | '+f(A.lvl,1).padStart(4)+' '+f(A.gold).padStart(5)+' '+f(A.str,1).padStart(4)+' '+f(A.wpn,1).padStart(4)+' '+f(A.pow,1).padStart(6)+' | '+f(A.sd,2)+' / '+(A.pd?f(A.pd,2):'-'));}
"
node --input-type=module -e "
import fs from 'fs'; const D='$D'; const P=[]; for (const f of fs.readdirSync(D)) P.push(...(JSON.parse(fs.readFileSync(D+'/'+f)).pairs||[]));
const bins=[0,0.15,0.25,0.35,0.45,0.55,0.7,0.9,1.2,9]; console.log('danger score -> bot win rate');
for (let i=0;i<bins.length-1;i++){const s=P.filter(([d])=>d>=bins[i]&&d<bins[i+1]); if(s.length) console.log(('  '+bins[i]+'-'+bins[i+1]).padEnd(14), (100*s.reduce((a,[,w])=>a+w,0)/s.length).toFixed(0)+'%', ' n='+s.length);}
"
rm -rf $D
