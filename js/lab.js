// The lab (Dave, 22 Oct 2026: "keep experimental saves separate and do not enable the system in the live game without my approval").
// Open the game with ?lab and it plays the weapons experiment (the six one-handed weapons, the Bow and the four arrows), with its own
// heroes on this device only: a lab hero never reaches the cloud, an online table or the live heroes' list. Without ?lab nothing changes.
export const LAB = typeof location !== 'undefined' && /[?&]lab(?:[=&]|$)/.test(location.search);
// A preview copy of the game (a build under /preview/ on the same site, for a phone check before anything is merged). Same rules as the
// release, but it keeps its own saves, battle reports and daily record under their own keys and never reaches the cloud or an online
// table, so trying it cannot touch the live game's heroes. On the real site (not under /preview/) this is always false.
export const PREVIEW = typeof location !== 'undefined' && /\/preview\//.test(location.pathname);
export const SANDBOX = LAB || PREVIEW;
// Which preview this is (the folder after /preview/). The two earliest previews, battle-report and cards, share one set of saves, kept under
// 'preview' exactly as before so their heroes and reports stay. Every other preview gets its OWN namespace, 'preview-<folder>', separate from
// the live game, the lab and every other preview (T17: an experiment that changes rules must not be able to touch another preview's heroes).
export const PREVIEW_NAME = (() => { const m = typeof location !== 'undefined' ? /\/preview\/([^/]+)/.exec(location.pathname) : null; return m ? m[1].toLowerCase().replace(/[^a-z0-9-]/g, '-') : ''; })();
export const SHARED_PREVIEWS = ['battle-report', 'cards'];
export const SANDBOX_NAME = LAB ? 'lab' : PREVIEW ? (SHARED_PREVIEWS.includes(PREVIEW_NAME) || !PREVIEW_NAME ? 'preview' : `preview-${PREVIEW_NAME}`) : '';
export const keyOf = (live) => (SANDBOX ? live.replace(/^(questdice|qd)\./, (m) => `${m}${SANDBOX_NAME}.`) : live); // questdice.hero. -> questdice.lab.hero. / questdice.preview.hero.
