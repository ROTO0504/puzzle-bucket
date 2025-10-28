import { WebGLRenderer, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter, Texture } from "three";

const touchTexture = (tex: Texture | undefined, maxAniso: number) => {
  if (!tex) return;
  tex.anisotropy = Math.max(tex.anisotropy ?? 1, maxAniso);
  tex.generateMipmaps = true;
  // Prefer mipmapped minification + linear magnification
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  // Ensure correct color space for color maps
  if ("colorSpace" in tex) (tex as any).colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
};

/**
 * Improve texture quality and reduce shimmering on common maps.
 * Call after the FBX is loaded (and cloned) and before first render.
 */
export const tuneMaterials = (root: any, gl: WebGLRenderer) => {
  const maxAniso = typeof (gl as any).capabilities.getMaxAnisotropy === "function"
    ? (gl as any).capabilities.getMaxAnisotropy()
    : 8;
  root.traverse?.((o: any) => {
    if (o && o.isMesh && o.material) {
      const applyMat = (m: any) => {
        // If transparent textures, a tiny alphaTest can help sort issues
        if (m.transparent && typeof m.alphaTest !== "number") m.alphaTest = 0.01;
        // Common texture slots
        touchTexture(m.map, maxAniso);
        touchTexture(m.normalMap, maxAniso);
        touchTexture(m.roughnessMap, maxAniso);
        touchTexture(m.metalnessMap, maxAniso);
        touchTexture(m.aoMap, maxAniso);
        touchTexture(m.emissiveMap, maxAniso);
        touchTexture(m.bumpMap, maxAniso);
        touchTexture(m.specularMap, maxAniso);
      };
      if (Array.isArray(o.material)) o.material.forEach(applyMat);
      else applyMat(o.material);
    }
  });
};

