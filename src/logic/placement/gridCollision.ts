import type { ItemSpec } from "../../types";
import type { AABB, Rotation, Vec3 } from "./orientation";
import { getAABB } from "./orientation";

export type GridDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type CandidatePlacement = {
  id?: string;
  spec: ItemSpec;
  position: Vec3;
  rotation: Rotation;
};

const intersects = (a: AABB, b: AABB) =>
  a.min.x < b.max.x &&
  a.max.x > b.min.x &&
  a.min.y < b.max.y &&
  a.max.y > b.min.y &&
  a.min.z < b.max.z &&
  a.max.z > b.min.z;

// Constrain within basket bounds, including height.
const withinBounds = (box: AABB, dimensions: GridDimensions) =>
  box.min.x >= 0 &&
  box.min.y >= 0 &&
  box.min.z >= 0 &&
  box.max.x <= dimensions.width &&
  box.max.y <= dimensions.height &&
  box.max.z <= dimensions.depth;

export const gridCollision = (
  candidate: CandidatePlacement,
  existing: CandidatePlacement[],
  dimensions: GridDimensions,
) => {
  const candidateBox = getAABB({ position: candidate.position, rotation: candidate.rotation }, candidate.spec);

  if (!withinBounds(candidateBox, dimensions)) {
    return true;
  }

  return existing.some((item) => {
    if (candidate.id && candidate.id === item.id) {
      return false;
    }
    const box = getAABB({ position: item.position, rotation: item.rotation }, item.spec);
    return intersects(candidateBox, box);
  });
};
