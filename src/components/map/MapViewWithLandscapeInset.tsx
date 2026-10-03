import type { ComponentProps } from "react";
import { MapView } from "./chrome/MapView";

type MapViewWithLandscapeInsetProps = ComponentProps<typeof MapView> & {
  /** Kept for call-site compatibility; landscape inset portals retired. */
  isDesktop?: boolean;
};

/** Thin MapView wrapper. Absolute left-stack inset portals retired. */
export function MapViewWithLandscapeInset({ model, children }: MapViewWithLandscapeInsetProps) {
  return <MapView model={model}>{children}</MapView>;
}
