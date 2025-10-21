import { create } from "zustand";
import type { AxisRotation, GamePhase, ItemSpec, ScoreBreakdown } from "../types";
import { ITEM_SPECS, STARTER_QUEUE, getItemSpec } from "../data/items";
import type { CandidatePlacement, GridDimensions } from "../logic/placement/gridCollision";
import { gridCollision } from "../logic/placement/gridCollision";
import { clampToBounds, snapGrid } from "../logic/placement/snapGrid";
import { computeCenterOfMass } from "../logic/placement/com";
import { getOrientedSize, getVolume } from "../logic/placement/orientation";
import type { Rotation as OrientationRotation } from "../logic/placement/orientation";
import { computeEmptyScore } from "../logic/scoring/computeEmpty";
import { computeBalanceScore } from "../logic/scoring/computeBalance";
import { computeStabilityScore } from "../logic/scoring/computeStability";
import { computeFragileAdjustment } from "../logic/scoring/fragileAdjust";
import { computeSupportY, computeSupportRatio, SUPPORT_THRESHOLD } from "../logic/placement/supportSurface";
import { MAX_STOCK } from "../config";

export type Vec3 = { x: number; y: number; z: number };

type PlacedInstance = {
  id: string;
  spec: ItemSpec;
  position: Vec3;
  rotation: OrientationRotation;
};

type GhostInstance = {
  id: string;
  spec: ItemSpec;
  position: Vec3;
  rotation: OrientationRotation;
  isValid: boolean;
};

type GameStoreState = {
  phase: GamePhase;
  totalDurationMs: number;
  timeRemainingMs: number;
  itemsCatalog: ItemSpec[];
  queue: string[];
  stock: string[]; // held item ids (FIFO)
  placedInstances: PlacedInstance[];
  ghostInstance: GhostInstance | null;
  score: ScoreBreakdown | null;
  pendingScore: ScoreBreakdown | null;
  totalVoxels: number;
  actions: {
    startGame: () => void;
    goToLeaderboard: () => void;
    goToStart: () => void;
    setGhostPosition: (position: Vec3) => void;
    rotateGhostYaw: (direction?: 1 | -1) => void;
    rotateGhostPitch: (direction?: 1 | -1) => void;
    rotateGhostRoll: (direction?: 1 | -1) => void;
    moveGhostBy: (dx: number, dz: number) => void;
    undoLastPlacement: () => void;
    holdCurrent: () => void;
    useStockAt: (index: number) => void;
    placeGhost: () => void;
    removePlacedItem: (id: string) => void;
    requestScoring: () => void;
    completeScoring: (delta?: number) => void;
    restart: () => void;
    tick: (deltaMs: number) => void;
  };
};

const BASKET_DIMENSIONS: GridDimensions = {
  width: 12,
  depth: 9,
  height: 12,
};

const TOTAL_VOXELS = BASKET_DIMENSIONS.width * BASKET_DIMENSIONS.depth * BASKET_DIMENSIONS.height;

const AXIS_ROTATIONS: AxisRotation[] = [0, 90, 180, 270];
const INITIAL_ROTATION: OrientationRotation = { yaw: 0, pitch: 0, roll: 0 };

let instanceCounter = 0;
const nextInstanceId = () => `placed-${++instanceCounter}`;

const rotateAxis = (value: AxisRotation, direction: 1 | -1) => {
  const index = AXIS_ROTATIONS.indexOf(value);
  const nextIndex = (index + direction + AXIS_ROTATIONS.length) % AXIS_ROTATIONS.length;
  return AXIS_ROTATIONS[nextIndex];
};

const cloneRotation = (rotation: OrientationRotation): OrientationRotation => ({
  yaw: rotation.yaw,
  pitch: rotation.pitch,
  roll: rotation.roll,
});

const toCandidatePlacements = (items: PlacedInstance[]): CandidatePlacement[] =>
  items.map((item) => ({
    id: item.id,
    spec: item.spec,
    position: item.position,
    rotation: cloneRotation(item.rotation),
  }));

const findSpawnPosition = (spec: ItemSpec, rotation: OrientationRotation, placed: PlacedInstance[]): Vec3 => {
  const oriented = getOrientedSize(spec, rotation);
  const width = Math.round(oriented.width);
  const height = Math.round(oriented.height);
  const depth = Math.round(oriented.depth);

  for (let y = 0; y <= BASKET_DIMENSIONS.height - height; y += 1) {
    for (let z = 0; z <= BASKET_DIMENSIONS.depth - depth; z += 1) {
      for (let x = 0; x <= BASKET_DIMENSIONS.width - width; x += 1) {
        const candidate: CandidatePlacement = {
          spec,
          position: { x, y, z },
          rotation: cloneRotation(rotation),
        };
        if (!gridCollision(candidate, toCandidatePlacements(placed), BASKET_DIMENSIONS)) {
          return { x, y, z };
        }
      }
    }
  }

  return { x: 0, y: 0, z: 0 };
};

const createGhost = (
  spec: ItemSpec,
  placed: PlacedInstance[],
  rotation: OrientationRotation = INITIAL_ROTATION,
): GhostInstance => {
  const rotationClone = cloneRotation(rotation);
  const spawnPosition = findSpawnPosition(spec, rotationClone, placed);
  const snapped = snapGrid(spawnPosition);
  const clampedXZ = clampToBounds(snapped, spec, rotationClone, BASKET_DIMENSIONS);
  const y = computeSupportY(
    { x: clampedXZ.x, z: clampedXZ.z },
    spec,
    rotationClone,
    toCandidatePlacements(placed),
    BASKET_DIMENSIONS,
  );
  const clamped = { ...clampedXZ, y };
  const candidate = { spec, position: clamped, rotation: rotationClone };
  const existing = toCandidatePlacements(placed);
  const collisionFree = !gridCollision(candidate, existing, BASKET_DIMENSIONS);
  const oriented = getOrientedSize(spec, rotationClone);
  const supportRatio = computeSupportRatio(
    { x: clamped.x, z: clamped.z, w: oriented.width, d: oriented.depth },
    clamped.y,
    existing,
  );
  const isValid = collisionFree && supportRatio >= SUPPORT_THRESHOLD;
  return {
    id: "ghost",
    spec,
    position: clamped,
    rotation: rotationClone,
    isValid,
  };
};

const evaluateScore = (placed: PlacedInstance[]): ScoreBreakdown => {
  const occupiedVoxels = placed.reduce((sum, item) => sum + getVolume(item.spec), 0);
  const empty = computeEmptyScore(occupiedVoxels, TOTAL_VOXELS);
  const com = computeCenterOfMass(placed);
  const balance = computeBalanceScore({
    centerOfMass: {
      x: com.totalMass > 0 ? com.x : BASKET_DIMENSIONS.width / 2,
      z: com.totalMass > 0 ? com.z : BASKET_DIMENSIONS.depth / 2,
    },
    basketSize: { width: BASKET_DIMENSIONS.width, depth: BASKET_DIMENSIONS.depth },
  });
  const stability = computeStabilityScore(
    toCandidatePlacements(placed),
    BASKET_DIMENSIONS,
  );
  const fragileAdjustment = computeFragileAdjustment(toCandidatePlacements(placed), BASKET_DIMENSIONS);
  const total = empty + balance.score + stability + fragileAdjustment;
  return {
    empty,
    balance: balance.score,
    stability,
    fragileAdjustment,
    total,
  };
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: "start" satisfies GamePhase,
  totalDurationMs: 180_000,
  timeRemainingMs: 180_000,
  itemsCatalog: ITEM_SPECS,
  queue: [...STARTER_QUEUE],
  stock: [],
  placedInstances: [],
  ghostInstance: null,
  score: null,
  pendingScore: null,
  totalVoxels: TOTAL_VOXELS,
  actions: {
    startGame: () => {
      instanceCounter = 0;
      const queue = [...STARTER_QUEUE];
      const nextSpecId = queue[0];
      const nextSpec = nextSpecId ? getItemSpec(nextSpecId) : null;
      const placed: PlacedInstance[] = [];
      set({
        phase: "placing",
        timeRemainingMs: 180_000,
        queue,
        stock: [],
        placedInstances: placed,
        score: null,
        pendingScore: null,
        ghostInstance: nextSpec ? createGhost(nextSpec, placed) : null,
      });
    },
    goToLeaderboard: () => set({ phase: "leaderboard" }),
    goToStart: () => set({ phase: "start" }),
    setGhostPosition: (position) => {
      const state = get();
      if (!state.ghostInstance) return;
      const snapped = snapGrid(position);
      const clampedXZ = clampToBounds(
        { ...snapped, y: state.ghostInstance.position.y },
        state.ghostInstance.spec,
        state.ghostInstance.rotation,
        BASKET_DIMENSIONS,
      );
      const y = computeSupportY(
        { x: clampedXZ.x, z: clampedXZ.z },
        state.ghostInstance.spec,
        state.ghostInstance.rotation,
        toCandidatePlacements(state.placedInstances),
        BASKET_DIMENSIONS,
      );
      const clamped = { ...clampedXZ, y };
      const candidate = {
        spec: state.ghostInstance.spec,
        position: clamped,
        rotation: state.ghostInstance.rotation,
      };
      const existing = toCandidatePlacements(state.placedInstances);
      const collisionFree = !gridCollision(candidate, existing, BASKET_DIMENSIONS);
      const oriented = getOrientedSize(state.ghostInstance.spec, state.ghostInstance.rotation);
      const supportRatio = computeSupportRatio(
        { x: clamped.x, z: clamped.z, w: oriented.width, d: oriented.depth },
        clamped.y,
        existing,
      );
      const isValid = collisionFree && supportRatio >= SUPPORT_THRESHOLD;
      set({
        ghostInstance: {
          ...state.ghostInstance,
          position: clamped,
          isValid,
        },
      });
    },
    moveGhostBy: (dx, dz) => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost) return;
      const next = {
        x: ghost.position.x + dx,
        y: ghost.position.y,
        z: ghost.position.z + dz,
      };
      // Reuse setGhostPosition to snap, clamp, and recompute support height
      get().actions.setGhostPosition(next);
    },
    undoLastPlacement: () => {
      const state = get();
      if (state.placedInstances.length === 0) return;
      const last = state.placedInstances[state.placedInstances.length - 1];
      const remaining = state.placedInstances.slice(0, -1);
      const newQueue = [last.spec.id, ...state.queue];
      const ghost = createGhost(last.spec, remaining, cloneRotation(last.rotation));
      set({
        placedInstances: remaining,
        queue: newQueue,
        ghostInstance: ghost,
        score: null,
        pendingScore: null,
        phase: "placing",
      });
    },
    useStockAt: (index) => {
      const state = get();
      if (index < 0 || index >= state.stock.length) return;
      const specId = state.stock[index];
      const spec = getItemSpec(specId);
      if (!spec) return;
      const newStock = [...state.stock.slice(0, index), ...state.stock.slice(index + 1)];
      const newQueue = [specId, ...state.queue];
      set({
        stock: newStock,
        queue: newQueue,
        ghostInstance: createGhost(spec, state.placedInstances),
        phase: "placing",
        score: null,
        pendingScore: null,
      });
    },
    holdCurrent: () => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost) return;
      if (state.stock.length >= MAX_STOCK) return; // max cap
      // Remove current item from queue (head) and push to stock
      const [, ...restQueue] = state.queue;
      const newStock = [...state.stock, ghost.spec.id];
      const nextSpecId = restQueue[0];
      const nextSpec = nextSpecId ? getItemSpec(nextSpecId) : null;
      set({
        queue: restQueue,
        stock: newStock,
        ghostInstance: nextSpec ? createGhost(nextSpec, state.placedInstances) : null,
        score: null,
        pendingScore: null,
        phase: "placing",
      });
    },
    rotateGhostYaw: (direction = 1) => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost) return;
      const nextRotation = {
        ...ghost.rotation,
        yaw: rotateAxis(ghost.rotation.yaw, direction),
      };
      // keep center-of-mass as pivot during rotation
      const prevSize = getOrientedSize(ghost.spec, ghost.rotation);
      const prevCenter = {
        x: ghost.position.x + prevSize.width / 2,
        y: ghost.position.y + prevSize.height / 2,
        z: ghost.position.z + prevSize.depth / 2,
      };
      const nextSize = getOrientedSize(ghost.spec, nextRotation);
      const recentered = {
        x: prevCenter.x - nextSize.width / 2,
        y: prevCenter.y - nextSize.height / 2,
        z: prevCenter.z - nextSize.depth / 2,
      };
      const clampedXZ = clampToBounds(recentered, ghost.spec, nextRotation, BASKET_DIMENSIONS);
      const y = computeSupportY(
        { x: clampedXZ.x, z: clampedXZ.z },
        ghost.spec,
        nextRotation,
        toCandidatePlacements(state.placedInstances),
        BASKET_DIMENSIONS,
      );
      const clamped = { ...clampedXZ, y };
      const candidate = { spec: ghost.spec, position: clamped, rotation: nextRotation };
      const existing = toCandidatePlacements(state.placedInstances);
      const collisionFree = !gridCollision(candidate, existing, BASKET_DIMENSIONS);
      const oriented = getOrientedSize(ghost.spec, nextRotation);
      const supportRatio = computeSupportRatio(
        { x: clamped.x, z: clamped.z, w: oriented.width, d: oriented.depth },
        clamped.y,
        existing,
      );
      const isValid = collisionFree && supportRatio >= SUPPORT_THRESHOLD;
      set({
        ghostInstance: {
          ...ghost,
          rotation: nextRotation,
          position: clamped,
          isValid,
        },
      });
    },
    rotateGhostPitch: (direction = 1) => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost) return;
      const nextRotation = {
        ...ghost.rotation,
        pitch: rotateAxis(ghost.rotation.pitch, direction),
      };
      // keep center-of-mass as pivot during rotation
      const prevSize = getOrientedSize(ghost.spec, ghost.rotation);
      const prevCenter = {
        x: ghost.position.x + prevSize.width / 2,
        y: ghost.position.y + prevSize.height / 2,
        z: ghost.position.z + prevSize.depth / 2,
      };
      const nextSize = getOrientedSize(ghost.spec, nextRotation);
      const recentered = {
        x: prevCenter.x - nextSize.width / 2,
        y: prevCenter.y - nextSize.height / 2,
        z: prevCenter.z - nextSize.depth / 2,
      };
      const clampedXZ = clampToBounds(recentered, ghost.spec, nextRotation, BASKET_DIMENSIONS);
      const y = computeSupportY(
        { x: clampedXZ.x, z: clampedXZ.z },
        ghost.spec,
        nextRotation,
        toCandidatePlacements(state.placedInstances),
        BASKET_DIMENSIONS,
      );
      const clamped = { ...clampedXZ, y };
      const candidate = { spec: ghost.spec, position: clamped, rotation: nextRotation };
      const existing = toCandidatePlacements(state.placedInstances);
      const collisionFree = !gridCollision(candidate, existing, BASKET_DIMENSIONS);
      const oriented = getOrientedSize(ghost.spec, nextRotation);
      const supportRatio = computeSupportRatio(
        { x: clamped.x, z: clamped.z, w: oriented.width, d: oriented.depth },
        clamped.y,
        existing,
      );
      const isValid = collisionFree && supportRatio >= SUPPORT_THRESHOLD;
      set({
        ghostInstance: {
          ...ghost,
          rotation: nextRotation,
          position: clamped,
          isValid,
        },
      });
    },
    rotateGhostRoll: (direction = 1) => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost) return;
      const nextRotation = {
        ...ghost.rotation,
        roll: rotateAxis(ghost.rotation.roll, direction),
      };
      const prevSize = getOrientedSize(ghost.spec, ghost.rotation);
      const prevCenter = {
        x: ghost.position.x + prevSize.width / 2,
        y: ghost.position.y + prevSize.height / 2,
        z: ghost.position.z + prevSize.depth / 2,
      };
      const nextSize = getOrientedSize(ghost.spec, nextRotation);
      const recentered = {
        x: prevCenter.x - nextSize.width / 2,
        y: prevCenter.y - nextSize.height / 2,
        z: prevCenter.z - nextSize.depth / 2,
      };
      const clampedXZ = clampToBounds(recentered, ghost.spec, nextRotation, BASKET_DIMENSIONS);
      const y = computeSupportY(
        { x: clampedXZ.x, z: clampedXZ.z },
        ghost.spec,
        nextRotation,
        toCandidatePlacements(state.placedInstances),
        BASKET_DIMENSIONS,
      );
      const clamped = { ...clampedXZ, y };
      const candidate = { spec: ghost.spec, position: clamped, rotation: nextRotation };
      const existing = toCandidatePlacements(state.placedInstances);
      const collisionFree = !gridCollision(candidate, existing, BASKET_DIMENSIONS);
      const oriented = getOrientedSize(ghost.spec, nextRotation);
      const supportRatio = computeSupportRatio(
        { x: clamped.x, z: clamped.z, w: oriented.width, d: oriented.depth },
        clamped.y,
        existing,
      );
      const isValid = collisionFree && supportRatio >= SUPPORT_THRESHOLD;
      set({
        ghostInstance: {
          ...ghost,
          rotation: nextRotation,
          position: clamped,
          isValid,
        },
      });
    },
    placeGhost: () => {
      const state = get();
      const ghost = state.ghostInstance;
      if (!ghost || !ghost.isValid) {
        return;
      }
      const [, ...restQueue] = state.queue;
      const newPlaced: PlacedInstance[] = [
        ...state.placedInstances,
        {
          id: nextInstanceId(),
          spec: ghost.spec,
          position: ghost.position,
          rotation: cloneRotation(ghost.rotation),
        },
      ];
      const nextSpecId = restQueue[0];
      const nextSpec = nextSpecId ? getItemSpec(nextSpecId) : null;
      set({
        placedInstances: newPlaced,
        queue: restQueue,
        ghostInstance: nextSpec ? createGhost(nextSpec, newPlaced) : null,
        score: null,
        pendingScore: null,
      });
    },
    removePlacedItem: (id) => {
      const state = get();
      const filtered = state.placedInstances.filter((item) => item.id !== id);
      const ghost = state.ghostInstance;
      const updates: Partial<GameStoreState> = { placedInstances: filtered };
      if (ghost) {
        const isValid = !gridCollision(
          { spec: ghost.spec, position: ghost.position, rotation: ghost.rotation },
          toCandidatePlacements(filtered),
          BASKET_DIMENSIONS,
        );
        updates.ghostInstance = { ...ghost, isValid };
      }
      set(updates);
    },
    requestScoring: () => {
      const state = get();
      if (state.phase !== "placing") return;
      const score = evaluateScore(state.placedInstances);
      set({ phase: "results", pendingScore: score, score });
    },
    completeScoring: () => {
      const state = get();
      if (!state.pendingScore) return;
      set({ score: state.pendingScore, phase: "results" });
    },
    restart: () => {
      instanceCounter = 0;
      const queue = [...STARTER_QUEUE];
      const nextSpecId = queue[0];
      const nextSpec = nextSpecId ? getItemSpec(nextSpecId) : null;
      const placed: PlacedInstance[] = [];
      set({
        phase: "placing",
        timeRemainingMs: 180_000,
        queue,
        stock: [],
        placedInstances: placed,
        score: null,
        pendingScore: null,
        ghostInstance: nextSpec ? createGhost(nextSpec, placed) : null,
      });
    },
    tick: (deltaMs) => {
      const state = get();
      if (state.phase !== "placing") return;
      const nextTime = Math.max(state.timeRemainingMs - deltaMs, 0);
      if (nextTime === 0) {
        const score = evaluateScore(state.placedInstances);
        set({
          timeRemainingMs: 0,
          phase: "results",
          pendingScore: score,
          score,
        });
        return;
      }
      set({ timeRemainingMs: nextTime });
    },
  },
}));

const initialState = useGameStore.getState();
if (!initialState.ghostInstance) {
  const nextSpecId = initialState.queue[0];
  const nextSpec = nextSpecId ? getItemSpec(nextSpecId) : null;
  if (nextSpec) {
    useGameStore.setState({ ghostInstance: createGhost(nextSpec, []) });
  }
}

export type { PlacedInstance, GhostInstance };
export { BASKET_DIMENSIONS, TOTAL_VOXELS };
