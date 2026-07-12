import { useMotionGesturePath } from "./useMotionGesturePath";
import {
  useWizardSwipe,
  type UseWizardSwipeOptions,
  type UseWizardSwipeResult,
} from "./useWizardSwipe";

const EMPTY_SURFACE_PROPS = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
} as UseWizardSwipeResult["surfaceProps"];

export function useAdaptiveWizardSwipe(
  options: UseWizardSwipeOptions,
): UseWizardSwipeResult & { useFramerSwipe: boolean } {
  const useFramerSwipe = useMotionGesturePath();
  const cssSwipe = useWizardSwipe({
    ...options,
  });

  if (useFramerSwipe) {
    return {
      dragOffsetX: 0,
      isDragging: false,
      surfaceStyle: {},
      surfaceProps: EMPTY_SURFACE_PROPS,
      useFramerSwipe: true,
    };
  }

  return { ...cssSwipe, useFramerSwipe: false };
}
