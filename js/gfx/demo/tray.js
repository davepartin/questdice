// Tray viewer: ?m=gfx/demo/tray.js&cls=knight&weapons=sword,shield&str=6,8&spec=6,10&board=NW:3,N:2,...&sel=NW,C&bound=S&hl=top&lock=1&roll=1
// Exposes window.__qd.tray / hero / testRolls(n).
import * as THREE from 'three';
import * as E from '../../engine.js';
import * as D from '../../data.js';
import { createTray } from '../dice/tray.js';
import { setDiceStyle } from '../dice/faces.js';

export async function demo({ stage, stdLights, cam, params, num }) {
  setDiceStyle(params.get('style') || 'classic');
  stdLights({ floor: false });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.92; floor.receiveShadow = true; stage.scene.add(floor);
  const cls = params.get('cls') || 'knight';
  const hero = E.newHero({ name: 'Test', cls, seed: 7 });
  if (params.has('weapons')) { const [a, b] = params.get('weapons').split(','); hero.loadout = { NW: { uid: 'a', id: a, rarity: num('rarity', 0) }, NE: { uid: 'b', id: b || a, rarity: num('rarity', 0) } }; }
  if (params.has('str')) { const [a, b] = params.get('str').split(',').map(Number); hero.strength = { W: a, E: b || a }; }
  if (params.has('spec')) { const [a, b] = params.get('spec').split(',').map(Number); hero.special = { SW: a, SE: b || a }; }
  const tray = createTray({ stage, quality: stage.quality });
  stage.scene.add(tray.object);
  tray.setHero(hero);
  let board = {};
  if (params.has('board')) { for (const s of D.SLOTS) board[s] = { v: 1 }; params.get('board').split(',').forEach((kv) => { const [k, v] = kv.split(':'); board[k] = { v: +v }; }); } else board = E.rollBoard(hero, E.makeRng(num('seed', 5)));
  tray.show(board);
  const list = (k) => (params.get(k) || '').split(',').filter(Boolean);
  if (params.has('sel')) tray.setSelected(new Set(list('sel')));
  list('bound').forEach((s) => tray.setBound(s, true));
  if (params.has('dim')) list('dim').forEach((s) => tray.setDimmed(s, true));
  if (params.has('hl')) tray.highlight(params.get('hl').includes(',') ? list('hl') : params.get('hl'), params.get('hc') || 'red', { hold: 30 });
  if (params.has('lock')) tray.lock();
  if (params.has('roll')) tray.roll(board, { seed: num('seed', 5) });
  tray.onPick = (slot) => console.log('pick', slot);
  const view = params.get('view');
  if (view === 'top') cam([0, 9, 0.01], [0, 0, 0], 40);
  else if (view === 'phone') cam([0, 8.6, 9.4], [0, -0.2, 0], 42);
  else cam([0, 5.8, 7.2], [0, -0.1, 0], 40);
  window.__qd.tray = tray; window.__qd.hero = hero; window.__qd.board = board;
  window.__qd.testRolls = (n = 100) => {
    const res = { n: 0, fail: 0, physical: 0, edge: 0, bad: [] };
    const rng = E.makeRng(99);
    for (let i = 0; i < n; i++) {
      const b = E.rollBoard(hero, rng);
      tray.roll(b, { seed: 1000 + i });
      for (let k = 0; k < 60; k++) tray.update(1 / 30, 0);
      for (const s of D.SLOTS) {
        const st = tray._S[s]; const poly = st.die.poly;
        res.n++;
        const n = new THREE.Vector3(); let best = -2; let bi = 0;
        const view = poly.sides === 4 ? new THREE.Vector3(0, 0.33, 0.94) : new THREE.Vector3(0, 1, 0);
        poly.faces.forEach((f, fi) => { n.copy(f.n).applyQuaternion(st.die.mesh.quaternion); const d = n.dot(view); if (d > best) { best = d; bi = fi; } });
        if (poly.faceLabel[bi] !== b[s].v) { res.fail++; res.bad.push([s, b[s].v, poly.faceLabel[bi]]); }
        if (poly.sides !== 4 && best < 0.999) res.edge++;
        if (tray.lastPlans[s].matched) res.physical++;
      }
    }
    res.physicalPct = Math.round((res.physical / res.n) * 100);
    res.pass = res.fail === 0 && res.edge === 0;
    return res;
  };
  stage.post.look({ bloom: 0.6 });
}
