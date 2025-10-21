import type { ItemSpec } from "../../types";
import type { CandidatePlacement, GridDimensions } from "./gridCollision";
import { gridCollision } from "./gridCollision";
import type { Rotation } from "./orientation";
import { getAABB, getOrientedSize } from "./orientation";

type XZ = { x: number; z: number };
export const SUPPORT_THRESHOLD = 0.7;

const computeOverlap1D = (amin: number, amax: number, bmin: number, bmax: number) =>
  Math.max(0, Math.min(amax, bmax) - Math.max(amin, bmin));

export const computeSupportRatio = (
  footprint: { x: number; z: number; w: number; d: number },
  y: number,
  existing: CandidatePlacement[],
) => {
  const area = footprint.w * footprint.d;
  if (area <= 0) return 0;
  let supportedArea = 0;
  const eps = 1e-3;

  existing.forEach((item) => {
    const box = getAABB({ position: item.position, rotation: item.rotation }, item.spec);
    // Consider items whose top is exactly the support height (within epsilon)
    if (Math.abs(box.max.y - y) <= eps) {
      const ox = computeOverlap1D(footprint.x, footprint.x + footprint.w, box.min.x, box.max.x);
      const oz = computeOverlap1D(footprint.z, footprint.z + footprint.d, box.min.z, box.max.z);
      supportedArea += ox * oz;
    }
  });

  // Ground support counts fully if y is 0
  if (Math.abs(y) <= eps) {
    supportedArea = Math.max(supportedArea, area);
  }

  return Math.min(supportedArea / area, 1);
};

export const computeSupportY = (
  xz: XZ,
  spec: ItemSpec,
  rotation: Rotation,
  existing: CandidatePlacement[],
  dimensions: GridDimensions,
) => {
  const oriented = getOrientedSize(spec, rotation);
  const posX = Math.min(Math.max(xz.x, 0), dimensions.width - oriented.width);
  const posZ = Math.min(Math.max(xz.z, 0), dimensions.depth - oriented.depth);
  const maxY = dimensions.height - oriented.height;

  const candidates = new Set<number>([0]);

  existing.forEach((item) => {
    const box = getAABB({ position: item.position, rotation: item.rotation }, item.spec);
    const overlapX = box.min.x < posX + oriented.width && box.max.x > posX;
    const overlapZ = box.min.z < posZ + oriented.depth && box.max.z > posZ;
    if (overlapX && overlapZ) {
      candidates.add(box.max.y);
    }
  });

  const sorted = Array.from(candidates).sort((a, b) => a - b);

  for (const yBase of sorted) {
    const y = Math.min(Math.max(yBase, 0), maxY);
    const candidate: CandidatePlacement = {
      spec,
      position: { x: posX, y, z: posZ },
      rotation,
    };
    if (!gridCollision(candidate, existing, dimensions)) {
      // Require at least 70% support by underlying items or ground
      const ratio = computeSupportRatio({ x: posX, z: posZ, w: oriented.width, d: oriented.depth }, y, existing);
      if (ratio >= 0.7) return y;
    }
  }

  // Fallback to ground level if nothing else fits and within bounds
  return 0;
};
