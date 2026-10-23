import { haversineMeters } from "./haversine.mjs";

/**
 * Radar yes/no from sealed anchor vs ask point/radius (V4).
 * Never returns coords.
 *
 * @param {{ lat: number, lng: number }} seal
 * @param {{ point?: { lat?: number, lng?: number }, radiusMeters?: number }} ask
 * @returns {{ kind: "radar", answer: "yes" | "no" }}
 */
export function answerRadarOracle(seal, ask) {
  const lat = ask?.point?.lat;
  const lng = ask?.point?.lng;
  const radiusMeters = ask?.radiusMeters;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    typeof radiusMeters !== "number" ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters < 0
  ) {
    throw new Error("Invalid radar ask: point and radiusMeters are required.");
  }

  const distanceMeters = haversineMeters(seal.lat, seal.lng, lat, lng);
  return {
    kind: "radar",
    answer: distanceMeters <= radiusMeters ? "yes" : "no",
  };
}
