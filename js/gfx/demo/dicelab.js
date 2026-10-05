// Dice lab: every kind of die at once under one camera, to judge readability.
//   ?m=gfx/demo/dicelab.js&style=classic|clear|vivid&view=top|tilt|low|phone&scale=1&pick=pip|max|min
import * as THREE from 'three';
import * as E from '../../engine.js';
import { dieSpecs, createDie, restQuat } from '../dice/dice.js';
import { leanQuat, d4Lift, setD4Lean } from '../dice/poly.js';
import { setDiceStyle } from '../dice/faces.js';

export async function demo({ stage, stdLights, cam, params, num }) {
  const lk = setDiceStyle(params.get('style') || 'classic').light;
  stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, num('hemi', 0.5)));
  const kl = new THREE.PointLight(0xffeedd, 14 * (num('light', 1) * lk), 0, 2); kl.position.set(-1.8, 5.5, 3.2); stage.scene.add(kl);
  const rl = new THREE.PointLight(0x78a4ff, 9 * num('light', 1) * lk * lk, 0, 2); rl.position.set(3.6, 2.4, -3); stage.scene.add(rl);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.scene.add(floor);

  const specs = [];
  // weapon dice: sword (red lane) and shield (blue lane) at rarity 0..3 -> d4, d6, d8, d10
  for (let r = 0; r < 4; r++) {
    const h = E.newHero({ name: 'T', cls: 'knight', seed: 7 });
    h.loadout = { NW: { uid: 'a', id: 'sword', rarity: r }, NE: { uid: 'b', id: 'shield', rarity: r } };
    h.strength = { W: 8, E: 6 }; h.special = { SW: 6, SE: 6 }; h.talent = { SW: [['heal','atk'],['gold'],['block','block']], SE: [['magic','pierce'],['atk'],[]] };
    const d = dieSpecs(h); specs.push([d.NW, d.NE, d.W, d.E, d.SW, d.SE, d.NW === d.NE ? null : null].filter(Boolean));
  }
  const pick = params.get('pick') || 'pip';
  const rowsDefs = [
    ['NW', 'NE'], ['W', 'E'], ['SW', 'SE'],
  ];
  const dice = []; const pitch = num('pitch', 1.5) * num('scale', 1);
  let tier = num('tier', -1); const EXTRA = ['pierce', 'magic', 'gold', 'heal'];
  const withTier = (spec) => {
    if (tier < 0) return spec;
    const cap = spec.sides === 6 ? 4 : 3;
    const labels = spec.labels.map((l, i) => {
      if (l.blank || l.sym) return l;
      const base = [spec.role === 'weapon' ? (l.tone === 'b' ? 'def' : 'atk') : l.mark === 'atk' ? 'atk' : l.mark === 'block' ? 'def' : null, l.pip].filter(Boolean);
      const want = tier >= 3 ? cap : Math.min(cap, Math.max(base.length, tier + 1));
      const corners = base.slice(); let k = i;
      while (corners.length < want) { const e = EXTRA[k++ % 4]; if (!corners.includes(e)) corners.push(e); }
      return { ...l, corners };
    });
    return { ...spec, labels };
  };
  const place = (spec0, x, z) => {
    const spec = withTier(spec0);
    const die = createDie({ spec, quality: stage.quality });
    const labels = spec.labels.map((l, i) => ({ l, v: i + 1 }));
    let v = labels[labels.length - 1].v;
    if (pick === 'talent') { const w = labels.find((o) => o.l.sym === 'TALENT'); if (w) v = w.v; } else if (pick === 'surge') { const w = labels.find((o) => o.l.sym === 'SURGE'); if (w) v = w.v; } else if (pick === 'pip') { const w = labels.find((o) => o.l.pip === 'pierce') || labels.find((o) => o.l.pip) || labels.find((o) => o.l.sym); if (w) v = w.v; } else if (pick === 'min') v = 1;
    if (params.has('lean')) setD4Lean(num('lean', 0.6));
    die.mesh.quaternion.copy(leanQuat(die.poly, restQuat(die.poly, v, 0, -1, 0), v));
    die.mesh.scale.setScalar(num('scale', 1));
    die.mesh.position.set(x, (die.inR + d4Lift(die.poly)) * num('scale', 1), z);
    die.setView(new THREE.Vector3(0, 0.62, 0.78)); die.setRest(1);
    stage.scene.add(die.mesh); dice.push(die);
  };
  // columns by rarity (d4 d6 d8 d10), rows: red weapon, blue weapon, strength(bone), hand(smoke), special, heart
  const h6 = E.newHero({ name: 'T', cls: 'knight', seed: 7 });
  const rows = ['NW', 'NE', 'W', 'SW', 'SE', 'C'];
  for (let r = 0; r < 4; r++) {
    const h = E.newHero({ name: 'T', cls: 'knight', seed: 7 });
    h.loadout = { NW: { uid: 'a', id: 'sword', rarity: r }, NE: { uid: 'b', id: 'shield', rarity: r } };
    h.strength = { W: [4, 6, 8, 10][r], E: [4, 6, 8, 10][r] }; h.special = { SW: r % 2 ? 6 : 4, SE: r % 2 ? 6 : 4 }; h.talent = { SW: [['heal', 'atk'], ['gold'], ['block', 'block']], SE: [['magic', 'pierce'], ['atk'], []] };
    const d = dieSpecs(h);
    rows.forEach((s, ri) => { if (d[s]) place(d[s], (r - 1.5) * pitch, (ri - 2.5) * pitch); });
  }
  if (params.get('mode') === 'tiers') {
    dice.forEach((d) => { d.mesh.removeFromParent(); }); dice.length = 0;
    const cfg = [['NW', 4], ['W', 6], ['W', 8], ['W', 10], ['C', 6]];
    cfg.forEach(([slot, sd], ri) => {
      for (let t = 0; t < 4; t++) {
        const h = E.newHero({ name: 'T', cls: 'knight', seed: 7 });
        h.loadout = { NW: { uid: 'a', id: 'sword', rarity: 3 }, NE: { uid: 'b', id: 'shield', rarity: 3 } };
        h.strength = { W: sd, E: sd };
        tier = t; place(dieSpecs(h)[slot], (t - 1.5) * pitch, (ri - 2) * pitch);
      }
    });
  }
  stage.onFrame((dt, t) => dice.forEach((d) => { d.uniforms.uTime.value = t; d.updateCamera(stage.camera); }));
  window.__qd.dice = dice;
  const view = params.get('view') || 'top'; const k = num('scale', 1);
  if (params.has('cx')) { const cx = num('cx', 0); const cz = num('cz', 0); const h = num('h', 3); cam([cx, h, cz + 0.01], [cx, 0, cz], 40); } else if (view === 'top') cam([0, 14 * k, 0.01], [0, 0, 0], 40);
  else if (view === 'tilt') cam([0, 12 * k, 7 * k], [0, 0, 0.3], 38);
  else if (view === 'low') cam([0, 6 * k, 12 * k], [0, 0, 0], 38);
  else cam([0, 14 * k, 5 * k], [0, 0, 0], 52);
  stage.post.look({ bloom: 0.35 });
}
