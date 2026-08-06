import { useCallback } from "react";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { isHidingTimerEffectivelyRunning } from "@/domain/session/timer/timer";
import { useQuestionDeadlineEnforcement } from "@/hooks/session/useQuestionDeadlineEnforcement";
import { useCancelOrphanThermometerWalks } from "@/hooks/sync/useCancelOrphanThermometerWalks";
import { usePendingQuestionResolver } from "@/hooks/sync/usePendingQuestionResolver";
import { useSeekerLocationSync } from "@/hooks/sync/useSeekerLocationSync";
import { captureException } from "@/services/core/analytics/sentry";
import type { MapScreenCore } from "./useMapScreenCore";

type SeekerEffectsInput = Pick<
  MapScreenCore,
  | "session"
  | "uid"
  | "myRole"
  | "isHost"
  | "canControlTimer"
  | "sessionRules"
  | "pendingQuestions"
  | "hidingZones"
  | "seekerLocations"
  | "timer"
  | "toolGameArea"
  | "createAnnotation"
  | "annotations"
> & {
  awaitHiderAnswer: boolean;
  postSystemMessage: (
    sessionId: string,
    uid: string,
    role: "seeker",
    text: string,
  ) => Promise<void>;
  cancelThermometerWalk: (args: {
    sessionId: string;
    pendingQuestionId: string;
    senderUid: string;
    senderRole: PlayerRole;
    reason: "manual" | "orphan" | "stale";
  }) => Promise<void>;
  setMapError: (message: string | null) => void;
};

export function useMapScreenSeekerEffects({
  session,
  uid,
  myRole,
  isHost,
  canControlTimer,
  sessionRules,
  pendingQuestions,
  hidingZones,
  seekerLocations,
  timer,
  toolGameArea,
  createAnnotation,
  annotations,
  awaitHiderAnswer,
  postSystemMessage,
  cancelThermometerWalk,
  setMapError,
}: SeekerEffectsInput) {
  const postDeadlineSystemMessage = useCallback(
    async (text: string) => {
      if (!session?.id || !uid) {
        return;
      }

      await postSystemMessage(session.id, uid, "seeker", text);
    },
    [postSystemMessage, session, uid],
  );

  useQuestionDeadlineEnforcement({
    sessionId: session?.id,
    enabled: canControlTimer,
    sessionRules,
    pendingQuestions,
    hidingZones,
    hidingTimerRunning: isHidingTimerEffectivelyRunning(
      timer.running,
      Boolean(session?.timerRunningSince),
    ),
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
    postSystemMessage: postDeadlineSystemMessage,
  });

  useSeekerLocationSync({
    sessionId: session?.id,
    uid,
    enabled: myRole === "seeker",
  });

  usePendingQuestionResolver({
    sessionId: session?.id,
    enabled: myRole !== "hider" && awaitHiderAnswer,
    pendingQuestions,
    createAnnotation,
    gameArea: toolGameArea,
    sessionResetAt: session?.sessionResetAt,
    knownAnnotationIdsKey: annotations
      .map((annotation) => annotation.id)
      .slice()
      .sort()
      .join("\0"),
    knownAnnotationIds: new Set(annotations.map((annotation) => annotation.id)),
  });

  useCancelOrphanThermometerWalks({
    sessionId: session?.id ?? null,
    myUid: uid,
    myRole,
    isHost,
    memberUids: session?.memberUids ?? [],
    pendingQuestions,
    seekerLocations,
    cancelThermometerWalk,
  });

  const handleCancelWalkingQuestion = useCallback(
    async (pendingQuestionId: string) => {
      if (!session?.id || !uid || !myRole) {
        return;
      }
      if (!window.confirm("Cancel this thermometer walk?")) {
        return;
      }
      try {
        await cancelThermometerWalk({
          sessionId: session.id,
          pendingQuestionId,
          senderUid: uid,
          senderRole: myRole,
          reason: "manual",
        });
      } catch (error) {
        captureException(error);
        setMapError("Couldn't cancel the walk. Please try again.");
      }
    },
    [cancelThermometerWalk, myRole, session, setMapError, uid],
  );

  return { handleCancelWalkingQuestion };
}
