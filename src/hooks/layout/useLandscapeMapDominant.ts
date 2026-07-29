import { DESKTOP_LAYOUT_MIN_WIDTH_PX } from "./useDesktopLayout";
import { useMediaQuery } from "./useMediaQuery";

/** Mobile/tablet landscape — map-dominant chrome (not desktop ops layout). */
export const LANDSCAPE_MAP_DOMINANT_MEDIA = `(orientation: landscape) and (max-width: ${
  DESKTOP_LAYOUT_MIN_WIDTH_PX - 1
}px)`;

export function useLandscapeMapDominant(): boolean {
  return useMediaQuery(LANDSCAPE_MAP_DOMINANT_MEDIA);
}
