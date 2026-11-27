// Keep the spelling shown to employees separate from the key used for comparison.
export function cleanRoadName(raw) {
  const text = raw.normalize('NFC').replace(/[\u2010-\u2015\u2212]/gu, '-')
    .replace(/\?([\p{L}\p{N}](?:[^?]*?[\p{L}\p{N}])?)\?/gu, '«$1»')
    .replace(/\?/gu, ' ').replace(/\s+/gu, ' ').trim();
  const chars = [...text], stack = [], pairs = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!/["'«»„“”‟＂‘’]/u.test(ch)) continue;
    const prev = chars[i - 1] || '', next = chars[i + 1] || '';
    if (/['’]/u.test(ch) && /\p{L}/u.test(prev) && /\p{L}/u.test(next)) continue;
    const close = ch === '»' || ch === '”' || ch === '’' || (!['«','„','‘'].includes(ch) &&
      stack.length && (!next || /[\s.,;:)/»"’]/u.test(next)) && (prev !== ' ' || !next));
    chars[i] = '';
    if (close) {
      if (stack.length) pairs.push([stack.pop(), i]);
    } else if (next) stack.push(i);
  }
  // A pair enclosing the whole field is packaging. Complete quotations within the name are meaningful.
  const nonspace = [0];
  for (const char of chars) nonspace.push(nonspace[nonspace.length - 1] + Number(!!char.trim()));
  for (const [a, b] of pairs) {
    const inside = nonspace[b] - nonspace[a + 1];
    if (!inside || inside === nonspace[chars.length]) continue;
    chars[a] = '«'; chars[b] = '»';
  }
  return chars.join('').replace(/([\p{L}\d])«/gu, '$1 «').replace(/»([\p{L}\d])/gu, '» $1')
    .replace(/«\s+/gu, '«').replace(/\s+»/gu, '»').replace(/\s+/gu, ' ')
    .replace(/\s+([.,;:)])/gu, '$1').trim();
}

export function roadKey(raw) {
  // Retain address operators, road ranges and fractions so that 9+100, 9/100 and 9-100 stay distinct.
  const cleaned = cleanRoadName(raw).toLocaleLowerCase('ru');
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return '';
  return (cleaned
    .match(/[\p{L}]+|\d+(?:[.,]\d+)?|(?<=\d)\s*-\s*(?=\d)|[+/№]/gu) || [])
    .map(t => t.trim().replace(',', '.')).join(' ');
}

export function canonicalRoads(names) {
  const groups = new Map();
  for (const {name, count, referenceCount} of names) {
    const clean = cleanRoadName(name), key = roadKey(name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, new Map());
    const candidates = groups.get(key);
    const candidate = candidates.get(clean) || { name: clean, references: 0, count: 0 };
    candidate.references += referenceCount;
    candidate.count += count;
    candidates.set(clean, candidate);
  }
  const targets = new Map();
  for (const [key, candidates] of groups) {
    const ranked = [...candidates.values()].sort((a,b) =>
      b.references - a.references || Number(b.name.includes('«')) - Number(a.name.includes('«')) ||
      b.count - a.count || a.name.localeCompare(b.name, 'ru') ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    targets.set(key, ranked[0].name);
  }
  return targets;
}
