import {
  measuringUsesAllPlacesInArea,
  measuringTargetLabel,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../../domain/questions";

export type MeasuringSearchRole = "seeker" | "target";

export function measuringUsesDebouncedSeekerResolve(
  subject: MeasuringSubject,
  measureFrom: MeasuringFromKind,
): boolean {
  return (
    subject === "coastline" ||
    subject === "sea_level" ||
    measuringUsesAllPlacesInArea(measureFrom)
  );
}

export function anchorResolveLoadingMessage(
  subject: MeasuringSubject,
  measureFrom: MeasuringFromKind,
  locationCategory?: MeasuringLocationCategory,
): string | null {
  if (!measuringUsesDebouncedSeekerResolve(subject, measureFrom)) {
    return null;
  }

  if (subject === "coastline") {
    return "Finding coastline in the play area…";
  }

  if (subject === "sea_level") {
    return "Reading elevation and shading the play area…";
  }

  const targetLabel = measuringTargetLabel(subject, locationCategory);
  return `Loading ${targetLabel.toLowerCase()}s in the play area…`;
}
