export const ENABLE_FBX_MODELS = true;
export const MAX_STOCK = 7;
// Reduce GPU load: disable small queue row previews (many canvases)
export const ENABLE_QUEUE_ROW_PREVIEWS = false;
// Use logarithmic depth buffer (can cause shimmer up-close). For our small scene, disable.
export const ENABLE_LOG_DEPTH = false;
// FBX bounds/centering mode:
// - "simple": use whole object bounds (recommended when each FBX is 1 object at origin)
// - "heuristic": try to ignore background planes etc.
export const FBX_BOUNDS_MODE: "simple" | "heuristic" = "simple";
