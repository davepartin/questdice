import * as E from '../../js/engine.js';
import { applyRelease } from '../../js/release.js';

// An isolated playable idea: a fresh in-memory Ranger and the existing released battle rules.
applyRelease();
const app = document.querySelector('#app');
const defs = [
  { id:'aimed', name:'Aimed Shot', art:'assets/cards/magic/ranger-aimed.webp', type:'RANGER', tone:'attack', cost:'1–4', hint:'Choose your dice' },
  { id:'mark', name:"Hunter’s Mark", art:'assets/cards/magic/ranger-mark.webp', type:'RANGER', tone:'attack', cost:'2', hint:'Mark your target' },
  { id:'volley', name:'Volley', art:'assets/cards/magic/ranger-volley.webp', type:'RANGER', tone:'attack', cost:'1', hint:'Store or release' },
  { id:'potion', name:'Potion', art:'assets/cards/utilities/potion-belt.webp', type:'SUPPLIES', tone:'life', cost:'FREE', hint:'Choose a potion' },
  { id:'heal', name:'Heal', art:'assets/cards/utilities/heal.webp', type:'RESTORE', tone:'life', cost:'2', hint:'Restore health' },
  { id:'heart', name:'Heart Change', art:'assets/tutorial/board-start.webp', type:'HEART', tone:'magic', cost:'3', hint:'Turn your heart' },
];
const byId = id => defs.find(d=>d.id===id);
const pips = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
let hero,b,view='deck',selected=null,choice=null,aim=0,busy=false,notice='';
function init() {
 hero=E.newHero({name:'Ranger',cls:'ranger',seed:7});hero.potions=2;
 b=E.newBattle(hero,E.questsFor(hero)[0],E.makeRng(107));E.startRoll(b);
 b.magic=E.magicCapOf(hero);b.hp=Math.max(1,b.maxHp-12);b.board.C.v=4;b.charge={volley:1};b.aim=0;
 view='deck';selected=null;choice=null;aim=0;busy=false;notice='';render();
}
const power=id=>E.cardsOf(hero).find(k=>k.id===id);
const die=(v=6,extra='')=>`<span class="pip-die ${extra}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="${pips[v].includes(i)?'p':''}"></i>`).join('')}</span>`;
const triangle='<span class="tri" aria-hidden="true"></span>';
const status=()=>`<div class="tallies"><div class="tally magic">${triangle}<strong>${b.magic-(selected==='aimed'?aim:0)}</strong><span>/ ${E.magicCapOf(hero)} MAGIC</span></div><div class="tally life"><b>✚</b><strong>${b.hp}</strong><span>/ ${b.maxHp}</span></div></div>`;
function isUsed(d) { if(d.id==='heart')return E.nudgedThisRound(b);if(['aimed','mark'].includes(d.id))return E.powerState(b,power(d.id)).spent;return false; }
function miniature(d) {
 const extra=isUsed(d)?'<span class="mini-used">USED</span>':d.id==='potion'?`<span class="mini-count">${E.potionsLeft(b)} LEFT</span>`:'';
 return `<button class="mini ${d.tone}" data-open="${d.id}" aria-label="Open ${d.name}"><span class="mini-paper"></span><span class="mini-art" style="background-image:url('${d.art}')"></span><span class="mini-shade"></span><span class="mini-frame"></span><span class="mini-cost">${d.cost==='FREE'?'FREE':`${triangle}${d.cost}`}</span>${extra}<span class="mini-title">${d.name}</span><span class="mini-hint">${d.hint}</span></button>`;
}
function header(title,back) { return `<header class="top"><div><span class="eyebrow">RANGER · PLAYABLE PREVIEW</span><h1>${title}</h1></div><button class="close" data-nav="${back}">${back==='deck'?'‹ CARDS':'BATTLE ✕'}</button></header>`; }
function deck(){ return `<section class="screen deck-screen">${header('MAGICAL POWERS','battle')}${status()}<div class="deck-heading"><div><span class="tiny-star">✦</span><span>YOUR CARDS</span></div><span>Tap a card to play</span></div><div class="deck-grid">${defs.map(miniature).join('')}</div><div class="deck-foot"><span class="rule-line"></span><span>RANGER</span><span class="rule-line"></span></div><div class="result" role="status">${notice||'Your magic is in your hands.'}</div><button class="reset" data-reset>Reset preview</button></section>`; }
function frame(d,inner,useEnabled,useLabel='USE') {
 const n=d.cost==='FREE'?'FREE':`${triangle}${d.cost}`;
 return `<article class="large-card ${d.tone}" data-card="${d.id}"><div class="card-under"></div><div class="card-art" style="background-image:url('${d.art}')"></div><div class="card-frame"></div><div class="card-cost">${n}</div><div class="card-title">${d.name}</div><div class="card-panel"><div class="panel-head"><span>${d.type}</span><button class="use ${useEnabled?'ready':''}" data-use ${!useEnabled||busy?'disabled':''}>${useLabel} <b>›</b></button></div>${inner}</div></article>`;
}
function aimed() {
 const used=E.powerState(b,power('aimed')).spent, cap=Math.min(power('aimed').max,b.magic);
 return {body:`<div class="panel-copy"><b>DRAW YOUR SHOT</b><span>${used?'Used this round':'Tap a space to add a die'}</span></div><div class="slots aim-slots">${Array.from({length:4},(_,i)=>`<button class="die-slot ${i<aim?'filled':''}" data-aim="${i+1}" aria-pressed="${i<aim}" ${used||(i>=cap&&i>=aim)?'disabled':''} aria-label="${i<aim?'Remove':'Add'} die ${i+1}">${i<aim?die(6,'pierce'):`<span class="slot-magic">${triangle}</span>`}</button>`).join('')}</div><div class="card-summary">${aim?`${aim} ${aim===1?'die':'dice'} · ${triangle} ${aim} magic`:'1 magic per die'}</div><div class="hint-text">Your dice add pierce to this attack.</div>`,enabled:!used&&aim>0&&aim<=b.magic};
}
function mark() {const used=E.powerState(b,power('mark')).spent,ok=b.magic>=2&&!used;return {body:`<div class="panel-copy"><b>MARK YOUR TARGET</b><span>${used?'Used this round':'Tap the mark to prepare'}</span></div><button class="target-piece ${choice?'chosen':''}" data-choice="mark" ${!ok?'disabled':''} aria-pressed="${!!choice}"><span>⌖</span><b>+3</b><small>PIERCE</small></button><div class="card-summary">${triangle} 2 magic</div><div class="hint-text">+6 gold if your target falls this round.</div>`,enabled:!!choice&&ok};}
function volley() {const k=power('volley'),n=b.charge?.volley||0,st=E.powerState(b,k),releaseUsed=!!b.usedRound?.['volley:release'];const canLoad=!st.spent&&b.magic>=1&&n<k.max, canRelease=n>0&&!releaseUsed&&!b.usedRound?.volley;return {body:`<div class="panel-copy"><b>BUILD YOUR VOLLEY</b><span>Tap a space or a stored die</span></div><div class="slots volley-slots">${Array.from({length:4},(_,i)=>i<n?`<button class="die-slot filled ${choice==='release'?'selected':''}" data-choice="release" aria-pressed="${choice==='release'}" ${!canRelease?'disabled':''} aria-label="Choose to release stored dice">${die(6,'pierce')}</button>`:`<button class="die-slot ${choice==='charge'&&i===n?'selected':''}" data-choice="charge" aria-pressed="${choice==='charge'}" ${!canLoad||i!==n?'disabled':''} aria-label="Choose to charge one die"><span class="slot-magic">${triangle}</span></button>`).join('')}</div><div class="card-summary">${choice==='charge'?`${triangle} 1 magic · add 1` : choice==='release'?`Release ${n} · +${E.chargeGain(k,n,0).pierce} pierce`:`${n} stored · charge or release`}</div><div class="hint-text">Charge or release once per round.</div>`,enabled:(choice==='charge'&&canLoad)||(choice==='release'&&canRelease)};}
function potion() {const n=E.potionsLeft(b),hp=E.potionHpOf(hero),can=b.hp<b.maxHp;return {body:`<div class="panel-copy"><b>YOUR POTIONS</b><span>${n?'Choose a bottle':'No potions left'}</span></div><div class="potion-grid">${Array.from({length:5},(_,i)=>`<button class="potion-slot ${i>=n?'empty':''} ${choice===i?'selected':''}" data-potion="${i}" aria-pressed="${choice===i}" ${i>=n||!can?'disabled':''} aria-label="${i<n?`Potion ${i+1}, restores ${hp} health`:'Empty potion space'}">${i<n?`<span class="potion-chit"><img src="assets/cards/utilities/potion-printed.webp" alt=""><b>+${hp}</b></span>`:''}</button>`).join('')}</div><div class="hint-text">${can?'Tap a bottle, then use it.':'Your health is full.'}</div>`,enabled:Number.isInteger(choice)&&choice<n&&can};}
function heal(){const can=b.magic>=2&&b.hp<b.maxHp;return {body:`<div class="panel-copy"><b>HEALING MAGIC</b><span>${can?'Touch the exchange to prepare':'Need magic or missing health'}</span></div><button class="exchange ${choice?'selected':''}" data-choice="heal" ${!can?'disabled':''} aria-pressed="${!!choice}"><span class="exchange-magic">${triangle} ${triangle}</span><span class="exchange-arrow">→</span><span class="exchange-life">✚ ✚ ✚</span></button><div class="card-summary">${triangle} 2 magic → ✚ 3 health</div><div class="hint-text">Use whenever you have the magic.</div>`,enabled:!!choice&&can};}
function heart(){const v=b.board.C.v,used=E.nudgedThisRound(b),can=b.magic>=3&&!used;return {body:`<div class="panel-copy"><b>TURN YOUR HEART</b><span>${used?'Used this round':'Choose a new face'}</span></div><div class="heart-choices"><button data-heart="-1" aria-pressed="${choice===-1}" class="heart-face ${choice===-1?'selected':''}" ${!can||v<=1?'disabled':''} aria-label="Turn heart down to ${v-1}"><small>▼</small><b>${Math.max(1,v-1)}</b></button><div class="heart-current"><small>NOW</small><b>${v}</b></div><button data-heart="1" aria-pressed="${choice===1}" class="heart-face ${choice===1?'selected':''}" ${!can||v>=6?'disabled':''} aria-label="Turn heart up to ${v+1}"><small>▲</small><b>${Math.min(6,v+1)}</b></button></div><div class="card-summary">${triangle} 3 magic · once per round</div><div class="hint-text">Choose a direction, then use.</div>`,enabled:!!choice&&can};}
function detail(){const d=byId(selected),content=({aimed,mark,volley,potion,heal,heart})[d.id]();return `<section class="screen detail-screen">${header('MAGICAL POWERS','deck')}${status()}<div class="detail-stage">${frame(d,content.body,content.enabled)}</div><div class="detail-foot">Tap the card to prepare · Use to play</div></section>`;}
function battle(){return `<section class="screen battle-screen"><div class="battle-top"><span>☰</span><span>ROUND I</span><span>✦ ${b.magic}</span></div><div class="battle-scene"><div class="enemy-shadow"><img src="assets/miniatures/ogre.webp" alt="Hill Ogre"></div><div class="enemy-name">HILL OGRE</div><div class="hero-shadow"><img src="assets/miniatures/ranger.webp" alt="Ranger"></div><div class="hero-name">RANGER</div></div>${status()}<div class="battle-bottom"><div class="battle-label">PREVIEW BATTLE · POWERS ONLY</div><button class="battle-magic" data-nav="deck">${triangle} MAGIC POWERS</button><button class="reset" data-reset>Reset preview</button></div></section>`;}
function render(){app.innerHTML=view==='deck'?deck():view==='detail'?detail():battle();}
function open(id, source){
 const origin=source?.getBoundingClientRect();selected=id;view='detail';choice=null;aim=0;notice='';render();
 const card=app.querySelector('.large-card');
 if(origin&&card&&typeof card.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const end=card.getBoundingClientRect(),scale=origin.width/end.width,dx=(origin.left+origin.width/2)-(end.left+end.width/2),dy=(origin.top+origin.height/2)-(end.top+end.height/2);card.style.animation='none';card.animate([{transform:`translate(${dx}px, ${dy}px) scale(${scale})`,opacity:.7},{transform:'translate(0, 0) scale(1)',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'});}
}
async function use(){if(busy)return;busy=true;let result=null;
 if(selected==='aimed'&&aim>0){const n=aim;result=E.castPower(b,'aimed',{x:n});notice=result?`Aimed Shot · ${result.rolls.join(' + ')} = ${result.total} pierce`:'';}
 else if(selected==='mark'&&choice){result=E.castPower(b,'mark');notice=result?'Hunter’s Mark · +3 pierce':'';}
 else if(selected==='volley'&&choice){const action=choice;result=E.castPower(b,'volley',action==='release'?{release:true}:{});notice=result?(action==='charge'?'Volley · 1 die stored':`Volley · +${result.total} pierce`):'';}
 else if(selected==='potion'&&Number.isInteger(choice)){const piece=app.querySelector(`[data-potion="${choice}"] .potion-chit`);if(piece){piece.classList.add('departing');await new Promise(r=>setTimeout(r,420));}const before=b.hp;result=E.drinkPotion(b);notice=result?`Potion · +${b.hp-before} health`:'';}
 else if(selected==='heal'&&choice){const before=b.hp;result=E.healSpend(b);notice=result?`Heal · +${b.hp-before} health`:'';}
 else if(selected==='heart'&&choice){result=E.nudge(b,choice);notice=result?`Heart Change · now ${b.board.C.v}`:'';}
 busy=false;if(result){selected=null;choice=null;aim=0;view='deck';}else notice='That action is not available.';render();
}
app.addEventListener('click',event=>{const el=event.target.closest('button');if(!el||el.disabled||busy)return;if(el.hasAttribute('data-open'))return open(el.dataset.open,el);if(el.hasAttribute('data-reset'))return init();if(el.dataset.nav){view=el.dataset.nav;selected=null;choice=null;aim=0;notice='';return render();}if(el.dataset.aim){const n=Number(el.dataset.aim);aim=n<=aim?n-1:n;return render();}if(el.dataset.potion!=null){const n=Number(el.dataset.potion);choice=choice===n?null:n;return render();}if(el.dataset.heart){choice=Number(el.dataset.heart);return render();}if(el.dataset.choice){choice=choice===el.dataset.choice?null:el.dataset.choice;return render();}if(el.hasAttribute('data-use'))return use();});
init();
