// The character mat: a heavy tabletop altar with nine socket wells, nine dice, and everything the board
// needs to *feel* like a tabletop (physical rolling, lifting, binding, light-lines). See docs/GFX.md §5.
//
//   const tray = createTray({ stage, quality });  stage.scene.add(tray.object);
//   tray.setHero(hero); tray.show(board); await tray.roll(board, { slots });
//
// tray.object: y = 0 is the leather inlay (the surface dice settle on), +Z toward the player.
// Footprint 4.7 x 4.7 m; the altar reaches 0.92 m below the surface.

import * as THREE from 'three';
import { mergeGeometries, worldUV, paint } from '../util.js';
import { mat, solid } from '../mats.js';
import { sprite } from '../tex.js';
import { mulberry32, hashStr } from '../noise.js';
import * as D from '../../data.js';
import { dieSpecs, createDie, restQuat } from './dice.js';
import { leanQuat, d4Lift } from './poly.js';
import { diceStyle, drawIcon } from './faces.js';
import { weaponIcon } from './art.js';
import { planRoll, samplePlan, ROLL, ROLL_PLAYBACK } from './roll.js';
import { paintDecals, paintSigil, CLASS_THEME } from './art.js';
import { petImg } from '../../g3/pets.js';
import { createFX, PULSE_COLORS } from './fx.js';

// ------------------------------------------------------------------------------- layout
export const PITCH = 1.25; // cell pitch (m)
const FH = 2.18;           // half width of the leather field
const FO = 2.35;           // half width of the outer frame
const DISH_TOP = 0.54;     // socket radius at the surface
const DEPTH = ROLL.dishDepth;
const DIE_SCALE = 1.5;     // dice are drawn this much larger than their physics body so they fill their sockets and read from afar
const RC = { NW: [0, 0], N: [1, 0], NE: [2, 0], W: [0, 1], C: [1, 1], E: [2, 1], SW: [0, 2], S: [1, 2], SE: [2, 2] };
// The pet die (Dave, Oct 2026): its own small stand in the dark to the left of the board, with the pet standing behind it.
export const PET_HOME = new THREE.Vector3(-(FO + 0.66), 0, 0.62);
const PET_SCALE = 1.25; const PET_DISH = 0.86; // the pet die and its dish, a little smaller than the board's
export const slotPos = (slot) => (slot === 'P' ? PET_HOME.clone() : new THREE.Vector3((RC[slot][0] - 1) * PITCH, 0, (RC[slot][1] - 1) * PITCH));

const DEFAULT_HERO = { cls: 'knight', loadout: { NW: { id: 'sword', rarity: 0 }, NE: { id: 'shield', rarity: 0 } }, strength: { W: 4, E: 4 }, special: { SW: 4, SE: 4 } };
const ROLE_GLOW = { head: 0xffe6b0, feet: 0xffe6b0, hand: 0xa8c8e8, heart: 0xffb82e, special: 0xd8e0f0 };
const STRAIGHT_GLOW = 0xff3ec8; // the dice in a straight: a magenta no other mark on the board uses
const SLOT_ORDER = D.SLOTS;
const ALL = [...SLOT_ORDER, 'P']; // the nine board sockets, then the pet's stand

function rrPath(p, hw, r) {
  p.moveTo(-hw + r, -hw); p.lineTo(hw - r, -hw); p.quadraticCurveTo(hw, -hw, hw, -hw + r); p.lineTo(hw, hw - r); p.quadraticCurveTo(hw, hw, hw - r, hw);
  p.lineTo(-hw + r, hw); p.quadraticCurveTo(-hw, hw, -hw, hw - r); p.lineTo(-hw, -hw + r); p.quadraticCurveTo(-hw, -hw, -hw + r, -hw);
  return p;
}
const flat = (g) => { g.rotateX(-Math.PI / 2); return g; };
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function ensureUV(g) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }
function plain(g) { const o = new THREE.BufferGeometry(); o.setAttribute('position', g.attributes.position); o.setAttribute('normal', g.attributes.normal); if (g.attributes.uv) o.setAttribute('uv', g.attributes.uv); if (g.index) o.setIndex(g.index); return o; }
function merge(list) { return mergeGeometries(list.map((g) => ensureUV(g.index ? g.toNonIndexed() : g)).map(plain)); }

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function createTray({ stage, quality = stage?.quality || 'high', auto = true, seed = 1 } = {}) {
  const Q = { low: 0, med: 1, high: 2 }[quality] ?? 2;
  const object = new THREE.Group(); object.name = 'tray';
  const table = new THREE.Group(); table.name = 'table'; object.add(table);
  const diceGroup = new THREE.Group(); diceGroup.name = 'dice'; object.add(diceGroup);
  const tray = { object, size: { w: FO * 2, d: FO * 2 }, quality, diceMeshes: {}, onPick: null, onHover: null, onSound: null, locked: false, enabled: true, hero: null, board: null, time: 0 };

  // =========================================================================== static geometry
  const seg = [8, 12, 20][Q];
  // ---- frame ring (carved wood) with bevel
  const outer = rrPath(new THREE.Shape(), FO - 0.02, 0.16); outer.holes.push(rrPath(new THREE.Path(), FH, 0.085));
  let frameG = new THREE.ExtrudeGeometry(outer, { depth: 0.305, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: seg });
  flat(frameG); frameG.translate(0, -0.28, 0); frameG = worldUV(frameG, 0.45);
  const frameMat = mat('woodDark', { repeat: 1, roughness: 0.9, color: 0xffffff }).clone();
  const frame = new THREE.Mesh(frameG, frameMat); frame.castShadow = true; frame.receiveShadow = true; frame.name = 'frame';
  // ---- leather field with nine round holes
  const fieldS = rrPath(new THREE.Shape(), FH + 0.04, 0.09);
  for (const s of SLOT_ORDER) { const p = slotPos(s); const h = new THREE.Path(); h.absarc(p.x, -p.z, DISH_TOP, 0, Math.PI * 2, true); fieldS.holes.push(h); }
  let fieldG = new THREE.ExtrudeGeometry(fieldS, { depth: 0.05, bevelEnabled: false, curveSegments: seg * 3 });
  flat(fieldG); fieldG.translate(0, -0.05, 0);
  { const pos = fieldG.attributes.position; const uv = new Float32Array(pos.count * 2); for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / (2 * FH) + 0.5; uv[i * 2 + 1] = 0.5 - pos.getZ(i) / (2 * FH); } fieldG.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  const leatherMat = mat('leather', { repeat: [5, 5], roughness: 1 }).clone(); leatherMat.color.set(0xc23c3c); leatherMat.normalScale.set(1.4, 1.4);
  const field = new THREE.Mesh(fieldG, leatherMat); field.receiveShadow = true; field.name = 'field';
  // ---- dishes (merged lathe) and brass rims
  const dishProfile = [[0.001, -DEPTH], [0.38, -DEPTH], [0.45, -DEPTH + 0.004], [0.495, -0.04], [0.525, -0.018], [DISH_TOP + 0.002, 0.0]];
  const dishes = []; const rims = []; const glowGeos = [];
  const rimProfile = [[0.528, -0.01], [0.54, 0.014], [0.558, 0.03], [0.585, 0.034], [0.607, 0.024], [0.624, 0.002], [0.628, -0.012]];
  const bandProfile = [[0.478, -0.047], [0.505, -0.034], [0.53, -0.012], [0.545, 0.002]];
  SLOT_ORDER.forEach((s, i) => {
    const p = slotPos(s);
    const dg = new THREE.LatheGeometry(dishProfile.map(([r, y]) => new THREE.Vector2(r, y)), seg * 4); dg.translate(p.x, 0, p.z);
    paint(dg, (x, y, z, c) => { const r = Math.hypot(x - p.x, z - p.z); const k = THREE.MathUtils.clamp((r - 0.3) / 0.25, 0, 1); c.setRGB(0.22 + 0.25 * k, 0.2 + 0.23 * k, 0.2 + 0.22 * k); });
    dishes.push(dg);
    const rg = new THREE.LatheGeometry(rimProfile.map(([r, y]) => new THREE.Vector2(r, y)), seg * 4); rg.translate(p.x, 0, p.z); rims.push(rg);
    const bg = new THREE.LatheGeometry(bandProfile.map(([r, y]) => new THREE.Vector2(r, y + 0.003)), seg * 4); bg.translate(p.x, 0, p.z);
    const n = bg.attributes.position.count; const aS = new Float32Array(n).fill(i); const aV = new Float32Array(n);
    for (let k = 0; k < n; k++) aV[k] = (k % bandProfile.length) / (bandProfile.length - 1);
    bg.setAttribute('aSock', new THREE.BufferAttribute(aS, 1)); bg.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
    glowGeos.push(bg);
  });
  // ---- the pet's stand: a small wooden drum with a leather top and a brass-rimmed dish, left of the frame
  const petStand = new THREE.Group(); petStand.name = 'petStand'; petStand.visible = false;
  {
    const p = PET_HOME; const k = PET_DISH; const R = 0.68;
    const dg = new THREE.LatheGeometry(dishProfile.map(([r, y]) => new THREE.Vector2(r * k, y)), seg * 4); dg.translate(p.x, 0, p.z);
    paint(dg, (x, y, z, c) => { const r = Math.hypot(x - p.x, z - p.z) / k; const kk = THREE.MathUtils.clamp((r - 0.3) / 0.25, 0, 1); c.setRGB(0.22 + 0.25 * kk, 0.2 + 0.23 * kk, 0.2 + 0.22 * kk); });
    const top = flat(new THREE.RingGeometry(DISH_TOP * k, R, seg * 4)); top.translate(p.x, -0.001, p.z);
    let side = new THREE.CylinderGeometry(R, R + 0.08, 0.36, seg * 4, 1, true); side.translate(p.x, -0.18, p.z); side = worldUV(side, 0.45);
    const rim = new THREE.LatheGeometry(rimProfile.map(([r, y]) => new THREE.Vector2(r * k, y)), seg * 4); rim.translate(p.x, 0, p.z);
    const lip = new THREE.TorusGeometry(R, 0.026, 6, seg * 4); lip.rotateX(Math.PI / 2); lip.translate(p.x, 0.004, p.z);
    const bg = new THREE.LatheGeometry(bandProfile.map(([r, y]) => new THREE.Vector2(r * k, y + 0.003)), seg * 4); bg.translate(p.x, 0, p.z);
    const n = bg.attributes.position.count; const aV = new Float32Array(n); for (let q = 0; q < n; q++) aV[q] = (q % bandProfile.length) / (bandProfile.length - 1);
    bg.setAttribute('aSock', new THREE.BufferAttribute(new Float32Array(n).fill(SLOT_ORDER.length), 1)); bg.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
    glowGeos.push(bg);
    petStand.userData.parts = { dg, top, side, rim, lip };
  }
  const dishG = mergeGeometries(dishes.map((g) => plain(g)).map((g) => { g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; }));
  // (re-apply the vertex colours: merge needs matching attributes)
  { const cols = []; dishes.forEach((g) => cols.push(g.attributes.color)); const arr = new Float32Array(cols.reduce((n, c) => n + c.array.length, 0)); let o = 0; cols.forEach((c) => { arr.set(c.array, o); o += c.array.length; }); dishG.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }
  const dishMat = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x5e5450, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide, envMapIntensity: 0.25 });
  const dishMesh = new THREE.Mesh(dishG, dishMat); dishMesh.receiveShadow = true; dishMesh.name = 'dishes';
  // ---- brass: rims, corner caps, studs, inner frame inlay, rosettes
  const brassParts = [...rims];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    brassParts.push(box(0.46, 0.075, 0.46, sx * (FO - 0.2), 0.045 + 0.0, sz * (FO - 0.2)));
    for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) { const s = new THREE.SphereGeometry(0.036, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); s.translate(sx * (FO - 0.2) + dx, 0.083, sz * (FO - 0.2) + dz); brassParts.push(s); }
  }
  // brass strips along the inner and outer frame lip
  const lipHW = (hw, w) => [box(2 * hw, 0.016, w, 0, 0.05, -hw), box(2 * hw, 0.016, w, 0, 0.05, hw), box(w, 0.016, 2 * hw, -hw, 0.05, 0), box(w, 0.016, 2 * hw, hw, 0.05, 0)];
  brassParts.push(...lipHW(FH + 0.012, 0.03));
  brassParts.push(...lipHW(FO - 0.045, 0.026));
  // studs along the frame
  for (const side of [0, 1, 2, 3]) for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) < 1 && false) continue;
    const u = i * 0.6; const off = FO - 0.1; const [x, z] = side === 0 ? [u, -off] : side === 1 ? [u, off] : side === 2 ? [-off, u] : [off, u];
    const s = new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); s.translate(x, 0.04, z); brassParts.push(s);
  }
  // rosette studs in the diagonal gaps (not the four around the heart: those are painted hearts)
  for (const gx of [-1.5, -0.5, 0.5, 1.5]) for (const gz of [-1.5, -0.5, 0.5, 1.5]) {
    const s = new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); s.translate(gx * PITCH, 0.0, gz * PITCH);
    if (!(Math.abs(gx) < 1 && Math.abs(gz) < 1)) brassParts.push(s);
  }
  const brassG = worldUV(merge(brassParts), 0.35);
  const brassMat = mat('bronze', { repeat: 1, roughness: 0.75 }).clone(); brassMat.side = THREE.DoubleSide; brassMat.color.set(0xffe6b0); brassMat.envMapIntensity = 1.4;
  const brass = new THREE.Mesh(brassG, brassMat); brass.castShadow = true; brass.receiveShadow = true; brass.name = 'brass';
  // ---- glow bands (one draw, per-socket uniforms)
  const glowG = mergeGeometries(glowGeos.map((g) => plain2(g)));
  function plain2(g) { const o = plain(g); o.setAttribute('aSock', g.attributes.aSock); o.setAttribute('aV', g.attributes.aV); return o; }
  const glowU = { uG: { value: new Float32Array(10).fill(0.6) }, uCol: { value: Array.from({ length: 10 }, () => new THREE.Color(0xffffff)) } };
  const glowMat = new THREE.ShaderMaterial({
    uniforms: glowU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float aSock; attribute float aV; uniform float uG[10]; uniform vec3 uCol[10]; varying vec3 vC; varying float vV;
      void main(){ int i = int(aSock + 0.5); vC = uCol[i] * uG[i]; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vV;
      void main(){ float a = smoothstep(0.0, 0.5, vV) * (0.55 + 0.45 * smoothstep(0.55, 1.0, vV)); gl_FragColor = vec4(vC * a * 1.2, a); }`,
  });
  const glow = new THREE.Mesh(glowG, glowMat); glow.renderOrder = 3; glow.frustumCulled = false; glow.name = 'socketGlow';
  // ---- decal overlay (stitching, runes, icons, bracket)
  const decalSize = [1024, 1536, 2048][Q];
  const decalMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.42, metalness: 0.55, depthWrite: false, emissive: 0xffffff, emissiveIntensity: 1.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 1.1 });
  const decal = new THREE.Mesh(flat(new THREE.PlaneGeometry(2 * FH, 2 * FH)), decalMat); decal.position.y = 0.002; decal.renderOrder = 1; decal.name = 'decals'; decal.receiveShadow = true;
  // ---- body: apron, legs, plinth, iron bands
  const bodyParts = [box(2 * FH + 0.02, 0.26, 2 * FH + 0.02, 0, -0.18, 0)]; // under-field filler
  const apron = new THREE.BoxGeometry(4.55, 0.4, 4.55); apron.translate(0, -0.5, 0); bodyParts.push(apron);
  const step = new THREE.BoxGeometry(3.7, 0.12, 3.7); step.translate(0, -0.84, 0); bodyParts.push(step);
  const plinth = new THREE.BoxGeometry(4.45, 0.1, 4.45); plinth.translate(0, -0.87, 0);
  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lg = new THREE.CylinderGeometry(0.27, 0.22, 0.34, 4, 1); lg.rotateY(Math.PI / 4); lg.translate(sx * 1.88, -0.76, sz * 1.88); legs.push(lg);
    const cap = new THREE.CylinderGeometry(0.33, 0.33, 0.07, 4, 1); cap.rotateY(Math.PI / 4); cap.translate(sx * 1.88, -0.9, sz * 1.88); legs.push(cap);
  }
  const slim = !!(typeof window !== 'undefined' && window.__SLIM_TRAY !== false); // a low slab: no apron, legs or plinth, so the board lies on the ground
  const bodyG = worldUV(merge(slim ? [bodyParts[0]] : [...bodyParts, ...legs, plinth]), 0.5);
  paint(bodyG, (x, y, z, c) => { const k = 0.55 + 0.45 * THREE.MathUtils.clamp((y + 0.95) / 0.7, 0, 1); c.setRGB(k, k * 0.96, k * 0.92); });
  const bodyMat = mat('stoneDark', { repeat: 1.2, roughness: 1 }).clone(); bodyMat.vertexColors = true; bodyMat.emissive = new THREE.Color(0x2a1a0e); bodyMat.emissiveIntensity = 0.6; bodyMat.color.set(0xd8c8b8);
  const body = new THREE.Mesh(bodyG, bodyMat); body.castShadow = true; body.receiveShadow = true; body.name = 'body';
  const ironParts = [];
  for (const y of [-0.3, -0.7]) { for (const sx of [-1, 1]) { ironParts.push(box(4.6, 0.05, 0.05, 0, y, sx * 2.3)); ironParts.push(box(0.05, 0.05, 4.6, sx * 2.3, y, 0)); } }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = new THREE.CylinderGeometry(0.285, 0.285, 0.045, 4, 1); b.rotateY(Math.PI / 4); b.translate(sx * 1.88, -0.7, sz * 1.88); ironParts.push(b); }
  const ironG = worldUV(merge(ironParts), 1.2);
  const ironMat = mat('iron', { repeat: 1, roughness: 0.8 }).clone(); ironMat.color.set(0xbbbbc4);
  const iron = new THREE.Mesh(ironG, ironMat); iron.castShadow = true; iron.receiveShadow = true; iron.name = 'iron';
  // ---- sigil plaque on the front apron
  const plaqueMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.35 });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), plaqueMat); plaque.position.set(0, -0.12, 2.278); plaque.name = 'sigil';
  {
    const { dg, top, side, rim, lip } = petStand.userData.parts; delete petStand.userData.parts;
    const dm = new THREE.Mesh(dg, dishMat); dm.receiveShadow = true;
    const tm = new THREE.Mesh(top, leatherMat); tm.receiveShadow = true;
    const sm = new THREE.Mesh(side, frameMat); sm.castShadow = true; sm.receiveShadow = true;
    const bm = new THREE.Mesh(worldUV(merge([rim, lip]), 0.35), brassMat); bm.castShadow = true;
    petStand.add(sm, tm, dm, bm);
  }
  table.add(body, iron, frame, field, dishMesh, brass, glow, decal, plaque, petStand);

  // ---- local lights (no shadows): a warm key above, a cool rim behind
  const keyLight = new THREE.PointLight(diceStyle().neutralLight ? 0xffffff : 0xffeedd, 14 * diceStyle().light, 0, 2); keyLight.position.set(-1.8, 3.6, 2.6); keyLight.name = 'trayKey';
  const rimLight = new THREE.PointLight(diceStyle().neutralLight ? 0xffffff : 0x78a4ff, 9 * diceStyle().light, 0, 2); rimLight.position.set(2.6, 1.9, -2.8); rimLight.name = 'trayRim';
  object.add(keyLight, rimLight);

  // ---- contact shadows (multiply-blended instanced blobs: fade by lightening the instance colour)
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgb(30,26,30)'); gr.addColorStop(0.5, 'rgb(120,116,120)'); gr.addColorStop(1, 'rgb(255,255,255)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const blobs = new THREE.InstancedMesh(flat(new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: blobTex, blending: THREE.MultiplyBlending, transparent: true, depthWrite: false, premultipliedAlpha: true, toneMapped: false }), ALL.length);
  blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); blobs.renderOrder = 2; blobs.frustumCulled = false; blobs.setColorAt(0, new THREE.Color(1, 1, 1)); object.add(blobs);

  // =========================================================================== per-slot state
  const fx = createFX({ root: object, stage, getCenter: (slot) => centerOf(slot), dieHeight: 0.4 });
  const S = {};
  ALL.forEach((slot, i) => {
    S[slot] = {
      slot, i, role: D.ROLE[slot], home: slotPos(slot), scale: slot === 'P' ? PET_SCALE : DIE_SCALE, die: null, spec: null, value: 1, quat: new THREE.Quaternion(), pos: new THREE.Vector3(),
      lift: 0, liftV: 0, sink: 0, hop: 0, hopV: 0, dim: 0, selected: false, hover: false, bound: false, flash: 0, flashCol: new THREE.Color(0xffffff),
      anim: null, glowBoost: 0, rest: 1, chains: null, hex: null, ring: null, halo: null,
    };
  });
  const centerOf = (slot) => { const s = S[slot]; return new THREE.Vector3(s.home.x, (s.die ? s.die.inR : 0.4) - DEPTH + s.lift + 0.1, s.home.z); };
  const restY = (s) => -DEPTH + s.die.inR + d4Lift(s.die.poly);

  // selection ring, halo and hover ring per slot (only visible when used)
  const ringTex = sprite('ring'); const glowTex = sprite('glow');
  for (const slot of ALL) {
    const s = S[slot];
    s.ring = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.9, 1.9)), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xffe9a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
    s.ring.position.set(s.home.x, 0.012, s.home.z); s.ring.visible = false; s.ring.renderOrder = 9; object.add(s.ring);
    s.halo = new THREE.Mesh(flat(new THREE.PlaneGeometry(2.3, 2.3)), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd98a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
    s.halo.position.set(s.home.x, 0.008, s.home.z); s.halo.visible = false; s.halo.renderOrder = 8; object.add(s.halo);
    if (slot === 'P') { s.ring.geometry.scale(0.82, 1, 0.82); s.halo.geometry.scale(0.82, 1, 0.82); }
  }
  // an empty socket (no weapon, talent or hand there): a light diagonal line and the word EMPTY, in the same tan as the other socket marks
  const vacTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.lineCap = 'round';
    g.fillStyle = 'rgba(28,16,8,0.35)'; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a98e62'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.lineWidth = 4; g.beginPath(); g.moveTo(-40, 40); g.lineTo(40, -40); g.stroke();
    g.font = '800 22px "Trebuchet MS", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(28,16,8,0.95)'; g.lineWidth = 7; g.strokeText('EMPTY', 0, 1); g.fillStyle = '#d2b47e'; g.fillText('EMPTY', 0, 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  for (const slot of ALL) {
    const s = S[slot];
    s.vac = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.9, 1.9)), new THREE.MeshBasicMaterial({ map: vacTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.32 }));
    s.vac.position.set(s.home.x, 0.03, s.home.z); s.vac.visible = false; s.vac.renderOrder = 7; object.add(s.vac);
    // what goes in this socket, shown before the dice are thrown (tan and brown, like the table)
    s.ico = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.9, 1.9)), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, opacity: 0.95 }));
    s.ico.position.set(s.home.x, 0.032, s.home.z); s.ico.visible = false; s.ico.renderOrder = 7; object.add(s.ico);
    if (slot === 'P') s.ico.scale.setScalar(PET_DISH);
  }
  const SLOT_ICON = { head: 'helmet', feet: 'boots', hand: 'gauntlet', heart: 'heart', special: 'talent' };
  function paintSlotIcon(s, hero) {
    const wi = hero.loadout[s.slot]; const name = s.role === 'weapon' ? (wi?.twin && D.modelOf(wi.id) === 'bow' ? 'arrows' : weaponIcon(D.modelOf(wi?.id))) : SLOT_ICON[s.role];
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const right = s.slot === 'E' || s.slot === 'NE' || s.slot === 'SE';
    const flip = name === 'bow' ? !right : name === 'arrows' ? false : right; // the bow's arrow points out to its own side
    g.translate(128, 128);
    // a medallion that sits inside the socket circle (radius ~72px at this scale): dark inset disc, thin tan ring, icon well inside it
    g.fillStyle = 'rgba(28,16,8,0.55)'; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(201,160,104,0.75)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.stroke();
    g.save(); g.beginPath(); g.arc(0, 0, 57, 0, Math.PI * 2); g.clip(); if (flip) g.scale(-1, 1);
    const sz = 74;
    if (s.role === 'pet') { // a paw print for the pet's stand
      const paw = (dx, dy) => { g.beginPath(); g.ellipse(dx, dy + 12, 20, 16, 0, 0, Math.PI * 2); g.fill(); for (const [x, y] of [[-21, -6], [-8, -19], [8, -19], [21, -6]]) { g.beginPath(); g.ellipse(dx + x, dy + y, 8, 9.5, 0, 0, Math.PI * 2); g.fill(); } };
      g.fillStyle = 'rgba(10,5,2,0.6)'; paw(1.5, 2.5);
      const gp = g.createLinearGradient(0, -30, 0, 30); gp.addColorStop(0, '#ead2a0'); gp.addColorStop(1, '#9a6c3c'); g.fillStyle = gp; paw(0, 0);
      g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; s.ico.material.map?.dispose?.(); s.ico.material.map = t; s.ico.material.needsUpdate = true; return;
    }
    g.fillStyle = 'rgba(10,5,2,0.6)'; drawIcon(g, name, 1.5, 2.5, sz); // carved shadow
    const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, '#ead2a0'); gr.addColorStop(0.5, '#cfa468'); gr.addColorStop(1, '#9a6c3c');
    g.fillStyle = gr; drawIcon(g, name, 0, 0, sz);
    g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    s.ico.material.map?.dispose?.(); s.ico.material.map = t; s.ico.material.needsUpdate = true;
  }
  tray.setWaiting = function setWaiting(on = true) { for (const slot of ALL) S[slot].waiting = !!on; return tray; }; // dice not thrown yet: icons show, dice stay off the table
  const hexTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); const hexP = (r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
    hexP(118); g.fillStyle = 'rgba(190,200,225,0.16)'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#e8eef9'; g.shadowColor = '#b8c8ff'; g.shadowBlur = 16; hexP(112); g.stroke(); g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = 'rgba(220,228,245,0.6)'; hexP(86); g.stroke(); hexP(60); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const chainGeo = new THREE.TorusGeometry(0.055, 0.017, 5, 9); chainGeo.scale(1.35, 1, 1);
  // bright silver chains (Dave: the dark ones were lost on the board); a little self-light so they read under any light
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xe6ebf5, metalness: 0.55, roughness: 0.26, emissive: 0x9aa4bc, emissiveIntensity: 0.55 });

  // =========================================================================== hero / dice
  const camLocal = new THREE.Vector3();
  const trayCam = () => (stage.trayCamera && stage.post?.trayPass?.enabled ? stage.trayCamera : stage.camera);
  function away() {
    const cam = stage.trayCamera && stage.post?.trayPass?.enabled ? stage.trayCamera : stage.camera; camLocal.copy(cam.position); object.worldToLocal(camLocal);
    const l = Math.hypot(camLocal.x, camLocal.z);
    if (l < 0.5) return [0, -1];
    return [-camLocal.x / l, -camLocal.z / l];
  }
  function jitterFor(slot, v) { const r = mulberry32(hashStr(`${slot}|${v}|${seed}`)); return (r() - 0.5) * 0.44; }
  function viewDir() { const a = away(); const c = Math.cos(0.34); return new THREE.Vector3(-a[0] * c, Math.sin(0.34), -a[1] * c); }
  function placeAtRest(s) {
    if (!s.die) return;
    const a = away();
    restQuat(s.die.poly, s.value, a[0], a[1], jitterFor(s.slot, s.value), s.quat);
    leanQuat(s.die.poly, s.quat, s.value, s.quat);
    s.pos.set(s.home.x, restY(s), s.home.z);
  }
  function buildDie(s, spec) {
    if (s.die) { diceGroup.remove(s.die.mesh); s.die.dispose(); }
    s.spec = spec; s.die = createDie({ spec, quality: 'high' }); // dice are few and small on screen: always paint their faces sharp
    s.die.mesh.scale.setScalar(s.scale); s.die.mesh.userData.slot = s.slot; diceGroup.add(s.die.mesh); tray.diceMeshes[s.slot] = s.die.mesh;
    s.value = Math.min(Math.max(1, s.value), spec.sides);
    placeAtRest(s);
  }
  let theme = CLASS_THEME.knight; let twoHanded = false;
  function applyTheme(hero) {
    theme = CLASS_THEME[hero.cls] || CLASS_THEME.knight;
    leatherMat.color.set(theme.leather).multiplyScalar(0.55); brassMat.color.set(theme.trim).lerp(new THREE.Color(0xffe6b0), 0.55);
    plaqueMat.map = new THREE.CanvasTexture(paintSigil({ theme })); plaqueMat.map.colorSpace = THREE.SRGBColorSpace; plaqueMat.map.anisotropy = 8; plaqueMat.emissiveMap = plaqueMat.map; plaqueMat.needsUpdate = true;
    const art = paintDecals({ size: decalSize, FH, pitch: PITCH, theme, hero, twoHanded, dishR: DISH_TOP, weaponIds: { NW: hero.loadout.NW.id, NE: hero.loadout.NE.id } });
    for (const [k, c] of [['map', art.albedo], ['emissiveMap', art.emissive]]) {
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
      decalMat[k]?.dispose?.(); decalMat[k] = t;
    }
    decalMat.needsUpdate = true;
    ALL.forEach((slot) => {
      let col = ROLE_GLOW[S[slot].role] ?? 0xffffff;
      if (S[slot].role === 'weapon') col = D.WEAPONS[hero.loadout[slot].id]?.lean === 'def' ? 0x4db4ff : 0xff4d4d;
      if (slot === 'P') col = new THREE.Color(D.PETS[hero.pet?.type]?.color || '#ffffff').getHex(); // the pet's stand glows in the pet's colour
      S[slot].baseGlow = col; glowU.uCol.value[S[slot].i].setHex(S[slot].inStraight ? STRAIGHT_GLOW : col);
    });
  }
  // Light the sockets under the dice that make a straight (null or [] clears it).
  tray.setStraight = function setStraight(slots) {
    const on = new Set(slots || []);
    for (const slot of SLOT_ORDER) {
      const s = S[slot]; const was = !!s.inStraight; s.inStraight = on.has(slot);
      glowU.uCol.value[s.i].setHex(s.inStraight ? STRAIGHT_GLOW : s.baseGlow ?? 0xffffff);
      if (s.inStraight && !was) s.glowBoost = Math.max(s.glowBoost, 1); // a little flare as it lights
    }
  };
  tray.setHero = function setHero(hero) {
    hero = hero || DEFAULT_HERO; tray.hero = hero;
    twoHanded = D.WEAPONS[hero.loadout.NW.id]?.hands === 2;
    const specs = dieSpecs(hero);
    for (const slot of ALL) { const s = S[slot]; if (!s.die || s.spec.key !== specs[slot].key) buildDie(s, specs[slot]); }
    applyTheme(hero);
    for (const slot of ALL) paintSlotIcon(S[slot], hero);
    tray.setPet(hero.pet?.type || null);
    return tray;
  };
  // ---- the pet: a picture of it standing behind its die (a camera-facing sprite), shown only when the hero has one
  const petSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
  const PET_H = 1.38; let petW = PET_H; // the picture's height on the table; its width follows the picture
  petSpr.center.set(0.5, 0.04); petSpr.scale.set(PET_H, PET_H, 1); petSpr.position.set(PET_HOME.x, 0.02, PET_HOME.z - 0.95); petSpr.visible = false; petSpr.renderOrder = 6; petSpr.name = 'pet';
  object.add(petSpr);
  // a soft glow in the pet's colour behind it, so a dark pet (Ember, the black dragon) still stands out from the dark
  const petGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  petGlow.scale.set(2.1, 2.1, 1); petGlow.renderOrder = 5; petGlow.visible = false; object.add(petGlow);
  let petType = null; let petHop = 0; let petHopV = 0;
  tray.setPet = function setPet(type) {
    petStand.visible = !!type; S.P.vacant = !type; if (!type) { petSpr.visible = false; petGlow.visible = false; } else petGlow.material.color.set(D.PETS[type]?.color || '#ffffff');
    if (type === petType) { if (type && petSpr.material.map) { petSpr.visible = true; petGlow.visible = true; } return tray; }
    petType = type; if (!type || typeof Image === 'undefined') return tray;
    const img = new Image();
    img.onload = () => {
      if (petType !== type) return;
      const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
      petW = PET_H * (img.naturalWidth / img.naturalHeight || 1);
      petSpr.material.map?.dispose?.(); petSpr.material.map = t; petSpr.material.needsUpdate = true; petSpr.visible = !!petType; petGlow.visible = !!petType;
    };
    img.src = petImg(type);
    return tray;
  };
  tray.petHop = () => { petHopV = Math.max(petHopV, 3.2); };
  tray.twoHanded = () => twoHanded;

  // =========================================================================== show / values
  tray.show = function show(board) {
    tray.board = board;
    for (const slot of ALL) {
      const s = S[slot]; if (!s.die || !board?.[slot]) continue;
      s.anim = null; s.value = Math.min(Math.max(1, board[slot].v | 0), s.die.sides); placeAtRest(s);
    }
    return tray;
  };
  tray.setValue = function setValue(slot, v, { animate = false } = {}) {
    const s = S[slot]; if (!s?.die) return Promise.resolve();
    v = Math.min(Math.max(1, v | 0), s.die.sides);
    if (tray.board?.[slot]) tray.board[slot].v = v;
    if (!animate) { s.value = v; s.anim = null; placeAtRest(s); return Promise.resolve(); }
    const q0 = s.quat.clone(); s.value = v; placeAtRest(s); const q1 = s.quat.clone();
    return new Promise((res) => { s.anim = { kind: 'flip', t: 0, dur: 0.6, q0, q1, res, fired: false }; });
  };

  // =========================================================================== rolling
  let rollJob = null;
  tray.roll = function roll(board, { slots = null, seed: sd, mode = 'throw' } = {}) {
    if (rollJob) finishRoll(true);
    tray.board = board;
    const list = (slots && slots.length ? [...slots] : ALL).filter((sl) => S[sl]?.die && !(sl === 'P' && S.P.vacant));
    const a = away();
    const items = []; const statics = [];
    const used = new Set(list);
    for (const slot of ALL) {
      const s = S[slot]; if (!s.die || (slot === 'P' && s.vacant)) continue;
      const rb = (s.die.poly.inR + s.die.poly.outR) * 0.47;
      if (!used.has(slot)) { statics.push({ x: s.pos.x, y: s.pos.y, z: s.pos.z, r: rb }); continue; }
      const v = Math.min(Math.max(1, (board[slot]?.v ?? s.value) | 0), s.die.sides);
      s.anim = null;
      if (s.waiting) { s.waiting = false; s.pos.set(s.home.x, 2.8, s.home.z + 2.4); } // first throw: the die comes in from above the table
      const box = slot === 'P' ? [s.home.x - 0.26, s.home.x + 0.26, s.home.z - 0.26, s.home.z + 0.26] : null; // the pet die tumbles inside its own stand
      items.push({ slot, die: s.die, start: { pos: s.pos.clone(), quat: s.quat.clone() }, sock: s.home, label: v, away: a, box });
    }
    const plans = planRoll(items, statics, { seed: sd ?? ((seed * 2654435761 + tray.time * 1000) >>> 0), mode });
    tray.lastPlans = plans;
    for (const it of items) { const s = S[it.slot]; s.value = it.label; const plan = plans[it.slot]; plan.jit = jitterFor(it.slot, it.label); s.anim = { kind: 'roll', plan, t: 0, ev: 0 }; }
    return new Promise((res) => { rollJob = { res, slots: list, plans }; });
  };
  function finishRoll(snap) {
    if (!rollJob) return;
    const job = rollJob; rollJob = null;
    if (snap) for (const sl of job.slots) { const s = S[sl]; s.anim = null; placeAtRest(s); }
    job.res(job.slots.map((sl) => ({ slot: sl, v: S[sl].value })));
  }

  // =========================================================================== selection, binding, states
  tray.setSelected = function setSelected(set) { const st = set instanceof Set ? set : new Set(set || []); for (const slot of ALL) S[slot].selected = st.has(slot); return tray; };
  tray.setBound = function setBound(slot, on = true) {
    const s = S[slot]; if (!s) return tray; s.bound = !!on;
    if (on && !s.chains) buildChains(s);
    if (s.chains) s.chains.group.visible = !!on || s.chains.k > 0.01;
    return tray;
  };
  tray.setDimmed = function setDimmed(slot, on = true) { if (S[slot]) S[slot].dimmed = !!on; return tray; };
  tray.setVacant = function setVacant(slot, on = true) {
    if (slot === 'P') { if (on) tray.setPet(null); else tray.setPet(tray.hero?.pet?.type || null); return tray; } // no pet: no stand at all (never an EMPTY mark)
    const s = S[slot]; if (s) { s.vacant = !!on; s.vac.visible = !!on; if (s.die) s.die.mesh.visible = !on; } return tray;
  };
  function buildChains(s) {
    const R = s.die.poly.outR + 0.07; const N = 22;
    const group = new THREE.Group(); group.visible = false;
    const mk = (plane) => { const m = new THREE.InstancedMesh(chainGeo, chainMat, N); m.castShadow = true; m.frustumCulled = false; group.add(m); return { m, plane }; };
    const bands = [mk('belt'), mk('diag'), mk('diag2')].slice(0, Q === 0 ? 2 : 3);
    const dummy = new THREE.Object3D(); const T = new THREE.Vector3(); const U = new THREE.Vector3(); const Vv = new THREE.Vector3(); const P = new THREE.Vector3();
    bands.forEach((b, bi) => {
      const axis = b.plane === 'belt' ? new THREE.Vector3(0, 1, 0) : b.plane === 'diag' ? new THREE.Vector3(1, 0, 1).normalize() : new THREE.Vector3(-1, 0, 1).normalize();
      const tilt = b.plane === 'belt' ? 0 : 1;
      U.set(1, 0, 0); if (Math.abs(axis.dot(U)) > 0.9) U.set(0, 0, 1); U.crossVectors(axis, U).normalize(); Vv.crossVectors(axis, U);
      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        P.copy(U).multiplyScalar(Math.cos(th) * R).addScaledVector(Vv, Math.sin(th) * R);
        T.copy(U).multiplyScalar(-Math.sin(th)).addScaledVector(Vv, Math.cos(th)).normalize();
        const radial = P.clone().normalize();
        const bin = new THREE.Vector3().crossVectors(T, radial).normalize();
        const m4 = new THREE.Matrix4();
        if (i % 2) m4.makeBasis(T, bin, radial.clone().negate()); else m4.makeBasis(T, radial, bin);
        dummy.matrix.copy(m4); dummy.matrix.setPosition(P); dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.updateMatrix(); b.m.setMatrixAt(i, dummy.matrix);
      }
      b.m.instanceMatrix.needsUpdate = true;
    });
    object.add(group); s.chains = { group, k: 0 };
    s.hex = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.25, 1.25)), new THREE.MeshBasicMaterial({ map: hexTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
    s.hex.position.set(s.home.x, -DEPTH + 0.006, s.home.z); s.hex.renderOrder = 2; s.hex.visible = false; object.add(s.hex);
  }

  // =========================================================================== effects API
  tray.pulse = function pulse(slot, kind = 'gold') {
    const s = S[slot]; if (!s?.die) return tray;
    const c = fx.pulse(slot, kind);
    s.flashCol.setHex(c); s.flash = 1; s.hopV = Math.max(s.hopV, 2.2); s.glowBoost = 1;
    return tray;
  };
  const SLOT_SETS = { top: ['NW', 'N', 'NE'], vertical: ['N', 'C', 'S'] };
  tray.highlight = function highlight(slots, color = 'gold', opts = {}) {
    if (slots == null) { fx.clearHighlights(); return Promise.resolve(); }
    const list = typeof slots === 'string' ? SLOT_SETS[slots] || [slots] : [...slots];
    const pts = list.map((sl) => { const c = centerOf(sl); return new THREE.Vector3(c.x, (S[sl].die?.inR || 0.4) * 2 - DEPTH + 0.04, c.z); });
    const h = fx.highlight(pts, color, opts);
    list.forEach((sl, i) => { setTimeout(() => {}, 0); const s = S[sl]; s.glowBoost = Math.max(s.glowBoost, 0.6); });
    // glow each die as the head passes
    const sweep = opts.sweep ?? 0.55;
    list.forEach((sl, i) => { S[sl]._hlAt = tray.time + (i / Math.max(1, list.length - 1)) * sweep; S[sl]._hlCol = color; });
    return h.promise;
  };
  tray.clearHighlight = () => fx.clearHighlights();
  // A glowing bar tying the dice of a triple together (slots in order), drawn just above the dice. `setLink(null)` clears it.
  const link = new THREE.Group(); link.name = 'link'; object.add(link);
  const linkMats = [];
  tray.setLink = function setLink(groups) { // groups: [{ slots:[...], color }] (or null)
    while (link.children.length) { const c = link.children.pop(); c.geometry.dispose(); }
    linkMats.length = 0;
    for (const g of groups || []) {
      if (!g.slots || g.slots.length < 2) continue;
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(g.color ?? 0xffd23d).multiplyScalar(1.1), transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
      linkMats.push(mat);
      const pts = g.slots.map((sl) => { const p = slotPos(sl); return new THREE.Vector3(p.x, 0.75, p.z); });
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i]; const p1 = pts[i + 1]; const len = p0.distanceTo(p1);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8, 1, true), mat);
        m.position.copy(p0).add(p1).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); m.renderOrder = 20; link.add(m);
      }
      for (const p of pts) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat); n.position.copy(p); n.renderOrder = 20; link.add(n); }
    }
  };
  let lockK = 0; let lockFlare = 0;
  tray.lock = function lock() { if (tray.locked) return tray; tray.locked = true; lockFlare = 1; for (const slot of ALL) { if (S[slot].vacant && slot === 'P') continue; const p = S[slot].home; fx.ring(p.x, 0.01, p.z, 0xffd98a, { dur: 0.8, s0: 0.8, s1: 2.8, a: 1.1 }); fx.sparkBurst(p.x, 0.06, p.z, 8, 0xffd98a, { speed: 1.2, up: 1.2, size: 0.04, life: 0.6 }); } tray.onSound?.('lock', { slot: null, speed: 1 }); return tray; };
  tray.unlock = function unlock() { tray.locked = false; lockFlare = 0.4; return tray; };
  tray.setSoundHandler = (fn) => { tray.onSound = fn; };

  // =========================================================================== positions for the HUD
  tray.worldPos = function worldPos(slot, { dy = 0.45 } = {}) { const s = S[slot]; const v = new THREE.Vector3(s.home.x, -DEPTH + (s.die?.inR || 0.4) + s.lift + dy, s.home.z); return object.localToWorld(v); };
  tray.projectSlot = function projectSlot(slot, { dy = 0.9 } = {}) {
    const v = tray.worldPos(slot, { dy }); v.project(trayCam());
    const w = stage.width; const h = stage.height;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && v.z > -1, ndc: { x: v.x, y: v.y } };
  };
  tray.slotAt = (x, y, slack = 1) => pickAt(x, y, slack);

  // =========================================================================== input
  const canvas = stage.canvas; const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function pickAt(clientX, clientY, slack = 1) {
    const r = canvas.getBoundingClientRect(); const px = clientX - r.left; const py = clientY - r.top;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1); ray.setFromCamera(ndc, trayCam());
    const meshes = ALL.filter((sl) => !(sl === 'P' && S.P.vacant)).map((sl) => S[sl].die?.mesh).filter(Boolean);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (hit) return hit.object.userData.slot;
    let best = null; let bd = 1e9;
    for (const slot of ALL) {
      const s = S[slot]; if (!s.die || (slot === 'P' && s.vacant)) continue;
      const c = new THREE.Vector3(s.home.x, -DEPTH + s.die.inR + s.lift, s.home.z); object.localToWorld(c);
      const sp = c.clone().project(trayCam());
      const sx = (sp.x * 0.5 + 0.5) * r.width; const sy = (-sp.y * 0.5 + 0.5) * r.height;
      const edge = c.clone().add(new THREE.Vector3().setFromMatrixColumn(trayCam().matrixWorld, 0).multiplyScalar(0.72 * slack)); edge.project(trayCam());
      const rad = Math.max(22, Math.abs((edge.x * 0.5 + 0.5) * r.width - sx));
      const d = Math.hypot(px - sx, py - sy) / rad;
      if (d < 1 && d < bd) { bd = d; best = slot; }
    }
    return best;
  }
  let down = null;
  const onDown = (e) => { if (!tray.enabled || e.button > 0) return; down = { x: e.clientX, y: e.clientY, slot: pickAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 1.3 : 1), moved: false }; };
  const onMove = (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
    if (e.pointerType === 'mouse' && tray.enabled) {
      const slot = pickAt(e.clientX, e.clientY, 1);
      for (const sl of ALL) S[sl].hover = sl === slot;
      if (slot !== tray._hover) { tray._hover = slot; tray.onHover?.(slot); canvas.style.cursor = slot ? 'pointer' : ''; }
    }
  };
  const onUp = (e) => {
    const d = down; down = null; if (!d || d.moved || !tray.enabled) return;
    const slot = pickAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 1.3 : 1);
    if (slot && (slot === d.slot || !d.slot)) { if (tray.locked && !tray.pickWhenLocked) return; tray.onPick?.(slot, e); }
  };
  const onLeave = () => { for (const sl of ALL) S[sl].hover = false; if (tray._hover) { tray._hover = null; tray.onHover?.(null); canvas.style.cursor = ''; } down = null; };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onLeave); canvas.addEventListener('pointerleave', onLeave);
  tray.setHover = (slot) => { for (const sl of ALL) S[sl].hover = sl === slot; };

  // =========================================================================== update
  const _c = new THREE.Color(); const _m = new THREE.Matrix4(); const _p = new THREE.Vector3(); const _q = new THREE.Quaternion(); const _s = new THREE.Vector3();
  const _view = new THREE.Vector3(); const AX = new THREE.Vector3(1, 0, 0);
  const upd = {
    dt: 0,
  };
  tray.update = function update(dt, t) {
    tray.time += dt; const time = tray.time;
    for (const lm of linkMats) lm.opacity = 0.5 + 0.3 * Math.sin(time * 5);
    const a = away(); _view.copy(viewDir());
    lockK += ((tray.locked ? 1 : 0) - lockK) * (1 - Math.exp(-9 * dt)); lockFlare = Math.max(0, lockFlare - dt * 1.4);
    let anyRolling = false;
    for (const slot of ALL) {
      const s = S[slot]; const die = s.die; if (!die) continue;
      die.mesh.visible = !s.vacant && !s.waiting; s.ico.visible = !!s.waiting && !s.vacant; if (s.vacant) s.vac.material.opacity = 0.55;
      // ---- springs: lift (selected/hover), hop (pulses)
      const target = (s.selected ? 0.12 : s.hover ? 0.04 : 0);
      s.liftV += ((target - s.lift) * 340 - s.liftV * 21) * dt; s.lift += s.liftV * dt;
      s.hopV += (-s.hop * 260 - s.hopV * 14) * dt; s.hop += s.hopV * dt; if (s.hop < 0) { s.hop = 0; s.hopV = Math.max(0, s.hopV); }
      s.flash = Math.max(0, s.flash - dt * 2.6); s.glowBoost = Math.max(0, s.glowBoost - dt * 1.3);
      const dimT = s.bound ? 0.25 : s.dimmed ? 0.5 : tray.locked ? 0.08 : 0; s.dim += (dimT - s.dim) * (1 - Math.exp(-8 * dt));
      // ---- pose
      let lifted = true;
      if (s.anim?.kind === 'roll') {
        anyRolling = true; const an = s.anim; an.t += dt * ROLL_PLAYBACK; const plan = an.plan; const lt = an.t - plan.delay;
        const r = samplePlan(plan, lt, _p, _q);
        s.pos.copy(_p); s.quat.copy(_q); lifted = false;
        while (an.ev < plan.events.length && plan.events[an.ev].t <= lt) {
          const e = plan.events[an.ev++];
          if (e.kind === 'hit') { if (e.speed > 2.2) { tray.onSound?.('hit', { slot, speed: e.speed, level: Math.min(1, e.speed / 12) }); fx.impact(s.pos.x, s.pos.z, e.speed); } } else { s.wobble = 0; if (slot === 'P') tray.petHop(); tray.onSound?.('settle', { slot, speed: 2, level: 0.4 }); fx.dustPuff(s.home.x, s.home.z, 3); fx.ring(s.home.x, 0.01, s.home.z, 0xffe0a0, { dur: 0.4, s0: 0.8, s1: 1.7, a: 0.4 }); }
        }
        if (lt >= plan.T) { s.anim = null; s.pos.set(s.home.x, restY(s), s.home.z); s.quat.copy(plan.qFinal); }
      } else if (s.anim?.kind === 'flip') {
        const an = s.anim; an.t += dt; const k = Math.min(1, an.t / an.dur); const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        _q.setFromAxisAngle(AX, Math.PI * 2 * e).multiply(_c2.copy(an.q0).slerp(an.q1, e)); s.quat.copy(_q);
        s.pos.set(s.home.x, restY(s) + Math.sin(k * Math.PI) * 0.55, s.home.z); lifted = false; anyRolling = true;
        if (k >= 1) { s.anim = null; placeAtRest(s); tray.onSound?.('settle', { slot, speed: 1.5 }); fx.dustPuff(s.home.x, s.home.z, 2); an.res?.(); }
      }
      const baseY = lifted ? restY(s) : s.pos.y;
      const sinkY = -0.05 * lockK;
      die.mesh.position.set(s.pos.x, baseY + (s.scale - 1) * (die.inR + d4Lift(die.poly)) + (lifted ? s.lift + s.hop + sinkY : 0), s.pos.z);
      if (s.wobble != null) { s.wobble += dt; const w = 0.07 * Math.exp(-s.wobble * 6.5) * Math.sin(s.wobble * 34); if (s.wobble > 0.9) s.wobble = null; _q.setFromAxisAngle(_wob.set(Math.cos(s.i * 2.1), 0, Math.sin(s.i * 2.1)), w); die.mesh.quaternion.copy(_q).multiply(s.quat); } else die.mesh.quaternion.copy(s.quat);
      // ---- shader state
      const U = die.uniforms;
      U.uTime.value = time; die.mesh.updateWorldMatrix(true, false); die.updateCamera(trayCam());
      const airK = THREE.MathUtils.clamp((baseY - restY(s)) / 0.5, 0, 1); // height above its socket (the mesh carries a scale offset, so measure the pose)
      s.rest += ((1 - airK) - s.rest) * (1 - Math.exp(-14 * dt));
      die.setRest(s.rest); die.setView(_view);
      // highlight sweep flash
      if (s._hlAt != null && time >= s._hlAt) { s.flashCol.setHex(typeof s._hlCol === 'number' ? s._hlCol : (PULSE_COLORS[s._hlCol] ?? 0xffd23d)); s.flash = Math.max(s.flash, 0.7); s._hlAt = null; }
      U.uFlash.value.copy(s.flashCol).multiplyScalar(s.flash * s.flash * 0.9);
      const rimK = (s.selected ? 0.9 : 0) + (s.hover ? 0.5 : 0);
      U.uRim.value.setHex(0xffe6b0).multiplyScalar(rimK * 0.8);
      U.uDim.value = s.dim;
      // ---- rings, halo, chain, hex
      s.ring.visible = rimK > 0.01 || s.inStraight || s.ring.material.opacity > 0.01;
      const ro = s.ring.material.opacity + ((s.selected ? 0.95 : s.inStraight ? 1 : s.hover ? 0.4 : 0) - s.ring.material.opacity) * (1 - Math.exp(-14 * dt));
      s.ring.material.opacity = ro; s.ring.scale.setScalar(1 + 0.07 * Math.sin(time * 6 + s.i)); s.ring.position.y = 0.012;
      s.ring.material.color.setHex(s.selected ? 0xffe9a8 : s.inStraight ? STRAIGHT_GLOW : 0xcfe8ff);
      if (s.inStraight && !s.selected) s.ring.scale.setScalar(1.12 + 0.06 * Math.sin(time * 4 + s.i * 0.7)); // a wider magenta ring that breathes
      s.halo.visible = s.ring.visible; s.halo.material.opacity = ro * (s.inStraight ? 0.3 : 0.2) * (0.8 + 0.2 * Math.sin(time * 3 + s.i));
      if (s.halo.material.color) s.halo.material.color.setHex(s.inStraight && !s.selected ? STRAIGHT_GLOW : 0xffd98a);
      if (s.chains) {
        const tk = s.bound ? 1 : 0; s.chains.k += (tk - s.chains.k) * (1 - Math.exp(-7 * dt));
        s.chains.group.visible = s.chains.k > 0.01; s.chains.group.position.set(s.pos.x, die.mesh.position.y, s.pos.z);
        const sc = 0.9 + 0.1 * s.chains.k + (1 - s.chains.k) * 0.5; s.chains.group.scale.setScalar(sc);
        s.chains.group.rotation.y = 0.0;
        s.hex.visible = s.chains.k > 0.01; s.hex.material.opacity = s.chains.k * (0.85 + 0.15 * Math.sin(time * 2.2));
      }
    }
    // ---- the pet: a soft idle bob, and a happy hop when its die lands
    if (petSpr.visible) {
      petHopV += (-petHop * 200 - petHopV * 10) * dt; petHop += petHopV * dt; if (petHop < 0) { petHop = 0; petHopV = Math.max(0, petHopV) * 0.3; }
      const bob = Math.sin(time * 2.4) * 0.025; petSpr.position.y = 0.02 + petHop * 0.35 + bob; petSpr.scale.set(petW * (1 - bob * 0.6), PET_H * (1 + bob * 0.8 + petHop * 0.1), 1);
      petSpr.material.opacity = S.P.bound ? 0.55 : S.P.dimmed ? 0.7 : 1;
      petGlow.position.set(petSpr.position.x, petSpr.position.y + PET_H * 0.45, petSpr.position.z - 0.05); petGlow.material.opacity = (0.42 + 0.1 * Math.sin(time * 1.6)) * petSpr.material.opacity;
    }
    // ---- socket glow uniforms
    for (const slot of ALL) {
      const s = S[slot];
      if (slot === 'P' && s.vacant) { glowU.uG.value[s.i] = 0; continue; }
      let g = 0.34 + 0.12 * Math.sin(time * 1.2 + s.i * 0.9);
      g *= s.bound ? 0.25 : s.vacant || s.waiting ? 0.18 : s.dimmed ? 0.55 : 1;
      g += (s.selected ? 0.9 : 0) + (s.hover ? 0.4 : 0) + s.glowBoost * 1.6;
      if (s.inStraight) g = Math.max(g, 2.0 + 0.5 * Math.sin(time * 4 + s.i * 0.7)); // a strong magenta pulse
      g = g * (1 - 0.55 * lockK) + lockFlare * 2.2;
      glowU.uG.value[s.i] = g;
    }
    // ---- blob shadows
    ALL.forEach((slot, i) => {
      const s = S[slot];
      if (!s.die || s.vacant || s.waiting) { _m.makeScale(0, 0, 0); blobs.setMatrixAt(i, _m); return; }
      const mp = s.die.mesh.position; const h = Math.max(0, mp.y - restY(s));
      const inDish = Math.hypot(mp.x - s.home.x, mp.z - s.home.z) < 0.5 && h < 0.3;
      const sc = slot === 'P' ? Math.min(0.85, 0.8 + h * 0.2) : 1.35 + h * 0.5; // the pet's shadow stays inside its small stand (its square corners must not hang off into the dark)
      _p.set(mp.x, inDish ? -DEPTH + 0.004 : 0.006 + 0.0, mp.z); _s.set(sc, 1, sc); _q.identity();
      _m.compose(_p, _q, _s); blobs.setMatrixAt(i, _m);
      const f = Math.min(1, 0.0 + h * 0.9 + (s.bound ? 0 : 0)); _c.setScalar(0.22 + f * 0.78); blobs.setColorAt(i, _c);
    });
    blobs.instanceMatrix.needsUpdate = true; if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
    fx.update(dt, time);
    if (rollJob && !anyRolling) finishRoll(false);
  };
  const _c2 = new THREE.Quaternion(); const _wob = new THREE.Vector3();
  let off = null;
  if (auto) off = stage.onFrame((dt, t) => tray.update(dt, t));

  tray.info = function info() {
    let tris = 0; let meshes = 0;
    object.traverse((o) => { if (o.isMesh && o.visible) { meshes++; const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
    return { tris: Math.round(tris), meshes };
  };
  tray.dispose = function dispose() {
    off?.(); fx.dispose();
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onLeave); canvas.removeEventListener('pointerleave', onLeave);
    object.traverse((o) => { o.geometry?.dispose?.(); });
    for (const slot of ALL) S[slot].die?.dispose();
  };
  tray._S = S; tray._fx = fx;
  tray.setHero(DEFAULT_HERO);
  const b0 = {}; for (const sl of SLOT_ORDER) b0[sl] = { v: 1 }; tray.show(b0);
  return tray;
}
