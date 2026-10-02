import { LANDSCAPE_MAP_DOMINANT_MEDIA } from "@/theme/phoneShell";
import { useMediaQuery } from "./useMediaQuery";

export { LANDSCAPE_MAP_DOMINANT_MEDIA } from "@/theme/phoneShell";

export function useLandscapeMapDominant(): boolean {
  return useMediaQuery(LANDSCAPE_MAP_DOMINANT_MEDIA);
}
