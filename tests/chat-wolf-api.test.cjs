'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createDevServer } = require('../scripts/chat-wolf-dev-server.cjs');

async function withServer(fn) {
  const server = createDevServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try { await fn(origin); } finally { await new Promise((resolve) => server.close(resolve)); }
}

async function post(origin, body, token) {
  const response = await fetch(`${origin}/api/chat-wolf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function get(origin, room, token) {
  const response = await fetch(`${origin}/api/chat-wolf?room=${room}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json() };
}

test('six independent HTTP sessions synchronize while secrets stay private', async () => {
  await withServer(async (origin) => {
    const created = await post(origin, { action: 'create', name: '玩家1', settings: { playerCount: 6, wolfCount: 2 } });
    assert.equal(created.status, 201);
    const room = created.body.state.public.code;
    const clients = [{ token: created.body.token, id: created.body.state.private.playerId }];
    for (let i = 2; i <= 6; i += 1) {
      const joined = await post(origin, { action: 'join', room, name: `玩家${i}` });
      assert.equal(joined.status, 201);
      clients.push({ token: joined.body.token, id: joined.body.state.private.playerId });
    }
    await Promise.all(clients.map((client) => post(origin, { action: 'ready', room, ready: true }, client.token)));
    const started = await post(origin, { action: 'startGame', room }, clients[0].token);
    assert.equal(started.body.state.public.phase, 'ROLE_REVEAL');

    const views = await Promise.all(clients.map((client) => get(origin, room, client.token)));
    const wolves = views.filter((view) => view.body.state.private.role === 'WOLF');
    const villagers = views.filter((view) => view.body.state.private.role === 'VILLAGER');
    assert.equal(wolves.length, 2);
    assert.equal(villagers.length, 4);
    assert.equal(wolves[0].body.state.private.tasks.length, 2);
    assert.deepEqual(wolves[0].body.state.private.tasks, wolves[1].body.state.private.tasks);
    for (const view of villagers) {
      assert.equal(view.body.state.private.tasks, null);
      assert.equal(view.body.state.public.reveal, undefined);
    }

    const invalid = await get(origin, room, 'x'.repeat(43));
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error, 'INVALID_SESSION');
  });
});

test('two simultaneous bell requests consume the room allowance once', async () => {
  await withServer(async (origin) => {
    const created = await post(origin, { action: 'create', name: 'A', settings: { playerCount: 3, wolfCount: 1 } });
    const room = created.body.state.public.code;
    const tokens = [created.body.token];
    for (const name of ['B', 'C']) tokens.push((await post(origin, { action: 'join', room, name })).body.token);
    await Promise.all(tokens.map((token) => post(origin, { action: 'ready', room, ready: true }, token)));
    await post(origin, { action: 'startGame', room }, tokens[0]);
    await Promise.all(tokens.map((token) => post(origin, { action: 'ackRole', room }, token)));
    const results = await Promise.all(tokens.slice(1).map((token) => post(origin, { action: 'ringBell', room }, token)));
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.filter((result) => result.body.error === 'BELL_ALREADY_USED').length, 1);
  });
});
