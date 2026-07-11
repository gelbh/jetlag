import {
  measuringUsesAllPlacesInArea,
  type MeasuringFromKind,
  type MeasuringSubject,
} from "../../../domain/questions";

export function usesDebouncedSeekerResolve(
  subject: MeasuringSubject,
  kind: MeasuringFromKind,
): boolean {
  return (
    subject === "coastline" ||
    subject === "sea_level" ||
    measuringUsesAllPlacesInArea(kind)
  );
}
