import type { ComponentType } from "react";
import {
  AirplaneTilt,
  Bank,
  BookOpen,
  Buildings,
  City,
  Confetti,
  FilmSlate,
  FirstAid,
  Fish,
  Flag,
  Golf,
  House,
  Island,
  MapTrifold,
  Mountains,
  Path,
  PawPrint,
  Tag,
  TextT,
  Train,
  Tree,
  type IconProps,
} from "@phosphor-icons/react";
import type { MatchingCategoryId } from "@/domain/questions";

const BUILTIN_ICONS: Record<
  Exclude<MatchingCategoryId, `custom:${string}` | `pack:${string}`>,
  ComponentType<IconProps>
> = {
  commercial_airport: AirplaneTilt,
  transit_line: Train,
  station_name_length: TextT,
  street_or_path: Path,
  admin_division_1: MapTrifold,
  admin_division_2: Buildings,
  admin_division_3: City,
  admin_division_4: House,
  mountain: Mountains,
  landmass: Island,
  park: Tree,
  amusement_park: Confetti,
  zoo: PawPrint,
  aquarium: Fish,
  golf_course: Golf,
  museum: Bank,
  movie_theater: FilmSlate,
  hospital: FirstAid,
  library: BookOpen,
  foreign_consulate: Flag,
};

/** Phosphor icon for a matching catalog category (custom/pack → Tag). */
export function matchingCategoryIcon(
  categoryId: MatchingCategoryId,
): ComponentType<IconProps> {
  if (categoryId.startsWith("custom:") || categoryId.startsWith("pack:")) {
    return Tag;
  }
  return BUILTIN_ICONS[categoryId as keyof typeof BUILTIN_ICONS] ?? Tag;
}
