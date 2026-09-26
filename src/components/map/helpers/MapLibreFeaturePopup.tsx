import { Popup as MapLibrePopup } from "react-map-gl/maplibre";
import { X } from "@phosphor-icons/react";
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
      offset={16}
      maxWidth="17.5rem"
      closeOnClick={closeOnClick}
      onClose={onClose}
      className="jl-map-feature-popup"
      closeButton={false}
    >
      <div className="jl-map-feature-popup__body">
        <button
          type="button"
          className="jl-map-feature-popup__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={14} weight="bold" aria-hidden />
        </button>
        {children}
      </div>
    </MapLibrePopup>
  );
}
