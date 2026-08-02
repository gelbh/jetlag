import type { TransitStation } from "../../../domain/session/hiding/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";

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
        const isSelected = selectedStation?.id === station.id;

        return (
          <MapLibreDotMarker
            key={station.id}
            latitude={station.lat}
            longitude={station.lng}
            radiusPx={isSelected ? 8 : 6}
            borderColor={
              isSelected
                ? MAP_ANNOTATION_COLORS.strokeLight
                : MAP_ANNOTATION_COLORS.hidingZone
            }
            borderWidth={isSelected ? 3 : 2}
            fillColor={
              isSelected
                ? MAP_ANNOTATION_COLORS.hidingZoneOwn
                : MAP_ANNOTATION_COLORS.hidingZone
            }
            opacity={isSelected ? 1 : 0.85}
            onClick={() => {
              onSelectStation(station);
            }}
          />
        );
      })}
    </>
  );
}
