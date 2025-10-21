import type { ItemSpec } from "../../types";
import type { GridDimensions } from "./gridCollision";
import type { Rotation, Vec3 } from "./orientation";
import { getOrientedSize } from "./orientation";

const roundToStep = (value: number, step = 1) => Math.round(value / step) * step;

export const snapGrid = (position: Vec3, step = 1) => ({
  x: roundToStep(position.x, step),
  y: roundToStep(position.y, step),
  z: roundToStep(position.z, step),
});

export const clampToBounds = (
  position: Vec3,
  spec: ItemSpec,
  rotation: Rotation,
  dimensions: GridDimensions,
) => {
  const size = getOrientedSize(spec, rotation);
  return {
    x: Math.min(Math.max(position.x, 0), dimensions.width - size.width),
    y: Math.min(Math.max(position.y, 0), dimensions.height - size.height),
    z: Math.min(Math.max(position.z, 0), dimensions.depth - size.depth),
  };
};
