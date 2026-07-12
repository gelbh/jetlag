export function isInsideBounds(lat, lng, bounds) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

export function normalizeTflPayload(payload, bounds) {
  const entries = payload?.vehiclePositions ?? payload?.vehiclepositions ?? [];

  return entries
    .map((entry) => {
      const lat = Number(entry?.location?.latitude ?? entry?.lat);
      const lng = Number(entry?.location?.longitude ?? entry?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      if (!isInsideBounds(lat, lng, bounds)) {
        return null;
      }

      return {
        id: String(entry?.vehicleId ?? entry?.id ?? `${lat},${lng}`),
        label: String(entry?.lineName ?? entry?.routeId ?? "Vehicle"),
        lat,
        lng,
        bearing: typeof entry?.bearing === "number" ? entry.bearing : undefined,
        routeRef:
          typeof entry?.lineName === "string" ? entry.lineName : undefined,
        mode: "metro",
        updatedAt: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}
