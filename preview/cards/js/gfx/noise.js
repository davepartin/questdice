// Seeded randomness and noise. Everything procedural in the game (textures, terrain, fur,
// bark, cracks) is built from these, so a given seed always yields the same picture.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export const rngFrom = (...parts) => mulberry32(hashStr(parts.join('|')));
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const rr = (rng, a, b) => a + (b - a) * rng();
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// Classic gradient noise with optional integer periods, so textures tile with no seam.
export function makeNoise(seed = 1) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256).map((_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(256); const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const a = rng() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }

  // 2D, range about [-1, 1]. px/py: period in lattice cells (0 = no wrap).
  function n2(x, y, px = 0, py = 0) {
    let xi = Math.floor(x); let yi = Math.floor(y);
    const xf = x - xi; const yf = y - yi;
    let x0 = xi; let y0 = yi; let x1 = xi + 1; let y1 = yi + 1;
    if (px) { x0 = ((x0 % px) + px) % px; x1 = ((x1 % px) + px) % px; }
    if (py) { y0 = ((y0 % py) + py) % py; y1 = ((y1 % py) + py) % py; }
    x0 &= 255; x1 &= 255; y0 &= 255; y1 &= 255;
    const h00 = perm[x0 + perm[y0]]; const h10 = perm[x1 + perm[y0]];
    const h01 = perm[x0 + perm[y1]]; const h11 = perm[x1 + perm[y1]];
    const d00 = gx[h00] * xf + gy[h00] * yf;
    const d10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const d01 = gx[h01] * xf + gy[h01] * (yf - 1);
    const d11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const u = fade(xf); const v = fade(yf);
    return (d00 + (d10 - d00) * u) * (1 - v) + (d01 + (d11 - d01) * u) * v;
  }
  // 3D value-ish gradient noise (non-tiling), range about [-1, 1].
  function n3(x, y, z) {
    const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
    const xf = x - xi; const yf = y - yi; const zf = z - zi;
    const X = xi & 255; const Y = yi & 255; const Z = zi & 255;
    const g = (hx, hy, hz, dx, dy, dz) => {
      const h = perm[hx + perm[hy + perm[hz]]] & 15;
      const u = h < 8 ? dx : dy; const v = h < 4 ? dy : (h === 12 || h === 14 ? dx : dz);
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    };
    const u = fade(xf); const v = fade(yf); const w = fade(zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(g(X, Y, Z, xf, yf, zf), g(X + 1, Y, Z, xf - 1, yf, zf), u), l(g(X, Y + 1, Z, xf, yf - 1, zf), g(X + 1, Y + 1, Z, xf - 1, yf - 1, zf), u), v),
      l(l(g(X, Y, Z + 1, xf, yf, zf - 1), g(X + 1, Y, Z + 1, xf - 1, yf, zf - 1), u), l(g(X, Y + 1, Z + 1, xf, yf - 1, zf - 1), g(X + 1, Y + 1, Z + 1, xf - 1, yf - 1, zf - 1), u), v),
      w,
    ) * 0.9;
  }
  // Fractal sum. u,v in any range; set `tile` to the base period to make it wrap on [0, tile).
  function fbm(x, y, { oct = 4, lac = 2, gain = 0.5, tile = 0 } = {}) {
    let a = 1; let f = 1; let sum = 0; let norm = 0;
    for (let o = 0; o < oct; o++) {
      const per = tile ? Math.round(tile * f) : 0;
      sum += a * n2(x * f, y * f, per, per); norm += a; a *= gain; f *= lac;
    }
    return sum / norm;
  }
  function ridged(x, y, opts = {}) { return 1 - Math.abs(fbm(x, y, opts)) * 2; }
  // Cellular distance (F1, F2) on a jittered grid. Tiles when `tile` is given.
  function worley(x, y, tile = 0) {
    const xi = Math.floor(x); const yi = Math.floor(y);
    let d1 = 9; let d2 = 9; let id = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        let cx = xi + i; let cy = yi + j;
        let wx = cx; let wy = cy;
        if (tile) { wx = ((cx % tile) + tile) % tile; wy = ((cy % tile) + tile) % tile; }
        const h = perm[(wx & 255) + perm[wy & 255]];
        const fx = cx + 0.15 + (h / 255) * 0.7;
        const fy = cy + 0.15 + (perm[h + 7] / 255) * 0.7;
        const d = Math.hypot(x - fx, y - fy);
        if (d < d1) { d2 = d1; d1 = d; id = h; } else if (d < d2) d2 = d;
      }
    }
    return { d1, d2, id };
  }
  return { n2, n3, fbm, ridged, worley };
}
