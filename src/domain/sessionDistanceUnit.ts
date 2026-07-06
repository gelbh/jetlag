import type { SessionRecord } from "./annotations";
import type { DistanceUnit } from "./distance";
import { resolveDistanceUnit } from "./distancePresets";

export function sessionDistanceUnit(
  session: Pick<SessionRecord, "distanceUnit"> | null | undefined,
): DistanceUnit {
  return resolveDistanceUnit(session?.distanceUnit);
}
