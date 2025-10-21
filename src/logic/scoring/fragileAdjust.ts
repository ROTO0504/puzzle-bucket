import type { ItemSpec } from "../../types";
import type { CandidatePlacement, GridDimensions } from "../placement/gridCollision";
import { getAABB } from "../placement/orientation";

export const computeFragileAdjustment = (
  placements: CandidatePlacement[],
  dimensions: GridDimensions,
) => {
  if (placements.length === 0) return 0;

  const fragileItems = placements.filter((item) => item.spec.fragile);
  if (fragileItems.length === 0) return 0;

  let adjustment = 0;

  fragileItems.forEach((fragile) => {
    const fragileBox = getAABB({ position: fragile.position, rotation: fragile.rotation }, fragile.spec);
    const supportMass: Array<{ spec: ItemSpec }> = [];

    placements.forEach((item) => {
      if (item === fragile) return;
      const itemBox = getAABB({ position: item.position, rotation: item.rotation }, item.spec);
      const horizontallyAligned =
        itemBox.min.x < fragileBox.max.x &&
        itemBox.max.x > fragileBox.min.x &&
        itemBox.min.z < fragileBox.max.z &&
        itemBox.max.z > fragileBox.min.z;
      const restingOnTop = itemBox.min.y >= fragileBox.max.y - 0.01;

      if (horizontallyAligned && restingOnTop) {
        supportMass.push({ spec: item.spec });
      }
    });

    if (supportMass.length === 0) {
      // Slight bonus if nothing rests on the fragile item and it is near the top.
      const isNearTop = fragileBox.max.y >= dimensions.height - 1;
      if (isNearTop) {
        adjustment += 2;
      }
      return;
    }

    const heavyAbove = supportMass.some((item) => item.spec.massKg > fragile.spec.massKg);
    const lightAbove = supportMass.every((item) => item.spec.massKg <= fragile.spec.massKg);

    if (heavyAbove) {
      adjustment -= 6;
    } else if (lightAbove) {
      adjustment += 3;
    }
  });

  return Math.max(Math.min(adjustment, 10), -10);
};
