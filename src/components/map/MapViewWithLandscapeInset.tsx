import type { ComponentProps } from "react";
import { MapView } from "./chrome/MapView";
import { useMapLandscapeChrome } from "../session/mapChrome/MapLandscapeChromeContext";
import { resolveLandscapeMapControlInset } from "../session/mapChrome/resolveLandscapeMapControlInset";
import type { MapChromeControlInset } from "./helpers/mapChromeControlInset";

type MapViewWithLandscapeInsetProps = ComponentProps<typeof MapView> & {
  isDesktop: boolean;
  mobileInset?: MapChromeControlInset;
};

export function MapViewWithLandscapeInset({
  isDesktop,
  mobileInset = "dock",
  mapStyleControlInset: mapStyleControlInsetProp,
  zoomControlInset: zoomControlInsetProp,
  ...props
}: MapViewWithLandscapeInsetProps) {
  const landscape = useMapLandscapeChrome();
  const baseInset = isDesktop ? "safe-area" : mobileInset;
  const resolvedInset = resolveLandscapeMapControlInset(
    baseInset,
    isDesktop,
    landscape,
  );

  return (
    <MapView
      {...props}
      mapStyleControlInset={mapStyleControlInsetProp ?? resolvedInset}
      zoomControlInset={zoomControlInsetProp ?? resolvedInset}
    />
  );
}
