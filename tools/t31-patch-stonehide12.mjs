// Candidate (T31 measurement, 6 Nov 2026): Stonehide 12 block a step, not 8. Measured value at four charges, rank I, is 1.69 a magic, the lowest charge card (the others sit between 3.5 and 5).
import * as D from '../js/data.js';
const k = D.CLASSES.dwarf.cards.find((c) => c.id === 'stonehide'); k.per = { block: 12 }; k.fx = { block: 12 };
