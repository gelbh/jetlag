import { Delaunay } from "d3-delaunay";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

const METERS_PER_DEGREE_LAT = 110_574;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111_320;
/** Extent multiplier applied to the sites' bbox span so boundary cells stay finite. */
const EXTENT_MARGIN_MULTIPLIER = 3;
/**
 * Floor margin for tightly clustered sites. Must exceed largest tentacle/matching
 * search disks in presets (15 mi ≈ 24 km) with headroom so disk−cell geometry is not
 * truncated by the finite Voronoi clip.
 */
const MIN_EXTENT_MARGIN_METERS = 50_000;

export type SpatialVoronoiSite<T extends Record<string, unknown> = Record<string, unknown>> = {
  lng: number;
  lat: number;
  properties: T;
};

function metersPerDegreeLng(latDegrees: number): number {
  const scale =
    METERS_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((latDegrees * Math.PI) / 180);
  return scale || METERS_PER_DEGREE_LNG_AT_EQUATOR;
}

/**
 * Computes a Voronoi diagram for the given sites in a local planar frame
 * (equirectangular projection about the sites' mean latitude), clipped to a
 * finite extent around the sites' bounding box. A local projection keeps
 * cell bisectors accurate at play-area scale, unlike a spherical Voronoi
 * reprojected through an arbitrary global Mercator scale factor.
 */
export function geoSpatialVoronoiFromSites<
  T extends Record<string, unknown> = Record<string, unknown>,
>(sites: Array<SpatialVoronoiSite<T>>): FeatureCollection {
  if (sites.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  // Exact duplicate coordinates yield null cellPolygon in d3-delaunay; keep first site only.
  const seen = new Set<string>();
  const workingSites = sites.filter((site) => {
    const key = `${site.lng},${site.lat}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const meanLat =
    workingSites.reduce((sum, site) => sum + site.lat, 0) / workingSites.length;
  const lngScale = metersPerDegreeLng(meanLat);

  const toPlanar = (lng: number, lat: number): [number, number] => [
    lng * lngScale,
    lat * METERS_PER_DEGREE_LAT,
  ];
  const fromPlanar = (x: number, y: number): [number, number] => [
    x / lngScale,
    y / METERS_PER_DEGREE_LAT,
  ];

  const points = workingSites.map((site) => toPlanar(site.lng, site.lat));

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const margin =
    Math.max(spanX, spanY, MIN_EXTENT_MARGIN_METERS) * EXTENT_MARGIN_MULTIPLIER;

  const bounds: [number, number, number, number] = [
    Math.min(...xs) - margin,
    Math.min(...ys) - margin,
    Math.max(...xs) + margin,
    Math.max(...ys) + margin,
  ];

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi(bounds);

  const features: Feature<Polygon>[] = [];
  workingSites.forEach((site, index) => {
    const cellPolygon = voronoi.cellPolygon(index);
    if (!cellPolygon) {
      return;
    }

    features.push({
      type: "Feature",
      properties: { ...site.properties },
      geometry: {
        type: "Polygon",
        coordinates: [cellPolygon.map(([x, y]) => fromPlanar(x, y))],
      },
    });
  });

  return { type: "FeatureCollection", features };
}

export function geoSpatialVoronoi(
  points: FeatureCollection<Point>,
): FeatureCollection {
  return geoSpatialVoronoiFromSites(
    points.features.map((feature) => ({
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
      properties: (feature.properties ?? {}) as Record<string, unknown>,
    })),
  );
}
