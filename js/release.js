// What the live game plays (Dave's approvals). The rules live behind switches in js/data.js so the tools and tests can compare them;
// this file turns on the approved ones for everyone, before the game boots. ?lab (js/lab.js) plays the same rules with its own saves,
// plus whatever is still being tried there.
//   23 Oct 2026  the teamwork pass: Heart to Heart (replaces Heartbeat), heart faces and Ready at the table, charms resting, perk cards
//                with before and after (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md)
import { TEAMWORK } from './data.js';

export function applyRelease() {
  Object.assign(TEAMWORK, { heartToHeart: true, noCharms: true, perkPreview: true });
}
