import { startFx } from './fx.js';
import { bindChrome, boot, debugApi } from './ui.js';
import { LAB } from './lab.js';
import { useWeapons2 } from './engine.js';
import { TEAMWORK } from './data.js';

// No pinch-zoom (Dave, Oct 2026: "I can zoom and pinch to zoom on all these screens; that is wrong"). iPhone Safari ignores
// user-scalable=no in the viewport tag, so its own pinch gesture and two-finger moves are stopped here; one-finger scrolling still works.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
// ?lab: the weapons experiment, with its own heroes (js/lab.js). A small tag in the corner says so on every screen.
if (LAB) { useWeapons2(); Object.assign(TEAMWORK, { heartToHeart: true, noCharms: true, perkPreview: true }); const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = 'LAB · preview'; document.body.append(tag); }
startFx(document.getElementById('fx'));
bindChrome();
boot();
if (location.search.includes('debug')) window.QD = debugApi;
