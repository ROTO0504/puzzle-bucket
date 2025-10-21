export const computeStabilityScore = (delta: number, a = 3) => {
  if (!Number.isFinite(delta) || delta < 0) {
    return 30;
  }
  const clampedDelta = Math.max(delta, 0);
  const score = 30 * Math.exp(-a * clampedDelta);
  return Math.max(Math.min(score, 30), 0);
};
