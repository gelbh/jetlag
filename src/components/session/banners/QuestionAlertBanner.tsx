import { useEffect, useState } from "react";
import type { SessionRulesInput } from "@/domain/session/rules";
import {
  selectPrimaryHiderAnswerTarget,
} from "@/domain/questions";
import type { HiderTruthReferenceMode } from "@/domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "@/domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import {
  HiderPendingQuestionAnswer,
  type HiderPendingQuestionAnswerProps,
} from "../../chat/HiderPendingQuestionAnswer";
import { InlineError } from "../../ui/banners/InlineError";
import { HudBanner } from "../../ui/hud/HudBanner";

interface QuestionAlertBannerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  messages: readonly SessionMessageRecord[];
  sessionRules: SessionRulesInput;
  sessionId: string;
  questionTruths?: ReadonlyMap<string, HiderTruthResult>;
  truthsLoading?: boolean;
  truthReferenceModes?: ReadonlyMap<string, HiderTruthReferenceMode>;
  answerError?: string | null;
  onAnswerQuestion: HiderPendingQuestionAnswerProps["onAnswerQuestion"];
}

export function QuestionAlertBanner({
  pendingQuestions,
  messages,
  sessionRules,
  sessionId,
  questionTruths,
  truthsLoading = false,
  truthReferenceModes,
  answerError = null,
  onAnswerQuestion,
}: QuestionAlertBannerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const target = selectPrimaryHiderAnswerTarget(
    pendingQuestions,
    messages,
    sessionRules,
    nowMs,
  );
  const closed =
    target != null &&
    (target.message.status === "answered" ||
      target.message.status === "resolved" ||
      target.message.status === "cancelled" ||
      target.pending.status === "cancelled" ||
      target.pending.status === "answered" ||
      target.pending.status === "resolved");
  const visible = target != null && !closed;

  return (
    <HudBanner
      visible={visible}
      className="pointer-events-auto mx-3 mt-1.5"
    >
      {target && visible ? (
        <div
          data-testid="question-alert-banner"
          className="max-h-[40vh] overflow-y-auto rounded-xl border-2 border-highlight bg-surface-deep px-3 py-3 text-left shadow-lg"
          role="region"
          aria-label="Open question"
        >
          {answerError ? (
            <InlineError className="mb-2 rounded-lg border border-status-error/40 bg-status-error-surface px-3 py-2">
              {answerError}
            </InlineError>
          ) : null}
          <HiderPendingQuestionAnswer
            message={target.message}
            pending={target.pending}
            sessionRules={sessionRules}
            sessionId={sessionId}
            truth={
              questionTruths?.get(target.pending.id) ?? null
            }
            truthsLoading={truthsLoading}
            truthReferenceMode={
              truthReferenceModes?.get(target.pending.id) ?? "hidingZoneCenter"
            }
            nowMs={nowMs}
            onAnswerQuestion={onAnswerQuestion}
          />
        </div>
      ) : null}
    </HudBanner>
  );
}
