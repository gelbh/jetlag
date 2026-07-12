import { useMotionGesturePath } from "./useMotionGesturePath";
import {
  useSheetGesture,
  type UseSheetGestureOptions,
  type UseSheetGestureResult,
} from "./useSheetGesture";

const EMPTY_SHEET_GESTURE: UseSheetGestureResult = {
  sheetRef: { current: null },
  sheetStyle: {},
  scrimStyle: {},
  handleProps: {
    onPointerDown: () => {},
    onPointerMove: () => {},
    onPointerUp: () => {},
    onPointerCancel: () => {},
  },
  isDragging: false,
};

export function useAdaptiveSheetGesture(
  options: UseSheetGestureOptions,
): UseSheetGestureResult & { useFramerDrag: boolean } {
  const useFramerDrag = useMotionGesturePath();
  const cssGesture = useSheetGesture({
    ...options,
    enabled: options.enabled && !useFramerDrag,
  });

  if (useFramerDrag) {
    return {
      ...EMPTY_SHEET_GESTURE,
      sheetRef: cssGesture.sheetRef,
      useFramerDrag: true,
    };
  }

  return { ...cssGesture, useFramerDrag: false };
}
