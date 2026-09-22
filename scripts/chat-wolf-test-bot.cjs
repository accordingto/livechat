'use strict';

/* Local QA helper only. It controls exactly the one player session it creates and
   never receives another player's private projection. Do not expose it in production. */

const origin = process.env.CHAT_WOLF_DEV_ORIGIN || 'http://127.0.0.1:8088';
const room = String(process.argv[2] || '').toUpperCase();
const name = String(process.argv[3] || '測試機器人');
if (!/^[A-HJ-NP-Z2-9]{6}$/.test(room)) throw new Error('Usage: node scripts/chat-wolf-test-bot.cjs ROOM NAME');

let token = null;
let stopped = false;

async function request(method, body) {
  const response = await fetch(method === 'GET' ? `${origin}/api/chat-wolf?room=${room}` : `${origin}/api/chat-wolf`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

async function act(action, payload = {}) {
  return request('POST', { action, room, ...payload });
}

async function run() {
  const joined = await request('POST', { action: 'join', room, name });
  token = joined.token;
  await act('ready', { ready: true });
  console.log(`${name} joined ${room} and is ready`);
  while (!stopped) {
    const { state } = await request('GET');
    if (state.public.phase === 'ROLE_REVEAL' && state.private.actions.canAckRole) await act('ackRole');
    else if (state.private.actions.canEndTurn) await act('endTurn');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

process.on('SIGINT', () => { stopped = true; });
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
