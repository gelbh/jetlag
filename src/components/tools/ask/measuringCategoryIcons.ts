import type { ComponentType } from "react";
import {
  AirplaneTilt,
  Bank,
  BookOpen,
  Buildings,
  City,
  Confetti,
  Drop,
  FilmSlate,
  FirstAid,
  Fish,
  Flag,
  Golf,
  GlobeHemisphereWest,
  House,
  Island,
  MapTrifold,
  Mountains,
  Path,
  PawPrint,
  Tag,
  Train,
  Tree,
  Waves,
  type IconProps,
} from "@phosphor-icons/react";
import type { MeasuringFromKind } from "@/domain/questions";

const BUILTIN_ICONS: Partial<
  Record<MeasuringFromKind, ComponentType<IconProps>>
> = {
  commercial_airport: AirplaneTilt,
  high_speed_rail_line: Train,
  rail_station: Train,
  international_border: GlobeHemisphereWest,
  admin1_border: MapTrifold,
  admin2_border: Buildings,
  admin3_border: City,
  admin4_border: House,
  sea_level: Drop,
  body_of_water: Waves,
  coastline: Island,
  mountain: Mountains,
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
  custom_place: Path,
};

export function hasMeasuringCategoryIcon(kind: string): boolean {
  return (
    kind in BUILTIN_ICONS ||
    kind.startsWith("custom:") ||
    kind.startsWith("pack:") ||
    kind.startsWith("custom_geo:")
  );
}

/** Phosphor icon for a Measuring catalog option (custom/pack → Tag). */
export function measuringCategoryIcon(
  kind: MeasuringFromKind,
): ComponentType<IconProps> {
  if (
    kind.startsWith("custom:") ||
    kind.startsWith("pack:") ||
    kind.startsWith("custom_geo:")
  ) {
    return Tag;
  }
  return BUILTIN_ICONS[kind] ?? Tag;
}
