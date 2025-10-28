export type ModelOverride = {
  includeNames?: string[]; // substring matches (case-insensitive)
  excludeNames?: string[]; // substring matches to hide
  thinRatio?: number; // default 0.02; raise if薄板判定が厳しすぎる
  outlierPlaneFactor?: number; // default 1.8; 大きい背景平面の除外強度
};

// 設定: アイテムIDまたは model キーで上書き可能
// 必要に応じて追加してください（例: 背景"plane"だけ除外したい等）
export const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // 例:
  // "bread-melon-square": { excludeNames: ["plane", "bg", "board"] },
  // "milk-carton-1l": { thinRatio: 0.05 },
};

export const getModelOverride = (key?: string | null): ModelOverride | undefined => {
  if (!key) return undefined;
  return MODEL_OVERRIDES[key];
};

