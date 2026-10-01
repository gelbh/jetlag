import type { ComponentType } from "react";
import { AirplaneTiltIcon, BankIcon, BookOpenIcon, BuildingsIcon, CityIcon, ConfettiIcon, FilmSlateIcon, FirstAidIcon, FishIcon, FlagIcon, GolfIcon, HouseIcon, IslandIcon, MapTrifoldIcon, MountainsIcon, PathIcon, PawPrintIcon, TagIcon, TextTIcon, TrainIcon, TreeIcon, type IconProps } from "@phosphor-icons/react";
import type { MatchingCategoryId } from "@/domain/questions";

const BUILTIN_ICONS: Record<
  Exclude<MatchingCategoryId, `custom:${string}` | `pack:${string}`>,
  ComponentType<IconProps>
> = {
  commercial_airport: AirplaneTiltIcon,
  transit_line: TrainIcon,
  station_name_length: TextTIcon,
  street_or_path: PathIcon,
  admin_division_1: MapTrifoldIcon,
  admin_division_2: BuildingsIcon,
  admin_division_3: CityIcon,
  admin_division_4: HouseIcon,
  mountain: MountainsIcon,
  landmass: IslandIcon,
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
};

/** Phosphor icon for a matching catalog category (custom/pack → TagIcon). */
export function matchingCategoryIcon(
  categoryId: MatchingCategoryId,
): ComponentType<IconProps> {
  if (categoryId.startsWith("custom:") || categoryId.startsWith("pack:")) {
    return TagIcon;
  }
  return BUILTIN_ICONS[categoryId as keyof typeof BUILTIN_ICONS] ?? TagIcon;
}
