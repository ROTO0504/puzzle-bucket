import { useMemo } from "react";
import { useGameStore } from "../store/useGameStore";
import { getWorldCenter, toEulerRadians } from "../logic/placement/orientation";

const ItemGhost = () => {
  const ghost = useGameStore((state) => state.ghostInstance);

  const center = useMemo(() => {
    if (!ghost) return null;
    return getWorldCenter({ position: ghost.position, rotation: ghost.rotation }, ghost.spec);
  }, [ghost]);

  const euler = useMemo<[number, number, number]>(() => {
    if (!ghost) return [0, 0, 0];
    return toEulerRadians(ghost.rotation);
  }, [ghost]);

  if (!ghost || !center) {
    return null;
  }

  const position: [number, number, number] = [center.x, center.y, center.z];
  const { w, h, d } = ghost.spec.size;

  return (
    <group>
      <mesh position={position} rotation={euler}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={ghost.isValid ? "#38bdf8" : "#fb7185"}
          transparent
          opacity={0.25}
          roughness={0.6}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh position={position} rotation={euler}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial
          color="#0f172a"
          wireframe
          transparent
          opacity={0.4}
          depthTest={false}
        />
      </mesh>
    </group>
  );
};

export default ItemGhost;
