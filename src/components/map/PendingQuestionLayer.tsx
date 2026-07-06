import { memo, useEffect, useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import type { GameArea } from "../../domain/annotations";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { buildPendingQuestionOverlays } from "../../domain/pendingQuestionOverlays";
import {
  formatAnswerCountdown,
  isQuestionAnswerDeadlineExpired,
  questionAnswerDeadlineMs,
} from "../../domain/questionRules";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { MapDraftLayer } from "./MapDraftLayer";
import { createCountdownBadgeIcon } from "./mapIcons";

interface PendingQuestionLayerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
}

export const PendingQuestionLayer = memo(function PendingQuestionLayer({
  pendingQuestions,
  gameArea,
  sessionRules,
}: PendingQuestionLayerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const overlayResults = useMemo(
    () => buildPendingQuestionOverlays(pendingQuestions, gameArea),
    [gameArea, pendingQuestions],
  );

  const overlays = useMemo(
    () => overlayResults.flatMap((result) => result.overlays),
    [overlayResults],
  );

  const badges = useMemo(() => {
    return overlayResults.flatMap((result) => {
      if (!result.badgeAnchor) {
        return [];
      }

      const question = pendingQuestions.find(
        (item) => item.id === result.questionId,
      );
      if (!question?.answerableAt) {
        return [];
      }

      const deadlineMs = questionAnswerDeadlineMs(
        question.toolType,
        sessionRules,
      );
      const expired =
        question.deadlineExpiredAt !== undefined ||
        isQuestionAnswerDeadlineExpired(
          question.answerableAt,
          deadlineMs,
          nowMs,
        );
      const countdown = formatAnswerCountdown(
        question.answerableAt,
        deadlineMs,
        nowMs,
      );

      return [
        {
          id: result.questionId,
          anchor: result.badgeAnchor,
          label: countdown ?? "Expired",
          expired,
        },
      ];
    });
  }, [sessionRules, nowMs, overlayResults, pendingQuestions]);

  if (overlays.length === 0 && badges.length === 0) {
    return null;
  }

  return (
    <>
      <MapDraftLayer overlays={overlays} />
      {badges.map((badge) => (
        <Marker
          key={`pending-countdown-${badge.id}`}
          position={badge.anchor}
          icon={createCountdownBadgeIcon(badge.label, badge.expired)}
          interactive={false}
        />
      ))}
    </>
  );
});
