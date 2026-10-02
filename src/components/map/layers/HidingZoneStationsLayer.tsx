import { useCallback, useMemo } from "react";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import type { TransitStation } from "@/domain/session/hiding/hidingZone";
import { useMapFeatureHitTest } from "../helpers/MapFeatureHitTestContext";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import { featureHitId } from "../helpers/mapFeatureHitTest";
import { jlMarkerLayerId } from "../helpers/mapMarkerConstants";
import type { CircleMarkerProps } from "../helpers/mapMarkerFeatures";

interface HidingZoneStationsLayerProps {
  stations: readonly TransitStation[];
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
}

const STATIONS_HIT_PREFIX = jlMarkerLayerId("hiding-stations");

export function HidingZoneStationsLayer({
  stations,
  selectedStation,
  onSelectStation,
}: HidingZoneStationsLayerProps) {
  const stationById = useMemo(
    () => new Map(stations.map((station) => [station.id, station])),
    [stations],
  );

  const markers = useMemo((): CircleMarkerProps[] => {
    return stations.map((station) => {
      const isSelected = selectedStation?.id === station.id;
      return {
        id: station.id,
        lat: station.lat,
        lng: station.lng,
        radiusPx: isSelected ? 8 : 6,
        borderColor: isSelected
          ? MAP_ANNOTATION_COLORS.strokeLight
          : MAP_ANNOTATION_COLORS.hidingZone,
        borderWidth: isSelected ? 3 : 2,
        fillColor: isSelected
          ? MAP_ANNOTATION_COLORS.hidingZoneOwn
          : MAP_ANNOTATION_COLORS.hidingZone,
        opacity: isSelected ? 1 : 0.85,
        hitId: station.id,
        hitKind: "hiding-station",
      };
    });
  }, [selectedStation?.id, stations]);

  useMapFeatureHitTest(
    STATIONS_HIT_PREFIX,
    useCallback(
      (result) => {
        const hitId = featureHitId(result.feature);
        if (!hitId) {
          return false;
        }
        const station = stationById.get(hitId);
        if (!station) {
          return false;
        }
        onSelectStation(station);
        return true;
      },
      [onSelectStation, stationById],
    ),
  );

  return <MapLibrePointMarkers id="hiding-stations" interactive markers={markers} />;
}
