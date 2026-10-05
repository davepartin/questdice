// Weapon showcase: every weapon at every rarity hung on a dark velvet wall.
//   ?m=gfx/demo/weapons.js                      full sheet (9 weapons x 4 rarities; bronze on top, diamond at the bottom)
//   &w=sword&r=2                                one weapon / one rarity (omit r for the 4 rarities side by side)
//   &yaw=0.6                                    turn the weapons about Y (default 0.55 so the flat of the blade shows)
//   &cam=x,y,z&look=x,y,z&fov=..                the usual camera overrides (hilt close-ups)
import * as THREE from 'three';
import { createWeapon, WEAPON_IDS } from '../weapons.js';

export async function demo({ stage, cam, params, num }) {
  stage.scene.background = new THREE.Color(0x07080d);
  if (!params.has('env0')) stage.environment({ top: 0x2c3a5a, horizon: 0x7a6a62, ground: 0x0c0a10, lights: [{ color: 0xffd0a0, intensity: 16, pos: [-5, 4, 4], size: 3.5 }, { color: 0x8ab4ff, intensity: 7, pos: [5, 5, -3], size: 4 }, { color: 0xffffff, intensity: 4, pos: [0, 9, 1], size: 6 }] });
  const key = new THREE.DirectionalLight(0xffd8b0, 3.4); key.position.set(-4, 5, 8);
  const rim = new THREE.DirectionalLight(0x7aa8ff, 2.6); rim.position.set(5, 3, -4);
  const fill = new THREE.HemisphereLight(0x8aa0d8, 0x2a1820, 0.7);
  const side = new THREE.DirectionalLight(0xff9a60, 1.2); side.position.set(6, 1.5, 4);
  stage.scene.add(key, rim, fill, side);

  // velvet backdrop with soft vertical folds
  const geo = new THREE.PlaneGeometry(40, 24, 160, 8); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 1.7) * 0.12 + Math.sin(x * 4.3 + 1) * 0.04); }
  geo.computeVertexNormals();
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x24101a, roughness: 0.95, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0x7a2840), sheenRoughness: 0.45 });
  const wall = new THREE.Mesh(geo, velvet); wall.position.set(0, 4, -0.9); wall.receiveShadow = true; stage.scene.add(wall);

  const id = params.get('w') || 'all';
  const ids = id === 'all' ? WEAPON_IDS : id.split(',');
  const rars = params.has('r') ? params.get('r').split(',').map(Number) : [0, 1, 2, 3];
  const single = ids.length === 1;
  const cols = single ? rars.length : ids.length; const rows = single ? 1 : rars.length;
  const sx = num('sp', single ? 1.15 : 1.0); const sy = num('sy', single ? 2.2 : 2.3);
  const updates = [];
  rars.forEach((r, ri) => {
    ids.forEach((w, wi) => {
      const g = createWeapon(w, r, { quality: stage.quality, style: params.get('style') || undefined });
      const box = new THREE.Box3().setFromObject(g); const c = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group(); holder.add(g);
      g.position.set(-c.x, -c.y, -c.z); g.rotation.y = 0; holder.rotation.y = num('yaw', ({ sword: 1.1, longsword: 1.1, dagger: 1.1, spear: 1.1, staff: 0.4, bow: 0.35, shield: 0.4, bracer: 0.5, fists: 0.5 })[w] ?? 0.5);
      const ci = single ? ri : wi; const rj = single ? 0 : ri;
      holder.position.set((ci - (cols - 1) / 2) * sx, 1.35 - rj * sy + (rows - 1) * sy / 2, 0);
      stage.scene.add(holder);
      if (g.userData.update) updates.push(g.userData.update);
      if (w === 'bow') g.userData.setDraw(num('draw', 0));
    });
  });
  stage.onFrame((dt, t) => { for (const u of updates) u(dt, t); });
  const tan = Math.tan((34 / 2) * Math.PI / 180); const aspect = 16 / 9;
  const vspan = rows * sy + 0.3; const hspan = cols * sx + 0.4;
  const dist = (single && rars.length === 1) ? 3.0 : Math.max(vspan / (2 * tan), hspan / (2 * tan * aspect));
  const cy = 1.35 + 0.0;
  cam([0, cy, dist / num('zoom', 1)], [0, cy, 0], 34);
  stage.post.look({ bloom: 0.4 });
}
