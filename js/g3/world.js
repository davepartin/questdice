// The 3D world: owns the stage, director and the lifecycle of whatever scene is on screen.
// Real modules (the dice tray) are loaded dynamically; if one is missing or throws, a stand-in from stubs.js takes
// its place so the game still plays. The battle's top half is not 3D any more: see flat.js.
import * as THREE from 'three';
import { createStage } from '../gfx/core.js';
import { Director } from './director.js';
import { stubTray } from './stubs.js';

async function tryLoad(path) {
  try { return await import(path); } catch (e) { if (!/Failed to fetch|404|Failed to resolve/i.test(String(e?.message))) console.warn(`[world] ${path} failed:`, e); return null; }
}

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

  // Build a battle's table (Dave, Oct 2026: the top of the battle is flat painted pieces on a table, drawn in the DOM by
  // flat.js). All the 3D that is left is the dice tray, which sits in its own band at the bottom of the screen.
  async buildTable({ hero }) {
    this.clear();
    const stage = this.stage;
    const trayMod = await tryLoad('../gfx/dice/tray.js');
    let tray;
    try { tray = trayMod ? trayMod.createTray({ stage, quality: stage.quality }) : stubTray(stage); } catch (e) { console.warn('[world] tray failed', e); tray = stubTray(stage); }
    tray.object.position.set(0, 0, 0); tray.object.scale.setScalar(1);
    // a dark leather floor so the band reads as a different place from the battlefield
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.95, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.9; stage.trayScene.add(floor);
    stage.trayScene.add(new THREE.HemisphereLight(0xffeedd, 0x302018, 1.0));
    stage.trayScene.add(tray.object); stage.post.trayPass.enabled = true;
    tray.setHero(hero);
    stage.onFrame((dt, t) => tray.update?.(dt, t));
    const bw = {
      stage, tray, director: this.director,
      // company: the dice table shows the dice of whoever's turn it is
      setActiveHero(i, heroData) { if (heroData) tray.setHero(heroData); },
      dispose() { tray.dispose?.(); },
    };
    this.battle = bw; this.mode = 'battle';
    return bw;
  },
};
