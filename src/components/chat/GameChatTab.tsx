import { useEffect, useState } from "react";
import type { GameSize } from "../../domain/gameSize";
import { answerDeadlineMs } from "../../domain/gameSizeRules";
import {
  formatExpiredAnswerCountdown,
  questionAnswerDeadlineMs,
} from "../../domain/questionRules";
import type { HiderTruthResult } from "../../domain/hiderTruthAnswer";
import { mapToolDockShortLabel, isQuestionDockTool } from "../../domain/mapTools";
import type { SessionMessageRecord } from "../../domain/sessionChat";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { HiderAnswerPicker } from "./HiderAnswerPicker";
import { PhotoAnswerPreview } from "./PhotoAnswerPreview";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";

interface GameChatTabProps {
  messages: readonly SessionMessageRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  gameSize: GameSize;
  sessionId: string;
  isHider: boolean;
  senderUid: string;
  questionTruths?: ReadonlyMap<string, HiderTruthResult>;
  truthsLoading?: boolean;
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
  sessionId,
  isHider,
  senderUid,
  questionTruths,
  truthsLoading = false,
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

          const isPhotoQuestion = pending?.toolType === "photo";
          const toolLabel =
            message.toolType && isQuestionDockTool(message.toolType)
              ? mapToolDockShortLabel(message.toolType)
              : (message.toolType ?? "Question");

          return (
            <div
              key={message.id}
              className="rounded-xl border border-border bg-surface-deep px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {toolLabel}
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
              {isHider && !answered && !walking && isPhotoQuestion && pending ? (
                <PhotoAnswerUploader
                  sessionId={sessionId}
                  pendingQuestion={pending}
                  messageId={message.id}
                  deadlineExpired={expired}
                  onAnswerQuestion={onAnswerQuestion}
                />
              ) : null}
              {isHider &&
              !answered &&
              !walking &&
              !isPhotoQuestion &&
              message.replyOptions ? (
                <HiderAnswerPicker
                  replyOptions={message.replyOptions}
                  truth={
                    message.pendingQuestionId
                      ? (questionTruths?.get(message.pendingQuestionId) ?? null)
                      : null
                  }
                  loading={truthsLoading}
                  onSelect={(option) =>
                    void onAnswerQuestion(
                      message.pendingQuestionId!,
                      message.id,
                      option.id === "null" ? null : option.id,
                      option.id,
                      expired,
                    )
                  }
                />
              ) : null}
              {answered && isPhotoQuestion ? (
                <PhotoAnswerPreview answer={pending?.answer} />
              ) : answered ? (
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
