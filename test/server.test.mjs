import test from 'node:test';
import assert from 'node:assert/strict';
import { start } from '../server.mjs';

async function post(port, body) {
  const res = await fetch(`http://127.0.0.1:${port}/api/room`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

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
