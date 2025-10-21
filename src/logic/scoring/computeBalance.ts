export type BalanceInput = {
  centerOfMass: { x: number; z: number };
  basketSize: { width: number; depth: number };
};

export const computeBalanceScore = ({ centerOfMass, basketSize }: BalanceInput) => {
  const centerX = basketSize.width / 2;
  const centerZ = basketSize.depth / 2;
  const dx = centerOfMass.x - centerX;
  const dz = centerOfMass.z - centerZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const maxRadius = Math.sqrt(centerX * centerX + centerZ * centerZ);

  if (maxRadius === 0) return { score: 30, offset: 0, maxRadius: 0 };

  const offset = Math.min(distance / maxRadius, 1);
  const score = 30 * (1 - offset) * (1 - offset);
  return { score, offset, maxRadius };
};
