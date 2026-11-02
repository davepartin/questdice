// CAMP-02 test prices. These apply only in the isolated training preview, pending balance study.
export const TRAINING = Object.freeze({
  health: Object.freeze({ name: 'Maximum health', amount: 4, costs: Object.freeze([50, 100, 180]) }),
  start: Object.freeze({ name: 'Starting magic', amount: 1, costs: Object.freeze([75, 150, 250]) }),
  capacity: Object.freeze({ name: 'Magic capacity', amount: 2, costs: Object.freeze([40, 80, 140]) }),
});
export const trainingRanks = (value) => Object.fromEntries(Object.keys(TRAINING).map(k => [k,
  Number.isInteger(value?.[k]) ? Math.max(0, Math.min(3, value[k])) : 0,
]));
