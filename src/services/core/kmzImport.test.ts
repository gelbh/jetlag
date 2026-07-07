import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { gameAreaToBoundingBox } from "../domain/geometry";
import { parseBoundaryFile, parseBoundaryKml } from "./kmzImport";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../test/fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

function fileFromFixture(name: string, content: string): File {
  return new File([content], name, {
    type: name.endsWith(".kmz")
      ? "application/vnd.google-earth.kmz"
      : "application/vnd.google-earth.kml+xml",
  });
}

async function kmzFromKml(kmlText: string, filename = "sample-polygon.kmz"): Promise<File> {
  const zip = new JSZip();
  zip.file("doc.kml", kmlText);
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], filename, {
    type: "application/vnd.google-earth.kmz",
  });
}

describe("parseBoundaryKml", () => {
  it("parses a single polygon KML file", () => {
    const gameArea = parseBoundaryKml(readFixture("sample-polygon.kml"));

    expect(gameArea.type).toBe("Polygon");
    const box = gameAreaToBoundingBox(gameArea);
    expect(box.south).toBeCloseTo(53.27, 2);
    expect(box.west).toBeCloseTo(-6.45, 2);
    expect(box.north).toBeCloseTo(53.42, 2);
    expect(box.east).toBeCloseTo(-6.08, 2);
  });

  it("unions multiple polygon placemarks", () => {
    const gameArea = parseBoundaryKml(readFixture("multi-polygon.kml"));
    const box = gameAreaToBoundingBox(gameArea);

    expect(box.south).toBeCloseTo(53.27, 2);
    expect(box.west).toBeCloseTo(-6.45, 2);
    expect(box.north).toBeCloseTo(53.42, 2);
    expect(box.east).toBeCloseTo(-6.08, 2);
  });

  it("rejects KML with no polygon geometry", () => {
    expect(() => parseBoundaryKml(readFixture("no-polygon.kml"))).toThrow(
      "No polygon found in file.",
    );
  });

  it("rejects polygons that are too small", () => {
    expect(() => parseBoundaryKml(readFixture("too-small-polygon.kml"))).toThrow(
      "Imported area is too small.",
    );
  });
});

describe("parseBoundaryFile", () => {
  it("parses a .kml file", async () => {
    const file = fileFromFixture(
      "sample-polygon.kml",
      readFixture("sample-polygon.kml"),
    );
    const gameArea = await parseBoundaryFile(file);

    expect(gameArea.type).toBe("Polygon");
  });

  it("parses a .kmz file to the same bounds as the source KML", async () => {
    const kmlText = readFixture("sample-polygon.kml");
    const kmlArea = parseBoundaryKml(kmlText);
    const kmzFile = await kmzFromKml(kmlText);
    const kmzArea = await parseBoundaryFile(kmzFile);

    expect(gameAreaToBoundingBox(kmzArea)).toEqual(gameAreaToBoundingBox(kmlArea));
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["not geo"], "boundary.txt", { type: "text/plain" });

    await expect(parseBoundaryFile(file)).rejects.toThrow(
      "Unsupported file type. Use .kml or .kmz.",
    );
  });
});
