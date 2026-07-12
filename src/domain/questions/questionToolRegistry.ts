import type { GameArea } from "../map/annotations";
import type { MapStyle } from "../map/mapBasemaps";
import type { PendingQuestionRecord } from "../session/sessionChat";
import type { PendingQuestionToolType } from "../session/sessionChat";
import { buildMatchingOverlays } from "./overlays/matching";
import { buildMeasuringOverlays } from "./overlays/measuring";
import { buildRadarOverlays } from "./overlays/radar";
import type { PendingQuestionOverlayResult } from "./overlays/shared";
import { buildTentacleOverlays } from "./overlays/tentacle";
import { buildThermometerOverlays } from "./overlays/thermometer";

type OverlayBuilderResult = {
  overlays: PendingQuestionOverlayResult["overlays"];
  badgeAnchor: PendingQuestionOverlayResult["badgeAnchor"];
};

type OverlayBuilder = (
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
  mapStyle: MapStyle,
) => OverlayBuilderResult;

export const pendingQuestionOverlayBuilders: Partial<
  Record<PendingQuestionToolType, OverlayBuilder>
> = {
  radar: (question, _gameArea, prefix) => buildRadarOverlays(question, prefix),
  thermometer: (question, _gameArea, prefix) =>
    buildThermometerOverlays(question, prefix),
  matching: (question, gameArea, prefix, mapStyle) =>
    buildMatchingOverlays(question, gameArea, prefix, mapStyle),
  measuring: (question, gameArea, prefix, mapStyle) =>
    buildMeasuringOverlays(question, gameArea, prefix, mapStyle),
  tentacle: (question, _gameArea, prefix) =>
    buildTentacleOverlays(question, prefix),
};
