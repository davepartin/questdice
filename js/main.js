import { startFx } from './fx.js';
import { bindChrome, boot, debugApi } from './ui.js';
import { LAB, PREVIEW, PREVIEW_NAME } from './lab.js';
import { BUILD } from './battlereport.js';
import { PACE } from './g3/flat.js';
import { applyRelease, applyLab } from './release.js';
import { useWeaponSize } from './engine.js';

// No pinch-zoom (Dave, Oct 2026: "I can zoom and pinch to zoom on all these screens; that is wrong"). iPhone Safari ignores
// user-scalable=no in the viewport tag, so its own pinch gesture and two-finger moves are stopped here; one-finger scrolling still works.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
applyRelease(); // what everyone plays (js/release.js)
if (PREVIEW && PREVIEW_NAME === 'weapon-size') useWeaponSize(); // T17: weapon size bought at camp, no wear; only in preview/weapon-size/ (its own saves), never at the live root
if (/[?&]pace=actions\b/.test(location.search)) { PACE.actions = true; const tag = document.createElement('div'); tag.className = 'lab-tag pace-tag'; tag.textContent = 'PREVIEW · quick replay'; document.body.append(tag); } // the replay-pace preview (js/g3/flat.js)
if (LAB) { applyLab(); const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = 'LAB · fury'; document.body.append(tag); } // ?lab: the release plus monster fury, its own heroes (js/lab.js)
if (PREVIEW && !LAB) { const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = `PREVIEW · ${PREVIEW_NAME.replace(/-/g, ' ') || 'copy'} · build ${BUILD}`; document.body.append(tag); } // a preview copy: its own saves (js/lab.js)
startFx(document.getElementById('fx'));
bindChrome();
boot();
if (location.search.includes('debug')) window.QD = debugApi;
