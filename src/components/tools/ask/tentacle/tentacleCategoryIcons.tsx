import { type IconProps, MapPinIcon, TagIcon, TrainIcon } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { MatchingCategoryId, TentacleExtendedCategoryId } from "@/domain/questions";
import { matchingCategoryIcon } from "../matching/matchingCategoryIcons";

export function tentacleCategoryIcon(
  categoryId: TentacleExtendedCategoryId,
): ComponentType<IconProps> {
  if (categoryId === "metro_line") {
    return TrainIcon;
  }
  if (categoryId.startsWith("pin:")) {
    return MapPinIcon;
  }
  if (categoryId.startsWith("custom:")) {
    return TagIcon;
  }
  return matchingCategoryIcon(categoryId as MatchingCategoryId);
}
