import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import {
  type DockableMapTool,
  isQuestionDockTool,
  mapToolDockShortLabel,
} from "../../domain/map/mapTools";
import { formatExpiredAnswerCountdown, questionAnswerDeadlineMs } from "../../domain/questions";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import { useStickScrollToBottom } from "../../hooks/ui/useStickScrollToBottom";
import { HudToolIcon } from "../map/icons/ToolIcons";
import { InlineError } from "../ui/banners/InlineError";
import { EmptyState } from "../ui/feedback/EmptyState";
import { HiderPendingQuestionAnswer } from "./HiderPendingQuestionAnswer";
import { PhotoAnswerPreview } from "./PhotoAnswerPreview";
import { PendingSyncBadge } from "./PendingSyncBadge";

interface GameChatTabProps {
  messages: readonly SessionMessageRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
  sessionId: string;
  isHider: boolean;
  senderUid: string;
  questionTruths?: ReadonlyMap<string, HiderTruthResult>;
  truthsLoading?: boolean;
  truthReferenceModes?: ReadonlyMap<string, HiderTruthReferenceMode>;
  answerError?: string | null;
  answerSubmitting?: boolean;
  answeredPendingIds?: ReadonlySet<string>;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
  onDismissExpiredQuestion?: (pendingQuestionId: string, messageId: string) => Promise<void>;
  readOnly?: boolean;
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

const QUESTION_DOCK_IDS = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
] as const;

function toolIcon(toolType: string | undefined): ReactNode {
  if (!toolType || !(QUESTION_DOCK_IDS as readonly string[]).includes(toolType)) {
    return null;
  }
  return <HudToolIcon tool={toolType as DockableMapTool} width={16} height={16} />;
}

function answerDisplayText(message: SessionMessageRecord): string | null {
  if (message.status === "cancelled") {
    return "Dismissed";
  }
  const reply = message.selectedReply;
  if (!reply) {
    return null;
  }
  if (reply === "photo") {
    return "Photo received";
  }
  const option = message.replyOptions?.find((item) => item.id === reply);
  return option?.label ?? reply;
}

function StakePlate({ children }: { children: ReactNode }) {
  return (
    <Box
      p={10}
      style={{
        borderRadius: "0.35rem",
        border: "1px solid var(--color-rule)",
        backgroundColor: "var(--color-canvas)",
      }}
    >
      {children}
    </Box>
  );
}

function AnswerBox({ children, tone = "trail" }: { children: ReactNode; tone?: "trail" | "halt" }) {
  return (
    <Box
      style={{
        flex: "1.25 1 10rem",
        minWidth: "min(100%, 9rem)",
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        padding: "10px 12px",
        borderRadius: "0.35rem",
        border: "1px solid var(--color-rule)",
        backgroundColor: tone === "halt" ? "var(--color-halt-soft)" : "var(--color-trail-soft)",
        overflow: "visible",
      }}
    >
      {children}
    </Box>
  );
}

const TEXT_WRAP = {
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
  whiteSpace: "normal" as const,
};

export function GameChatTab({
  messages,
  pendingQuestions,
  sessionRules,
  sessionId,
  isHider,
  senderUid,
  questionTruths,
  truthsLoading = false,
  truthReferenceModes,
  answerError = null,
  answerSubmitting = false,
  answeredPendingIds,
  onAnswerQuestion,
  onDismissExpiredQuestion,
  readOnly = false,
}: GameChatTabProps) {
  const [nowMs, setNowMs] = useState(0);
  const gameMessages = messages
    .filter((message) => message.channel === "game")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const bottomRef = useStickScrollToBottom(gameMessages.length);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Stack gap={8}>
      {answerError ? <InlineError>{answerError}</InlineError> : null}
      {gameMessages.length === 0 ? (
        <EmptyState>No game messages yet.</EmptyState>
      ) : (
        gameMessages.map((message) => {
          if (message.kind === "system") {
            return (
              <Text
                key={message.id}
                component="p"
                role="status"
                size="xs"
                ta="center"
                c="var(--color-field-ink)"
                py={4}
                px={8}
                style={{
                  ...TEXT_WRAP,
                  borderRadius: "0.35rem",
                  backgroundColor: "var(--color-signal-soft)",
                }}
              >
                {message.text}
              </Text>
            );
          }

          if (message.kind !== "question") {
            return null;
          }

          const pending = pendingQuestionForMessage(pendingQuestions, message.pendingQuestionId);
          const walking = pending?.status === "walking";
          const cancelled = message.status === "cancelled" || pending?.status === "cancelled";
          const answered = message.status === "answered" || message.status === "resolved";
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
            pending?.deadlineExpiredAt !== undefined || countdown === "Time expired. Timer paused";

          const isPhotoQuestion = pending?.toolType === "photo";
          const toolLabel =
            message.toolType && isQuestionDockTool(message.toolType)
              ? mapToolDockShortLabel(message.toolType)
              : (message.toolType ?? "Question");
          const canDismissExpired =
            !isHider &&
            !readOnly &&
            !closed &&
            pending?.status === "pending" &&
            expired &&
            Boolean(onDismissExpiredQuestion) &&
            Boolean(message.pendingQuestionId);

          const showHiderAnswer =
            isHider &&
            !readOnly &&
            !closed &&
            !(
              message.pendingQuestionId != null &&
              answeredPendingIds?.has(message.pendingQuestionId)
            );

            const rowPendingSync = Boolean(message.pendingSync || pending?.pendingSync);

          const answerText = answerDisplayText(message);
          const showAnswerBox = closed && answerText != null;

          return (
            <StakePlate key={message.id}>
              {showHiderAnswer ? (
                <HiderPendingQuestionAnswer
                  message={message}
                  pending={pending}
                  sessionRules={sessionRules}
                  sessionId={sessionId}
                  truth={
                    message.pendingQuestionId
                      ? (questionTruths?.get(message.pendingQuestionId) ?? null)
                      : null
                  }
                  truthsLoading={truthsLoading}
                  truthReferenceMode={
                    (message.pendingQuestionId
                      ? truthReferenceModes?.get(message.pendingQuestionId)
                      : undefined) ?? "hidingZoneCenter"
                  }
                  nowMs={nowMs}
                  disabled={
                    answerSubmitting ||
                    (message.pendingQuestionId != null &&
                      answeredPendingIds?.has(message.pendingQuestionId) === true)
                  }
                  onAnswerQuestion={onAnswerQuestion}
                />
              ) : showAnswerBox ? (
                <Group
                  gap={8}
                  wrap="wrap"
                  align="stretch"
                  aria-label={`${toolLabel}: ${message.promptText ?? ""}. Answer: ${answerText}`}
                >
                  <Group
                    gap={8}
                    wrap="nowrap"
                    align="flex-start"
                    style={{ flex: "1 1 10rem", minWidth: "min(100%, 10rem)" }}
                  >
                    <Box
                      c="var(--color-flag)"
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-hidden
                    >
                      {toolIcon(message.toolType)}
                    </Box>
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" fw={600} c="var(--color-flag)" lh={1.2}>
                        {toolLabel}
                      </Text>
                      <Text size="sm" c="var(--color-field-ink)" lh={1.35} style={TEXT_WRAP}>
                        {message.promptText}
                      </Text>
                    </Stack>
                  </Group>

                  <Box
                    component="span"
                    aria-hidden
                    style={{
                      alignSelf: "center",
                      flexShrink: 0,
                      color: "var(--color-trail)",
                    }}
                  >
                    <ArrowRightIcon size={14} weight="bold" />
                  </Box>

                  <AnswerBox tone={cancelled ? "halt" : "trail"}>
                    <Text
                      size="md"
                      fw={700}
                      c={cancelled ? "var(--color-halt)" : "var(--color-field-ink)"}
                      lh={1.3}
                      style={TEXT_WRAP}
                    >
                      {answerText}
                    </Text>
                    {pending?.answeredLate ? (
                      <Text size="xs" fw={600} c="var(--color-halt)">
                        Late
                      </Text>
                    ) : null}
                  </AnswerBox>
                </Group>
              ) : (
                <Stack gap={6} aria-label={`${toolLabel}: ${message.promptText ?? ""}`}>
                  <Group gap={8} wrap="nowrap" align="flex-start">
                    <Box
                      c="var(--color-flag)"
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-hidden
                    >
                      {toolIcon(message.toolType)}
                    </Box>
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" fw={600} c="var(--color-flag)" lh={1.2}>
                        {toolLabel}
                      </Text>
                      <Text size="sm" c="var(--color-field-ink)" lh={1.35} style={TEXT_WRAP}>
                        {message.promptText}
                      </Text>
                    </Stack>
                  </Group>
                  {walking ? (
                    <Text size="xs" c="var(--color-field-ink)" fw={500}>
                      Seeker is walking. Answer when the full question arrives.
                    </Text>
                  ) : null}
                  {countdown ? (
                    <Text
                      size="xs"
                      c={expired ? "var(--color-halt)" : "var(--color-field-ink)"}
                      fw={expired ? 600 : 400}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {countdown}
                    </Text>
                  ) : null}
                  {pending?.answeredLate ? (
                    <Text size="xs" fw={600} c="var(--color-halt)">
                      Answered late. Card draw forfeited.
                    </Text>
                  ) : null}
                  {!isHider && !walking && !rowPendingSync ? (
                    <Text size="xs" c="var(--color-field-ink)">
                      Waiting for hider…
                    </Text>
                  ) : null}
                </Stack>
              )}

              {answered && isPhotoQuestion ? <PhotoAnswerPreview answer={pending?.answer} /> : null}

              {canDismissExpired ? (
                <Button
                  variant="default"
                  size="compact-sm"
                  mt={6}
                  c="var(--color-field-ink)"
                  onClick={() =>
                    void onDismissExpiredQuestion?.(message.pendingQuestionId!, message.id)
                  }
                >
                  Dismiss question
                </Button>
              ) : null}
              {rowPendingSync ? (
                <Box mt={6}>
                  <PendingSyncBadge />
                </Box>
              ) : null}
              {message.senderUid === senderUid ? null : null}
            </StakePlate>
          );
        })
      )}
      <div ref={bottomRef} aria-hidden />
    </Stack>
  );
}
