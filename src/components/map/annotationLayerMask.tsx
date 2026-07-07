import { Polygon } from "react-leaflet";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import {
  polygonToLeafletLatLngs,
  type LatLngTuple,
} from "../../domain/geometry/geometry";

export function renderMaskPolygon(
  polygon: Feature<GeoPolygon | MultiPolygon>,
  key: string,
  color: string,
  pulsing: boolean,
  selected: boolean,
  selectionEnabled: boolean,
  onSelect?: () => void,
) {
  const pathOptions = {
    stroke: !selected,
    color: selected ? color : undefined,
    weight: selected ? 3 : 0,
    fillColor: color,
    fillOpacity: 0.35,
    className: pulsing ? "annotation-pulse" : undefined,
  };

  if (polygon.geometry.type === "MultiPolygon") {
    return polygon.geometry.coordinates.map((rings, index) => {
      const ringsLatLng = rings.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
      );

      return (
        <Polygon
          key={`${key}-${index}`}
          positions={ringsLatLng}
          interactive={selectionEnabled}
          pathOptions={pathOptions}
          eventHandlers={
            selectionEnabled && onSelect
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    onSelect();
                  },
                }
              : undefined
          }
        />
      );
    });
  }

  const rings = polygonToLeafletLatLngs(polygon as Feature<GeoPolygon>);
  if (rings.length === 0) {
    return null;
  }

  return (
    <Polygon
      key={key}
      positions={rings}
      interactive={selectionEnabled}
      pathOptions={pathOptions}
      eventHandlers={
        selectionEnabled && onSelect
          ? {
              click: (event) => {
                event.originalEvent?.stopPropagation();
                onSelect();
              },
            }
          : undefined
      }
    />
  );
}
