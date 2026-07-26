import type { MatchingFeature } from "../../../domain/geo/types";
import type { AdminDivisionFeature } from "../../../domain/geo/types";

function stationNameLength(name: string): number {
  return name.length;
}

function stationNameLengthFeatureId(name: string): string {
  return `station-name-length:${stationNameLength(name)}`;
}

function stationNameLengthFeatureName(name: string): string {
  return `${stationNameLength(name)} characters (${name})`;
}

export function buildStationNameLengthFeatures(
  stations: MatchingFeature[],
): MatchingFeature[] {
  const byLength = new Map<string, MatchingFeature>();

  for (const station of stations) {
    const id = stationNameLengthFeatureId(station.name);
    const existing = byLength.get(id);

    if (!existing || station.name.localeCompare(existing.name) < 0) {
      byLength.set(id, {
        id,
        name: stationNameLengthFeatureName(station.name),
        point: station.point,
      });
    }
  }

  return [...byLength.values()];
}

function stationFirstLetter(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : "?";
}

function stationFirstLetterFeatureId(name: string): string {
  return `station-first-letter:${stationFirstLetter(name)}`;
}

function stationFirstLetterFeatureName(name: string): string {
  return `Letter ${stationFirstLetter(name)} (${name})`;
}

export function buildStationFirstLetterFeatures(
  stations: MatchingFeature[],
): MatchingFeature[] {
  const byLetter = new Map<string, MatchingFeature>();

  for (const station of stations) {
    const id = stationFirstLetterFeatureId(station.name);
    const existing = byLetter.get(id);

    if (!existing || station.name.localeCompare(existing.name) < 0) {
      byLetter.set(id, {
        id,
        name: stationFirstLetterFeatureName(station.name),
        point: station.point,
      });
    }
  }

  return [...byLetter.values()];
}

function letterZoneFeatureId(name: string): string {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return `letter-zone:${letter}`;
}

function letterZoneFeatureName(name: string): string {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return `Letter ${letter} (${name})`;
}

export function buildLetterZoneFeatures(
  divisions: AdminDivisionFeature[],
): MatchingFeature[] {
  const byLetter = new Map<string, MatchingFeature>();

  for (const division of divisions) {
    const id = letterZoneFeatureId(division.name);
    const existing = byLetter.get(id);

    if (!existing || division.name.localeCompare(existing.name) < 0) {
      byLetter.set(id, {
        id,
        name: letterZoneFeatureName(division.name),
        point: division.representativePoint,
        boundary: division.boundary,
      });
    }
  }

  return [...byLetter.values()];
}

export function letterZoneFeatureIdForDivision(name: string): string {
  return letterZoneFeatureId(name);
}
