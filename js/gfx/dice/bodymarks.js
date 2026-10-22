// Small moulded identifiers for the ivory d6 pilot. No network images required.
const HEAD = { knight: 'helmet', ranger: 'slotHood', wizard: 'slotHat', dwarf: 'slotHelm', bard: 'slotCap' };

export function bodyCornerMark(cls, slot, sides) {
  if (sides !== 6) return null;
  if (slot === 'N') return { icon: HEAD[cls] || HEAD.knight, right: false, flip: false };
  if (slot === 'W' || slot === 'E') return { icon: 'slotGlove', right: slot === 'E', flip: slot === 'E' };
  if (slot === 'S') return { icon: 'slotBoot', right: false, flip: false };
  return null;
}
