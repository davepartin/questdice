// Dice close-ups: every face of one slot's die, face-up, on a dark table.
//   ?m=gfx/demo/dicegallery.js&slot=NW&cls=knight&weapons=sword,shield&str=6,8&spec=6,10&cam=0,3,3.6&look=0,0.2,0
import * as THREE from 'three';
import * as E from '../../engine.js';
import { dieSpecs, createDie, restQuat } from '../dice/dice.js';

export async function demo({ stage, stdLights, cam, params, num }) {
  stdLights({ floor: false });
  const hero = E.newHero({ name: 'Test', cls: params.get('cls') || 'knight', seed: 7 });
  if (params.has('weapons')) { const [a, b] = params.get('weapons').split(','); hero.loadout = { NW: { uid: 'a', id: a, rarity: num('rarity', 0) }, NE: { uid: 'b', id: b || a, rarity: num('rarity', 0) } }; }
  if (params.has('str')) { const [a, b] = params.get('str').split(',').map(Number); hero.strength = { W: a, E: b || a }; }
  if (params.has('spec')) { const [a, b] = params.get('spec').split(',').map(Number); hero.special = { SW: a, SE: b || a }; }
  const slot = params.get('slot') || 'NW';
  const spec = dieSpecs(hero)[slot];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.8, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.scene.add(floor);
  const n = spec.sides; const cols = Math.min(n, params.has('cols') ? num('cols', 5) : 5); const rows = Math.ceil(n / cols);
  const dice = [];
  for (let i = 0; i < n; i++) {
    const die = createDie({ spec, quality: stage.quality });
    const q = restQuat(die.poly, i + 1, 0, -1, 0);
    die.mesh.quaternion.copy(q);
    die.mesh.position.set((i % cols - (cols - 1) / 2) * 1.15, die.inR, (Math.floor(i / cols) - (rows - 1) / 2) * 1.15);
    die.setView(new THREE.Vector3(0, 0.62, 0.78)); die.setRest(params.has('flat') ? 0 : 1);
    stage.scene.add(die.mesh); dice.push(die);
  }
  stage.onFrame((dt, t) => dice.forEach((d) => { d.uniforms.uTime.value = t; d.updateCamera(stage.camera); }));
  window.__qd.dice = dice; window.__qd.hero = hero;
  cam([0, 2.6 + rows * 0.9, 3.0 + rows * 1.4], [0, 0.2, 0], 36);
  stage.post.look({ bloom: 0.5 });
}
