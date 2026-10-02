import type { ComponentProps } from "react";
import { useMapLandscapeChrome } from "../session/mapChrome/MapLandscapeChromeContext";
import { resolveLandscapeMapControlInset } from "../session/mapChrome/resolveLandscapeMapControlInset";
import { MapView } from "./chrome/MapView";
import type { MapChromeControlInset } from "./helpers/mapChromeControlInset";

type MapViewWithLandscapeInsetProps = ComponentProps<typeof MapView> & {
  isDesktop: boolean;
  mobileInset?: MapChromeControlInset;
};

export function MapViewWithLandscapeInset({
  isDesktop,
  mobileInset = "dock",
  model,
  children,
}: MapViewWithLandscapeInsetProps) {
  const landscape = useMapLandscapeChrome();
  const baseInset = isDesktop ? "safe-area" : mobileInset;
  const resolvedInset = resolveLandscapeMapControlInset(baseInset, isDesktop, landscape);

  return (
    <MapView
      model={{
        ...model,
        mapStyleControlInset: model.mapStyleControlInset ?? resolvedInset,
        zoomControlInset: model.zoomControlInset ?? resolvedInset,
      }}
    >
      {children}
    </MapView>
  );
}
