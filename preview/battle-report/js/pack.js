// Turn a table into text and back without breaking shared objects.
// Plain JSON would copy a hero once for the seat, once for the company and once for the battle;
// here an object met a second time is written as { $ref: n } and comes back as the same object.
// Functions (the battle's dice roller) are dropped; table.js rebuilds them on load.

export function pack(root) {
  const seen = new Map();
  const shared = new Set();
  (function count(v) {
    if (!v || typeof v !== 'object') return;
    if (seen.has(v)) { shared.add(v); return; }
    seen.set(v, -1);
    if (Array.isArray(v)) v.forEach(count);
    else for (const k of Object.keys(v)) count(v[k]);
  })(root);

  const ids = new Map();
  function walk(v) {
    if (typeof v === 'function') return undefined;
    if (!v || typeof v !== 'object') return v;
    if (ids.has(v)) return { $ref: ids.get(v) };
    let tag = null;
    if (shared.has(v)) { tag = ids.size; ids.set(v, tag); }
    if (Array.isArray(v)) {
      const arr = v.map((x) => { const w = walk(x); return w === undefined ? null : w; });
      return tag == null ? arr : { $id: tag, $arr: arr };
    }
    const out = tag == null ? {} : { $id: tag };
    for (const k of Object.keys(v)) {
      const w = walk(v[k]);
      if (w !== undefined) out[k] = w;
    }
    return out;
  }
  return JSON.stringify(walk(root));
}

export function unpack(text) {
  const ids = new Map();
  function walk(v) {
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) {
      const arr = [];
      for (const x of v) arr.push(walk(x));
      return arr;
    }
    if ('$ref' in v) {
      if (!ids.has(v.$ref)) throw new Error('The saved table is damaged.');
      return ids.get(v.$ref);
    }
    if ('$arr' in v) {
      const arr = [];
      ids.set(v.$id, arr);
      for (const x of v.$arr) arr.push(walk(x));
      return arr;
    }
    const out = {};
    if ('$id' in v) ids.set(v.$id, out);
    for (const k of Object.keys(v)) if (k !== '$id') out[k] = walk(v[k]);
    return out;
  }
  return walk(JSON.parse(text));
}
