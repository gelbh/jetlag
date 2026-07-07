import type { SessionRulesInput } from "../session/sessionRules";
import { questionAnswerDeadlineMs } from "./questionRules";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { mapToolDockShortLabel } from "../map/mapTools";
import type { QuestionToolType } from "./questionRules";

export interface ActiveQuestionTimer {
  pendingQuestionId: string;
  toolLabel: string;
  countdownLabel: string;
  remainingMs: number;
}

function toolLabelForQuestion(question: PendingQuestionRecord): string {
  return mapToolDockShortLabel(question.toolType as QuestionToolType);
}

export function selectPrimaryQuestionTimer(
  pendingQuestions: readonly PendingQuestionRecord[],
  sessionRules: SessionRulesInput,
  nowMs: number = Date.now(),
): ActiveQuestionTimer | null {
  let best: ActiveQuestionTimer | null = null;

  for (const question of pendingQuestions) {
    if (question.status !== "pending" && question.status !== "walking") {
      continue;
    }

    const toolLabel = toolLabelForQuestion(question);

    if (question.status === "walking") {
      const candidate: ActiveQuestionTimer = {
        pendingQuestionId: question.id,
        toolLabel,
        countdownLabel: "WALKING",
        remainingMs: Number.POSITIVE_INFINITY,
      };

      if (!best || best.countdownLabel !== "WALKING") {
        best = candidate;
      }
      continue;
    }

    if (!question.answerableAt) {
      continue;
    }

    const deadlineMs = questionAnswerDeadlineMs(question.toolType, sessionRules);
    const elapsed = nowMs - Date.parse(question.answerableAt);
    const remainingMs = deadlineMs - elapsed;

    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const countdownLabel =
      remainingMs <= 0
        ? "EXPIRED"
        : `${minutes}:${String(seconds).padStart(2, "0")}`;

    const candidate: ActiveQuestionTimer = {
      pendingQuestionId: question.id,
      toolLabel,
      countdownLabel,
      remainingMs,
    };

    if (
      !best ||
      best.countdownLabel === "WALKING" ||
      candidate.remainingMs < best.remainingMs
    ) {
      best = candidate;
    }
  }

  return best;
}
