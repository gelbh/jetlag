import { memo, useEffect, useMemo, useState } from "react";
import type { GameArea } from "../../../domain/map/annotations";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import type { SessionRulesInput } from "../../../domain/session/rules";
import {
  buildPendingQuestionOverlays,
  type PendingQuestionOverlayResult,
} from "../../../domain/questions/ui";
import type { PendingQuestionRecord } from "../../../domain/session/activity/sessionChat";
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
  const [overlayResults, setOverlayResults] = useState<
    PendingQuestionOverlayResult[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    setOverlayResults([]);

    void buildPendingQuestionOverlays(
      pendingQuestions,
      gameArea,
      mapStyle,
    )
      .then((results) => {
        if (!cancelled) {
          setOverlayResults(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverlayResults([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gameArea, mapStyle, pendingQuestions]);

  const overlays = useMemo(
    () => overlayResults.flatMap((result) => result.overlays),
    [overlayResults],
  );

  if (overlays.length === 0) {
    return null;
  }

  return <MapDraftLayer overlays={overlays} />;
});
