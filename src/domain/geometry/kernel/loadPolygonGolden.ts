import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PolygonFeature } from "./types";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export function loadPolygonGolden(entrypoint: string, name: string): PolygonFeature {
  const filePath = path.join(fixturesDir, entrypoint, name);
  return JSON.parse(readFileSync(filePath, "utf8")) as PolygonFeature;
}
