import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { QuestionPowerUpId } from "../../domain/boardEconomy";
import {
  type DockableMapTool,
  isQuestionDockTool,
  mapToolDockShortLabel,
} from "../../domain/map/mapTools";
import {
  activeDeadlineAnchor,
  formatExpiredAnswerCountdown,
  formatPendingDrawPickSummary,
  questionAnswerDeadlineMs,
} from "../../domain/questions";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import { HudToolIcon } from "../map/icons/ToolIcons";
import { powerUpLabel } from "../session/board/boardCardLabels";
import { HiderAnswerPicker } from "./HiderAnswerPicker";
import { PhotoAnswerUploader } from "./PhotoAnswerUploader";

export interface HiderQuestionCards {
  /** Veto / randomize cards in the hider's hand; empty hides the actions. */
  available: readonly QuestionPowerUpId[];
  onPlay: (pendingQuestionId: string, messageId: string, card: QuestionPowerUpId) => void;
}

export interface HiderPendingQuestionAnswerProps {
  message: SessionMessageRecord;
  pending: PendingQuestionRecord | undefined;
  sessionRules: SessionRulesInput;
  sessionId: string;
  truth: HiderTruthResult | null;
  truthsLoading: boolean;
  truthReferenceMode: HiderTruthReferenceMode;
  nowMs: number;
  disabled?: boolean;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
  questionCards?: HiderQuestionCards;
}

const QUESTION_DOCK_IDS = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
] as const;

export function HiderPendingQuestionAnswer({
  message,
  pending,
  sessionRules,
  sessionId,
  truth,
  truthsLoading,
  truthReferenceMode,
  nowMs,
  disabled = false,
  onAnswerQuestion,
  questionCards,
}: HiderPendingQuestionAnswerProps) {
  const walking = pending?.status === "walking";
  const pendingQuestionId = message.pendingQuestionId;
  const cancelled = message.status === "cancelled" || pending?.status === "cancelled";
  const answered = message.status === "answered" || message.status === "resolved";
  const closed = answered || cancelled;
  const deadlineMs = pending
    ? questionAnswerDeadlineMs(pending.toolType, sessionRules)
    : questionAnswerDeadlineMs("matching", sessionRules);
  const countdown =
    !walking && !closed && pending && activeDeadlineAnchor(pending)
      ? formatExpiredAnswerCountdown(
          activeDeadlineAnchor(pending),
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
  const showToolIcon =
    message.toolType != null && (QUESTION_DOCK_IDS as readonly string[]).includes(message.toolType);

  const answerControls = (
    <>
      {!closed && !walking && isPhotoQuestion && pending ? (
        <PhotoAnswerUploader
          sessionId={sessionId}
          pendingQuestion={pending}
          messageId={message.id}
          distanceUnit={sessionRules.distanceUnit}
          deadlineExpired={expired}
          disabled={disabled}
          onAnswerQuestion={onAnswerQuestion}
        />
      ) : null}
      {!closed && !walking && !isPhotoQuestion && message.replyOptions ? (
        <HiderAnswerPicker
          replyOptions={message.replyOptions}
          truth={truth}
          loading={truthsLoading}
          truthReferenceMode={truthReferenceMode}
          disabled={disabled}
          onSelect={(option) => {
            if (!pendingQuestionId || disabled) {
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
      {!closed && !walking && pendingQuestionId && questionCards?.available.length ? (
        <Group gap={8}>
          {questionCards.available.map((card) => (
            <Button
              key={card}
              variant="default"
              size="sm"
              radius="sm"
              disabled={disabled}
              styles={{ root: { minHeight: "2.75rem" } }}
              onClick={() => questionCards.onPlay(pendingQuestionId, message.id, card)}
            >
              Play {powerUpLabel(card)}
            </Button>
          ))}
        </Group>
      ) : null}
    </>
  );

  return (
    <Stack gap={6}>
      <Group gap={8} wrap="nowrap" align="flex-start">
        {showToolIcon ? (
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
            <HudToolIcon tool={message.toolType as DockableMapTool} width={16} height={16} />
          </Box>
        ) : null}
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} c="var(--color-flag)" lh={1.2}>
            {toolLabel}
          </Text>
          <Text size="sm" c="var(--color-field-ink)" lh={1.35}>
            {message.promptText}
          </Text>
          {pending?.cardDraw != null && pending?.cardKeep != null ? (
            <Text size="xs" c="var(--color-field-ink-muted)">
              {formatPendingDrawPickSummary(pending.toolType, pending.cardDraw, pending.cardKeep)}
            </Text>
          ) : null}
        </Stack>
      </Group>
      {walking ? (
        <Text size="xs" c="var(--color-flag)">
          Seeker is walking. Answer when the full question arrives.
        </Text>
      ) : null}
      {countdown ? (
        <Text
          size="xs"
          c={expired ? "var(--color-halt)" : "var(--color-field-ink-muted)"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {countdown}
        </Text>
      ) : null}
      {pending?.answeredLate ? (
        <Text size="xs" c="var(--color-halt)">
          Answered late. Card draw forfeited.
        </Text>
      ) : null}
      {answerControls}
    </Stack>
  );
}
