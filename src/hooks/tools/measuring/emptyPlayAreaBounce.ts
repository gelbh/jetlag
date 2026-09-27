import type { MeasuringFromKind } from "@/domain/questions";

/** Empty play-area catalog: zero named places in the game area. */
export function isMeasuringEmptyPlayAreaCatalog(placeCount: number): boolean {
  return placeCount === 0;
}

export function markMeasuringFromKindUnavailable(
  current: ReadonlyMap<MeasuringFromKind, string>,
  kind: MeasuringFromKind,
  catalogNotice: string,
): {
  unavailableMeasuringFromKinds: Map<MeasuringFromKind, string>;
  catalogNotice: string;
} {
  const unavailableMeasuringFromKinds = new Map(current);
  unavailableMeasuringFromKinds.set(kind, catalogNotice);
  return { unavailableMeasuringFromKinds, catalogNotice };
}
