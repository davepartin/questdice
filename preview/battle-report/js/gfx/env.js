// Image-based lighting without image files: a tiny procedural sky room is rendered into a cubemap
// (PMREM) once, so metals and glossy dice have something real to reflect.
import * as THREE from 'three';

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} o  { top, horizon, ground, lights: [{ color, intensity, pos:[x,y,z], size }] }
 */
export function makeEnvironment(renderer, o = {}) {
  const {
    top = 0x1a2a50, horizon = 0xc8743a, ground = 0x0c0a10,
    lights = [
      { color: 0xffb070, intensity: 14, pos: [-6, 3, -4], size: 3 },   // low warm key
      { color: 0x6a9cff, intensity: 5, pos: [5, 6, 3], size: 4 },      // cold fill
      { color: 0xffffff, intensity: 3, pos: [0, 9, 0], size: 5 },      // top soft
    ],
  } = o;
  const sc = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { cTop: { value: new THREE.Color(top) }, cHor: { value: new THREE.Color(horizon) }, cGnd: { value: new THREE.Color(ground) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 cTop, cHor, cGnd;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(cHor, cTop, pow(h, 0.55)) : mix(cHor, cGnd, pow(-h, 0.4)); gl_FragColor = vec4(c, 1.0); }`,
  });
  sc.add(new THREE.Mesh(geo, m));
  for (const l of lights) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(l.size, l.size), new THREE.MeshBasicMaterial({ color: new THREE.Color(l.color).multiplyScalar(l.intensity), side: THREE.DoubleSide }));
    p.position.set(...l.pos); p.lookAt(0, 0, 0); sc.add(p);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, 0.02);
  pm.dispose(); geo.dispose(); m.dispose();
  return rt.texture;
}
