import type { MapBoundsExpression } from "./mapBounds";

export type MapFocusFitBoundsMode = "once" | "always";

/**
 * Effect dependency keys for MapFocus apply.
 * once-mode: bounds presence only (not identity) and no preferFly — so preferFly
 * flips / bounds-identity churn cannot re-enter and abort an in-flight ease.
 * always-mode: live bounds/bias/zoom so framing modals keep tracking.
 */
export function mapFocusApplyDependencyKeys(args: {
  fitBoundsMode: MapFocusFitBoundsMode;
  animate: boolean;
  focusBounds: MapBoundsExpression | null;
  focusPaddingBias?: number;
  focusMaxZoom?: number;
  focusMinZoom?: number;
  padX: number;
  padY: number;
  recenterToken: number;
}): unknown[] {
  const focusBoundsDep =
    args.fitBoundsMode === "always"
      ? args.focusBounds
      : args.focusBounds != null;
  const focusPaddingBiasDep =
    args.fitBoundsMode === "always" ? args.focusPaddingBias : null;
  const focusMaxZoomDep =
    args.fitBoundsMode === "always" ? args.focusMaxZoom : null;
  const focusMinZoomDep =
    args.fitBoundsMode === "always" ? args.focusMinZoom : null;

  return [
    args.animate,
    focusBoundsDep,
    focusPaddingBiasDep,
    focusMaxZoomDep,
    focusMinZoomDep,
    args.fitBoundsMode,
    args.padX,
    args.padY,
    args.recenterToken,
  ];
}
