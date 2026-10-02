import {
  AirplaneTiltIcon,
  BankIcon,
  BookOpenIcon,
  BuildingsIcon,
  CityIcon,
  ConfettiIcon,
  DropIcon,
  FilmSlateIcon,
  FirstAidIcon,
  FishIcon,
  FlagIcon,
  GlobeHemisphereWestIcon,
  GolfIcon,
  HouseIcon,
  type IconProps,
  IslandIcon,
  MapTrifoldIcon,
  MountainsIcon,
  PathIcon,
  PawPrintIcon,
  TagIcon,
  TrainIcon,
  TreeIcon,
  WavesIcon,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { MeasuringFromKind } from "@/domain/questions";

const BUILTIN_ICONS: Partial<Record<MeasuringFromKind, ComponentType<IconProps>>> = {
  commercial_airport: AirplaneTiltIcon,
  high_speed_rail_line: TrainIcon,
  rail_station: TrainIcon,
  international_border: GlobeHemisphereWestIcon,
  admin1_border: MapTrifoldIcon,
  admin2_border: BuildingsIcon,
  admin3_border: CityIcon,
  admin4_border: HouseIcon,
  sea_level: DropIcon,
  body_of_water: WavesIcon,
  coastline: IslandIcon,
  mountain: MountainsIcon,
  park: TreeIcon,
  amusement_park: ConfettiIcon,
  zoo: PawPrintIcon,
  aquarium: FishIcon,
  golf_course: GolfIcon,
  museum: BankIcon,
  movie_theater: FilmSlateIcon,
  hospital: FirstAidIcon,
  library: BookOpenIcon,
  foreign_consulate: FlagIcon,
  custom_place: PathIcon,
};

export function hasMeasuringCategoryIcon(kind: string): boolean {
  return (
    kind in BUILTIN_ICONS ||
    kind.startsWith("custom:") ||
    kind.startsWith("pack:") ||
    kind.startsWith("custom_geo:")
  );
}

/** Phosphor icon for a Measuring catalog option (custom/pack → TagIcon). */
export function measuringCategoryIcon(kind: MeasuringFromKind): ComponentType<IconProps> {
  if (kind.startsWith("custom:") || kind.startsWith("pack:") || kind.startsWith("custom_geo:")) {
    return TagIcon;
  }
  return BUILTIN_ICONS[kind] ?? TagIcon;
}
