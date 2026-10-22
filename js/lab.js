// The lab (Dave, 22 Oct 2026: "keep experimental saves separate and do not enable the system in the live game without my approval").
// Open the game with ?lab and it plays the weapons experiment (the six one-handed weapons, the Bow and the four arrows), with its own
// heroes on this device only: a lab hero never reaches the cloud, an online table or the live heroes' list. Without ?lab nothing changes.
export const LAB = typeof location !== 'undefined' && /[?&]lab(?:[=&]|$)/.test(location.search);
