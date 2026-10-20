/** Cheap local haversine (R = 6_371_000). Matches client `haversineMeters`. */
export function haversineMeters(aLat, aLng, bLat, bLng) {
  const earthRadius = 6_371_000;
  const latDelta = ((bLat - aLat) * Math.PI) / 180;
  const lngDelta = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

/**
 * Initial bearing degrees [0, 360) from A → B.
 * @returns {number}
 */
export function bearingDegrees(aLat, aLng, bLat, bLng) {
  const φ1 = (aLat * Math.PI) / 180;
  const φ2 = (bLat * Math.PI) / 180;
  const Δλ = ((bLng - aLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
