// Post-processing chain: scene -> (ambient occlusion) -> bloom -> filmic tone map -> grade -> AA.
// The grade pass does the "AAA" finishing: orange-and-teal split toning, vignette, chromatic fringe,
// film grain, tilt-shift focus falloff, and the red pulse when the hero is hurt.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  name: 'QDGrade',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.045 },
    uAberration: { value: 0.0016 },
    uSat: { value: 1.08 },
    uContrast: { value: 1.08 },
    uShadowTint: { value: new THREE.Color(0.86, 0.96, 1.08) },
    uHighTint: { value: new THREE.Color(1.1, 1.0, 0.86) },
    uTilt: { value: 0.0 },          // 0 off .. 1 strong tilt-shift blur away from uFocusY
    uFocusY: { value: 0.55 },
    uHurt: { value: 0.0 },          // 0..1 red edge pulse
    uFlash: { value: 0.0 },         // 0..1 white flash
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uFade: { value: 0.0 },          // 0..1 fade to black
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes;
    uniform float uVignette, uGrain, uAberration, uSat, uContrast, uTilt, uFocusY, uHurt, uFlash, uFade;
    uniform vec3 uShadowTint, uHighTint, uFlashColor;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      // chromatic fringe grows toward the edges
      vec2 off = c * r2 * uAberration * 18.0;
      vec3 col;
      // tilt-shift: blur grows with distance from focus line
      float blurAmt = uTilt * smoothstep(0.12, 0.6, abs(uv.y - uFocusY));
      if (blurAmt > 0.002) {
        vec3 acc = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 2.399963; float rad = sqrt(float(i) + 0.5) / 3.4641;
          vec2 o = vec2(cos(a), sin(a)) * rad * blurAmt * 0.012 * vec2(uRes.y / uRes.x, 1.0) * 1.0;
          acc += texture2D(tDiffuse, uv + o).rgb; wsum += 1.0;
        }
        col = acc / wsum;
      } else {
        col.r = texture2D(tDiffuse, uv + off).r; col.g = texture2D(tDiffuse, uv).g; col.b = texture2D(tDiffuse, uv - off).b;
      }
      // contrast + saturation
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      // split toning: cool shadows, warm highlights
      float sl = smoothstep(0.0, 0.8, l);
      col *= mix(uShadowTint, uHighTint, sl);
      // vignette
      float v = smoothstep(0.9, 0.2, length(c * vec2(1.0, 1.15)) * (1.0 + uVignette));
      col *= mix(1.0 - uVignette * 0.9, 1.0, v);
      // hurt pulse
      col = mix(col, col * vec3(1.5, 0.45, 0.4), uHurt * smoothstep(0.15, 0.75, length(c)));
      col += vec3(0.5, 0.0, 0.0) * uHurt * 0.12;
      // film grain
      float g = hash(uv * uRes + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain * (1.0 - l * 0.6);
      col = mix(col, uFlashColor, uFlash);
      col *= 1.0 - uFade;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export function createPost(renderer, scene, camera, { quality = 'high', ao = true } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: quality === 'low' ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let gtao = null;
  if (ao && quality === 'high') {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), quality === 'low' ? 0.5 : 0.7, 0.55, 0.82);
  composer.addPass(bloom);
  const output = new OutputPass();
  composer.addPass(output);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  let smaa = null;
  if (quality !== 'low') { smaa = new SMAAPass(size.x * pr, size.y * pr); composer.addPass(smaa); }

  const api = {
    composer, bloom, grade, gtao, smaa, uniforms: grade.uniforms,
    setSize(w, h, dpr) {
      composer.setPixelRatio(dpr); composer.setSize(w, h);
      grade.uniforms.uRes.value.set(w * dpr, h * dpr);
      smaa?.setSize(w * dpr, h * dpr);
    },
    setCamera(cam) { renderPass.camera = cam; if (gtao) gtao.camera = cam; },
    setScene(sc) { renderPass.scene = sc; if (gtao) gtao.scene = sc; },
    render(dt, t) { grade.uniforms.uTime.value = t; composer.render(dt); },
    // quick looks: pass any subset
    look(o = {}) {
      const u = grade.uniforms;
      if (o.bloom !== undefined) bloom.strength = o.bloom;
      if (o.bloomRadius !== undefined) bloom.radius = o.bloomRadius;
      if (o.bloomThreshold !== undefined) bloom.threshold = o.bloomThreshold;
      if (o.vignette !== undefined) u.uVignette.value = o.vignette;
      if (o.grain !== undefined) u.uGrain.value = o.grain;
      if (o.aberration !== undefined) u.uAberration.value = o.aberration;
      if (o.sat !== undefined) u.uSat.value = o.sat;
      if (o.contrast !== undefined) u.uContrast.value = o.contrast;
      if (o.tilt !== undefined) u.uTilt.value = o.tilt;
      if (o.focusY !== undefined) u.uFocusY.value = o.focusY;
      if (o.shadowTint !== undefined) u.uShadowTint.value.set(o.shadowTint);
      if (o.highTint !== undefined) u.uHighTint.value.set(o.highTint);
      if (o.exposure !== undefined) renderer.toneMappingExposure = o.exposure;
      return api;
    },
  };
  return api;
}
