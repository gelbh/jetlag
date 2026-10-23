import type { ComponentProps } from "react";
import { MapView } from "./chrome/MapView";

type MapViewWithLandscapeInsetProps = ComponentProps<typeof MapView> & {
  isDesktop?: boolean;
};

export function MapViewWithLandscapeInset({ model, children }: MapViewWithLandscapeInsetProps) {
  return <MapView model={model}>{children}</MapView>;
}
