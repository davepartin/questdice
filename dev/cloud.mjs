// Two phones, one live Firebase room: host opens, friend joins, both ready, start, road, quest, roll, lock.
//   node dev/serve.mjs 8135 &  then  node dev/cloud.mjs
import { chromium } from 'playwright-core';
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-quic', '--disable-http2'], proxy });
const phone = async (who) => {
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log(who, m.type(), m.text().slice(0, 300)); });
  p.on('pageerror', (e) => console.log(who, 'ERR', e.message));
  await p.goto('http://localhost:8135/dev/viewer.html');
  await p.evaluate(async () => { window.N = await import('/js/net.js'); window.seen = []; });
  return p;
};
const A = await phone('host'); const B = await phone('friend');
const run = (p, f, arg) => p.evaluate(f, arg).catch((e) => ({ error: String(e.message || e) }));
console.log('cloud?', await run(A, () => N.isCloud()));
const made = await run(A, () => N.createSeat({ name: 'Dave', cls: 'knight', table: 'Test Company' }).then((d) => ({ code: d.code, phase: d.view.phase, links: d.view.links })).catch((e) => ({ error: e.message })));
console.log('host', made);
if (made.error) { await b.close(); process.exit(1); }
await run(A, () => N.connect((v) => window.seen.push(`${v.seq}:${v.phase}:${v.players.length}`)));
const joined = await run(B, (code) => N.joinSeat({ code, name: 'Abby', cls: 'bard' }).then((d) => ({ players: d.view.players.map((p) => p.name) })).catch((e) => ({ error: e.message })), made.code);
console.log('friend', joined);
await run(B, () => N.connect((v) => window.seen.push(`${v.seq}:${v.phase}`)));
const act = async (p, cmd, who) => { const r = await run(p, (c) => N.send(c).then((d) => ({ phase: d.view.phase, seq: d.view.seq, stage: d.view.battle?.me?.stage })).catch((e) => ({ error: e.message })), cmd); console.log(who, cmd.type, JSON.stringify(r)); return r; };
await act(A, { type: 'ready' }, 'host'); await act(B, { type: 'ready' }, 'friend');
await act(B, { type: 'start' }, 'friend (should refuse)');
await act(A, { type: 'start' }, 'host');
const road = await run(A, () => N.snapshot().then((v) => v.road));
await act(B, { type: 'choose', id: road.choices[0].id }, 'friend');
await act(A, { type: 'onward' }, 'host'); await act(B, { type: 'onward' }, 'friend');
const quest = await run(A, () => N.snapshot().then((v) => v.board.quests[0].id));
await act(A, { type: 'quest', id: quest }, 'host');
// Both roll at the same moment: the transactions must both land.
await Promise.all([act(A, { type: 'roll' }, 'host'), act(B, { type: 'roll' }, 'friend')]);
await Promise.all([act(A, { type: 'lock', target: 0 }, 'host'), act(B, { type: 'lock', target: 0 }, 'friend')]);
await new Promise((r) => setTimeout(r, 2500));
const after = await run(B, () => N.snapshot().then((v) => ({ round: v.battle?.round, foes: v.battle?.enemies.map((e) => `${e.name} ${e.hp}/${e.maxHp}`), strikes: v.battle?.report?.strikes?.map((s) => s.name) })));
console.log('after round 1', JSON.stringify(after));
console.log('host heard', (await run(A, () => window.seen)).join(' '));
console.log('friend heard', (await run(B, () => window.seen)).join(' '));
// A stranger cannot write into a running table.
const C = await phone('stranger');
console.log('stranger join mid-game', JSON.stringify(await run(C, (code) => N.joinSeat({ code, name: 'Eve', cls: 'knight' }).then(() => 'joined?!').catch((e) => e.message), made.code)));
console.log('CODE', made.code);
await b.close();
