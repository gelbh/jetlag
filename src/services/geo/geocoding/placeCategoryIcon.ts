import {
  BuildingsIcon,
  CityIcon,
  FlagIcon,
  HouseIcon,
  type IconProps,
  MapPinIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

const PLACE_CATEGORY_ICONS: Record<string, ComponentType<IconProps>> = {
  city: CityIcon,
  municipality: CityIcon,
  town: BuildingsIcon,
  borough: BuildingsIcon,
  village: HouseIcon,
  suburb: HouseIcon,
  hamlet: HouseIcon,
  neighbourhood: HouseIcon,
  county: MapTrifoldIcon,
  district: MapTrifoldIcon,
  state: MapTrifoldIcon,
  province: MapTrifoldIcon,
  region: MapTrifoldIcon,
  "administrative area": MapTrifoldIcon,
  country: FlagIcon,
};

export function placeCategoryIcon(category: string): ComponentType<IconProps> {
  return PLACE_CATEGORY_ICONS[category.trim().toLowerCase()] ?? MapPinIcon;
}
