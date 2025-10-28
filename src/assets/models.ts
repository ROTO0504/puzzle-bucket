// Map known item keys to bundled FBX asset URLs.
// Uses Vite's `?url` to emit files and return runtime URLs.

// Food and package models
import melon from "./3d/melon.fbx?url";
import huransu from "./3d/huransu.fbx?url"; // baguette
import syokupan from "./3d/syokupan.fbx?url"; // loaf bread
import jagaimo from "./3d/jagaimo.fbx?url"; // potato
import ninjin from "./3d/ninjin.fbx?url"; // carrot
import moyasi from "./3d/moyasi.fbx?url"; // bean sprouts
import gyouza from "./3d/gyouza.fbx?url"; // gyoza
import sasimi from "./3d/sasimi.fbx?url"; // sashimi
import senngyo from "./3d/senngyo.fbx?url"; // fresh fish
import daikon from "./3d/daikon.fbx?url";
import tamago from "./3d/tamago.fbx?url"; // eggs
import gyuunyuu from "./3d/gyuunyuu.fbx?url"; // milk carton

// Bottles
import _500ml from "./3d/500ml.fbx?url";
import _1L from "./3d/1L.fbx?url";
import _2L from "./3d/2L.fbx?url";

// Meat sizes
import nikusyou from "./3d/nikusyou.fbx?url"; // small
import nikutyuu from "./3d/nikutyuu.fbx?url"; // medium
import nikudai from "./3d/nikudai.fbx?url"; // large

// Item-id keyed URL map
export const MODEL_URLS: Record<string, string> = {
  // Breads
  "bread-melon-square": melon,
  "bread-baguette-rect": huransu,
  "bread-loaf-rect": syokupan,

  // Meat
  "meat-small": nikusyou,
  "meat-medium": nikutyuu,
  "meat-large": nikudai,

  // Fish / seafood
  sashimi: sasimi,
  "fresh-fish-med": senngyo,
  "frozen-gyoza": gyouza,

  // Vegetables
  potato: jagaimo,
  carrot: ninjin,
  moyashi: moyasi,
  daikon: daikon,

  // Drinks / eggs
  "pet-500ml": _500ml,
  "pet-1l": _1L,
  "pet-2l": _2L,
  "milk-carton-1l": gyuunyuu,
  "egg-pack": tamago,
};

// Resolve a model key or path to a usable URL.
// - If key matches MODEL_URLS, return bundled URL.
// - If starts with '/', assume it’s a public path.
// - Otherwise, prefix with '/' to try loading as-is (fallback).
export const resolveModelUrl = (key?: string | null): string | null => {
  if (!key) return null;
  if (MODEL_URLS[key]) return MODEL_URLS[key];
  if (key.startsWith("/")) return key;
  // Fallback to public assets directory structure
  return `/assets/3d/${key}.fbx`;
};
