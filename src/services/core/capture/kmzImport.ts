import { kml } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import {
  boundingBoxHasMinimumSpan,
  featureToGameArea,
  gameAreaToBoundingBox,
  simplifyGameArea,
} from "@/domain/geometry/gameArea/geometry";

function isPolygonFeature(
  feature: Feature,
): feature is Feature<Polygon | MultiPolygon> {
  const { type } = feature.geometry;
  return type === "Polygon" || type === "MultiPolygon";
}

function collectPolygonFeatures(
  geojson: FeatureCollection | Feature,
): Feature<Polygon | MultiPolygon>[] {
  if (geojson.type === "FeatureCollection") {
    return geojson.features.filter(isPolygonFeature);
  }

  if (geojson.type === "Feature" && isPolygonFeature(geojson)) {
    return [geojson];
  }

  return [];
}

function unionPolygonFeatures(
  features: Feature<Polygon | MultiPolygon>[],
): Feature<Polygon | MultiPolygon> {
  if (features.length === 1) {
    return features[0]!;
  }

  let combined = features[0]!;
  for (let index = 1; index < features.length; index += 1) {
    const next = features[index]!;
    try {
      const merged = union(featureCollection([combined, next]));
      if (
        merged &&
        (merged.geometry.type === "Polygon" ||
          merged.geometry.type === "MultiPolygon")
      ) {
        combined = merged as Feature<Polygon | MultiPolygon>;
        continue;
      }
    } catch {
      /* union can fail on invalid topology */
    }

    throw new Error("Could not merge polygon boundaries in file.");
  }

  return combined;
}

function parseKmlDocument(kmlText: string) {
  try {
    const doc = new DOMParser({
      onError(level) {
        if (level === "warning" || level === "error" || level === "fatalError") {
          throw new Error("Invalid KML file.");
        }
      },
    }).parseFromString(kmlText, "application/xml");
    if (!doc.documentElement) {
      throw new Error("Invalid KML file.");
    }
    return doc;
  } catch {
    throw new Error("Invalid KML file.");
  }
}

export function parseBoundaryKml(kmlText: string): GameArea {
  const doc = parseKmlDocument(kmlText);
  const geojson = kml(doc) as FeatureCollection;
  const polygonFeatures = collectPolygonFeatures(geojson);

  if (polygonFeatures.length === 0) {
    throw new Error("No polygon found in file.");
  }

  const merged = unionPolygonFeatures(polygonFeatures);
  const gameArea = simplifyGameArea(featureToGameArea(merged));

  if (!boundingBoxHasMinimumSpan(gameAreaToBoundingBox(gameArea))) {
    throw new Error("Imported area is too small.");
  }

  return gameArea;
}

async function readKmlTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".kmz")) {
    const zip = await JSZip.loadAsync(buffer);
    const docKml = zip.file("doc.kml");
    if (docKml) {
      return docKml.async("string");
    }

    const kmlEntry = Object.keys(zip.files).find(
      (path) => path.toLowerCase().endsWith(".kml") && !zip.files[path]?.dir,
    );
    if (!kmlEntry) {
      throw new Error("No KML file found in KMZ archive.");
    }

    return zip.file(kmlEntry)!.async("string");
  }

  if (lowerName.endsWith(".kml")) {
    return new TextDecoder().decode(buffer);
  }

  throw new Error("Unsupported file type. Use .kml or .kmz.");
}

export async function parseBoundaryFile(file: File): Promise<GameArea> {
  const kmlText = await readKmlTextFromFile(file);
  return parseBoundaryKml(kmlText);
}
