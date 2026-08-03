import { useCallback, useState } from "react";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { MapLibreFeaturePopup } from "../helpers/MapLibreFeaturePopup";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import { useMapFeatureHitTarget } from "../helpers/MapFeatureHitTestContext";

interface PinAnnotationMarkerProps {
  annotationId: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  selectionEnabled: boolean;
  onSelect: () => void;
}

const PIN_LAYER_SUFFIX = "pin";

export function PinAnnotationMarker({
  annotationId,
  lat,
  lng,
  color,
  label,
  selectionEnabled,
  onSelect,
}: PinAnnotationMarkerProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  useMapFeatureHitTarget(
    annotationId,
    useCallback(() => {
      if (!selectionEnabled) {
        return false;
      }
      onSelect();
      setPopupOpen(true);
      return true;
    }, [onSelect, selectionEnabled]),
    selectionEnabled,
  );

  return (
    <>
      <MapLibrePointMarkers
        id={`${PIN_LAYER_SUFFIX}-${annotationId}`}
        interactive={selectionEnabled}
        markers={[
          {
            id: annotationId,
            lat,
            lng,
            radiusPx: 8,
            fillColor: color,
            borderColor: MAP_ANNOTATION_COLORS.strokeLight,
            hitId: annotationId,
            hitKind: "pin",
          },
        ]}
      />
      {popupOpen ? (
        <MapLibreFeaturePopup
          latitude={lat}
          longitude={lng}
          anchor="bottom"
          onClose={() => setPopupOpen(false)}
        >
          {label}
        </MapLibreFeaturePopup>
      ) : null}
    </>
  );
}
