export type BalanceInput = {
  centerOfMass: { x: number; z: number };
  basketSize: { width: number; depth: number };
};

export const computeBalanceScore = ({ centerOfMass, basketSize }: BalanceInput) => {
  const halfW = basketSize.width / 2;
  const halfD = basketSize.depth / 2;
  if (halfW <= 0 || halfD <= 0) return { score: 0, offset: 1, maxRadius: 1 };

  const dx = Math.abs(centerOfMass.x - halfW);
  const dz = Math.abs(centerOfMass.z - halfD);
  // Chebyshev distance normalized to edges (0 center -> 0, edge -> 1)
  const nx = Math.min(dx / halfW, 1);
  const nz = Math.min(dz / halfD, 1);
  const offset = Math.min(Math.max(Math.max(nx, nz), 0), 1);
  // Harsher falloff to reduce overly high scores near edges
  const score = 30 * Math.pow(1 - offset, 1.6);
  return { score, offset, maxRadius: 1 };
};
