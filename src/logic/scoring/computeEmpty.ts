export const computeEmptyScore = (occupiedVoxels: number, totalVoxels: number) => {
  if (totalVoxels <= 0) return 0;
  const occupancy = occupiedVoxels / totalVoxels;
  const score = 40 * Math.min(Math.max(occupancy / 0.75, 0), 1);
  return Number.isFinite(score) ? score : 0;
};
