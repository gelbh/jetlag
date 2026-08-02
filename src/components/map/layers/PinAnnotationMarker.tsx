import { useState } from "react";
import { Popup as MapLibrePopup } from "react-map-gl/maplibre";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";

interface PinAnnotationMarkerProps {
  lat: number;
  lng: number;
  color: string;
  label: string;
  selectionEnabled: boolean;
  onSelect: () => void;
}

export function PinAnnotationMarker({
  lat,
  lng,
  color,
  label,
  selectionEnabled,
  onSelect,
}: PinAnnotationMarkerProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <MapLibreDotMarker
        latitude={lat}
        longitude={lng}
        radiusPx={8}
        fillColor={color}
        borderColor={MAP_ANNOTATION_COLORS.strokeLight}
        onClick={
          selectionEnabled
            ? () => {
                onSelect();
                setPopupOpen(true);
              }
            : undefined
        }
      />
      {popupOpen ? (
        <MapLibrePopup
          latitude={lat}
          longitude={lng}
          anchor="bottom"
          onClose={() => setPopupOpen(false)}
        >
          {label}
        </MapLibrePopup>
      ) : null}
    </>
  );
}
