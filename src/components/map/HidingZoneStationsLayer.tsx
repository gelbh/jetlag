import { CircleMarker } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import type { TransitStation } from "../../domain/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface HidingZoneStationsLayerProps {
  stations: readonly TransitStation[];
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
}

export function HidingZoneStationsLayer({
  stations,
  selectedStation,
  onSelectStation,
}: HidingZoneStationsLayerProps) {
  return (
    <>
      {stations.map((station) => {
        const center: LatLngTuple = [station.lat, station.lng];
        const isSelected = selectedStation?.id === station.id;

        return (
          <CircleMarker
            key={station.id}
            center={center}
            radius={isSelected ? 8 : 6}
            pathOptions={{
              color: isSelected
                ? MAP_ANNOTATION_COLORS.strokeLight
                : MAP_ANNOTATION_COLORS.hidingZone,
              weight: isSelected ? 3 : 2,
              fillColor: isSelected
                ? MAP_ANNOTATION_COLORS.hidingZoneOwn
                : MAP_ANNOTATION_COLORS.hidingZone,
              fillOpacity: isSelected ? 1 : 0.85,
            }}
            eventHandlers={{
              click: (event) => {
                event.originalEvent.stopPropagation();
                onSelectStation(station);
              },
            }}
          />
        );
      })}
    </>
  );
}
