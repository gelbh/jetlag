import { memo, useMemo } from "react";
import type { GameArea } from "../../domain/annotations";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { buildPendingQuestionOverlays } from "../../domain/pendingQuestionOverlays";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { MapDraftLayer } from "./MapDraftLayer";

interface PendingQuestionLayerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
}

export const PendingQuestionLayer = memo(function PendingQuestionLayer({
  pendingQuestions,
  gameArea,
}: PendingQuestionLayerProps) {
  const overlayResults = useMemo(
    () => buildPendingQuestionOverlays(pendingQuestions, gameArea),
    [gameArea, pendingQuestions],
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
