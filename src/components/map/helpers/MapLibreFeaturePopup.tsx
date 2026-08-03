import { Popup as MapLibrePopup } from "react-map-gl/maplibre";
import type { ReactNode } from "react";

interface MapLibreFeaturePopupProps {
  latitude: number;
  longitude: number;
  anchor?: "center" | "top" | "bottom" | "left" | "right";
  closeOnClick?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Shared popup shell for GL hit-test marker interactions. */
export function MapLibreFeaturePopup({
  latitude,
  longitude,
  anchor = "bottom",
  closeOnClick = false,
  onClose,
  children,
}: MapLibreFeaturePopupProps) {
  return (
    <MapLibrePopup
      latitude={latitude}
      longitude={longitude}
      anchor={anchor}
      closeOnClick={closeOnClick}
      onClose={onClose}
    >
      {children}
    </MapLibrePopup>
  );
}
