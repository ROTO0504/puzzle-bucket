import { useLoader } from "@react-three/fiber";
import { FBXLoader } from "three-stdlib";

/**
 * FBX loader hook that also sets a resource path for resolving textures.
 * Provide an absolute path where referenced textures (jpg/png) live.
 */
export const useFbxWithResources = (url: string, resourcePath: string = "/assets/3d/") => {
  return useLoader(FBXLoader, url, (loader) => {
    if (resourcePath) loader.setResourcePath(resourcePath);
  });
};

