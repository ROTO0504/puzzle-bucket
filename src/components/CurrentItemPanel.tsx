import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useMemo, useEffect, Suspense, Component, type ReactNode } from "react";
import { useGameStore } from "../store/useGameStore";
import type { ItemSpec } from "../types";
// Box3, Vector3 handled via bounds util
import { ENABLE_FBX_MODELS, FBX_BOUNDS_MODE, ENABLE_LOG_DEPTH } from "../config";
import { resolveModelUrl } from "../assets/models";
import { useFbxWithResources } from "../utils/useFbxWithResources";
import { getMainBounds, hideBackgroundMeshes, hasRenderableMeshes } from "../utils/fbxBounds";
import { Box3, Vector3 } from "three";
import { useThree } from "@react-three/fiber";
import { tuneMaterials } from "../utils/materialTuning";
import { getModelOverride } from "../assets/modelOverrides";

const PrimitivePreviewMesh = ({ spec }: { spec: ItemSpec }) => {
  const euler: [number, number, number] = [Math.PI / 8, Math.PI / 6, 0];
  const color = spec.fragile ? "#ffb49d" : "#9dc5ff";
  const commonMaterial = <meshStandardMaterial color={color} />;

  if (spec.shape === "box") {
    return (
      <mesh rotation={euler} castShadow receiveShadow>
        <boxGeometry args={[spec.size.w, spec.size.h, spec.size.d]} />
        {commonMaterial}
      </mesh>
    );
  }
  if (spec.shape === "cylinder") {
    const radius = Math.max(spec.size.w, spec.size.d) / 2;
    return (
      <mesh rotation={euler} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, spec.size.h, 20]} />
        {commonMaterial}
      </mesh>
    );
  }
  if (spec.shape === "capsule") {
    const radius = Math.min(spec.size.w, spec.size.d) / 2;
    const length = Math.max(spec.size.h - radius * 2, 0.1);
    return (
      <mesh rotation={euler} castShadow receiveShadow>
        <capsuleGeometry args={[radius, Math.max(length, 0.1), 6, 16]} />
        {commonMaterial}
      </mesh>
    );
  }
  if (spec.shape === "sphere") {
    const radius = Math.max(spec.size.w, spec.size.h, spec.size.d) / 2;
    return (
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 24, 24]} />
        {commonMaterial}
      </mesh>
    );
  }
  return null;
};

const FbxPreviewMesh = ({ spec }: { spec: ItemSpec }) => {
  const euler: [number, number, number] = [Math.PI / 8, Math.PI / 6, 0];
  const url = useMemo(() => resolveModelUrl(spec.model)!, [spec.model]);
  const fbx = useFbxWithResources(url, "/assets/3d/");
  const model = useMemo(() => fbx.clone(true), [fbx]);
  const override = useMemo(() => getModelOverride(spec.id) ?? getModelOverride(spec.model ?? undefined), [spec.id, spec.model]);
  const { gl } = useThree();
  useEffect(() => {
    if (FBX_BOUNDS_MODE === "heuristic") hideBackgroundMeshes(model, override);
    tuneMaterials(model, gl as any);
  }, [model, gl]);
  useEffect(() => {
    model.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const applyMat = (m: any) => {
          if (!m) return;
          m.side = 0; // FrontSide
          if (typeof m.opacity === "number" && m.opacity < 1) m.transparent = true;
          m.needsUpdate = true;
        };
        if (Array.isArray(o.material)) o.material.forEach(applyMat);
        else applyMat(o.material);
      }
    });
  }, [model]);
  const { size, center } = useMemo(() => {
    if (FBX_BOUNDS_MODE === "heuristic") return getMainBounds(model, { ...override, respectVisibility: false });
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { size, center };
  }, [model, override]);
  const scale = useMemo(() => {
    const sx = size.x > 0 ? spec.size.w / size.x : 1;
    const sy = size.y > 0 ? spec.size.h / size.y : 1;
    const sz = size.z > 0 ? spec.size.d / size.z : 1;
    return [sx, sy, sz] as [number, number, number];
  }, [size.x, size.y, size.z, spec.size.w, spec.size.h, spec.size.d]);
  const localOffset: [number, number, number] = [
    -center.x * scale[0],
    -center.y * scale[1],
    -center.z * scale[2],
  ];
  const hasMeshes = hasRenderableMeshes(model, true);
  return (
    <group rotation={euler}>
      {hasMeshes ? (
        <group position={localOffset} scale={scale}>
          <primitive object={model} />
        </group>
      ) : (
        <PrimitivePreviewMesh spec={spec} />
      )}
    </group>
  );
};

class LocalErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) return this.props.fallback as any;
    return this.props.children as any;
  }
}

const ItemPreview = ({ spec }: { spec: ItemSpec }) => {
  const diag = Math.sqrt(spec.size.w ** 2 + spec.size.h ** 2 + spec.size.d ** 2) || 1;
  // Keep a comfortable distance so the model fits well.
  const dist = Math.max(diag * 2.6, 6);
  return (
    <div className="current-item__preview">
      <Canvas
        shadows
        camera={{ position: [dist, dist * 0.7, dist], fov: 35 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: ENABLE_LOG_DEPTH }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.9} castShadow />
        <LocalErrorBoundary fallback={<PrimitivePreviewMesh spec={spec} />}>
          <Suspense fallback={<PrimitivePreviewMesh spec={spec} />}>
            {ENABLE_FBX_MODELS && spec.model ? (
              <FbxPreviewMesh spec={spec} />
            ) : (
              <PrimitivePreviewMesh spec={spec} />
            )}
          </Suspense>
        </LocalErrorBoundary>
        <Environment preset="warehouse" />
      </Canvas>
    </div>
  );
};

const CurrentItemPanel = () => {
  const ghost = useGameStore((s) => s.ghostInstance);
  if (!ghost) return null;
  const spec = ghost.spec;
  const hardness = spec.fragile ? "柔らかい" : "硬い";
  return (
    <div className="current-item">
      <div className="current-item__card">
        <div className="current-item__header">
          <div className="current-item__title">{spec.name}</div>
          <div className="current-item__subtitle">ID: {spec.id}</div>
        </div>
        <div className="current-item__grid">
          <div className="current-item__block">
            <div className="current-item__label">重さ</div>
            <div className="current-item__value">{spec.massKg} kg</div>
          </div>
          <div className="current-item__block">
            <div className="current-item__label">サイズ (W×D×H)</div>
            <div className="current-item__value">
              {spec.size.w} × {spec.size.d} × {spec.size.h} m
            </div>
          </div>
          <div className="current-item__block">
            <div className="current-item__label">硬さ</div>
            <div className="current-item__value">{hardness}</div>
          </div>
        </div>
        <ItemPreview spec={spec} />
      </div>
    </div>
  );
};

export default CurrentItemPanel;
