/**
 * The two bodies' motion: a Keplerian ellipse about their common centre of
 * mass, solved once a frame on the CPU (in doubles) and again in the trail
 * shader for each trail star's past moment. Pure functions, no DOM.
 */

/** The companion's mass as a share of the primary's: the primary swings less. */
export const MASS_RATIO = 0.72;

/** Radians of mean anomaly per second of orbit time at speed 1: one orbit in about 16 s. */
export const MEAN_MOTION = (2 * Math.PI) / 16;

/** The ellipse's semi-major axis, in units of the disc's radius, at a separation knob. */
export const semiMajor = (separation: number): number => 0.18 + 0.42 * separation;

/** Solve Kepler's equation `E - e sin E = M` for the eccentric anomaly. */
export function eccentricAnomaly(meanAnomaly: number, e: number): number {
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  return E;
}

/**
 * The bodies' places in the orbit plane at mean anomaly `M`: the primary,
 * then the companion, each `[x, y]` from the centre of mass. The companion
 * is the lighter, so it travels the larger ellipse.
 */
export function bodies(M: number, a: number, e: number): [[number, number], [number, number]] {
  const E = eccentricAnomaly(M, e);
  const rx = a * (Math.cos(E) - e);
  const ry = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const primary = MASS_RATIO / (1 + MASS_RATIO);
  const companion = 1 / (1 + MASS_RATIO);
  return [
    [-rx * primary, -ry * primary],
    [rx * companion, ry * companion],
  ];
}
