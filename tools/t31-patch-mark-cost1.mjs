// Candidate (T31 measurement, 6 Nov 2026): Hunter's Mark costs 1 magic, not 2. Measured value at rank I is 1.21 a magic, the lowest of any card (the others sit near 2).
import * as D from '../js/data.js';
D.CLASSES.ranger.cards.find((c) => c.id === 'mark').cost = 1;
