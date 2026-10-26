import test from 'node:test';
import os from 'node:os';
import assert from 'node:assert/strict';
import { start } from '../server.mjs';
import * as E from '../js/engine.js';
import { loadTable } from '../js/table.js';

async function post(port, body) {
  const res = await fetch(`http://127.0.0.1:${port}/api/room`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

test('LAN camp purchases use released rules, persist on the wire and reject duplicate or foreign upgrades', async () => {
  const server = await start(0); const port = server.address().port;
  try {
    const hero = E.newHero({ name: 'Sizer', cls: 'wizard', seed: 5 }); hero.gold = 350;
    const host = (await post(port, { op: 'create', name: hero.name, cls: hero.cls, hero })).data;
    const friend = (await post(port, { op: 'join', code: host.code, name: 'Friend', cls: 'knight' })).data;
    const act = async (token, cmd) => post(port, { op: 'act', code: host.code, token, cmd });
    for (const token of [host.token, friend.token]) await act(token, { type: 'ready' });
    let answer = await act(host.token, { type: 'start' });
    const choice = answer.data.view.road.choices[0].id;
    await act(host.token, { type: 'choose', id: choice });
    for (const token of [host.token, friend.token]) await act(token, { type: 'onward' });
    answer = await act(host.token, { type: 'camp' }); assert.equal(answer.data.view.phase, 'camp');
    const uid = hero.loadout.NW.uid;
    const upgrade = (size) => ({ type: 'op', op: 'trainWeapon', args: [uid, size] });
    assert.equal((await act(friend.token, upgrade(6))).status, 400);
    for (const [size, gold] of [[6, 300], [8, 200], [10, 0]]) {
      answer = await act(host.token, upgrade(size)); assert.equal(answer.status, 200);
      const table = loadTable(answer.data.view.state); const h = table.players.find((p) => p.name === hero.name).hero;
      assert.equal(h.gold, gold); assert.equal(E.sidesOf(h, 'NW'), size); assert.equal(h.strength.W, 4);
      assert.equal((await act(host.token, upgrade(size))).status, 400, 'a repeated request cannot buy the next step');
    }
    const table = loadTable(answer.data.view.state); const h = table.players.find((p) => p.name === hero.name).hero;
    assert.equal(E.sellValue(h.loadout.NW), 184);
  } finally { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); }
});

test('two phones can sit, and a lock stays private on the wire', async () => {
  const server = await start(0);
  const port = server.address().port;
  try {
    const host = await post(port, { op: 'create', name: 'Ada', cls: 'knight', table: 'Ash' });
    assert.equal(host.status, 200);
    assert.match(host.data.code, /^[A-Z0-9]{4}$/);
    assert.equal(host.data.view.phase, 'lobby');
    assert.equal(JSON.stringify(host.data.view).includes(host.data.token), false);

    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /own phone/);

    const friend = await post(port, { op: 'join', code: host.data.code, name: 'Bea', cls: 'bard' });
    assert.equal(friend.status, 200);
    assert.equal(friend.data.token === host.data.token, false);

    const events = await fetch(`http://127.0.0.1:${port}/api/room/${host.data.code}/events?token=${host.data.token}`);
    const reader = events.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /"phase":"lobby"/);
    await reader.cancel();

    assert.equal((await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'ready' } })).data.ok, true);
    assert.equal((await post(port, { op: 'act', code: host.data.code, token: friend.data.token, cmd: { type: 'ready' } })).data.ok, true);
    const started = await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'start' } });
    assert.equal(started.data.view.phase, 'road');
    const choice = started.data.view.road.choices[0].id;
    await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'choose', id: choice } });
    await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'onward' } });
    const board = await post(port, { op: 'act', code: host.data.code, token: friend.data.token, cmd: { type: 'onward' } });
    assert.equal(board.data.view.phase, 'board');
    const quest = board.data.view.board.quests[0].id;
    await post(port, { op: 'act', code: host.data.code, token: friend.data.token, cmd: { type: 'quest', id: quest } });
    for (const t of [host.data.token, friend.data.token]) await post(port, { op: 'act', code: host.data.code, token: t, cmd: { type: 'envelope' } }); // secret objectives first
    const rolled = await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'roll' } });
    assert.equal(rolled.data.view.battle.me.stage, 'shape');
    assert.ok(rolled.data.view.battle.me.board);
    const peek = await fetch(`http://127.0.0.1:${port}/api/room/${host.data.code}?token=${friend.data.token}`);
    const bea = await peek.json();
    assert.equal(bea.battle.me.board, null);
    assert.equal(JSON.stringify(bea).includes(JSON.stringify(rolled.data.view.battle.me.board)), false);
    assert.equal(bea.battle.enemies[0].intent.v, rolled.data.view.battle.enemies[0].intent.v);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('a hero takes their seat back from a new phone after the game has started', async () => {
  const server = await start(0);
  const port = server.address().port;
  try {
    const host = await post(port, { op: 'create', name: 'WizKid', cls: 'wizard', table: 'Cheese' });
    const friend = await post(port, { op: 'join', code: host.data.code, name: 'Smalls', cls: 'dwarf' });
    for (const t of [host.data.token, friend.data.token]) await post(port, { op: 'act', code: host.data.code, token: t, cmd: { type: 'ready' } });
    await post(port, { op: 'act', code: host.data.code, token: host.data.token, cmd: { type: 'start' } });
    const stranger = await post(port, { op: 'join', code: host.data.code, name: 'Smalls', cls: 'dwarf' });
    assert.equal(stranger.status, 400); assert.match(stranger.data.error, /Cloud save/);
    const back = await post(port, { op: 'join', code: host.data.code, name: 'Smalls', cls: 'dwarf', reclaim: true });
    assert.equal(back.status, 200); assert.equal(back.data.playerId, friend.data.playerId);
    const look = async (token) => (await fetch(`http://127.0.0.1:${port}/api/room/${host.data.code}?token=${encodeURIComponent(token)}`)).json();
    assert.equal((await look(back.data.token)).you?.name, 'Smalls', 'the new phone holds the seat');
    assert.notEqual((await look(friend.data.token)).you?.name, 'Smalls', 'the old phone no longer does');
  } finally { server.close(); }
});


test('a room still opens when the host cannot enumerate LAN interfaces', async (t) => {
  t.mock.method(os, 'networkInterfaces', () => { throw new Error('Interfaces unavailable'); });
  const server = await start(0);
  try {
    const host = await post(server.address().port, { op: 'create', name: 'Ada', cls: 'knight', table: 'Ash' });
    assert.equal(host.status, 200);
    assert.equal(host.data.view.phase, 'lobby');
    assert.deepEqual(host.data.view.links, []);
    assert.equal(JSON.stringify(host.data.view).includes(host.data.token), false);
  } finally { server.close(); }
});
