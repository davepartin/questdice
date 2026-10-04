// Act I battlegrounds: "The Ashen Marches". buildArena(stage, { place, kind, seed, quality, enemyCount }) builds a
// complete stage (sky, terrain, props, lights, fog, particles, post look) and returns
//   { group, update(dt, t), setMood('calm'|'battle'|'boss'|'victory'|'camp'), dispose(), marks, stats() }.
// 1 unit = 1 metre. Hero at marks.hero facing -Z; monsters on marks.monsters(n); the tray sits on a table at
// marks.tray; the camera suggestion is marks.camera / marks.cameraPortrait. Keep the clear zone prop-free.
import { createCtx, finalize, makeArenaObject, MARKS } from './arena/kit.js';
import { burntOrchard } from './arena/places1.js';

const PLACES = {
  'burnt orchard': burntOrchard,
};
export const PLACE_NAMES = ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'Smoke Hollow', 'The Toll Bridge', 'Ashfall Camp', 'Gallows Hill'];
const norm = (s) => String(s || '').replace(/[’‘`]/g, "'").trim().toLowerCase();

export function buildArena(stage, { place = 'Burnt Orchard', kind = 'standard', seed = 1, quality = stage.quality, enemyCount = 2 } = {}) {
  const key = norm(place);
  const fn = PLACES[key] || PLACES['burnt orchard'];
  const name = PLACES[key] ? PLACE_NAMES.find((n) => norm(n) === key) || place : 'Burnt Orchard';
  const c = createCtx(stage, { place: name, kind, seed, quality, enemyCount });
  fn(c);
  finalize(c, { ...c.ambient, ...c.smokeOpts });
  return makeArenaObject(c);
}
export { MARKS };
