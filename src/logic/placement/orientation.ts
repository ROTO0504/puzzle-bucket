import type { AxisRotation, ItemSpec, PlacedItem } from "../../types";

export type Rotation = PlacedItem["rotation"];

export type Vec3 = { x: number; y: number; z: number };

export type AABB = {
  min: Vec3;
  max: Vec3;
};

const degToRad = (deg: AxisRotation) => (deg * Math.PI) / 180;

const multiply3x3 = (a: number[][], b: number[][]) => {
  const result: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      result[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
  }
  return result;
};

const createRotationMatrix = ({ yaw, pitch }: Rotation) => {
  const yawRad = degToRad(yaw);
  const pitchRad = degToRad(pitch);

  const yawMatrix = [
    [Math.cos(yawRad), 0, Math.sin(yawRad)],
    [0, 1, 0],
    [-Math.sin(yawRad), 0, Math.cos(yawRad)],
  ];

  const pitchMatrix = [
    [1, 0, 0],
    [0, Math.cos(pitchRad), -Math.sin(pitchRad)],
    [0, Math.sin(pitchRad), Math.cos(pitchRad)],
  ];

  return multiply3x3(yawMatrix, pitchMatrix);
};

const sanitize = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

export const getOrientedSize = (spec: ItemSpec, rotation: Rotation) => {
  const rotationMatrix = createRotationMatrix(rotation);
  const size = [spec.size.w, spec.size.h, spec.size.d];

  const width =
    Math.abs(rotationMatrix[0][0]) * size[0] +
    Math.abs(rotationMatrix[0][1]) * size[1] +
    Math.abs(rotationMatrix[0][2]) * size[2];
  const height =
    Math.abs(rotationMatrix[1][0]) * size[0] +
    Math.abs(rotationMatrix[1][1]) * size[1] +
    Math.abs(rotationMatrix[1][2]) * size[2];
  const depth =
    Math.abs(rotationMatrix[2][0]) * size[0] +
    Math.abs(rotationMatrix[2][1]) * size[1] +
    Math.abs(rotationMatrix[2][2]) * size[2];

  return {
    width: sanitize(width),
    height: sanitize(height),
    depth: sanitize(depth),
  };
};

export const getWorldCenter = (placement: { position: Vec3; rotation: Rotation }, spec: ItemSpec) => {
  const size = getOrientedSize(spec, placement.rotation);
  return {
    x: placement.position.x + size.width / 2,
    y: placement.position.y + size.height / 2,
    z: placement.position.z + size.depth / 2,
  };
};

export const getAABB = (placement: { position: Vec3; rotation: Rotation }, spec: ItemSpec): AABB => {
  const size = getOrientedSize(spec, placement.rotation);
  return {
    min: { ...placement.position },
    max: {
      x: placement.position.x + size.width,
      y: placement.position.y + size.height,
      z: placement.position.z + size.depth,
    },
  };
};

export const getVolume = (spec: ItemSpec) => spec.size.w * spec.size.h * spec.size.d;

export const toEulerRadians = (rotation: Rotation): [number, number, number] => [
  degToRad(rotation.pitch),
  degToRad(rotation.yaw),
  0,
];
