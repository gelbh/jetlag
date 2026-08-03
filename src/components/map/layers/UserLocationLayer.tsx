import { useMemo } from "react";
import turfCircle from "@turf/circle";
import type { GeolocationReading } from "../../../services/core/location/geolocation";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  JL_ICON_USER_LOCATION,
  JL_ICON_USER_LOCATION_PLAIN,
} from "../helpers/mapLibreIconRegistry";
import { symbolMarkerCollection } from "../helpers/mapMarkerFeatures";

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

  const userSymbol = useMemo(() => {
    if (!reading) {
      return null;
    }
    const showHeading =
      typeof reading.heading === "number" &&
      Number.isFinite(reading.heading) &&
      reading.heading >= 0;
    return symbolMarkerCollection([
      {
        id: "user-location",
        lat: reading.lat,
        lng: reading.lng,
        iconImage: showHeading
          ? JL_ICON_USER_LOCATION
          : JL_ICON_USER_LOCATION_PLAIN,
        iconRotate: showHeading ? reading.heading! : 0,
        iconSize: 1,
      },
    ]);
  }, [reading]);

  if (!reading || !accuracyFeature || !userSymbol) {
    return null;
  }

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
      <MapLibreGeoJsonOverlay
        id="user-location-pin"
        data={userSymbol}
        symbol={{
          layout: {
            iconImage: ["get", "iconImage"],
            iconRotate: ["get", "iconRotate"],
            iconSize: ["get", "iconSize"],
            iconAllowOverlap: true,
          },
        }}
      />
    </>
  );
}
