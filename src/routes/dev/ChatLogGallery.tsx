import { useEffect, useMemo, useState } from "react";
import { Box, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { ChatPanelBody } from "@/components/chat/ChatPanelBody";
import { SessionLogBody } from "@/components/session/log/SessionLogBody";
import {
  buildMockActivityEvents,
  buildMockChatMessages,
  buildMockHiderTruths,
  buildMockPendingQuestions,
  MOCK_SESSION_FEED_ID,
  setDevMockSessionFeedEnabled,
} from "@/dev/sessionFeedFixtures";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import { setPlayerUiMantineEnabled } from "@/hooks/feature/usePlayerUiMantine";

const SEED_MESSAGES = buildMockChatMessages(MOCK_SESSION_FEED_ID);
const SEED_PENDING = buildMockPendingQuestions(MOCK_SESSION_FEED_ID);
const MOCK_EVENTS = buildMockActivityEvents(MOCK_SESSION_FEED_ID);
const MOCK_TRUTHS = buildMockHiderTruths();

const roleSegmentStyles = {
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
  },
  indicator: {
    backgroundColor: "var(--color-flag-soft)",
    borderRadius: "0.25rem",
  },
} as const;

/**
 * Dev-only gallery for Chat + Session log polish.
 * Open `/dev/chat-log`. Also flips on `jl.dev.mockSessionFeed` for in-map use.
 */
export function ChatLogGallery() {
  const [view, setView] = useState<"seeker" | "hider">("hider");
  const [answerBusy, setAnswerBusy] = useState(false);
  const [messages, setMessages] = useState<SessionMessageRecord[]>(SEED_MESSAGES);
  const [pending, setPending] =
    useState<PendingQuestionRecord[]>(SEED_PENDING);
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setPlayerUiMantineEnabled(true);
    setDevMockSessionFeedEnabled(true);
  }, []);

  const isHider = view === "hider";
  const senderUid = isHider ? "mock-hider" : "mock-seeker";
  const senderRole = isHider ? "hider" : "seeker";

  const openAnswerCount = useMemo(
    () =>
      pending.filter(
        (item) =>
          item.status === "pending" &&
          item.toolType !== "photo" &&
          !answeredIds.has(item.id),
      ).length,
    [answeredIds, pending],
  );

  return (
    <Box
      component="main"
      px="md"
      py="lg"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-canvas)",
        color: "var(--color-field-ink)",
      }}
    >
      <Stack gap="xs" mb="lg" maw={420}>
        <Title order={2} style={{ color: "var(--color-field-ink)" }}>
          Chat / Log gallery
        </Title>
        <Text size="sm" c="var(--color-field-ink-muted)">
          Mock feed for polish. Switch to Hider to answer open questions (
          {openAnswerCount} open).
        </Text>
        <SegmentedControl
          fullWidth
          value={view}
          onChange={(value) => setView(value as "seeker" | "hider")}
          data={[
            { value: "hider", label: "Hider view" },
            { value: "seeker", label: "Seeker view" },
          ]}
          aria-label="Gallery role"
          styles={roleSegmentStyles}
        />
      </Stack>

      <Stack gap="xl" maw={420}>
        <Box
          component="section"
          aria-label="Chat mock"
          style={{
            height: "min(70dvh, 36rem)",
            display: "flex",
            flexDirection: "column",
            borderRadius: "0.35rem",
            border: "1px solid var(--color-rule)",
            backgroundColor: "var(--color-canvas)",
            padding: 12,
            overflow: "hidden",
          }}
        >
          <Text fw={600} mb={8} className="shrink-0">
            Chat
          </Text>
          <Box style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <ChatPanelBody
              messages={messages}
              pendingQuestions={pending}
              sessionRules={{ gameSize: "medium" }}
              sessionId={MOCK_SESSION_FEED_ID}
              senderUid={senderUid}
              senderRole={senderRole}
              isHider={isHider}
              questionTruths={MOCK_TRUTHS}
              answerSubmitting={answerBusy}
              answeredPendingIds={answeredIds}
              onAnswerQuestion={async (
                pendingQuestionId,
                messageId,
                _answer,
                selectedReply,
              ) => {
                setAnswerBusy(true);
                await new Promise((resolve) => setTimeout(resolve, 350));
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === messageId
                      ? {
                          ...message,
                          status: "answered",
                          selectedReply,
                        }
                      : message,
                  ),
                );
                setPending((prev) =>
                  prev.map((item) =>
                    item.id === pendingQuestionId
                      ? {
                          ...item,
                          status: "answered",
                          answer: selectedReply,
                        }
                      : item,
                  ),
                );
                setAnsweredIds((prev) => new Set([...prev, pendingQuestionId]));
                setAnswerBusy(false);
              }}
              onDismissExpiredQuestion={async (pendingQuestionId, messageId) => {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === messageId
                      ? { ...message, status: "cancelled" }
                      : message,
                  ),
                );
                setPending((prev) =>
                  prev.map((item) =>
                    item.id === pendingQuestionId
                      ? { ...item, status: "cancelled" }
                      : item,
                  ),
                );
              }}
            />
          </Box>
        </Box>

        <Box
          component="section"
          aria-label="Session log mock"
          p="md"
          style={{
            height: "min(70dvh, 36rem)",
            display: "flex",
            flexDirection: "column",
            borderRadius: "0.35rem",
            border: "1px solid var(--color-rule)",
            backgroundColor: "var(--color-canvas)",
            overflow: "hidden",
          }}
        >
          <Text fw={600} mb="sm" className="shrink-0">
            Session log
          </Text>
          <Box
            className="jl-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <SessionLogBody
              events={MOCK_EVENTS}
              annotations={[]}
              onDelete={() => undefined}
              onEdit={() => undefined}
              readOnly
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
