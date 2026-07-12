import type { GameArea } from "../../map/annotations";
import type { LatLngTuple } from "../../geometry/geometry";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { truthMatching, truthMatchingAsync } from "./matching";
import { truthMeasuringSeaLevel, truthMeasuringSync } from "./measuring";
import { truthRadar } from "./radar";
import {
  truthUnavailable,
  UNAVAILABLE_NO_ZONE,
  type HiderTruthResult,
} from "./shared";
import { truthTentacle } from "./tentacle";
import { truthThermometer } from "./thermometer";

export type { HiderTruthResult } from "./shared";

export function computeHiderTruthReply(
  pending: PendingQuestionRecord,
  /** Confirmed hiding-zone center (station location). Never live GPS. */
  stationCenter: LatLngTuple | null,
): HiderTruthResult | null {
  if (!stationCenter) {
    return truthUnavailable(UNAVAILABLE_NO_ZONE);
  }

  switch (pending.toolType) {
    case "radar":
      return truthRadar(pending, stationCenter);
    case "thermometer":
      return truthThermometer(pending, stationCenter);
    case "matching":
      return truthMatching(pending, stationCenter);
    case "measuring":
      return truthMeasuringSync(pending, stationCenter);
    case "tentacle":
      return truthTentacle(pending, stationCenter);
    default:
      return truthUnavailable();
  }
}

export async function computeHiderTruthReplyAsync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple | null,
  gameArea?: GameArea,
): Promise<HiderTruthResult | null> {
  if (!stationCenter) {
    return truthUnavailable(UNAVAILABLE_NO_ZONE);
  }

  if (pending.toolType === "measuring") {
    const metadata = pending.placement.metadata;
    if (metadata.measuringSubject === "sea_level") {
      return truthMeasuringSeaLevel(pending, stationCenter);
    }
  }

  if (pending.toolType === "matching") {
    return truthMatchingAsync(pending, stationCenter, gameArea);
  }

  return computeHiderTruthReply(pending, stationCenter);
}
