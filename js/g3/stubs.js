// Stand-ins used until the real module for a part exists (or if one fails to load), so the
// game is always playable. They implement the same contracts as docs/GFX.md.
import * as THREE from 'three';
import * as D from '../data.js';
import * as E from '../engine.js';

// ------------------------------------------------------------------------------ arena
export function stubArena(stage) {
  const g = new THREE.Group();
  stage.scene.fog = new THREE.FogExp2(0x1a1018, 0.035);
  stage.scene.background = new THREE.Color(0x1a1018);
  const key = new THREE.DirectionalLight(0xffb070, 3); key.position.set(-5, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 30 });
  const rim = new THREE.DirectionalLight(0x6a8cff, 1.5); rim.position.set(4, 5, -8);
  g.add(key, rim, new THREE.HemisphereLight(0x8090c0, 0x201010, 0.5));
  const f = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 1 }));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true; g.add(f);
  stage.scene.add(g);
  return { group: g, update() {}, setMood() {}, dispose() { stage.scene.remove(g); }, marks: {} };
}

// ------------------------------------------------------------------------------ tray
const SLOT_POS = { NW: [-1.45, -1.45], N: [0, -1.45], NE: [1.45, -1.45], W: [-1.45, 0], C: [0, 0], E: [1.45, 0], SW: [-1.45, 1.45], S: [0, 1.45], SE: [1.45, 1.45] };
export function stubTray(stage) {
  const root = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 4.8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }));
  top.position.y = -0.1; top.receiveShadow = true; root.add(top);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 4.4), new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1 }));
  legs.position.y = -0.6; root.add(legs);
  const dice = {}; let hero = null; const T = { object: root, size: { w: 4.8, d: 4.8 }, onPick: null, diceMeshes: dice, onSound: null };
  const tex = (txt, col) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = 'bold 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const colOf = (slot, v) => {
    const r = D.ROLE[slot];
    if (r === 'weapon' && hero) { const f = E.weaponFaces(hero.loadout[slot])[v - 1]; return { c: f?.c === 'r' ? '#a01c24' : '#1c5ca0', t: String(f?.v ?? v) }; }
    if (r === 'special' && hero) { const s = E.specialFace(hero, slot, v); return { c: s ? '#5a2a9a' : '#2a2a30', t: s ? D.SYMBOL_INFO[s].glyph : '–' }; }
    if (r === 'heart') return { c: '#a07a14', t: String(v) };
    return { c: '#4a4438', t: String(v) };
  };
  const paint = (slot, v) => { const m = dice[slot]; const { c, t } = colOf(slot, v); m.material.map = tex(t, c); m.material.needsUpdate = true; m.userData.v = v; };
  T.setHero = (h) => {
    hero = h;
    for (const s of D.SLOTS) {
      if (dice[s]) { root.remove(dice[s]); }
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ roughness: 0.4 }));
      m.position.set(SLOT_POS[s][0], 0.45, SLOT_POS[s][1]); m.castShadow = true; m.userData.slot = s; dice[s] = m; root.add(m); paint(s, 1);
    }
  };
  T.show = (board) => { for (const s of D.SLOTS) paint(s, board[s].v); };
  T.roll = async (board, { slots = null } = {}) => {
    const list = slots || D.SLOTS;
    const t0 = stage.time;
    await stage.tween({ dur: 0.9 }, (k) => { for (const s of list) { dice[s].rotation.set(k * 12 + s.length, k * 9, k * 7); dice[s].position.y = 0.45 + Math.abs(Math.sin(k * 9)) * (1 - k) * 1.2; } });
    for (const s of list) { dice[s].rotation.set(0, 0, 0); dice[s].position.y = 0.45; paint(s, board[s].v); T.onSound?.('settle', { slot: s, speed: 1 }); }
  };
  T.setSelected = (set) => { for (const s of D.SLOTS) { dice[s].position.y = set.has(s) ? 0.7 : 0.45; } };
  T.setBound = () => {}; T.highlight = () => {}; T.pulse = () => {}; T.setDimmed = () => {}; T.lock = () => {}; T.unlock = () => {};
  T.setValue = (s, v) => paint(s, v);
  T.worldPos = (s) => new THREE.Vector3(SLOT_POS[s][0], 0.5, SLOT_POS[s][1]).applyMatrix4(root.matrixWorld);
  T.update = () => {};
  T.dispose = () => {};
  const ray = new THREE.Raycaster(); const v2 = new THREE.Vector2(); let down = null;
  const el = stage.canvas;
  el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return; down = null;
    const r = el.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, stage.camera); const hit = ray.intersectObjects(Object.values(dice), false)[0];
    if (hit) T.onPick?.(hit.object.userData.slot);
  });
  return T;
}

// ------------------------------------------------------------------------------ vfx (no-ops)
export function stubVfx(stage) {
  const done = (ms = 120) => stage.wait(ms / 1000);
  const noop = () => done();
  return new Proxy({ stub: true }, { get: (t, k) => (k in t ? t[k] : noop) });
}
