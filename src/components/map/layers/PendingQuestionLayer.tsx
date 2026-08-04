import { memo, useEffect, useMemo, useState } from "react";
import type { GameArea } from "@/domain/map/annotations";
import type { MapStyle, StreetBasemap } from "@/domain/map/mapBasemaps";
import type { SessionRulesInput } from "@/domain/session/rules";
import {
  buildPendingQuestionOverlays,
  type PendingQuestionOverlayResult,
} from "@/domain/questions/ui";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { MapDraftLayer } from "./MapDraftLayer";

interface PendingQuestionLayerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
  mapStyle?: MapStyle;
  streetBasemap: StreetBasemap;
}

export const PendingQuestionLayer = memo(function PendingQuestionLayer({
  pendingQuestions,
  gameArea,
  mapStyle = "standard",
  streetBasemap,
}: PendingQuestionLayerProps) {
  const overlayKey = useMemo(
    () =>
      `${mapStyle}|${streetBasemap}|${pendingQuestions.map((question) => `${question.id}:${question.status}`).join(",")}`,
    [mapStyle, streetBasemap, pendingQuestions],
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
      streetBasemap,
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
  }, [gameArea, mapStyle, streetBasemap, overlayKey, pendingQuestions]);

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
