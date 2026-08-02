import { useMemo } from "react";
import turfCircle from "@turf/circle";
import { Marker as MapLibreMarker } from "react-map-gl/maplibre";
import type { GeolocationReading } from "../../../services/core/location/geolocation";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { userLocationIconHtml } from "../icons/userLocationIconHtml";

interface UserLocationLayerProps {
  reading: GeolocationReading | null;
}

const ACCURACY_FILL = "rgba(66, 133, 244, 0.15)";
const ACCURACY_STROKE = "rgba(66, 133, 244, 0.35)";

export function UserLocationLayer({ reading }: UserLocationLayerProps) {
  const accuracyFeature = useMemo(() => {
    if (!reading) {
      return null;
    }
    const accuracy = reading.accuracy ?? 35;
    return turfCircle([reading.lng, reading.lat], accuracy / 1000, {
      steps: 64,
      units: "kilometers",
    });
  }, [reading]);

  if (!reading || !accuracyFeature) {
    return null;
  }

  const html = userLocationIconHtml(reading.heading);

  return (
    <>
      <MapLibreGeoJsonOverlay
        id="user-location-accuracy"
        data={accuracyFeature}
        fill={{
          fillColor: ACCURACY_FILL,
          fillOpacity: 1,
        }}
        line={{
          color: ACCURACY_STROKE,
          width: 1,
          opacity: 1,
        }}
      />
      <MapLibreMarker
        latitude={reading.lat}
        longitude={reading.lng}
        anchor="center"
        style={{ zIndex: 1000, pointerEvents: "none" }}
      >
        <div
          className="user-location-icon"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </MapLibreMarker>
    </>
  );
}
