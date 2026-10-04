import { bundledPresetDefinition, isBundledPresetId } from "../../regions/bundledGamePresets";
import { formatBundledPresetLocation } from "../../regions/bundledPresetHierarchy";
import type { GamePreset } from "./gamePreset";

function foldPlaceLabel(value: string): string {
  const stripped = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\p{Pd}/gu, "-")
    .toLowerCase();
  return stripped
    .replace(/\bco\.?\s+/g, "county ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headPlaceLabel(value: string): string {
  return foldPlaceLabel(value.split(",")[0] ?? "");
}

function trailingRegion(value: string): string | null {
  const parts = value
    .split(",")
    .map((part) => foldPlaceLabel(part))
    .filter(Boolean);
  return parts.length >= 2 ? (parts[parts.length - 1] ?? null) : null;
}

function placeMatchesPreset(placeName: string, preset: GamePreset): boolean {
  const placeHead = headPlaceLabel(placeName);
  if (!placeHead) {
    return false;
  }

  const nameHead = headPlaceLabel(preset.name);
  const labelHead = preset.placeLabel ? headPlaceLabel(preset.placeLabel) : "";
  if (placeHead !== nameHead && placeHead !== labelHead) {
    return false;
  }

  // Same city name in another country must not take the bundled pack.
  const region = preset.placeLabel ? trailingRegion(preset.placeLabel) : null;
  if (!region) {
    return true;
  }
  return foldPlaceLabel(placeName).includes(region);
}

/** Official play-area preset for a geocoded place, when the names line up uniquely. */
export function matchGamePresetForPlace(
  presets: readonly GamePreset[],
  place: { displayName: string },
): GamePreset | null {
  const matches = presets.filter((preset) => placeMatchesPreset(place.displayName, preset));
  if (matches.length === 1) {
    return matches[0] ?? null;
  }

  if (matches.length === 0) {
    return null;
  }

  const foldedPlace = foldPlaceLabel(place.displayName);
  const exactLabel = matches.filter(
    (preset) => preset.placeLabel && foldPlaceLabel(preset.placeLabel) === foldedPlace,
  );
  return exactLabel.length === 1 ? (exactLabel[0] ?? null) : null;
}

function presetSearchHaystack(preset: GamePreset): string {
  const parts = [preset.name];
  if (preset.placeLabel) {
    parts.push(preset.placeLabel);
  }
  if (isBundledPresetId(preset.id)) {
    const definition = bundledPresetDefinition(preset.id);
    if (definition) {
      parts.push(formatBundledPresetLocation(definition));
    }
  }
  return parts.join(" ").toLowerCase();
}

function compareFilteredPresets(left: GamePreset, right: GamePreset): number {
  const leftBundled = isBundledPresetId(left.id);
  const rightBundled = isBundledPresetId(right.id);
  if (leftBundled !== rightBundled) {
    return leftBundled ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

export function filterGamePresetsForSearch(
  presets: readonly GamePreset[],
  query: string,
): GamePreset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...presets];
  }

  return presets
    .filter((preset) => presetSearchHaystack(preset).includes(normalized))
    .sort(compareFilteredPresets);
}
