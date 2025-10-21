import { Canvas } from "@react-three/fiber";
import { Center, Environment, useFBX } from "@react-three/drei";
import { useMemo, useEffect, Suspense, Component, type ReactNode } from "react";
import { useGameStore } from "../store/useGameStore";
import type { ItemSpec } from "../types";
import { Box3, Vector3 } from "three";
import { ENABLE_FBX_MODELS } from "../config";

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
  const url = useMemo(() => (spec.model ? (spec.model.startsWith("/") ? spec.model : `/${spec.model}`) : null), [
    spec.model,
  ]);
  if (!url) return null;
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
  return (
    <group rotation={euler}>
      <Center>
        <primitive object={fbx} scale={scale} />
      </Center>
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
  const dist = diag * 1.8;
  return (
    <div className="current-item__preview">
      <Canvas shadows camera={{ position: [dist, dist * 0.7, dist], fov: 40 }} dpr={[1, 1.5]} frameloop="demand">
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
