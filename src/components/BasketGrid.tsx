import { Edges } from "@react-three/drei";
import { useMemo } from "react";

const DIMENSIONS = {
  width: 12,
  depth: 9,
  height: 6,
};

const BasketGrid = () => {
  const { width, depth, height } = DIMENSIONS;

  const gridArgs = useMemo<[number, number, string | number, string | number]>(
    () => [width, width, "#cbd5f5", "#e2e8f0"],
    [width],
  );

  return (
    <group>
      <gridHelper
        args={gridArgs}
        position={[width / 2, 0.001, depth / 2]}
        rotation={[0, 0, 0]}
      />
      <gridHelper
        args={[depth, depth, "#dbeafe", "#e2e8f0"]}
        position={[0.001, height / 2, depth / 2]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <gridHelper
        args={[height, height, "#bfdbfe", "#e2e8f0"]}
        position={[width / 2, height / 2, depth]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh position={[width / 2, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.05} />
        <Edges color="#94a3b8" />
      </mesh>
    </group>
  );
};

export default BasketGrid;
