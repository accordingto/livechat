'use strict';
// Isolated Firebase-compatible fixture for 雙選賓果 browser checks.
// - One in-memory database on the Node side, with the Hub's PRODUCTION RULES
//   enforced: only rooms/{code}/players/{token}(/…) and rooms/{code}/roster
//   can be read or written. Listing a room or its players is denied.
// - Each page gets a compat-style firebase shim. A page receives ONLY the
//   values of paths it subscribed to or read, so the per-page log is exactly
//   that page's network payload.
// - ServerValue.TIMESTAMP is resolved on the "server" with a shared clock
//   skew, which the test can move forward for every page at once.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const normalize = value => {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const clean = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const item = normalize(entry); if (item !== null) clean[key] = item; }
  return Object.keys(clean).length ? clean : null;
};
const keys = location => String(location || '').split('/').filter(Boolean);

function allowed(location) {
  const k = keys(location);
  if (k[0] !== 'rooms' || k.length < 3) return false;
  if (k[2] === 'players') return k.length >= 4;
  if (k[2] === 'roster') return true;
  return false;
}

function createServer(root) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (url.pathname === '/') file = path.join(root, 'index.html');
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function createDatabase() {
  let tree = {};
  const state = { skew: 0, pages: new Map(), log: [] };
  const now = () => Date.now() + state.skew;
  const get = location => keys(location).reduce((value, key) => value?.[key], tree) ?? null;
  const resolve = value => {
    if (value && typeof value === 'object') {
      if (value['.sv'] === 'timestamp') return now();
      const out = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) out[k] = resolve(v);
      return out;
    }
    return value;
  };
  const put = (location, value) => {
    const k = keys(location);
    if (!k.length) { tree = normalize(value) || {}; return; }
    let parent = tree;
    for (const key of k.slice(0, -1)) { if (!parent[key] || typeof parent[key] !== 'object') parent[key] = {}; parent = parent[key]; }
    const clean = normalize(clone(value));
    if (clean === null) delete parent[k.at(-1)]; else parent[k.at(-1)] = clean;
    // prune empty parents
    let node = tree;
    const stack = [];
    for (const key of k.slice(0, -1)) { stack.push([node, key]); node = node?.[key]; }
    for (let i = stack.length - 1; i >= 0; i--) { const [p, key] = stack[i]; if (p[key] && typeof p[key] === 'object' && !Object.keys(p[key]).length) delete p[key]; }
  };
  async function broadcast() {
    for (const [id, page] of state.pages) {
      if (page.closed) continue;
      const pushes = [];
      for (const location of page.listens.keys()) {
        const json = JSON.stringify(get(location));
        if (page.sent.get(location) === json) continue;
        page.sent.set(location, json);
        page.received.push({ path: location, json });
        pushes.push([location, json]);
      }
      if (pushes.length) await page.page.evaluate(list => { for (const [p, j] of list) window.__qaPush(p, j); }, pushes).catch(() => {});
    }
  }
  async function handle(id, raw) {
    const r = JSON.parse(raw), page = state.pages.get(id);
    state.log.push({ page: id, type: r.type, path: r.path });
    if (!allowed(r.path)) { page.denied.push({ type: r.type, path: r.path }); return { error: 'permission_denied' }; }
    if (r.type === 'listen') {
      page.listens.set(r.path, (page.listens.get(r.path) || 0) + 1);
      const json = JSON.stringify(get(r.path));
      page.sent.set(r.path, json); page.received.push({ path: r.path, json });
      return { value: JSON.parse(json) };
    }
    if (r.type === 'unlisten') { const n = (page.listens.get(r.path) || 1) - 1; if (n <= 0) { page.listens.delete(r.path); page.sent.delete(r.path); } else page.listens.set(r.path, n); return {}; }
    if (r.type === 'get') { const json = JSON.stringify(get(r.path)); page.received.push({ path: r.path, json }); return { value: JSON.parse(json) }; }
    if (r.type === 'set') { put(r.path, resolve(r.value)); if (state.onSet) state.onSet(id, r.path, get(r.path)); await broadcast(); return {}; }
    if (r.type === 'update') { put(r.path, Object.assign({}, get(r.path) || {}, resolve(r.value))); await broadcast(); return {}; }
    if (r.type === 'cas') {
      const current = get(r.path);
      if (JSON.stringify(normalize(clone(current))) !== JSON.stringify(normalize(clone(r.expected)))) {
        const json = JSON.stringify(current); page.received.push({ path: r.path, json });
        return { conflict: true, value: current };
      }
      if (!r.hasValue) { page.received.push({ path: r.path, json: JSON.stringify(current) }); return { committed: false, value: current }; }
      put(r.path, resolve(r.value));
      if (state.onWrite) state.onWrite(id, r.path, get(r.path));
      const json = JSON.stringify(get(r.path)); page.received.push({ path: r.path, json });
      await broadcast();
      return { committed: true, value: JSON.parse(json) };
    }
    return { error: 'bad_request' };
  }
  async function attach(page, id, { storage } = {}) {
    const entry = { page, listens: new Map(), sent: new Map(), received: [], denied: [], closed: false };
    state.pages.set(id, entry);
    await page.exposeFunction('__qaFirebase', raw => handle(id, raw));
    await page.addInitScript(installFirebase, { storage: storage || null, skew: state.skew });
    page.on('close', () => { entry.closed = true; });
    return entry;
  }
  async function setSkew(ms) {
    state.skew = ms;
    for (const [, page] of state.pages) if (!page.closed) await page.page.evaluate(v => { window.__qaSkew = v; try { sessionStorage.setItem('__qaSkew', String(v)); } catch (e) {} }, ms).catch(() => {});
  }
  return { get, put: async (p, v) => { put(p, v); await broadcast(); }, dump: () => clone(tree), attach, setSkew, state, now, broadcast };
}

// Runs inside each page before any of its scripts.
function installFirebase({ storage, skew }) {
  const realNow = Date.now.bind(Date);
  // a reload keeps the shared clock (the init argument is from attach time)
  let saved = null; try { saved = sessionStorage.getItem('__qaSkew'); } catch (e) {}
  window.__qaSkew = saved != null ? Number(saved) : (skew || 0);
  Date.now = () => realNow() + window.__qaSkew;
  const listeners = new Map();
  const snapshot = (value, key) => ({ val: () => (value == null ? null : structuredClone(value)), key, exists: () => value != null });
  const request = r => window.__qaFirebase(JSON.stringify(r));
  window.__qaPush = (location, json) => {
    for (const entry of listeners.get(location) || []) {
      if (entry.last === json) continue;
      entry.last = json;
      try { entry.handler(snapshot(JSON.parse(json), location.split('/').pop())); } catch (e) { console.error(e); }
    }
  };
  function local(value) {
    return { key: null, child: () => local(null), on(event, handler) { setTimeout(() => handler(snapshot(value)), 0); return handler; }, off() {}, once: async () => snapshot(value) };
  }
  function reference(location) {
    if (location === '.info/connected') return local(true);
    if (location === '.info/serverTimeOffset') return local(0);
    const ref = {
      key: location.split('/').pop(), path: location,
      child: c => reference(location + '/' + String(c).replace(/^\/+|\/+$/g, '')),
      on(event, handler, fail) {
        const entry = { handler, last: undefined };
        if (!listeners.has(location)) listeners.set(location, new Set());
        listeners.get(location).add(entry);
        request({ type: 'listen', path: location }).then(r => {
          if (r.error) { if (fail) fail(new Error(r.error)); return; }
          if (!listeners.get(location)?.has(entry)) return;
          const json = JSON.stringify(r.value ?? null);
          entry.last = json; handler(snapshot(r.value ?? null, ref.key));
        });
        return handler;
      },
      off(event, handler) {
        const set = listeners.get(location); if (!set) return;
        for (const entry of set) if (!handler || entry.handler === handler) { set.delete(entry); request({ type: 'unlisten', path: location }); }
      },
      once: async () => { const r = await request({ type: 'get', path: location }); if (r.error) throw new Error(r.error); return snapshot(r.value ?? null, ref.key); },
      set: async value => { const r = await request({ type: 'set', path: location, value: value === undefined ? null : value }); if (r.error) throw new Error(r.error); },
      update: async value => { const r = await request({ type: 'update', path: location, value }); if (r.error) throw new Error(r.error); },
      remove: async () => { const r = await request({ type: 'set', path: location, value: null }); if (r.error) throw new Error(r.error); },
      onDisconnect: () => ({ remove: async () => {}, cancel: async () => {}, set: async () => {}, update: async () => {} }),
      async transaction(updater) {
        for (let attempt = 0; attempt < 60; attempt++) {
          const got = await request({ type: 'get', path: location });
          if (got.error) throw new Error(got.error);
          const current = got.value ?? null;
          const next = updater(current == null ? null : structuredClone(current));
          const r = await request({ type: 'cas', path: location, expected: current, value: next === undefined ? null : next, hasValue: next !== undefined });
          if (r.error) throw new Error(r.error);
          if (!r.conflict) return { committed: !!r.committed, snapshot: snapshot(r.value ?? null, ref.key) };
        }
        throw new Error('QA transaction retry limit');
      },
    };
    return ref;
  }
  const database = () => ({ ref: p => reference(String(p || '').replace(/^\/+|\/+$/g, '')) });
  database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };
  window.firebase = { apps: [], initializeApp() { this.apps.push({}); return {}; }, database };
  if (storage) for (const [k, v] of Object.entries(storage)) { if (localStorage.getItem(k) == null) localStorage.setItem(k, v); }
}

module.exports = { createServer, createDatabase, allowed };
