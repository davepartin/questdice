// What the Arrows' ammunition says it does, worded from the rules the game is actually playing (WEAPONS2.arrowRules), so the camp card and the
// battle banner can never describe a rule that is not on. Pure: no imports. (T20: the cards still described the older half-splash and halved-blow tests.)
export function ammoLine(kind, rules = {}) {
  switch (kind) {
    case 'normal': return 'Bigger numbers. No arrowheads.';
    case 'pierce': return rules.pierce === 'all' ? 'Arrowhead: the whole arrow hit goes through block.' : 'Arrowhead: your hand’s Strength goes through block.';
    case 'fire': return rules.fire === 'full' ? 'Arrowhead: hits, and your hand’s Strength splashes on every other monster.' : 'Arrowhead: hits, and half your hand’s Strength splashes on the others.';
    case 'frost': return rules.frost === 'strength' ? 'Arrowhead: hits, and its next blow is softened by your hand’s Strength.' : 'Arrowhead: hits, and halves its next blow.';
    default: return '';
  }
}
// The battle banner's second line for an arrowhead (a = ev.arrow: { kind, n }).
export function arrowBannerSub(a, rules = {}) {
  if (a.kind === 'pierce') return `${a.n} pierce`;
  if (a.kind === 'fire') return a.n ? `${a.n} to the others` : 'too weak to spread';
  return rules.frost === 'strength' ? `${a.n} softer next blow` : 'halves its next blow';
}
