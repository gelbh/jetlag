import { useMotionGesturePath } from "./useMotionGesturePath";
import {
  usePanelDrag,
  type UsePanelDragOptions,
  type UsePanelDragResult,
} from "./usePanelDrag";

const EMPTY_HANDLE = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
} as UsePanelDragResult["handleProps"];

export function useAdaptivePanelDrag(
  options: UsePanelDragOptions,
): UsePanelDragResult & { useFramerDrag: boolean } {
  const useFramerDrag = useMotionGesturePath();
  const cssDrag = usePanelDrag(options);

  if (useFramerDrag) {
    return {
      dragOffsetY: 0,
      isDragging: false,
      panelStyle: {},
      handleProps: EMPTY_HANDLE,
      useFramerDrag: true,
    };
  }

  return { ...cssDrag, useFramerDrag: false };
}
