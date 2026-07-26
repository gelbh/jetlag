import { useMinWidth } from "./useMinWidth";

export const DESKTOP_LAYOUT_MIN_WIDTH_PX = 1024;

export function useDesktopLayout(): boolean {
  return useMinWidth(DESKTOP_LAYOUT_MIN_WIDTH_PX);
}
