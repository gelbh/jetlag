import { featureCollection, point as turfPoint } from "@turf/helpers";
import { toMercator, toWgs84 } from "@turf/projection";
import { geoMercator } from "d3-geo";
// @ts-expect-error d3-geo-projection ships without bundled types
import { geoProject, geoStitch } from "d3-geo-projection";
// @ts-expect-error d3-geo-voronoi ships without bundled types
import { geoVoronoi } from "d3-geo-voronoi";
import type { FeatureCollection, Point } from "geojson";

const scaleReference = toMercator(turfPoint([180, 90]));

export function geoSpatialVoronoi(
  points: FeatureCollection<Point>,
): FeatureCollection {
  const voronoi = geoVoronoi()(points).polygons();
  const projected = geoProject(
    geoStitch(voronoi),
    geoMercator().translate([0, 0]).precision(0.005),
  );

  const ratio = scaleReference.geometry.coordinates[0] / 480.5;

  for (const feature of projected.features) {
    const coordinates = feature.geometry.coordinates;
    if (feature.geometry.type === "Polygon") {
      for (const ring of coordinates) {
        for (const coord of ring) {
          coord[0] = coord[0] * ratio;
          coord[1] = coord[1] * -ratio;
        }
      }
    } else if (feature.geometry.type === "MultiPolygon") {
      for (const polygon of coordinates) {
        for (const ring of polygon) {
          for (const coord of ring) {
            coord[0] = coord[0] * ratio;
            coord[1] = coord[1] * -ratio;
          }
        }
      }
    }
  }

  return toWgs84(projected);
}

export function geoSpatialVoronoiFromSites<T extends Record<string, unknown>>(
  sites: Array<{ lng: number; lat: number; properties: T }>,
): FeatureCollection {
  return geoSpatialVoronoi(
    featureCollection(
      sites.map((site) =>
        turfPoint([site.lng, site.lat], site.properties),
      ),
    ),
  );
}
