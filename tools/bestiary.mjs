// Prints the monster tables as markdown so docs/BESTIARY.md can never drift from js/data.js.
import { MONSTERS } from '../js/data.js';
const VERB = { strike: 'Strike', pierce: 'Pierce', guard: 'Guard', mend: 'Mend', charge: 'Wind-Up', howl: 'Howl', bind: 'Bind', drain: 'Drain', pilfer: 'Pilfer', summon: 'Summon' };
const fmt = (f, power) => {
  const lo = f.f + f.m, hi = f.f + f.m * power;
  const num = f.m || f.f ? (lo === hi ? `${lo}` : `${lo}–${hi}`) : '';
  const extra = f.k ? ` k=${f.k}` : '';
  return `${f.n} (${VERB[f.v]}${num ? ` ${num}` : ''}${extra})`;
};
for (const m of Object.values(MONSTERS)) {
  console.log(`#### ${m.glyph} ${m.name} — ${m.tier}`);
  console.log(`Base HP ${m.hp} · Power die d${m.power} · XP ${m.xp} · gold ${m.gold}${m.slam ? ` · Slam ${m.slam.f}+${m.slam.m}×power` : ''}${m.adds ? ` · calls ${MONSTERS[m.adds].name}` : ''}\n`);
  console.log('| d6 | Intention |\n|---|---|');
  m.faces.forEach((f, i) => console.log(`| ${i + 1} | ${fmt(f, m.power)} |`));
  if (m.rage) {
    console.log(`\n**${m.rage.name}** (at half health, power die becomes d${m.rage.power}):\n`);
    console.log('| d6 | Intention |\n|---|---|');
    m.rage.faces.forEach((f, i) => console.log(`| ${i + 1} | ${fmt(f, m.rage.power)} |`));
  }
  console.log('');
}
