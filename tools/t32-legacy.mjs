// Used by T31's matched campaign runner: T31_PATCH=./t32-legacy.mjs node tools/t31-campaign.mjs 3
// applyRelease has already run; switch only the monster experiment back to its six-face baseline.
import { MONSTER_D4 } from '../js/monster-d4.js';
MONSTER_D4.on = false;
