// The pets (Dave, Oct 2026): Dave's pictures, one per symbol and in its colour, cut out on transparent backgrounds
// (assets/pets/*.webp, made by dev/petcut.mjs from assets/pets/src/*.jpg). Used at camp and beside the pet die in battle.
import * as D from '../data.js';

export const petImg = (type) => `assets/pets/${D.PETS[type]?.img || 'ember'}.webp`;
export const petColor = (type) => D.PETS[type]?.color || '#ffffff';
