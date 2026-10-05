// Actor registry. Each monster/hero lives in its own module exporting `create(opts) -> Actor`.
// Missing modules fall back to a simple placeholder so the game always runs.
import * as THREE from 'three';
import { Actor } from './base.js';
import { mat } from '../mats.js';

const LOADERS = {
  goblin: () => import('./goblin.js'),
  wolf: () => import('./wolf.js'),
  cultist: () => import('./cultist.js'),
  ogre: () => import('./ogre.js'),
  goblinking: () => import('./goblinking.js'),
  hero: () => import('./hero.js'),
  skeleton: () => import('./skeleton.js'),
  wraith: () => import('./wraith.js'),
  spider: () => import('./spider.js'),
  bonewarden: () => import('./bonewarden.js'),
  lich: () => import('./lich.js'),
};
const SIZE = { minion: 1.4, elite: 2.8, boss: 3.0 };
const TINT = { minion: 0x7a8a5a, elite: 0x8a6a4a, boss: 0xb8902a };

function placeholder(id, { tier = 'minion', seed = 1 } = {}) {
  const h = SIZE[tier] || 1.6;
  const a = new Actor({ name: id, height: h, radius: h * 0.3 });
  const body = a.joint('body', a.model, 0, 0, 0);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.22, h * 0.45, 6, 16), mat('skinGreen', { color: TINT[tier] || 0x888888 }));
  torso.position.y = h * 0.5; torso.castShadow = true; body.add(torso);
  const head = a.joint('head', body, 0, h * 0.88, 0.05);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(h * 0.16, 20, 14), mat('skinGreen', { color: TINT[tier] || 0x888888 })));
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffd23d });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(h * 0.025, 8, 6), eyeM); e.position.set(sx * h * 0.06, h * 0.03, h * 0.14); head.add(e); }
  a.anchor('head', head, 0, h * 0.25, 0); a.anchor('chest', body, 0, h * 0.55, h * 0.2); a.anchor('feet', body, 0, 0.05, 0); a.anchor('mouth', head, 0, -h * 0.04, h * 0.15);
  a.clips = {
    idle: { loop: true, dur: 2.2, fn: (t, P) => { P.pos('body', 0, Math.sin(t * 2.86) * 0.012 * h, 0); P.rot('body', Math.sin(t * 1.4) * 0.02, 0, 0); } },
    attack: { dur: 0.7, events: { hit: 0.3 }, fn: (t, P) => { const k = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.4; P.rot('body', 0.5 * Math.max(0, k), 0, 0); P.pos('body', 0, 0, 0.5 * Math.max(0, k)); } },
    hurt: { dur: 0.3, fn: (t, P) => { const k = Math.sin((t / 0.3) * Math.PI); P.rot('body', -0.3 * k, 0, 0); P.pos('body', 0, 0, -0.15 * k); } },
    die: { dur: 0.9, fn: (t, P) => { const k = Math.min(1, t / 0.9); P.rot('body', -1.3 * k * k, 0, 0); P.pos('body', 0, -0.3 * k, 0); } },
  };
  return a.finalize();
}

export async function createActor(id, opts = {}) {
  const key = LOADERS[id] ? id : null;
  if (key) {
    try { const m = await LOADERS[key](); return await m.create({ ...opts, id }); } catch (e) {
      if (!/Failed to fetch|Cannot find|404|Unexpected token|Failed to resolve/i.test(String(e?.message))) console.warn(`actor ${id} failed:`, e);
    }
  }
  return placeholder(id, opts);
}
export const hasActorModule = (id) => !!LOADERS[id];
