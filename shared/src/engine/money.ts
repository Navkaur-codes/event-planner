/** Rounds to one decimal place (used for display percentages). */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Clamps an integer into `[min, max]` after rounding. */
export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Splits `total` whole units across `weights` with the largest-remainder method, so the
 * parts are non-negative integers that always sum exactly to `total`. Ties on the remainder
 * go to the earlier index, which keeps the result deterministic.
 */
export function allocateLargestRemainder(total: number, weights: readonly number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weights.length === 0) return [];
  if (weightSum <= 0) {
    // No usable weights: give everything to the first slot rather than inventing a split.
    return weights.map((_, i) => (i === 0 ? total : 0));
  }
  const exact = weights.map((w) => (total * w) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = total - parts.reduce((sum, p) => sum + p, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  // Cycling guards against float error leaving more leftover units than slots.
  for (let i = 0; leftover > 0; i = (i + 1) % order.length, leftover--) {
    const slot = order[i];
    if (slot) parts[slot.index] = (parts[slot.index] ?? 0) + 1;
  }
  return parts;
}
