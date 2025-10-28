import { Suspense, useMemo, useCallback, useEffect, Component, type ReactNode } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import BasketGrid from "./BasketGrid";
import ItemGhost from "./ItemGhost";
import { useGameStore, BASKET_DIMENSIONS } from "../store/useGameStore";
import type { PlacedInstance } from "../store/useGameStore";
import { getWorldCenter, toEulerRadians } from "../logic/placement/orientation";
// Box3, Vector3 no longer used here after bounds util
import { ENABLE_FBX_MODELS, FBX_BOUNDS_MODE } from "../config";
import { resolveModelUrl } from "../assets/models";
import { useFbxWithResources } from "../utils/useFbxWithResources";
import { getMainBounds, hideBackgroundMeshes, hasRenderableMeshes } from "../utils/fbxBounds";
import { Box3, Vector3 } from "three";
import { getModelOverride } from "../assets/modelOverrides";

const FbxItem = ({ instance }: { instance: PlacedInstance }) => {
  const { spec, position, rotation } = instance;
  const url = useMemo(() => resolveModelUrl(spec.model)!, [spec.model]);
  const fbx = useFbxWithResources(url, "/assets/3d/");
  const model = useMemo(() => fbx.clone(true), [fbx]);
  const override = useMemo(() => getModelOverride(spec.id) ?? getModelOverride(spec.model ?? undefined), [spec.id, spec.model]);

  useEffect(() => {
    if (FBX_BOUNDS_MODE === "heuristic") hideBackgroundMeshes(model, override);
    model.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const applyMat = (m: any) => {
          if (!m) return;
          m.side = 2; // DoubleSide
          if (typeof m.opacity === "number" && m.opacity < 1) m.transparent = true;
          if (m.map) {
            m.map.anisotropy = 8;
            m.map.needsUpdate = true;
          }
          m.needsUpdate = true;
        };
        if (Array.isArray(o.material)) o.material.forEach(applyMat);
        else applyMat(o.material);
      }
    });
  }, [model]);

  const { scale, localOffset } = useMemo(() => {
    const compute = () => {
      if (FBX_BOUNDS_MODE === "heuristic") {
        const { size, center } = getMainBounds(model, { ...override, respectVisibility: false });
        return { size, center };
      }
      const box = new Box3().setFromObject(model);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);
      return { size, center };
    };
    const { size, center } = compute();
    const eps = 1e-6;
    const minDim = Math.min(size.x, size.y, size.z);
    const maxDim = Math.max(size.x, size.y, size.z);
    const isPlanar = maxDim > eps && minDim / maxDim < 0.05;
    let sx = size.x > eps ? spec.size.w / size.x : 1;
    let sy = size.y > eps ? spec.size.h / size.y : 1;
    let sz = size.z > eps ? spec.size.d / size.z : 1;
    if (isPlanar) {
      const specMax = Math.max(spec.size.w, spec.size.h, spec.size.d);
      const s = maxDim > eps ? specMax / maxDim : 1;
      sx = sy = sz = s;
    }
    const offset: [number, number, number] = [-center.x * sx, -center.y * sy, -center.z * sz];
    return { scale: [sx, sy, sz] as [number, number, number], localOffset: offset };
  }, [model, spec.size.w, spec.size.h, spec.size.d, override]);

  const worldPosition = useMemo(() => {
    const center = getWorldCenter({ position, rotation }, spec);
    return [center.x, center.y, center.z] as [number, number, number];
  }, [position, rotation, spec]);

  const euler = useMemo(() => toEulerRadians(rotation), [rotation]);

  const hasMeshes = hasRenderableMeshes(model, true);
  return (
    <group position={worldPosition} rotation={euler}>
      {hasMeshes ? (
        <group position={localOffset} scale={scale}>
          <primitive object={model} />
        </group>
      ) : (
        // Fallback safety: render primitive if nothing visible
        <mesh castShadow receiveShadow>
          <boxGeometry args={[spec.size.w, spec.size.h, spec.size.d]} />
          <meshStandardMaterial color={spec.fragile ? "#ffb49d" : "#9dc5ff"} />
        </mesh>
      )}
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
      const { ray } = event;
      const denom = ray.direction.y;
      if (Math.abs(denom) < 1e-6) return;
      const t = (ghost.position.y - ray.origin.y) / denom;
      const x = ray.origin.x + ray.direction.x * t;
      const z = ray.origin.z + ray.direction.z * t;
      setGhostPosition({ x, y: ghost.position.y, z });
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
      const { ray } = event;
      const denom = ray.direction.y;
      if (Math.abs(denom) < 1e-6) return;
      const t = (ghost.position.y - ray.origin.y) / denom;
      const x = ray.origin.x + ray.direction.x * t;
      const z = ray.origin.z + ray.direction.z * t;
      setGhostPosition({ x, y: ghost.position.y, z });
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
      <Canvas
        shadows
        camera={{ position: [16, 14, 16], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={["#f3f5f8"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          intensity={1.1}
          position={[10, 12, 8]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-normalBias={0.02}
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
