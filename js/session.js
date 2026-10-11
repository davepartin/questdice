// The table on this phone. Every view the table sends carries the whole table as text (view.state). This module
// rebuilds it and keeps it, so the 3D screens read an online game exactly as they read a solo one: a company of heroes,
// a battle with fighters, a campaign. What a phone does is a command (send); the answer is the next table.
//
//   adopt(view)        a view arrived (from a command or from the table's live feed): keep it if it is newer
//   send(cmd)          one command at a time, in order; resolves with the new table
//   hold() / release() while a round is being played on screen, newer tables wait their turn
//   onChange(fn)       fn(prev, next, { why }) whenever the table changes
//   me() / hero() / index() / mates()   who I am at this table
import { loadTable } from './table.js';
import * as Net from './net.js';

const S = { table: null, view: null, listeners: new Set(), held: 0, waiting: null, chain: Promise.resolve(), youId: null, lost: false };

export const current = () => S.table;
export const view = () => S.view;
export const active = () => !!S.table;
export const me = () => S.table?.players.find((p) => p.id === S.youId) || null;
export const hero = () => me()?.hero || null;
export const mates = () => S.table?.players || [];
export const isHost = () => !!S.table && S.table.hostId === S.youId;
// my fighter's number in the battle (the fighters stand in the same order as the heroes)
export const index = () => { const b = S.table?.battle; const h = hero(); return b && h ? b.fighters.findIndex((f) => f.hero === h) : -1; };

export function onChange(fn) { S.listeners.add(fn); return () => S.listeners.delete(fn); }
function emit(prev, next, why) { for (const fn of [...S.listeners]) { try { fn(prev, next, { why }); } catch (e) { console.error('session listener', e); } } }

// Start from a view (joining, creating, coming back to a table).
export function open(v) {
  S.table = null; S.view = null; S.waiting = null; S.held = 0; S.lost = false;
  S.youId = v?.you?.id || null;
  adopt(v, 'open');
}
export function close() { S.table = null; S.view = null; S.waiting = null; S.held = 0; S.youId = null; S.chain = Promise.resolve(); S.listeners.clear(); }

export function adopt(v, why = 'view') {
  if (!v || !v.state) return false;
  if (v.you?.id) S.youId = v.you.id;
  if (S.table && v.code === S.table.code && v.seq <= S.table.seq && why !== 'open') return false; // never step back to an older table
  if (S.waiting && v.seq <= S.waiting.seq) return false;
  if (S.held > 0 && why !== 'open') { S.waiting = v; return false; }
  commit(v, why);
  return true;
}
function commit(v, why) {
  const prev = S.table; S.waiting = null;
  S.table = loadTable(v.state); S.view = v;
  emit(prev, S.table, why);
}
// The copy on this phone drifted from the table's (a change was refused after it had already been shown): take the table's.
export async function resync() {
  const v = await Net.snapshot(); if (!v || v.missing || !v.state) return;
  S.waiting = null; commit(v, 'resync');
}
// While a round plays out (or a reveal is on screen) newer tables wait; release lets the latest one in.
export function hold() { S.held += 1; }
export function release() {
  S.held = Math.max(0, S.held - 1);
  if (S.held === 0 && S.waiting) { const v = S.waiting; commit(v, 'released'); }
}
export const holding = () => S.held > 0;

// One command at a time: a phone never has two transactions in flight, and they land in the order they were made.
export function send(cmd) {
  const run = async () => {
    const data = await Net.send(cmd);
    if (data?.view) adoptNow(data.view);
    return data;
  };
  const p = S.chain.then(run, run);
  S.chain = p.catch(() => {});
  return p;
}
// A command's own answer is applied at once, even while the screen is holding other tables back.
function adoptNow(v) {
  if (!v?.state) return;
  if (S.table && v.code === S.table.code && v.seq <= S.table.seq) return;
  if (S.held > 0) { S.waiting = v; return; }
  commit(v, 'sent');
}
