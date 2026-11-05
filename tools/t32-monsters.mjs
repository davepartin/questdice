// D4 roster audit: exact raw-damage expectations (before guard, flat bonuses, Specials).
// Complements matched campaigns; these numbers alone cannot value control or defensive moves.
import { MONSTERS } from '../js/data.js';
import { MONSTER_D4, fourMoves, signatureSpecial } from '../js/monster-d4.js';
MONSTER_D4.on = true;
const damage = new Set(['strike','pierce','drain','pilfer','breath']);
const ev = (faces, size) => faces.reduce((a,f)=>a+(damage.has(f.v)?f.f+f.m*(size+1)/2:0),0)/faces.length;
console.log('| Monster | 1 | 2 | 3 | 4 | Special | Raw D6 → D4 |');
console.log('|---|---|---|---|---|---|---|');
for(const [id,m] of Object.entries(MONSTERS)) {
  const faces=fourMoves(id,m), special=signatureSpecial(id);
  console.log(`| ${m.name} | ${faces.map(f=>f.n).join(' | ')} | ${special?.name || 'Fight Special'} | ${ev(m.faces,m.power).toFixed(2)} → ${ev(faces,m.power).toFixed(2)} |`);
}
