import { useState } from "react";
import { Box, SegmentedControl, Stack } from "@mantine/core";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { usePlayerUiMantine } from "../../hooks/feature/usePlayerUiMantine";
import { SegmentControl } from "../ui/forms/SegmentControl";
import { GameChatTab } from "./GameChatTab";
import { SocialChatTab } from "./SocialChatTab";

interface ChatPanelBodyProps {
  messages: readonly SessionMessageRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  sessionRules?: SessionRulesInput;
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  isHider: boolean;
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
  onDismissExpiredQuestion?: (
    pendingQuestionId: string,
    messageId: string,
  ) => Promise<void>;
  readOnly?: boolean;
}

const chatSegmentStyles = {
  root: {
    backgroundColor: "var(--color-canvas)",
    border: "1px solid var(--color-rule)",
    borderRadius: "0.35rem",
    padding: 2,
  },
  label: {
    color: "var(--color-field-ink)",
    fontWeight: 500,
    fontSize: "0.8125rem",
    paddingInline: 8,
  },
  indicator: {
    backgroundColor: "var(--color-flag-soft)",
    borderRadius: "0.25rem",
  },
} as const;

export function ChatPanelBody({
  messages,
  pendingQuestions = [],
  sessionRules = { gameSize: "medium" },
  sessionId,
  senderUid,
  senderRole,
  isHider,
  questionTruths,
  truthsLoading = false,
  truthReferenceModes,
  answerError = null,
  answerSubmitting = false,
  answeredPendingIds,
  onAnswerQuestion,
  onDismissExpiredQuestion,
  readOnly = false,
}: ChatPanelBodyProps) {
  const [tab, setTab] = useState<"social" | "game">("game");
  const mantinePlayerUi = usePlayerUiMantine();

  if (mantinePlayerUi) {
    return (
      <Stack gap={8} style={{ flex: 1, minHeight: 0, height: "100%" }}>
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={(value) => setTab(value as "social" | "game")}
          data={[
            { value: "game", label: "Game" },
            { value: "social", label: "Social" },
          ]}
          aria-label="Chat tabs"
          styles={chatSegmentStyles}
          className="shrink-0"
        />
        <Box
          key={tab}
          className="jl-chat-tab-enter motion-reduce:animate-none"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {tab === "social" ? (
            <SocialChatTab
              messages={messages}
              sessionId={sessionId}
              senderUid={senderUid}
              senderRole={senderRole}
              readOnly={readOnly}
            />
          ) : (
            <Box
              className="jl-scroll jl-game-chat-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
            >
              <GameChatTab
                messages={messages}
                pendingQuestions={pendingQuestions}
                sessionRules={sessionRules}
                sessionId={sessionId}
                isHider={isHider}
                senderUid={senderUid}
                questionTruths={questionTruths}
                truthsLoading={truthsLoading}
                truthReferenceModes={truthReferenceModes}
                answerError={answerError}
                answerSubmitting={answerSubmitting}
                answeredPendingIds={answeredPendingIds}
                onAnswerQuestion={onAnswerQuestion}
                onDismissExpiredQuestion={onDismissExpiredQuestion}
                readOnly={readOnly}
              />
            </Box>
          )}
        </Box>
      </Stack>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 shrink-0">
        <SegmentControl
          variant="pill"
          value={tab}
          options={[
            { value: "game", label: "Game" },
            { value: "social", label: "Social" },
          ]}
          onChange={setTab}
          aria-label="Chat tabs"
        />
      </div>
      <div
        key={tab}
        className="jl-scroll jl-game-chat-scroll jl-chat-tab-enter min-h-0 flex-1 overflow-y-auto overscroll-contain motion-reduce:animate-none"
      >
        {tab === "social" ? (
          <SocialChatTab
            messages={messages}
            sessionId={sessionId}
            senderUid={senderUid}
            senderRole={senderRole}
            readOnly={readOnly}
          />
        ) : (
          <GameChatTab
            messages={messages}
            pendingQuestions={pendingQuestions}
            sessionRules={sessionRules}
            sessionId={sessionId}
            isHider={isHider}
            senderUid={senderUid}
            questionTruths={questionTruths}
            truthsLoading={truthsLoading}
            truthReferenceModes={truthReferenceModes}
            answerError={answerError}
            answerSubmitting={answerSubmitting}
            answeredPendingIds={answeredPendingIds}
            onAnswerQuestion={onAnswerQuestion}
            onDismissExpiredQuestion={onDismissExpiredQuestion}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
