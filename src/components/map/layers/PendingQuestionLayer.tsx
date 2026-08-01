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
  const overlayKey = useMemo(
    () =>
      `${mapStyle}|${pendingQuestions.map((question) => `${question.id}:${question.status}`).join(",")}`,
    [mapStyle, pendingQuestions],
  );

  const [overlayResults, setOverlayResults] = useState<
    PendingQuestionOverlayResult[]
  >([]);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    void buildPendingQuestionOverlays(
      pendingQuestions,
      gameArea,
      mapStyle,
    )
      .then((results) => {
        if (!cancelled) {
          setOverlayResults(results);
          setLoadedKey(overlayKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverlayResults([]);
          setLoadedKey(overlayKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gameArea, mapStyle, overlayKey, pendingQuestions]);

  const overlays = useMemo(() => {
    if (loadedKey !== overlayKey) {
      return [];
    }
    return overlayResults.flatMap((result) => result.overlays);
  }, [loadedKey, overlayKey, overlayResults]);

  if (overlays.length === 0) {
    return null;
  }

  return <MapDraftLayer overlays={overlays} />;
});
