import { useEffect, useRef } from "react";
import type { SessionRulesInput } from "../domain/sessionRules";
import type { HidingZoneRecord } from "../domain/hidingZone";
import {
  isQuestionAnswerDeadlineExpired,
  questionAnswerDeadlineMs,
} from "../domain/questionRules";
import type { PendingQuestionRecord } from "../domain/sessionChat";
import { updatePendingQuestion } from "../services/firestoreSessionExtras";

const DEADLINE_EXPIRED_MESSAGE =
  "Answer deadline passed — hiding timer paused. Hider forfeits card draw for this question.";

interface UseQuestionDeadlineEnforcementParams {
  sessionId: string | undefined;
  enabled: boolean;
  sessionRules: SessionRulesInput;
  pendingQuestions: readonly PendingQuestionRecord[];
  hidingZones: readonly HidingZoneRecord[];
  timerRunning: boolean;
  pauseTimer: () => void;
  resumeTimer: () => void;
  postSystemMessage: (text: string) => Promise<void>;
}

function hasMoveInProgress(
  hidingZones: readonly HidingZoneRecord[],
): boolean {
  return hidingZones.some((zone) => zone.moveInProgress === true);
}

export function useQuestionDeadlineEnforcement({
  sessionId,
  enabled,
  sessionRules,
  pendingQuestions,
  hidingZones,
  timerRunning,
  pauseTimer,
  resumeTimer,
  postSystemMessage,
}: UseQuestionDeadlineEnforcementParams) {
  const expiryHandledRef = useRef<Set<string>>(new Set());
  const autoPausedQuestionRef = useRef<string | null>(null);
  const resumeHandledRef = useRef<Set<string>>(new Set());
  const timerRunningRef = useRef(timerRunning);

  useEffect(() => {
    timerRunningRef.current = timerRunning;
  }, [timerRunning]);

  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    const checkDeadlines = () => {
      const nowMs = Date.now();
      const openQuestions = pendingQuestions.filter(
        (question) => question.status === "pending" && question.answerableAt,
      );

      for (const question of openQuestions) {
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

        if (!expired || expiryHandledRef.current.has(question.id)) {
          continue;
        }

        expiryHandledRef.current.add(question.id);

        void (async () => {
          if (!question.deadlineExpiredAt) {
            await updatePendingQuestion(sessionId, question.id, {
              deadlineExpiredAt: new Date().toISOString(),
            });
          }

          await postSystemMessage(DEADLINE_EXPIRED_MESSAGE);

          if (timerRunningRef.current) {
            autoPausedQuestionRef.current = question.id;
            pauseTimer();
          }
        })();
      }

      const answeredAfterExpiry = pendingQuestions.filter(
        (question) =>
          question.status === "answered" &&
          (question.deadlineExpiredAt !== undefined || question.answeredLate),
      );

      for (const question of answeredAfterExpiry) {
        if (resumeHandledRef.current.has(question.id)) {
          continue;
        }

        if (autoPausedQuestionRef.current !== question.id) {
          resumeHandledRef.current.add(question.id);
          continue;
        }

        resumeHandledRef.current.add(question.id);
        autoPausedQuestionRef.current = null;

        if (!timerRunningRef.current && !hasMoveInProgress(hidingZones)) {
          resumeTimer();
        }
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
