// The stage: one WebGL canvas, one scene, a cinematic camera and the post chain.
// Time is owned by the stage (not performance.now), so every animation, tween and wait() is
// deterministic. In `manual` mode (screenshots, tests) nothing runs until you call step().
//
//   const stage = createStage(canvas, { quality: 'high' });
//   stage.onFrame((dt, t) => { ... });          // per-frame hook, returns an unsubscribe fn
//   await stage.tween({ dur: .4, ease: easeOutCubic }, (k) => { ... });
//   await stage.wait(0.5);
//   stage.shake(0.6); stage.flash(0xffffff, .5); stage.hurt(1);

import * as THREE from 'three';
import { createPost } from './post.js';
import { makeEnvironment } from './env.js';
import { makeNoise } from './noise.js';

export function detectQuality() {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'med' || q === 'high') return q;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  if (mobile) return cores >= 6 ? 'med' : 'low'; // current iPhones report 6 cores; they have the power for med
  return 'high';
}

export function createStage(canvas, opts = {}) {
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const quality = opts.quality || detectQuality();
  const manual = opts.manual ?? params.has('manual');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // (three r18x: PCF is already soft; use light.shadow.radius)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05060c, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060c);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 400);
  camera.position.set(0, 3, 9);
  scene.add(camera);

  const post = createPost(renderer, scene, camera, { quality, ao: opts.ao ?? true });
  const maxDpr = quality === 'low' ? 1.5 : 2; // phones are 3x screens: rendering at 1x looked pixelated
  const dprCap = Number(params.get('dpr')) || maxDpr;
  const shakeNoise = makeNoise(5);

  const S = {
    renderer, scene, camera, post, quality, manual, canvas,
    time: 0, frame: 0, frozen: false, width: 1, height: 1, dpr: 1,
    env: null,
    _frameFns: new Set(), _tweens: [], _waits: [], _shake: 0, _flash: 0, _hurt: 0, _raf: 0, _last: 0, _viewTarget: null,
    // bound objects the camera shake is applied around
    _baseCam: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), saved: false },
  };

  S.resize = function resize(w, h) {
    const rect = canvas.parentElement?.getBoundingClientRect?.();
    w = w || Math.max(2, Math.floor(rect?.width || window.innerWidth));
    h = h || Math.max(2, Math.floor(rect?.height || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    S.width = w; S.height = h; S.dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    post.setSize(w, h, dpr);
    S.onResize?.(w, h);
  };
  S.environment = function environment(o) {
    S.env?.dispose?.();
    S.env = makeEnvironment(renderer, o);
    scene.environment = S.env;
    return S.env;
  };
  S.onFrame = (fn) => { S._frameFns.add(fn); return () => S._frameFns.delete(fn); };

  // ---- time-based helpers (all driven by stage time)
  S.tween = function tween({ dur = 0.4, ease = (x) => x, delay = 0 } = {}, fn) {
    return new Promise((resolve) => { S._tweens.push({ t: -delay, dur: Math.max(1e-4, dur), ease, fn, resolve }); });
  };
  S.wait = (sec) => new Promise((resolve) => { S._waits.push({ left: sec, resolve }); });
  S.shake = (amt = 0.5) => { S._shake = Math.min(1.5, Math.max(S._shake, amt)); };
  S.flash = (color = 0xffffff, amt = 0.5) => { post.uniforms.uFlashColor.value.set(color); S._flash = Math.max(S._flash, amt); };
  S.hurt = (amt = 1) => { S._hurt = Math.max(S._hurt, amt); };
  S.fadeTo = (v, dur = 0.5) => { const a = post.uniforms.uFade.value; return S.tween({ dur }, (k) => { post.uniforms.uFade.value = a + (v - a) * k; }); };

  function tick(dt) {
    S.time += dt; S.frame++;
    for (let i = S._tweens.length - 1; i >= 0; i--) {
      const tw = S._tweens[i]; tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.ease(k), k);
      if (k >= 1) { S._tweens.splice(i, 1); tw.resolve(); }
    }
    for (let i = S._waits.length - 1; i >= 0; i--) { const w = S._waits[i]; w.left -= dt; if (w.left <= 0) { S._waits.splice(i, 1); w.resolve(); } }
    for (const fn of S._frameFns) fn(dt, S.time);
    // screen effects decay
    S._shake = Math.max(0, S._shake - dt * 2.2);
    S._flash = Math.max(0, S._flash - dt * 3.2);
    S._hurt = Math.max(0, S._hurt - dt * 1.6);
    post.uniforms.uFlash.value = S._flash;
    post.uniforms.uHurt.value = S._hurt * S._hurt;
  }
  function render(dt) {
    // camera shake: apply, render, restore (so scripted camera moves are never polluted)
    const sh = S._shake * S._shake;
    let px; let py; let pz; let rz;
    if (sh > 0.0005) {
      px = camera.position.x; py = camera.position.y; pz = camera.position.z; rz = camera.rotation.z;
      const t = S.time * 38;
      camera.position.x += shakeNoise.n2(t, 1) * 0.16 * sh;
      camera.position.y += shakeNoise.n2(t, 7) * 0.12 * sh;
      camera.rotation.z += shakeNoise.n2(t, 13) * 0.02 * sh;
      camera.updateMatrixWorld();
    }
    post.render(dt, S.time);
    if (sh > 0.0005) { camera.position.set(px, py, pz); camera.rotation.z = rz; }
  }
  S.renderNow = () => render(0);

  // Advance deterministic time without waiting for rAF. Used by screenshots and tests.
  S.step = function step(frames = 1, dt = 1 / 30) {
    for (let i = 0; i < frames; i++) tick(dt);
    render(dt);
    return S;
  };
  // Tick the simulation (tweens, waits, animation) without rendering: cheap fast-forward for tests.
  S.simulate = (seconds, dt = 1 / 30) => { const n = Math.max(1, Math.round(seconds / dt)); for (let i = 0; i < n; i++) tick(dt); return S; };
  S.advance = (seconds, dt = 1 / 30) => { const n = Math.max(1, Math.round(seconds / dt)); for (let i = 0; i < n - 1; i++) tick(dt); return S.step(1, dt); };

  // Real-time loop.
  S.start = function start() {
    if (manual || S._raf) return;
    S._last = performance.now();
    const loop = (now) => {
      S._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - S._last) / 1000); S._last = now;
      if (S.frozen) return;
      tick(dt); render(dt);
    };
    S._raf = requestAnimationFrame(loop);
  };
  S.stop = () => { cancelAnimationFrame(S._raf); S._raf = 0; };

  // Add a Particles system to the scene and keep its size scale and simulation in sync with the camera.
  S.addParticles = function addParticles(ps) {
    scene.add(ps.object);
    const off = S.onFrame((dt) => { ps.material.uniforms.uScale.value = (S.height * S.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360)); ps.update(dt); });
    ps._off = off;
    return ps;
  };

  S.clearScene = function clearScene({ keepLights = false } = {}) {
    for (const c of [...scene.children]) {
      if (c === camera) continue;
      if (keepLights && c.isLight) continue;
      scene.remove(c);
      c.traverse?.((o) => { o.geometry?.dispose?.(); });
    }
    S._frameFns.clear(); S._tweens.length = 0; S._waits.length = 0;
  };

  let ro = null;
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) { ro = new ResizeObserver(() => S.resize()); ro.observe(canvas.parentElement); }
  window.addEventListener('resize', () => S.resize());
  S.resize();
  S.environment();
  S.dispose = () => { S.stop(); ro?.disconnect(); renderer.dispose(); };
  return S;
}
