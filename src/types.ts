export type VoxelSize = { w: number; d: number; h: number };

export type AxisRotation = 0 | 90 | 180 | 270;

export type ItemSpec = {
  id: string;
  name: string;
  size: VoxelSize;
  massKg: number;
  shape: "box" | "cylinder" | "capsule" | "sphere";
  fragile?: boolean;
  texture?: string;
  // Relative path under /public to an FBX model to render.
  model?: string;
};

export type PlacedItem = {
  specId: string;
  rotation: {
    yaw: AxisRotation;
    pitch: AxisRotation;
    roll: AxisRotation;
  };
  position: { x: number; y: number; z: number };
};

export type ScoreBreakdown = {
  empty: number;
  balance: number;
  stability: number;
  fragileAdjustment: number;
  total: number;
};

export type GamePhase = "start" | "placing" | "scoring" | "results" | "leaderboard";
