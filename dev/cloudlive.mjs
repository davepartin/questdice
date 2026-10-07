// LIVE test against the real questdice-eef50 project: two phones, one room, using the game's own js/cloud.js.
// It writes a small test room to Firestore. Needs the npm Firebase SDK in some folder:
//   mkdir /tmp/fb && cd /tmp/fb && npm init -y && npm i firebase@10.12.2
//   cp <repo>/dev/cloudlive.mjs . && node cloudlive.mjs <repo>      (behind a proxy: NODE_USE_ENV_PROXY=1)
import * as A from 'firebase/app'; import * as U from 'firebase/auth'; import * as F from 'firebase/firestore';
const repo = process.argv[2];
const load = async (tag) => { const m = await import(`${repo}/js/cloud.js?${tag}`); m.useSdk([A, U, F], tag); return m; };
const host = await load('host'); const friend = await load('friend'); const stranger = await load('stranger');
const t0 = Date.now(); const ms = () => `${Date.now() - t0}ms`;
const show = (who, what, r) => console.log(ms(), who, what, JSON.stringify(r));
const made = await host.createSeat({ name: 'Dave', cls: 'knight', table: 'Test Company' });
show('host', 'created', { code: made.code, phase: made.view.phase, links: made.view.links });
const heard = { host: [], friend: [] };
host.connect(made.code, (v) => heard.host.push(`${v.seq}:${v.phase}:${v.players.length}`));
const j = await friend.joinSeat({ code: made.code.toLowerCase(), name: 'Abby', cls: 'bard' });
show('friend', 'joined', j.view.players.map((p) => p.name));
const again = await friend.joinSeat({ code: made.code, name: 'Abby', cls: 'bard' });
show('friend', 'rejoined (same seat?)', again.view.players.length);
friend.connect(made.code, (v) => heard.friend.push(`${v.seq}:${v.phase}`));
const act = async (m, who, cmd) => { try { const r = await m.send(made.code, cmd); show(who, cmd.type, { phase: r.view.phase, seq: r.view.seq, stage: r.view.battle?.me?.stage }); return r; } catch (e) { show(who, cmd.type, { refused: e.message }); return null; } };
await act(host, 'host', { type: 'ready' }); await act(friend, 'friend', { type: 'ready' });
await act(friend, 'friend', { type: 'start' });
const road = (await act(host, 'host', { type: 'start' })).view.road;
await act(friend, 'friend', { type: 'choose', id: road.choices[0].id });
const on = await Promise.all([act(host, 'host', { type: 'onward' }), act(friend, 'friend', { type: 'onward' })]);
const quest = on.map((r) => r.view).sort((a, b) => b.seq - a.seq)[0].board.quests[0];
await act(host, 'host', { type: 'quest', id: quest.id });
await Promise.all([act(host, 'host', { type: 'roll' }), act(friend, 'friend', { type: 'roll' })]);
const locks = await Promise.all([act(host, 'host', { type: 'lock', target: 0 }), act(friend, 'friend', { type: 'lock', target: 0 })]);
const v = locks.map((r) => r.view).sort((a, b) => b.seq - a.seq)[0];
show('friend', 'after round 1', { round: v.battle?.round, foes: v.battle?.enemies.map((e) => `${e.name} ${e.hp}/${e.maxHp}`), strikes: v.battle?.report?.strikes?.map((s) => s.name) });
try { await stranger.joinSeat({ code: made.code, name: 'Eve', cls: 'knight' }); show('stranger', 'joined mid-game?!', 'BAD'); } catch (e) { show('stranger', 'join mid-game refused', e.message); }
try { await stranger.send(made.code, { type: 'roll' }); show('stranger', 'acted?!', 'BAD'); } catch (e) { show('stranger', 'act refused', e.message); }
await new Promise((r) => setTimeout(r, 1500));
console.log('host heard', heard.host.join(' ')); console.log('friend heard', heard.friend.join(' '));
host.disconnect(); friend.disconnect();
console.log('CODE', made.code);
process.exit(0);
