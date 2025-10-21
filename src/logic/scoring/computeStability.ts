import type { CandidatePlacement, GridDimensions } from "../placement/gridCollision";
import { getAABB, getOrientedSize } from "../placement/orientation";
import { computeSupportRatio, SUPPORT_THRESHOLD } from "../placement/supportSurface";
import { computeCenterOfMass, type MassInstance } from "../placement/com";

export const computeStabilityScore = (items: CandidatePlacement[], dims: GridDimensions) => {
  if (!items || items.length === 0) return 30;

  // Prepare once with others list precomputed by index
  const totalMass = items.reduce((s, it) => s + (it.spec.massKg || 0), 0);
  if (totalMass <= 0) return 0;

  let weightedSupport = 0;
  let weightedPenalty = 0;
  const eps = 1e-3;

  items.forEach((it, idx) => {
    const mass = it.spec.massKg || 0;
    const size = getOrientedSize(it.spec, it.rotation);
    const box = getAABB({ position: it.position, rotation: it.rotation }, it.spec);
    const others = items.filter((_, j) => j !== idx);

    const ratio = computeSupportRatio(
      { x: it.position.x, z: it.position.z, w: size.width, d: size.depth },
      box.min.y,
      others,
    );
    weightedSupport += mass * ratio;
    if (ratio < SUPPORT_THRESHOLD - eps) {
      weightedPenalty += mass * (SUPPORT_THRESHOLD - ratio);
    }
  });

  const supportAvg = Math.min(Math.max(weightedSupport / totalMass, 0), 1);
  const penalty = Math.min(Math.max(weightedPenalty / totalMass, 0), 1);

  // Penalize top-heavy stacks using COM height ratio
  const masses = items.map((it) => ({ spec: it.spec, position: it.position, rotation: it.rotation })) as MassInstance[];
  const com = computeCenterOfMass(masses);
  const height = Math.max(dims.height, 0.0001);
  const hRatio = Math.min(Math.max(com.y / height, 0), 1);
  const heightFactor = Math.max(1 - 0.6 * hRatio, 0.4); // keep at least 40%

  // Score components: base by average support, minus overhang penalty, scaled by height factor
  const base = 30 * supportAvg * heightFactor;
  const overhangPenalty = 20 * penalty; // up to -20
  const score = Math.max(Math.min(base - overhangPenalty, 30), 0);
  return score;
};
