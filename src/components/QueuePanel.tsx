import { useMemo, useEffect, useRef, Suspense, Component, type ReactNode } from "react";
import { useGameStore } from "../store/useGameStore";
import type { ItemSpec } from "../types";
import { Canvas } from "@react-three/fiber";
// no Center used here
// Box3, Vector3 handled via bounds util
import { ENABLE_FBX_MODELS, ENABLE_QUEUE_ROW_PREVIEWS, FBX_BOUNDS_MODE } from "../config";
import { resolveModelUrl } from "../assets/models";
import { useFbxWithResources } from "../utils/useFbxWithResources";
import { getMainBounds, hideBackgroundMeshes, hasRenderableMeshes } from "../utils/fbxBounds";
import { Box3, Vector3 } from "three";
import { getModelOverride } from "../assets/modelOverrides";
import { useInViewport } from "../hooks/useInViewport";

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
  const radius = Math.max(spec.size.w, spec.size.h, spec.size.d) / 2;
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 24, 24]} />
      {commonMaterial}
    </mesh>
  );
};

const FbxPreviewMesh = ({ spec }: { spec: ItemSpec }) => {
  const euler: [number, number, number] = [Math.PI / 8, Math.PI / 6, 0];
  const url = useMemo(() => resolveModelUrl(spec.model)!, [spec.model]);
  const fbx = useFbxWithResources(url, "/assets/3d/");
  const model = useMemo(() => fbx.clone(true), [fbx]);
  const override = useMemo(() => getModelOverride(spec.id) ?? getModelOverride(spec.model ?? undefined), [spec.id, spec.model]);
  useEffect(() => {
    if (FBX_BOUNDS_MODE === "heuristic") hideBackgroundMeshes(model, override);
  }, [model]);
  useEffect(() => {
    fbx.traverse((o: any) => {
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
  }, [fbx]);
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

const RowPreview = ({ spec }: { spec: ItemSpec }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewport(ref);
  if (!ENABLE_QUEUE_ROW_PREVIEWS) {
    return <div ref={ref} className="queue__preview queue__preview--small"><div className="queue__preview--placeholder" /></div>;
  }
  const diag = Math.sqrt(spec.size.w ** 2 + spec.size.h ** 2 + spec.size.d ** 2) || 1;
  const dist = Math.max(diag * 1.8, 5);
  return (
    <div ref={ref} className="queue__preview queue__preview--small">
      {inView ? (
        <Canvas
          camera={{ position: [dist, dist * 0.7, dist], fov: 35 }}
          dpr={[1, 1]}
          frameloop="demand"
          gl={{ antialias: false, powerPreference: "low-power", logarithmicDepthBuffer: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={0.9} />
          <LocalErrorBoundary fallback={<PrimitivePreviewMesh spec={spec} />}>
            <Suspense fallback={<PrimitivePreviewMesh spec={spec} />}>
              {ENABLE_FBX_MODELS && spec.model ? <FbxPreviewMesh spec={spec} /> : <PrimitivePreviewMesh spec={spec} />}
            </Suspense>
          </LocalErrorBoundary>
        </Canvas>
      ) : (
        <div className="queue__preview--placeholder" />
      )}
    </div>
  );
};

const QueuePanel = () => {
  const queue = useGameStore((s) => s.queue);
  const catalog = useGameStore((s) => s.itemsCatalog);

  const byId = useMemo(() => {
    const map = new Map<string, ItemSpec>();
    catalog.forEach((it) => map.set(it.id, it));
    return map;
  }, [catalog]);

  const allQueue = queue ?? [];
  const nextId = allQueue[0];
  const nextSpec = byId.get(nextId);
  const nextDiag = nextSpec ? Math.sqrt(nextSpec.size.w ** 2 + nextSpec.size.h ** 2 + nextSpec.size.d ** 2) || 1 : 1;
  const nextDist = nextSpec ? Math.max(nextDiag * 2.4, 7) : 7;
  const allSpecs = allQueue.map((id) => byId.get(id)).filter(Boolean) as ItemSpec[];
  const listRef = useRef<HTMLDivElement>(null);
  // Scroll to bottom so「次」は常に下に表示される
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [allQueue.length]);

  if (allSpecs.length === 0) return null;

  return (
    <div className="queue">
      <div className="queue__card queue__card--wide">
        <div className="queue__header">次はこれ！</div>
        <div ref={listRef} className="queue__list queue__list--vertical queue__list--scroll">
          {allSpecs.map((spec) => (
            <div key={spec.id} className="queue__row" title={spec.name}>
              <div className="queue__row-info">
                <div className="queue__row-name">{spec.name}</div>
                <div className="queue__row-meta">
                  <span>{spec.massKg} kg</span>
                  <span>
                    {spec.size.w}×{spec.size.d}×{spec.size.h} m
                  </span>
                </div>
              </div>
              <RowPreview spec={spec} />
            </div>
          ))}
        </div>
        {nextSpec ? (
          <div className="queue__next-row">
            <div className="queue__next-info">
              <div className="queue__next-name">{nextSpec.name}</div>
              <div className="queue__next-meta">
                <span>{nextSpec.massKg} kg</span>
                <span>
                  {nextSpec.size.w}×{nextSpec.size.d}×{nextSpec.size.h} m
                </span>
              </div>
            </div>
            <div className="queue__preview">
              <Canvas camera={{ position: [nextDist, nextDist * 0.7, nextDist], fov: 35 }} dpr={[1, 1]} frameloop="demand" gl={{ antialias: false, powerPreference: "low-power", logarithmicDepthBuffer: true }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 8, 5]} intensity={0.9} />
                <LocalErrorBoundary fallback={<PrimitivePreviewMesh spec={nextSpec} />}>
                  <Suspense fallback={<PrimitivePreviewMesh spec={nextSpec} />}>
                    {ENABLE_FBX_MODELS && nextSpec.model ? (
                      <FbxPreviewMesh spec={nextSpec} />
                    ) : (
                      <PrimitivePreviewMesh spec={nextSpec} />
                    )}
                  </Suspense>
                </LocalErrorBoundary>
              </Canvas>
            </div>
          </div>
        ) : (
          <div className="queue__empty">No items</div>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;
