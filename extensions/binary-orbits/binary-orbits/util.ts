/** What both scenes share: a seedable PRNG and colour parsing. Pure functions, no DOM. */

/** A small, seedable PRNG (mulberry32): the same seed lays the same stars. */
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `#rrggbb` as linear-ish 0..1 channels; anything else, the fallback. */
export function rgb(hex: unknown, fallback: readonly [number, number, number]): [number, number, number] {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return [...fallback];
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
