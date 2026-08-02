import { useMemo } from "react";
import turfCircle from "@turf/circle";
import { Marker } from "react-leaflet";
import { Marker as MapLibreMarker } from "react-map-gl/maplibre";
import type { GeolocationReading } from "../../../services/core/location/geolocation";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { createUserLocationIcon } from "../icons/mapIcons";

interface UserLocationLayerProps {
  reading: GeolocationReading | null;
}

const ACCURACY_FILL = "rgba(66, 133, 244, 0.15)";
const ACCURACY_STROKE = "rgba(66, 133, 244, 0.35)";

function UserLocationLayerMapLibre({ reading }: UserLocationLayerProps) {
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

  const icon = createUserLocationIcon(reading.heading);
  const html = typeof icon.options.html === "string" ? icon.options.html : "";

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
          // DivIcon HTML from createUserLocationIcon (trusted).
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </MapLibreMarker>
    </>
  );
}

function UserLocationLayerLeaflet({ reading }: UserLocationLayerProps) {
  if (!reading) {
    return null;
  }

  const position: [number, number] = [reading.lat, reading.lng];
  const accuracy = reading.accuracy ?? 35;

  return (
    <>
      <CompensatedCircle
        center={position}
        radius={accuracy}
        pathOptions={{
          color: ACCURACY_STROKE,
          weight: 1,
          fillColor: ACCURACY_FILL,
          fillOpacity: 1,
          className: "user-location-accuracy",
        }}
      />
      <Marker
        position={position}
        icon={createUserLocationIcon(reading.heading)}
        interactive={false}
        zIndexOffset={1000}
      />
    </>
  );
}

export function UserLocationLayer(props: UserLocationLayerProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <UserLocationLayerMapLibre {...props} />,
    leaflet: () => <UserLocationLayerLeaflet {...props} />,
  });
}
