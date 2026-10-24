globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}};globalThis.window=globalThis;
const R=await import('../../../../js/release.js'); R.applyRelease?.();
const E=await import('../../../../js/engine.js'); const D=await import('../../../../js/data.js');
const k=f=>JSON.stringify([f.c,f.v,f.plus||0,f.arrow||'',f.fx||{}]);
const ids=Object.keys(D.WEAPONS).filter(id=>!D.WEAPONS[id].retired);
for(const id of ids){for(const r of [0,1,2]){let prev=null,out=[];for(const s of [4,6,8,10]){let w;try{w=E.makeWeapon(id,r);w.size=s;}catch(e){continue}const f=E.weaponFaces(w);if(prev){const ch=f.slice(0,prev.length).map((x,i)=>k(x)!==k(prev[i])?i+1:0).filter(Boolean);out.push(`d${s}:${ch.length?'changed '+ch.join(','):'keeps'}`)}prev=f}console.log(id,['B','S','G'][r],out.join(' '))}}
