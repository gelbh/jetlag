import type { SessionRecord } from "../map/annotations";
import type { DistanceUnit } from "../map/distance";
import { resolveDistanceUnit } from "../map/distancePresets";

export function sessionDistanceUnit(
  session: Pick<SessionRecord, "distanceUnit"> | null | undefined,
): DistanceUnit {
  return resolveDistanceUnit(session?.distanceUnit);
}
