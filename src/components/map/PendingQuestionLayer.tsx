import { memo, useMemo } from "react";
import type { GameArea } from "../../domain/map/annotations";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { buildPendingQuestionOverlays } from "../../domain/questions/ui";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { MapDraftLayer } from "./MapDraftLayer";

interface PendingQuestionLayerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
  mapStyle?: MapStyle;
}

export const PendingQuestionLayer = memo(function PendingQuestionLayer({
  pendingQuestions,
  gameArea,
  mapStyle = "standard",
}: PendingQuestionLayerProps) {
  const overlayResults = useMemo(
    () => buildPendingQuestionOverlays(pendingQuestions, gameArea, mapStyle),
    [gameArea, mapStyle, pendingQuestions],
  );

  const overlays = useMemo(
    () => overlayResults.flatMap((result) => result.overlays),
    [overlayResults],
  );

  if (overlays.length === 0) {
    return null;
  }

  return <MapDraftLayer overlays={overlays} />;
});
