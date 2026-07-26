import type { Feature, LineString, Polygon } from "geojson";

export type CustomMeasureGeometryKind = "line" | "polygon";

export interface SessionCustomMeasureGeometry {
  id: string;
  label: string;
  kind: CustomMeasureGeometryKind;
  geometryJson: string;
}

export function isCustomMeasureGeometryId(
  id: string,
): id is `custom_geo:${string}` {
  return id.startsWith("custom_geo:");
}

export function createCustomMeasureGeometryId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `custom_geo:${slug || "geometry"}`;
}

export function parseCustomMeasureGeometries(
  value: unknown,
): readonly SessionCustomMeasureGeometry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed: SessionCustomMeasureGeometry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.label !== "string" ||
      typeof record.geometryJson !== "string"
    ) {
      continue;
    }

    const kind =
      record.kind === "polygon"
        ? "polygon"
        : record.kind === "line"
          ? "line"
          : inferCustomMeasureGeometryKind(record.geometryJson);

    if (!kind) {
      continue;
    }

    parsed.push({
      id: record.id,
      label: record.label,
      kind,
      geometryJson: record.geometryJson,
    });
  }

  return parsed.length > 0 ? parsed : undefined;
}

function inferCustomMeasureGeometryKind(
  geometryJson: string,
): CustomMeasureGeometryKind | null {
  try {
    const feature = JSON.parse(geometryJson) as Feature<
      LineString | Polygon
    >;
    if (feature.geometry?.type === "Polygon") {
      return "polygon";
    }
    if (feature.geometry?.type === "LineString") {
      return "line";
    }
  } catch {
    return null;
  }

  return null;
}

export function parseCustomMeasureGeometryFeature(
  geometry: SessionCustomMeasureGeometry,
): Feature<LineString | Polygon> | null {
  try {
    const feature = JSON.parse(geometry.geometryJson) as Feature<
      LineString | Polygon
    >;
    if (
      feature.geometry?.type !== "LineString" &&
      feature.geometry?.type !== "Polygon"
    ) {
      return null;
    }

    return feature;
  } catch {
    return null;
  }
}
