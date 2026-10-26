import { startFx } from './fx.js';
import { bindChrome, boot, debugApi } from './ui.js';
import { LAB, PREVIEW, PREVIEW_NAME } from './lab.js';
import { BUILD } from './battlereport.js';
import { PACE } from './g3/flat.js';
import { applyRelease, applyLab } from './release.js';
import { useWeaponSize, useHeartUpgrades } from './engine.js';
import { WEAPON_SIZE } from './data.js';

// No pinch-zoom (Dave, Oct 2026: "I can zoom and pinch to zoom on all these screens; that is wrong"). iPhone Safari ignores
// user-scalable=no in the viewport tag, so its own pinch gesture and two-finger moves are stopped here; one-finger scrolling still works.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
applyRelease(); // what everyone plays (js/release.js)
if (PREVIEW && PREVIEW_NAME === 'heart-upgrades') useHeartUpgrades(); // T23 isolated candidate, separate saves and no cloud
if (PREVIEW && PREVIEW_NAME === 'weapon-size') { useWeaponSize(); try { WEAPON_SIZE.ladder = await (await fetch(new URL('assets/t17-faces.json', document.baseURI))).json(); } catch { /* no table: the plain card */ } } // T17: weapon size bought at camp, no wear, and the PROPOSED cumulative face table (docs/team/tasks/T17-faces.json); only in preview/weapon-size/ (its own saves), never at the live root
if (/[?&]pace=actions\b/.test(location.search)) { PACE.actions = true; const tag = document.createElement('div'); tag.className = 'lab-tag pace-tag'; tag.textContent = 'PREVIEW · quick replay'; document.body.append(tag); } // the replay-pace preview (js/g3/flat.js)
if (LAB) { applyLab(); const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = 'LAB · fury'; document.body.append(tag); } // ?lab: the release plus monster fury, its own heroes (js/lab.js)
if (PREVIEW && !LAB) { const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = `PREVIEW · ${PREVIEW_NAME.replace(/-/g, ' ') || 'copy'} · build ${BUILD}`; document.body.append(tag); } // a preview copy: its own saves (js/lab.js)
startFx(document.getElementById('fx'));
bindChrome();
boot();
if (location.search.includes('debug')) window.QD = debugApi;
