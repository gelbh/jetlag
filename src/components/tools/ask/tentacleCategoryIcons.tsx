/**
 * Phosphor glyphs for Tentacle catalog + map pins.
 * Reuses Matching icons for shared POI types; metro/custom/pin are Tentacle-only.
 */
import type { ComponentType } from "react";
import { MapPin, Tag, Train, type IconProps } from "@phosphor-icons/react";
import type {
  MatchingCategoryId,
  TentacleExtendedCategoryId,
} from "@/domain/questions";
import { matchingCategoryIcon } from "./matchingCategoryIcons";

/** Phosphor icon for a Tentacle category id. */
export function tentacleCategoryIcon(
  categoryId: TentacleExtendedCategoryId,
): ComponentType<IconProps> {
  if (categoryId === "metro_line") {
    return Train;
  }
  if (categoryId.startsWith("pin:")) {
    return MapPin;
  }
  if (categoryId.startsWith("custom:")) {
    return Tag;
  }
  return matchingCategoryIcon(categoryId as MatchingCategoryId);
}
