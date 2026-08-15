import {
  formatExpiredAnswerCountdown,
  formatPendingDrawPickSummary,
  questionAnswerDeadlineMs,
} from "../../domain/questions";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import { mapToolDockShortLabel, isQuestionDockTool } from "../../domain/map/mapTools";
import type { SessionRulesInput } from "../../domain/session/rules";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import { HiderAnswerPicker } from "./HiderAnswerPicker";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";

export interface HiderPendingQuestionAnswerProps {
  message: SessionMessageRecord;
  pending: PendingQuestionRecord | undefined;
  sessionRules: SessionRulesInput;
  sessionId: string;
  truth: HiderTruthResult | null;
  truthsLoading: boolean;
  truthReferenceMode: HiderTruthReferenceMode;
  nowMs: number;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
}

export function HiderPendingQuestionAnswer({
  message,
  pending,
  sessionRules,
  sessionId,
  truth,
  truthsLoading,
  truthReferenceMode,
  nowMs,
  onAnswerQuestion,
}: HiderPendingQuestionAnswerProps) {
  const walking = pending?.status === "walking";
  const cancelled =
    message.status === "cancelled" || pending?.status === "cancelled";
  const answered =
    message.status === "answered" || message.status === "resolved";
  const closed = answered || cancelled;
  const deadlineMs = pending
    ? questionAnswerDeadlineMs(pending.toolType, sessionRules)
    : questionAnswerDeadlineMs("matching", sessionRules);
  const countdown =
    !walking && !closed && pending?.answerableAt
      ? formatExpiredAnswerCountdown(
          pending.answerableAt,
          deadlineMs,
          pending.deadlineExpiredAt,
          nowMs,
        )
      : null;
  const expired =
    pending?.deadlineExpiredAt !== undefined ||
    countdown === "Time expired. Timer paused";

  const isPhotoQuestion = pending?.toolType === "photo";
  const toolLabel =
    message.toolType && isQuestionDockTool(message.toolType)
      ? mapToolDockShortLabel(message.toolType)
      : (message.toolType ?? "Question");

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
        {toolLabel}
      </p>
      <p className="mt-1 text-sm text-ink">{message.promptText}</p>
      {pending?.cardDraw != null && pending?.cardKeep != null ? (
        <p className="mt-1 text-xs text-ink-dim">
          {formatPendingDrawPickSummary(
            pending.toolType,
            pending.cardDraw,
            pending.cardKeep,
          )}
        </p>
      ) : null}
      {walking ? (
        <p className="mt-2 text-xs text-brand-gold">
          Seeker is walking. Answer when the full question arrives.
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
          Answered late. Card draw forfeited.
        </p>
      ) : null}
      {!closed && !walking && isPhotoQuestion && pending ? (
        <PhotoAnswerUploader
          sessionId={sessionId}
          pendingQuestion={pending}
          messageId={message.id}
          distanceUnit={sessionRules.distanceUnit}
          deadlineExpired={expired}
          onAnswerQuestion={onAnswerQuestion}
        />
      ) : null}
      {!closed && !walking && !isPhotoQuestion && message.replyOptions ? (
        <HiderAnswerPicker
          replyOptions={message.replyOptions}
          truth={truth}
          loading={truthsLoading}
          truthReferenceMode={truthReferenceMode}
          onSelect={(option) => {
            const pendingQuestionId = message.pendingQuestionId;
            if (!pendingQuestionId) {
              return;
            }
            void onAnswerQuestion(
              pendingQuestionId,
              message.id,
              option.id === "null" ? null : option.id,
              option.id,
              expired,
            );
          }}
        />
      ) : null}
    </>
  );
}
