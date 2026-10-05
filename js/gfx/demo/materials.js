// Foundation smoke test: every material in the library on a sphere, over a cobble floor, with embers.
import * as THREE from 'three';
import { mat } from '../mats.js';
import { Particles } from '../particles.js';
import { rngFrom } from '../noise.js';

export async function demo({ stage, stdLights, cam, U }) {
  const names = ['stone', 'stoneDark', 'cobble', 'wood', 'woodDark', 'leather', 'cloth', 'clothRed', 'steel', 'iron', 'gold', 'bronze', 'rust', 'bark', 'ash', 'dirt', 'grass', 'bone', 'skinGreen', 'skinOgre', 'skinHuman', 'fur', 'scales', 'parchment', 'rune'];
  stage.scene.fog = new THREE.FogExp2(0x0a0c14, 0.03);
  stdLights({ floor: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat('ash', { repeat: 8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.scene.add(floor);
  const cols = 7;
  names.forEach((n, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), mat(n, { repeat: 1.5 }));
    m.position.set((i % cols - (cols - 1) / 2) * 1.55, 0.62, Math.floor(i / cols) * -1.55 + 1.5);
    m.castShadow = m.receiveShadow = true; stage.scene.add(m);
  });
  const embers = stage.addParticles(new Particles({ max: 300, sprite: 'dot', gravity: 0.2 }));
  const rng = rngFrom('demo');
  stage.onFrame((dt) => {
    for (let i = 0; i < 4; i++) embers.emit({ pos: [(rng() - 0.5) * 14, rng() * 0.5, (rng() - 0.5) * 8], vel: [(rng() - 0.5) * 0.5, 0.6 + rng() * 0.8, (rng() - 0.5) * 0.3], life: 2 + rng() * 2, size: 0.03 + rng() * 0.05, color: 0xff9a3a, colorEnd: 0xff3a10, alpha: 1, turbulence: 1.5 });
  });
  cam([0, 3.2, 8.5], [0, 0.6, -0.5], 40);
  stage.post.look({ bloom: 0.8 });
  stage.advance(3);
}
