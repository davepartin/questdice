// The table. One process serves the game and gathers each phone's choices.
// Phones on the same Wi-Fi open the address this prints and enter the room code.
//
//   node server.mjs
//
import http from 'node:http';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createTable, joinTable, command, playerByToken, playerView } from './js/table.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();
let listenPort = 8000;

function makeCode() {
  const buf = randomBytes(4);
  let s = '';
  for (const b of buf) s += ALPH[b % ALPH.length];
  return s;
}
function lanUrls() {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) urls.push(`http://${net.address}:${listenPort}`);
    }
  }
  return urls;
}
function decorate(view) {
  if (view && view.phase === 'lobby') view.links = lanUrls();
  return view;
}
function sweep() {
  const dead = Date.now() - 6 * 60 * 60 * 1000;
  for (const [code, room] of rooms) if (room.touched < dead) rooms.delete(code);
}
function roomOf(code) {
  if (!/^[A-Z0-9]{4}$/.test(code || '')) return null;
  return rooms.get(code) || null;
}
function publish(room) {
  const stale = [];
  for (const sub of room.subs) {
    try {
      const view = decorate(playerView(room.table, sub.playerId));
      sub.res.write(`data: ${JSON.stringify(view)}\n\n`);
    } catch { stale.push(sub); }
  }
  for (const sub of stale) room.subs.delete(sub);
}
function send(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(raw) });
  res.end(raw);
}
async function readBody(req) {
  const chunks = [];
  let n = 0;
  for await (const chunk of req) {
    n += chunk.length;
    if (n > 1_000_000) { const err = new Error('too big'); err.status = 413; throw err; }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function createRoom(body) {
  sweep();
  let code = '';
  for (let i = 0; i < 12 && (!code || rooms.has(code)); i++) code = makeCode();
  if (rooms.has(code)) return { status: 503, body: { error: 'Every code is taken. Try again.' } };
  const token = randomBytes(18).toString('hex');
  const table = createTable({ code, seed: randomBytes(4).readUInt32BE(0), name: body.table || 'Company' });
  const joined = joinTable(table, { name: body.name, cls: body.cls, token });
  if (!joined.ok) return { status: 400, body: { error: joined.error } };
  const room = { table, subs: new Set(), touched: Date.now() };
  rooms.set(code, room);
  return { status: 200, body: { code, token, playerId: joined.player.id, view: decorate(playerView(table, joined.player.id)) } };
}
function joinRoom(body) {
  const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const room = roomOf(code);
  if (!room) return { status: 404, body: { error: 'No table with that code.' } };
  const token = randomBytes(18).toString('hex');
  const joined = joinTable(room.table, { name: body.name, cls: body.cls, token });
  if (!joined.ok) return { status: 400, body: { error: joined.error } };
  room.touched = Date.now();
  publish(room);
  return { status: 200, body: { code, token, playerId: joined.player.id, view: decorate(playerView(room.table, joined.player.id)) } };
}
function actRoom(body) {
  const code = String(body.code || '').toUpperCase();
  const room = roomOf(code);
  if (!room) return { status: 404, body: { error: 'That table is gone.' } };
  const player = playerByToken(room.table, body.token);
  if (!player) return { status: 401, body: { error: 'This phone is not seated at that table.' } };
  const res = command(room.table, player.id, body.cmd);
  if (!res.ok) return { status: 400, body: { error: res.error } };
  room.touched = Date.now();
  publish(room);
  return { status: 200, body: { ok: true, view: decorate(playerView(room.table, player.id)) } };
}

function fileFor(urlPath) {
  let raw = '/';
  try { raw = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  if (raw.includes('\0')) return null;
  const rel = raw === '/' ? '/index.html' : raw;
  if (rel.split('/').some((part) => part.startsWith('.'))) return null;
  const full = normalize(join(ROOT, rel));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return full;
}
function serveFile(req, res) {
  const full = fileFor(req.url || '/');
  if (!full) { send(res, 404, { error: 'Not found.' }); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(full)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(full).pipe(res);
}

async function onRequest(req, res) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/room') {
      const body = await readBody(req);
      const out = body.op === 'create' ? createRoom(body) : body.op === 'join' ? joinRoom(body) : body.op === 'act' ? actRoom(body) : { status: 400, body: { error: 'Unknown request.' } };
      send(res, out.status, out.body);
      return;
    }
    const snap = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{4})$/);
    const events = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{4})\/events$/);
    if ((snap || events) && req.method === 'GET') {
      const code = (snap || events)[1].toUpperCase();
      const room = roomOf(code);
      const player = room && playerByToken(room.table, url.searchParams.get('token'));
      if (!room) { send(res, 404, { error: 'That table is gone.' }); return; }
      if (!player) { send(res, 401, { error: 'This phone is not seated at that table.' }); return; }
      if (snap) { send(res, 200, decorate(playerView(room.table, player.id))); return; }
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(decorate(playerView(room.table, player.id)))}\n\n`);
      const sub = { res, playerId: player.id };
      room.subs.add(sub);
      const beat = setInterval(() => { try { res.write(':\n\n'); } catch { /* closed */ } }, 25000);
      req.on('close', () => { clearInterval(beat); room.subs.delete(sub); });
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') { serveFile(req, res); return; }
    send(res, 405, { error: 'No.' });
  } catch (err) {
    if (!res.headersSent) send(res, err.status || 400, { error: 'The table could not read that.' });
  }
}

export function start(port = 0) {
  const server = http.createServer(onRequest);
  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      listenPort = server.address().port;
      resolve(server);
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT) || 8000;
  const server = await start(port);
  const shown = lanUrls();
  console.log(`QuestDice table on http://localhost:${server.address().port}`);
  if (shown.length) console.log(`Other phones: ${shown.join('  ')}`);
  else console.log('No LAN address found. Phones on this computer can still use localhost.');
}
