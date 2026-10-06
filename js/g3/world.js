// The 3D world: owns the stage, director and the lifecycle of whatever scene is on screen.
// Real modules (arena, actors, tray, vfx) are loaded dynamically; if one is missing or throws,
// a stand-in from stubs.js takes its place so the game still plays.
import * as THREE from 'three';
import { createStage } from '../gfx/core.js';
import { createActor } from '../gfx/actors/index.js';
import { Director } from './director.js';
import { stubArena, stubTray, stubVfx } from './stubs.js';

async function tryLoad(path) {
  try { return await import(path); } catch (e) { if (!/Failed to fetch|404|Failed to resolve/i.test(String(e?.message))) console.warn(`[world] ${path} failed:`, e); return null; }
}

// Staging marks (metres). See docs/GFX.md and the arena brief.
export const MARKS = {
  hero: [-3.2, 0, 0.8],
  tray: [0, 0.3, 4.5],
  big: [0.5, 0, -0.9],
};
// Marks for the monsters' back row. With a big monster (elite/boss) slot 0 is its centre-back mark and the rest
// flank it; otherwise a row spread by count.
export function enemyMarks(n, hasBig) {
  if (hasBig) return [[0.5, -1.9], [-3.1, -0.2], [3.4, -0.2], [-1.9, 0.9], [2.5, 1.0]];
  const rows = { 1: [[0.5, -0.3]], 2: [[-1.2, -0.2], [1.9, -0.5]], 3: [[-2.4, 0.0], [0.4, -0.8], [3.0, 0.0]], 4: [[-3.0, 0.1], [-1.0, -0.8], [1.3, -0.8], [3.3, 0.1]] };
  return rows[Math.min(4, Math.max(1, n))];
}

// How tall each monster stands, as a multiple of the hero (so a goblin reads small and an ogre reads huge next to your hero).
export const SIZE_VS_HERO = { goblin: 0.72, wolf: 0.9, cultist: 1.0, ogre: 1.6, goblinking: 1.55, skeleton: 1.0, wraith: 1.15, spider: 0.75, bonewarden: 1.7, lich: 1.6 };
const HERO_H = 1.98;

export const world = {
  stage: null, director: null, vfx: null, available: false, mode: null, battle: null,

  async boot(canvas) {
    if (this.stage) return true;
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return false;
      this.stage = createStage(canvas);
      this.director = new Director(this.stage);
      try { (await import('../gfx/dice/faces.js')).setDiceStyle('clean'); } catch (e) { console.warn('[world] dice style', e); }
      this.stage.start();
      try { (await import('./portrait.js')).shareRenderer(this.stage.renderer, () => this.stage.env); } catch { /* portraits fall back to their own renderer */ }
      this.available = true;
      window.__stage = this.stage;
      return true;
    } catch (e) { console.warn('[world] WebGL unavailable', e); this.available = false; return false; }
  },

  clear() {
    const s = this.stage;
    this.battle?.dispose?.(); this.battle = null;
    s.clearScene();
    this.director.layout = null;
    this.director.attach();
    s.scene.fog = null; s.scene.environment = s.env; s.scene.background = new THREE.Color(0x05060c);
    s.post.look({ bloom: 0.16, bloomThreshold: 1.0, vignette: 0.3, grain: 0.02, aberration: 0, sat: 1.14, contrast: 1.14, tilt: 0, exposure: 1 });
  },

  // Build a battle: arena, hero, one actor per enemy, tray, vfx. Returns the handle the battle controller drives.
  async buildBattle({ quest, hero, enemies }) {
    this.clear();
    const stage = this.stage;
    const [arenaMod, trayMod, vfxMod, heroMod] = await Promise.all([
      tryLoad('../gfx/arena.js'), tryLoad('../gfx/dice/tray.js'), tryLoad('../gfx/vfx.js'), tryLoad('../gfx/actors/hero.js'),
    ]);
    const kind = quest.kind || 'standard';
    let arena;
    try { arena = arenaMod ? arenaMod.buildArena(stage, { place: quest.place || quest.name?.split(' at ').pop() || 'Burnt Orchard', kind, seed: quest.seed || 1, enemyCount: enemies.length }) : stubArena(stage); }
    catch (e) { console.warn('[world] arena failed', e); this.clear(); arena = stubArena(stage); }
    stage.onFrame((dt, t) => arena.update?.(dt, t));

    // hero
    const heroActor = await createActor('hero', { cls: hero.cls, loadout: hero.loadout, level: hero.level, seed: hero.campaign?.seed || 1, quality: stage.quality });
    heroActor.root.position.set(...MARKS.hero);
    if (this.director.portrait > 0.5) { heroActor.root.scale.setScalar(1.0); heroActor.root.position.set(-1.6, 0, 2.6); }
    const eMarks = enemyMarks(enemies.length, enemies.some((e) => e.tier !== 'minion'));
    const faceHeroYaw = (x, z) => Math.atan2(MARKS.hero[0] - x, MARKS.hero[2] - z);
    const mid = eMarks.reduce((a, p) => [a[0] + p[0] / eMarks.length, a[1] + p[1] / eMarks.length], [0, 0]);
    heroActor.root.rotation.y = Math.atan2(mid[0] - MARKS.hero[0], mid[1] - MARKS.hero[2]);
    stage.scene.add(heroActor.root);
    stage.onFrame((dt, t) => heroActor.update(dt, t));

    if (this.director.portrait > 0.5) { // scale props: a tree and a far mountain tell you how big everything is
      const bark = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 1 }); const leaf = new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 1 }); const rock = new THREE.MeshStandardMaterial({ color: 0x3a2e38, roughness: 1 });
      const tree = (x, z, h) => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * h / 5, 0.26 * h / 5, h * 0.4, 7), bark); t.position.y = h * 0.2; g.add(t);
        for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.35) * h / 5, h * (0.42 - i * 0.04), 8), leaf); c.position.y = h * (0.42 + i * 0.22); g.add(c); }
        g.position.set(x, 0, z); return g; };
      stage.scene.add(tree(-4.6, -4.8, 6.2), tree(5.0, -6.5, 7.4), tree(-6.8, -9, 8.4));
      const m = new THREE.Mesh(new THREE.ConeGeometry(9, 11, 5), rock); m.position.set(3, 3.5, -22); m.scale.set(1.6, 1, 1); stage.scene.add(m);
      const m2 = new THREE.Mesh(new THREE.ConeGeometry(7, 8, 5), rock); m2.position.set(-12, 2.5, -20); stage.scene.add(m2);
    }
    // tray
    let tray;
    try { tray = trayMod ? trayMod.createTray({ stage, quality: stage.quality }) : stubTray(stage); } catch (e) { console.warn('[world] tray failed', e); tray = stubTray(stage); }
    const pk = this.director.portrait;
    const split = pk > 0.5; // phones: the dice table is its own picture in a band at the bottom ("the control area"), the battlefield is above it
    if (split) {
      tray.object.position.set(0, 0, 0); tray.object.scale.setScalar(1);
      // a dark leather floor so the band reads as a different place from the battlefield
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.95, metalness: 0.05 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.9; stage.trayScene.add(floor);
      const hemi = new THREE.HemisphereLight(0xffeedd, 0x302018, 1.0); stage.trayScene.add(hemi);
      stage.trayScene.add(tray.object); stage.post.trayPass.enabled = true;
    } else {
      tray.object.position.set(MARKS.tray[0], MARKS.tray[1], MARKS.tray[2] - 0.9 * pk); tray.object.scale.setScalar(1.12 - 0.2 * pk);
      stage.scene.add(tray.object);
    }
    tray.setHero(hero);
    stage.onFrame((dt, t) => tray.update?.(dt, t));

    let vfx;
    try { vfx = vfxMod ? vfxMod.createVfx(stage) : stubVfx(stage); } catch (e) { console.warn('[world] vfx failed', e); vfx = stubVfx(stage); }

    const actors = new Map();
    const hasBig = enemies.some((e) => e.tier !== 'minion');
    const layout = enemyMarks(enemies.length, hasBig);
    // which slot each enemy index stands on: the big one takes slot 0, the rest follow in order
    const slotOf = (i, list = enemies) => {
      if (!hasBig) return Math.min(i, layout.length - 1);
      const bigIdx = list.findIndex((e) => e.tier !== 'minion');
      return i === bigIdx ? 0 : Math.min(layout.length - 1, 1 + i - (i > bigIdx ? 1 : 0));
    };
    const bw = {
      stage, arena, hero: heroActor, tray, vfx, actors, director: this.director, layout, slotOf,
      slotFor(i, list) { return layout[slotOf(i, list)]; },
      async addEnemy(e, index, list = enemies) {
        const a = await createActor(e.id, { tier: e.tier, seed: (e.uid.length * 7919) >>> 0, quality: stage.quality });
        const m = this.slotFor(index, list);
        a.root.position.set(m[0], 0, m[1] + (this.director.portrait > 0.5 ? (e.tier !== 'minion' ? -0.2 : -1.6) : 0));
        const pk2 = this.director.portrait; const rel = SIZE_VS_HERO[e.id]; if (rel && a.height) { const crowd = Math.max(0.78, 1 - 0.06 * Math.max(0, list.length - 3)); a.root.scale.setScalar((rel * HERO_H / a.height) * crowd * (pk2 > 0.5 ? 1 : 1)); } // phones: the miniature battle is a small scene, the dice are the game
        a.root.rotation.y = Math.atan2(MARKS.hero[0] - m[0], MARKS.hero[2] - m[1]) * 0.5;
        a.userData.uid = e.uid;
        stage.scene.add(a.root);
        actors.set(e.uid, a);
        return a;
      },
      dispose() { for (const a of actors.values()) a.dispose?.(); heroActor.dispose?.(); tray.dispose?.(); arena.dispose?.(); },
    };
    stage.onFrame((dt, t) => { for (const a of actors.values()) a.update(dt, t); });
    await Promise.all(enemies.map((e, i) => bw.addEnemy(e, i)));
    this.battle = bw; this.mode = 'battle';
    this.director.set('intro', { snap: true });
    return bw;
  },
};
