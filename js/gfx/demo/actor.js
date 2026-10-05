// Actor viewer: ?m=gfx/demo/actor.js&actor=goblin&anim=idle&t=0.6&yaw=0.5&cam=x,y,z&look=x,y,z
// Exposes window.__qd.actor. Shot sequences: {"eval":"__qd.actor.play('attack')","advance":0.4,"shot":"x.png"}
import * as THREE from 'three';
import { createActor } from '../actors/index.js';
import { Particles } from '../particles.js';

export async function demo({ stage, stdLights, cam, params, num }) {
  stage.scene.fog = new THREE.FogExp2(0x0a0c14, 0.02);
  stdLights();
  const id = params.get('actor') || 'goblin';
  const opts = {};
  for (const [k, v] of params.entries()) if (k.startsWith('o.')) opts[k.slice(2)] = isNaN(v) ? v : Number(v);
  if (params.has('cls')) opts.cls = params.get('cls');
  if (params.has('weapons')) { const [a, b] = params.get('weapons').split(','); opts.loadout = { NW: { id: a, rarity: num('rarity', 0) }, NE: { id: b || a, rarity: num('rarity', 0) } }; }
  const a = await createActor(id, { quality: stage.quality, seed: num('seed', 1), ...opts });
  a.root.rotation.y = num('yaw', 0);
  stage.scene.add(a.root);
  stage.onFrame((dt, t) => a.update(dt, t));
  window.__qd.actor = a;
  const h = a.height;
  cam([h * 0.9, h * 0.75, h * 2.4], [0, h * 0.5, 0], 38);
  const embers = stage.addParticles(new Particles({ max: 120, sprite: 'dot', gravity: 0.1 }));
  stage.onFrame(() => { if (Math.random() < 0.3) embers.emit({ pos: [(Math.random() - 0.5) * 4, 0.2, (Math.random() - 0.5) * 3], vel: [0, 0.5, 0], life: 3, size: 0.04, color: 0xff9a3a, colorEnd: 0xff3a10, turbulence: 1 }); });
  if (params.has('anim')) a.play(params.get('anim'), { fade: 0 }); // never await in manual mode: time only moves on step()
  a.update(num('t', 0), 0);
  stage.post.look({ bloom: 0.6 });
}
