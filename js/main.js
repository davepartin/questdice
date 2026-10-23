import { startFx } from './fx.js';
import { bindChrome, boot, debugApi } from './ui.js';
import { LAB } from './lab.js';
import { useWeapons2 } from './engine.js';
import { CLASS2, WEAPONS2, PRESSURE } from './data.js';
import { applyRelease } from './release.js';

// No pinch-zoom (Dave, Oct 2026: "I can zoom and pinch to zoom on all these screens; that is wrong"). iPhone Safari ignores
// user-scalable=no in the viewport tag, so its own pinch gesture and two-finger moves are stopped here; one-finger scrolling still works.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
// ?lab: the weapons experiment, with its own heroes (js/lab.js). A small tag in the corner says so on every screen.
applyRelease(); // what everyone plays (js/release.js)
if (LAB) { useWeapons2(); CLASS2.on = true; /* class identity (Guard, Dig In, Verse for a friend) to try by hand */
  Object.assign(WEAPONS2.arrowRules, { pierce: 'all', frost: 'strength', fire: 'full' }); WEAPONS2.faces.quiver.special = WEAPONS2.faces.quiver.numbered; /* the arrows as last measured (docs/balance/ARROWS_2026-10-22.md) */
  Object.assign(PRESSURE, { on: true, bag: false }); PRESSURE.fury.from = 4; PRESSURE.rally.min = 99; PRESSURE.mend.share = 0; /* monster fury from round 4, nothing else */ const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = 'LAB · preview'; document.body.append(tag); }
startFx(document.getElementById('fx'));
bindChrome();
boot();
if (location.search.includes('debug')) window.QD = debugApi;
