import { Suspense, useMemo, useCallback, useEffect, Component, type ReactNode } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, Center, useFBX } from "@react-three/drei";
import BasketGrid from "./BasketGrid";
import ItemGhost from "./ItemGhost";
import { useGameStore, BASKET_DIMENSIONS } from "../store/useGameStore";
import type { PlacedInstance } from "../store/useGameStore";
import { getWorldCenter, toEulerRadians } from "../logic/placement/orientation";
import { Box3, Vector3 } from "three";
import { ENABLE_FBX_MODELS } from "../config";

const FbxItem = ({ instance }: { instance: PlacedInstance }) => {
  const { spec, position, rotation } = instance;
  const url = useMemo(() => (spec.model?.startsWith("/") ? spec.model : `/${spec.model}`), [spec.model]);
  const fbx = useFBX(url);

  useEffect(() => {
    fbx.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [fbx]);

  const scale = useMemo(() => {
    const box = new Box3().setFromObject(fbx);
    const size = new Vector3();
    box.getSize(size);
    const sx = size.x > 0 ? spec.size.w / size.x : 1;
    const sy = size.y > 0 ? spec.size.h / size.y : 1;
    const sz = size.z > 0 ? spec.size.d / size.z : 1;
    return [sx, sy, sz] as [number, number, number];
  }, [fbx, spec.size.w, spec.size.h, spec.size.d]);

  const worldPosition = useMemo(() => {
    const center = getWorldCenter({ position, rotation }, spec);
    return [center.x, center.y, center.z] as [number, number, number];
  }, [position, rotation, spec]);

  const euler = useMemo(() => toEulerRadians(rotation), [rotation]);

  return (
    <group position={worldPosition} rotation={euler}>
      <Center>
        <primitive object={fbx} scale={scale} />
      </Center>
    </group>
  );
};

const ItemMesh = ({ instance }: { instance: PlacedInstance }) => {
  const { spec, position, rotation } = instance;
  const ghost = useGameStore((state) => state.ghostInstance);
  const setGhostPosition = useGameStore((state) => state.actions.setGhostPosition);
  const placeGhost = useGameStore((state) => state.actions.placeGhost);

  const worldPosition = useMemo(() => {
    const center = getWorldCenter({ position, rotation }, spec);
    return [center.x, center.y, center.z] as [number, number, number];
  }, [position, rotation, spec]);
  const euler = useMemo(() => toEulerRadians(rotation), [rotation]);

  const commonMaterial = <meshStandardMaterial color={spec.fragile ? "#ffb49d" : "#9dc5ff"} />;

  const renderPrimitive = () => {
    if (spec.shape === "box") {
      return (
        <mesh position={worldPosition} rotation={euler} castShadow receiveShadow>
          <boxGeometry args={[spec.size.w, spec.size.h, spec.size.d]} />
          {commonMaterial}
        </mesh>
      );
    }

    if (spec.shape === "cylinder") {
      const radius = Math.max(spec.size.w, spec.size.d) / 2;
      return (
        <mesh position={worldPosition} rotation={euler} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, spec.size.h, 20]} />
          {commonMaterial}
        </mesh>
      );
    }

    if (spec.shape === "capsule") {
      const radius = Math.min(spec.size.w, spec.size.d) / 2;
      const length = Math.max(spec.size.h - radius * 2, 0.1);
      return (
        <mesh position={worldPosition} rotation={euler} castShadow receiveShadow>
          <capsuleGeometry args={[radius, Math.max(length, 0.1), 6, 16]} />
          {commonMaterial}
        </mesh>
      );
    }

    if (spec.shape === "sphere") {
      const radius = Math.max(spec.size.w, spec.size.h, spec.size.d) / 2;
      return (
        <mesh position={worldPosition} castShadow receiveShadow>
          <sphereGeometry args={[radius, 24, 24]} />
          {commonMaterial}
        </mesh>
      );
    }

    return null;
  };

  class LocalErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
    constructor(props: { fallback: ReactNode; children: ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch() {
      /* noop: render fallback */
    }
    render() {
      if (this.state.hasError) return this.props.fallback;
      return this.props.children as any;
    }
  }

  const handleMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!ghost) return;
      event.stopPropagation();
      const point = event.point;
      setGhostPosition({ x: point.x, y: ghost.position.y, z: point.z });
    },
    [ghost, setGhostPosition],
  );

  const handleDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!ghost) return;
      event.stopPropagation();
      placeGhost();
    },
    [ghost, placeGhost],
  );

  let content: ReactNode;
  if (ENABLE_FBX_MODELS && spec.model) {
    content = (
      <LocalErrorBoundary fallback={renderPrimitive()}>
        <Suspense fallback={null}>
          <FbxItem instance={instance} />
        </Suspense>
      </LocalErrorBoundary>
    );
  } else if (spec.shape === "box") {
    content = (
      <mesh position={worldPosition} rotation={euler} castShadow receiveShadow>
        <boxGeometry args={[spec.size.w, spec.size.h, spec.size.d]} />
        {commonMaterial}
      </mesh>
    );
  } else {
    content = renderPrimitive();
  }

  return (
    <group onPointerMove={handleMove} onPointerDown={handleDown}>
      {content}
    </group>
  );
};

const PlacementPlane = () => {
  const ghost = useGameStore((state) => state.ghostInstance);
  const setGhostPosition = useGameStore((state) => state.actions.setGhostPosition);
  const placeGhost = useGameStore((state) => state.actions.placeGhost);
  const rotateGhostYaw = useGameStore((state) => state.actions.rotateGhostYaw);
  const rotateGhostPitch = useGameStore((state) => state.actions.rotateGhostPitch);

  const handleMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!ghost) return;
      event.stopPropagation();
      const point = event.point;
      setGhostPosition({
        x: point.x,
        y: ghost.position.y,
        z: point.z,
      });
    },
    [ghost, setGhostPosition],
  );

  const handleDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!ghost) return;
      event.stopPropagation();
      placeGhost();
    },
    [ghost, placeGhost],
  );

  const handleWheel = useCallback(
    (event: ThreeEvent<WheelEvent>) => {
      if (!ghost) return;
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      const direction = event.nativeEvent.deltaY > 0 ? 1 : -1;
      if (event.nativeEvent.shiftKey) {
        rotateGhostPitch(direction);
      } else {
        rotateGhostYaw(direction);
      }
    },
    [ghost, rotateGhostPitch, rotateGhostYaw],
  );

  return (
    <mesh
      position={[BASKET_DIMENSIONS.width / 2, 0, BASKET_DIMENSIONS.depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handleMove}
      onPointerDown={handleDown}
      onWheel={handleWheel}
    >
      <planeGeometry args={[BASKET_DIMENSIONS.width, BASKET_DIMENSIONS.depth]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const CanvasStage = () => {
  const placedInstances = useGameStore((state) => state.placedInstances);

  return (
    <div className="canvas-wrapper">
      <Canvas shadows camera={{ position: [16, 14, 16], fov: 45 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#f3f5f8"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          intensity={1.1}
          position={[10, 12, 8]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Suspense fallback={null}>
          <PlacementPlane />
          <BasketGrid />
          {placedInstances.map((instance) => (
            <ItemMesh key={instance.id} instance={instance} />
          ))}
          <ItemGhost />
          <ContactShadows
            opacity={0.3}
            color="#4a5568"
            blur={2.6}
            far={20}
            resolution={1024}
            frames={1}
          />
          <Environment preset="warehouse" />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          target={[BASKET_DIMENSIONS.width / 2, BASKET_DIMENSIONS.height / 2, BASKET_DIMENSIONS.depth / 2]}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
};

export default CanvasStage;
