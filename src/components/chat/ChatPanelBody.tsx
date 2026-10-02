import { Box, SegmentedControl, Stack } from "@mantine/core";
import { useState } from "react";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { SessionRulesInput } from "../../domain/session/rules";
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
  onDismissExpiredQuestion?: (pendingQuestionId: string, messageId: string) => Promise<void>;
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
