import { useEffect, useState } from "react";
import type { GameSize } from "../../domain/gameSize";
import { answerDeadlineMs } from "../../domain/gameSizeRules";
import {
  formatExpiredAnswerCountdown,
  questionAnswerDeadlineMs,
} from "../../domain/questionRules";
import type { SessionMessageRecord } from "../../domain/sessionChat";
import type { PendingQuestionRecord } from "../../domain/sessionChat";

interface GameChatTabProps {
  messages: readonly SessionMessageRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  gameSize: GameSize;
  isHider: boolean;
  senderUid: string;
  answerError?: string | null;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
}

function pendingQuestionForMessage(
  pendingQuestions: readonly PendingQuestionRecord[],
  pendingQuestionId: string | undefined,
): PendingQuestionRecord | undefined {
  if (!pendingQuestionId) {
    return undefined;
  }

  return pendingQuestions.find((question) => question.id === pendingQuestionId);
}

export function GameChatTab({
  messages,
  pendingQuestions,
  gameSize,
  isHider,
  senderUid,
  answerError = null,
  onAnswerQuestion,
}: GameChatTabProps) {
  const [nowMs, setNowMs] = useState(0);
  const gameMessages = messages.filter((message) => message.channel === "game");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- initialize countdown clock */
    setNowMs(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      {answerError ? (
        <p className="rounded-lg border border-status-error/40 bg-status-error-surface px-3 py-2 text-sm text-status-error">
          {answerError}
        </p>
      ) : null}
      {gameMessages.length === 0 ? (
        <p className="text-sm text-ink-dim">No game messages yet.</p>
      ) : (
        gameMessages.map((message) => {
          if (message.kind === "system") {
            return (
              <p
                key={message.id}
                className="rounded-lg bg-surface-raised px-3 py-2 text-center text-xs text-ink-muted"
              >
                {message.text}
              </p>
            );
          }

          if (message.kind !== "question") {
            return null;
          }

          const pending = pendingQuestionForMessage(
            pendingQuestions,
            message.pendingQuestionId,
          );
          const walking = pending?.status === "walking";
          const answered =
            message.status === "answered" || message.status === "resolved";
          const deadlineMs = pending
            ? questionAnswerDeadlineMs(pending.toolType, gameSize)
            : answerDeadlineMs("matching", gameSize);
          const countdown =
            !walking && !answered && pending?.answerableAt
              ? formatExpiredAnswerCountdown(
                  pending.answerableAt,
                  deadlineMs,
                  pending.deadlineExpiredAt,
                  nowMs,
                )
              : null;
          const expired =
            pending?.deadlineExpiredAt !== undefined ||
            countdown === "Time expired — timer paused";

          return (
            <div
              key={message.id}
              className="rounded-xl border border-border bg-surface-deep px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {message.toolType ?? "Question"}
              </p>
              <p className="mt-1 text-sm text-ink">{message.promptText}</p>
              {walking ? (
                <p className="mt-2 text-xs text-brand-gold">
                  Seeker is walking — answer when the full question arrives.
                </p>
              ) : null}
              {countdown ? (
                <p
                  className={`mt-1 text-xs tabular-nums ${expired ? "text-status-warning" : "text-ink-dim"}`}
                >
                  {countdown}
                </p>
              ) : null}
              {pending?.answeredLate ? (
                <p className="mt-1 text-xs text-status-warning">
                  Answered late — card draw forfeited.
                </p>
              ) : null}
              {isHider && !answered && !walking && message.replyOptions ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {message.replyOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        void onAnswerQuestion(
                          message.pendingQuestionId!,
                          message.id,
                          option.id === "null" ? null : option.id,
                          option.id,
                          expired,
                        )
                      }
                      className="btn-secondary min-h-11"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {answered ? (
                <p className="mt-2 text-xs text-ink-dim">
                  Answered: {message.selectedReply ?? "—"}
                </p>
              ) : !isHider && !walking ? (
                <p className="mt-2 text-xs text-ink-dim">Waiting for hider…</p>
              ) : null}
              {message.senderUid === senderUid ? null : null}
            </div>
          );
        })
      )}
    </div>
  );
}
