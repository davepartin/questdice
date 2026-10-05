// Arena viewer.  ?m=gfx/demo/arena.js&place=Burnt%20Orchard&kind=standard|elite|boss&seed=3&n=2
//   &view=game|wide|beauty|low|top  &mood=calm|battle|boss|victory|camp  &t=3 (seconds to run before the shot)
//   &actors=1 tries the real hero / monster actors instead of capsule stand-ins.
// Exposes window.__qd.arena. Capsule stand-ins sit on the staging marks; a box stands in for the tray.
import * as THREE from 'three';
import { buildArena } from '../arena.js';

function dummy(h, r, color, { cape = false, horns = false } = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, h - r * 2 - 0.2, 6, 14), m); body.position.y = h * 0.5 - 0.1; body.castShadow = true; body.receiveShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 14, 10), m); head.position.y = h - r * 0.7; head.castShadow = true;
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffd23d });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 8, 6), eyeM); e.position.set(sx * r * 0.28, h - r * 0.62, r * 0.62); g.add(e); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.12, r * 0.4, 6), m); nose.rotation.x = Math.PI / 2; nose.position.set(0, h - r * 0.75, r * 0.8);
  g.add(body, head, nose);
  return g;
}

export async function demo({ stage, cam, params, num }) {
  const place = params.get('place') || 'Burnt Orchard';
  const kind = params.get('kind') || 'standard';
  const seed = num('seed', 1);
  const n = num('n', kind === 'standard' ? 2 : 1);
  const arena = buildArena(stage, { place, kind, seed, quality: stage.quality, enemyCount: n });
  stage.onFrame((dt, t) => arena.update(dt, t));
  window.__qd.arena = arena;
  if (params.has('mood')) arena.setMoodNow(params.get('mood'));
  const M = arena.marks;
  const root = new THREE.Group(); stage.scene.add(root);

  // hero + monsters (stand-ins)
  const heroC = 0x4a78c8;
  const hero = dummy(1.8, 0.32, heroC); hero.position.set(...M.hero); hero.lookAt(0, 0, -1.5); hero.rotation.x = 0; root.add(hero);
  const pos = M.monsters(n, kind);
  const monC = [0x6f8f3a, 0x7a6a58, 0x8a5a7a, 0x6f8f3a];
  pos.forEach((p, i) => {
    const big = kind !== 'standard';
    const d = dummy(big ? (kind === 'boss' ? 3.0 : 2.8) : 1.3 + (i % 2) * 0.2, big ? 0.8 : 0.4, kind === 'boss' ? 0xb8902a : kind === 'elite' ? 0x9a8a5a : monC[i % 4]);
    d.position.set(p[0], p[1], p[2]); d.rotation.y = 0.05 * (i - 1); root.add(d);
  });
  // table + tray placeholder
  const tp = M.tray.pos;
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.9, 5.4), wood); table.position.set(tp[0], 0.45, tp[2]); table.castShadow = table.receiveShadow = true; root.add(table);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(M.tray.size[0], 0.1, M.tray.size[1]), new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.55, metalness: 0.3 }));
  tray.position.set(tp[0], 0.95, tp[2]); tray.castShadow = tray.receiveShadow = true; root.add(tray);
  const dieM = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 });
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), dieM); d.position.set(tp[0] + ((i % 3) - 1) * 1.3, 1.23, tp[2] + (Math.floor(i / 3) - 1) * 1.3); d.rotation.y = i * 0.7; d.castShadow = true; root.add(d); }

  // camera
  const view = params.get('view') || 'game';
  const portrait = stage.width < stage.height;
  const C = portrait ? M.cameraPortrait : M.camera;
  if (view === 'game') cam(C.pos, C.look, C.fov);
  else if (view === 'wide') cam([0.3, 5.2, 15.5], [0, 3.2, -12], portrait ? 62 : 52);
  else if (view === 'beauty') cam([-11, 4.4, 12], [3, 2.6, -10], portrait ? 62 : 50);
  else if (view === 'low') cam([-3.5, 1.5, 7.5], [1, 2.6, -14], 56);
  else if (view === 'top') cam([0, 16, 8], [0, 0, -2], 50);
  else cam(C.pos, C.look, C.fov);
  if (params.has('mood')) arena.setMoodNow(params.get('mood'));
  window.__qd.stats = () => arena.stats();
  console.log('arena', place, kind, JSON.stringify(arena.stats()));
  stage.advance(num('t', 2.5));
}
