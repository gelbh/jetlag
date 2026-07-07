import { Circle, Marker } from "react-leaflet";
import type { GeolocationReading } from "../../services/core/geolocation";
import { createUserLocationIcon } from "./mapIcons";

interface UserLocationLayerProps {
  reading: GeolocationReading | null;
}

const ACCURACY_FILL = "rgba(66, 133, 244, 0.15)";
const ACCURACY_STROKE = "rgba(66, 133, 244, 0.35)";

export function UserLocationLayer({ reading }: UserLocationLayerProps) {
  if (!reading) {
    return null;
  }

  const position: [number, number] = [reading.lat, reading.lng];
  const accuracy = reading.accuracy ?? 35;

  return (
    <>
      <Circle
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
      />
    </>
  );
}
