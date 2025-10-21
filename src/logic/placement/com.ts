import type { ItemSpec } from "../../types";
import { getWorldCenter } from "./orientation";
import type { Rotation } from "./orientation";

export type MassInstance = {
  spec: ItemSpec;
  position: { x: number; y: number; z: number };
  rotation: Rotation;
};

export const computeCenterOfMass = (items: MassInstance[]) => {
  if (items.length === 0) {
    return { x: 0, y: 0, z: 0, totalMass: 0 };
  }

  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  items.forEach((item) => {
    const mass = item.spec.massKg;
    const center = getWorldCenter({ position: item.position, rotation: item.rotation }, item.spec);
    totalMass += mass;
    sumX += center.x * mass;
    sumY += center.y * mass;
    sumZ += center.z * mass;
  });

  if (totalMass === 0) {
    return { x: 0, y: 0, z: 0, totalMass: 0 };
  }

  return {
    x: sumX / totalMass,
    y: sumY / totalMass,
    z: sumZ / totalMass,
    totalMass,
  };
};
