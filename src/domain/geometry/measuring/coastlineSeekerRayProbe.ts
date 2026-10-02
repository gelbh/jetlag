import turfDestination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Point } from "geojson";
import type { LatLngTuple } from "../gameArea/geometryCore";

/** Point R meters beyond nearest coast along the ray from coast toward seeker. */
export function coastlineSeekerRayProbeBeyondRadius(
  nearestCoastLatLng: LatLngTuple,
  seekerLatLng: LatLngTuple,
  radiusMeters: number,
  beyondMeters: number,
): Feature<Point> {
  const seeker = turfPoint([seekerLatLng[1], seekerLatLng[0]]);
  const coastPoint = turfPoint([nearestCoastLatLng[1], nearestCoastLatLng[0]]);
  const fromLng = coastPoint.geometry.coordinates[0]!;
  const fromLat = coastPoint.geometry.coordinates[1]!;
  const toLng = seeker.geometry.coordinates[0]!;
  const toLat = seeker.geometry.coordinates[1]!;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  const towardSeekerBearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  return turfDestination(coastPoint, (radiusMeters + beyondMeters) / 1000, towardSeekerBearing, {
    units: "kilometers",
  });
}
