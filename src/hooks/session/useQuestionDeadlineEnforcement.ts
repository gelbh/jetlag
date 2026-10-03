import { useEffect, useRef } from "react";
import {
  isAwaitingServerReceipt,
  isQuestionAnswerDeadlineExpired,
  questionAnswerDeadlineMs,
  resolveDeadlineAnchor,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type { SessionRulesInput } from "../../domain/session/rules";
import { serverNow, serverNowIso } from "../../services/core/time/serverClock";
import { commitWrite } from "../../services/firestore/commitWrite";
import { updatePendingQuestion } from "../../services/firestore/firestoreSessionExtras";

const DEADLINE_EXPIRED_MESSAGE =
  "Answer deadline passed. Hiding timer paused. Hider forfeits card draw for this question.";

interface UseQuestionDeadlineEnforcementParams {
  sessionId: string | undefined;
  enabled: boolean;
  sessionRules: SessionRulesInput;
  pendingQuestions: readonly PendingQuestionRecord[];
  hidingZones: readonly HidingZoneRecord[];
  /** Local or remote hiding timer is running (see isHidingTimerEffectivelyRunning). */
  hidingTimerRunning: boolean;
  pauseTimer: () => void;
  resumeTimer: () => void;
  postSystemMessage: (text: string) => Promise<void>;
}

function hasMoveInProgress(hidingZones: readonly HidingZoneRecord[]): boolean {
  return hidingZones.some((zone) => zone.moveInProgress === true);
}

export function useQuestionDeadlineEnforcement({
  sessionId,
  enabled,
  sessionRules,
  pendingQuestions,
  hidingZones,
  hidingTimerRunning,
  pauseTimer,
  resumeTimer,
  postSystemMessage,
}: UseQuestionDeadlineEnforcementParams) {
  const expiryHandledRef = useRef<Set<string>>(new Set());
  const autoPausedQuestionRef = useRef<string | null>(null);
  const resumeHandledRef = useRef<Set<string>>(new Set());
  const hidingTimerRunningRef = useRef(hidingTimerRunning);

  useEffect(() => {
    expiryHandledRef.current = new Set();
    autoPausedQuestionRef.current = null;
    resumeHandledRef.current = new Set();
  }, [sessionId]);

  useEffect(() => {
    hidingTimerRunningRef.current = hidingTimerRunning;
  }, [hidingTimerRunning]);

  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    const checkDeadlines = () => {
      const nowMs = serverNow();
      // A still-queued ask has not reached the hider: its window has not opened.
      const openQuestions = pendingQuestions.filter(
        (question) =>
          question.status === "pending" &&
          resolveDeadlineAnchor(question) !== undefined &&
          !isAwaitingServerReceipt(question),
      );

      for (const question of openQuestions) {
        const deadlineMs = questionAnswerDeadlineMs(question.toolType, sessionRules);
        const expired =
          question.deadlineExpiredAt !== undefined ||
          isQuestionAnswerDeadlineExpired(resolveDeadlineAnchor(question), deadlineMs, nowMs);

        if (!expired || expiryHandledRef.current.has(question.id)) {
          continue;
        }

        expiryHandledRef.current.add(question.id);

        void (async () => {
          if (!question.deadlineExpiredAt) {
            commitWrite("system.message", () =>
              updatePendingQuestion(sessionId, question.id, {
                deadlineExpiredAt: serverNowIso(),
              }),
            );
          }

          await postSystemMessage(DEADLINE_EXPIRED_MESSAGE);

          if (hidingTimerRunningRef.current) {
            autoPausedQuestionRef.current = question.id;
            pauseTimer();
          }
        })();
      }

      const closedAfterExpiry = pendingQuestions.filter(
        (question) =>
          (question.status === "answered" || question.status === "cancelled") &&
          (question.deadlineExpiredAt !== undefined || question.answeredLate),
      );

      for (const question of closedAfterExpiry) {
        if (resumeHandledRef.current.has(question.id)) {
          continue;
        }

        if (autoPausedQuestionRef.current !== question.id) {
          resumeHandledRef.current.add(question.id);
          continue;
        }

        // Wait until the host pause is visible (local+remote) and no move is
        // in progress before marking handled — otherwise a late answer would
        // skip resume forever while remote is still running.
        if (hidingTimerRunningRef.current || hasMoveInProgress(hidingZones)) {
          continue;
        }

        resumeHandledRef.current.add(question.id);
        autoPausedQuestionRef.current = null;
        resumeTimer();
      }
    };

    checkDeadlines();
    const interval = window.setInterval(checkDeadlines, 1000);
    return () => window.clearInterval(interval);
  }, [
    enabled,
    sessionRules,
    hidingZones,
    pauseTimer,
    pendingQuestions,
    postSystemMessage,
    resumeTimer,
    sessionId,
  ]);
}
