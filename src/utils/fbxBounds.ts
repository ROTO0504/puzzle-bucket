import { Box3, Object3D, Vector3 } from "three";

export type BoundsOptions = {
  includeNames?: string[];
  excludeNames?: string[];
  thinRatio?: number; // threshold for thin plane classification
  outlierPlaneFactor?: number; // how much bigger to treat as outlier (area)
  respectVisibility?: boolean;
};

const matchesAny = (name: string | undefined, patterns: string[] | undefined): boolean => {
  if (!name || !patterns || patterns.length === 0) return false;
  const lower = name.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
};

const isLikelyBackgroundName = (name: string | undefined) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes("bg") ||
    n.includes("background") ||
    n.includes("plane") ||
    n.includes("floor") ||
    n.includes("canvas") ||
    n.includes("board") ||
    n.includes("panel") ||
    n.includes("card") ||
    n.includes("label") ||
    n.includes("back") ||
    n.includes("base") ||
    n.includes("image")
  );
};

/**
 * Heuristically decide if a mesh is a thin 2D plane (e.g., background card) to be ignored.
 */
const isThinPlane = (size: Vector3, thinRatio = 0.1) => {
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const minDim = Math.min(size.x, size.y, size.z);
  const ratio = minDim / maxDim;
  return ratio < thinRatio; // extremely thin in one axis
};

export type BoundsResult = {
  box: Box3;
  size: Vector3;
  center: Vector3;
};

/**
 * Traverse meshes, ignore heuristic outliers and compute a bounds representing the main content.
 *
 * ポリシー:
 * - 立体(非薄板)が一つでもあれば、それらのみでBoundsを作る
 * - 薄板しか無ければ、面積が極端に大きい薄板(背景と見なす)を除外してBoundsを作る
 */
export const getMainBounds = (root: Object3D, options?: BoundsOptions): BoundsResult => {
  const meshBoxes: { obj: Object3D; box: Box3; size: Vector3 }[] = [];

  root.traverse((o) => {
    // runtime check for Mesh
    const anyObj: any = o as any;
    if (anyObj && anyObj.isMesh && anyObj.geometry) {
      if (options?.respectVisibility && o.visible === false) return;
      if (matchesAny(o.name, options?.excludeNames)) return;
      if (options?.includeNames && options.includeNames.length > 0 && !matchesAny(o.name, options.includeNames)) {
        return;
      }
      const b = new Box3().setFromObject(o);
      const s = new Vector3();
      b.getSize(s);
      meshBoxes.push({ obj: o, box: b, size: s });
    }
  });

  if (meshBoxes.length === 0) {
    const fallback = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    fallback.getSize(size);
    fallback.getCenter(center);
    return { box: fallback, size, center };
  }

  // Separate thin planes and volumetric meshes
  const thin = options?.thinRatio ?? 0.02;
  const planes = meshBoxes.filter(({ size }) => isThinPlane(size, thin));
  const volumetric = meshBoxes.filter(({ size }) => !isThinPlane(size, thin));

  let use: typeof meshBoxes = [];
  if (volumetric.length > 0) {
    // Prefer volumetric content; also drop obvious background names among volumetric just in case
    use = volumetric.filter(({ obj }) => !isLikelyBackgroundName(obj.name));
    if (use.length === 0) use = volumetric;
  } else {
    // Only planes available: drop the largest extreme plane as background if it dwarfs others
    const byArea = (s: Vector3) => {
      const dims = [s.x, s.y, s.z].sort((a, b) => b - a);
      return Math.max(1e-6, dims[0] * dims[1]);
    };
    const sorted = [...planes].sort((a, b) => byArea(b.size) - byArea(a.size));
    if (sorted.length >= 2) {
      const a0 = byArea(sorted[0].size);
      const a1 = byArea(sorted[1].size);
      const factor = options?.outlierPlaneFactor ?? 1.8;
      const keep = a0 > a1 * factor ? sorted.slice(1) : sorted; // hide only extreme outlier
      use = keep.filter(({ obj }) => !isLikelyBackgroundName(obj.name));
      if (use.length === 0) use = keep; // if all had bg names, still keep to avoid empty
    } else {
      use = planes; // single plane -> keep it
    }
  }

  const union = use.reduce((acc, { box }) => acc.union(box), new Box3());
  const size = new Vector3();
  const center = new Vector3();
  union.getSize(size);
  union.getCenter(center);
  return { box: union, size, center };
};

/**
 * Optionally mark obviously-background meshes as invisible so they don't render.
 */
export const hideBackgroundMeshes = (root: Object3D, options?: BoundsOptions) => {
  const meshBoxes: { obj: Object3D; size: Vector3; area: number }[] = [];
  root.traverse((o) => {
    const anyObj: any = o as any;
    if (anyObj && anyObj.isMesh) {
      const b = new Box3().setFromObject(o);
      const s = new Vector3();
      b.getSize(s);
      const dims = [s.x, s.y, s.z].sort((a, b) => b - a);
      const area = Math.max(1e-6, dims[0] * dims[1]);
      meshBoxes.push({ obj: o, size: s, area });
    }
  });

  const thin = options?.thinRatio ?? 0.02;
  const planes = meshBoxes.filter((m) => isThinPlane(m.size, thin));
  const volumetric = meshBoxes.filter((m) => !isThinPlane(m.size, thin));

  if (volumetric.length > 0) {
    // When there is volumetric content, hide all planes by default; plus name-based backgrounds.
    planes.forEach(({ obj }) => {
      obj.visible = false;
    });
    volumetric.forEach(({ obj }) => {
      if (matchesAny(obj.name, options?.excludeNames) || isLikelyBackgroundName(obj.name)) obj.visible = false;
    });
  } else if (planes.length > 0) {
    // Only planes exist: hide the largest if it's a clear outlier
    const sorted = [...planes].sort((a, b) => b.area - a.area);
    if (sorted.length >= 2) {
      const [first, second] = sorted;
      const factor = options?.outlierPlaneFactor ?? 1.8;
      if (first.area > second.area * factor) first.obj.visible = false;
    }
    // Name-based backgrounds are hidden as well
    planes.forEach(({ obj }) => {
      if (isLikelyBackgroundName(obj.name) || matchesAny(obj.name, options?.excludeNames)) obj.visible = false;
    });
  }
};

export const hasRenderableMeshes = (root: Object3D, respectVisibility = true): boolean => {
  let found = false;
  root.traverse((o) => {
    const anyObj: any = o as any;
    if (anyObj && anyObj.isMesh && anyObj.geometry) {
      if (respectVisibility && o.visible === false) return;
      found = true;
    }
  });
  return found;
};
