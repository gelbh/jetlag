import { z } from "zod";

const boundingBoxSchema = z.object({
  south: z.number().finite(),
  west: z.number().finite(),
  north: z.number().finite(),
  east: z.number().finite(),
});

export function parseBoundingBoxQuery(query) {
  const result = boundingBoxSchema.safeParse({
    south: Number(query.south),
    west: Number(query.west),
    north: Number(query.north),
    east: Number(query.east),
  });

  if (!result.success) {
    return { ok: false, error: "Missing bounding box." };
  }

  return { ok: true, value: result.data };
}

const vehiclesMetroSchema = z.enum(["london"]);

export function parseVehiclesMetroQuery(query) {
  const metro = String(query.metro ?? "");
  const result = vehiclesMetroSchema.safeParse(metro);
  if (!result.success) {
    return { ok: false, error: "Unknown metro feed." };
  }

  return { ok: true, value: result.data };
}

const transitlandFeedSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9._~-]+$/);

export function parseTransitlandFeedQuery(query) {
  const feed = String(query.feed ?? "");
  const result = transitlandFeedSchema.safeParse(feed);
  if (!result.success) {
    return { ok: false, error: "Missing transit feed." };
  }

  return { ok: true, value: result.data };
}

const overpassQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(20_000);

export function parseOverpassQueryBody(body) {
  const query =
    typeof body?.query === "string"
      ? body.query
      : typeof body === "string"
        ? body
        : "";

  const result = overpassQuerySchema.safeParse(query);
  if (!result.success) {
    return { ok: false, error: "Missing Overpass query." };
  }

  return { ok: true, value: result.data };
}
