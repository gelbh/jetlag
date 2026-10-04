import { ActionIcon, Box, Group, Stack, Text, TextInput } from "@mantine/core";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { commitWrite } from "@/services/firestore/commitWrite";
import type { SessionMessageRecord } from "../../domain/session/activity/sessionChat";
import { createMessageId } from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { useStickScrollToBottom } from "../../hooks/ui/useStickScrollToBottom";
import { postSocialMessage } from "../../services/firestore/firestoreSessionExtras";
import { EmptyState } from "../ui/feedback/EmptyState";
import { PendingSyncBadge } from "./PendingSyncBadge";

interface SocialChatTabProps {
  messages: readonly SessionMessageRecord[];
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  readOnly?: boolean;
}

function roleLabel(role: PlayerRole): string {
  return role === "hider" ? "Hider" : role === "seeker" ? "Seeker" : role;
}

export function SocialChatTab({
  messages,
  sessionId,
  senderUid,
  senderRole,
  readOnly = false,
}: SocialChatTabProps) {
  const [draft, setDraft] = useState("");
  const socialMessages = useMemo(
    () =>
      messages
        .filter((message) => message.channel === "social")
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages],
  );
  const bottomRef = useStickScrollToBottom(socialMessages.length);

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    // Mint the id once per submit: the doc id is the message id, so a Firestore
    // replay on reconnect rewrites the same doc instead of creating a duplicate.
    const messageId = createMessageId();
    setDraft("");
    // Not awaited: the server ack never arrives offline. Rejections surface via
    // WriteFailureNotifier; the pending row shows "Waiting to send" meanwhile.
    commitWrite("chat.send", () =>
      postSocialMessage(sessionId, senderUid, senderRole, text, messageId),
    );
  };

  return (
    <Stack gap={10} style={{ height: "100%", minHeight: 0 }}>
      <Stack
        gap={6}
        className="jl-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        {socialMessages.length === 0 ? (
          <EmptyState>No messages yet.</EmptyState>
        ) : (
          socialMessages.map((message, index) => {
            const mine = message.senderUid === senderUid;
            const prev = socialMessages[index - 1];
            const showRole =
              !mine && (!prev || prev.senderUid !== message.senderUid || prev.kind === "system");

            return (
              <Stack key={message.id} gap={2} align={mine ? "flex-end" : "flex-start"}>
                {showRole ? (
                  <Text size="xs" px={8} c="var(--color-field-ink-muted)" fw={500}>
                    {roleLabel(message.senderRole)}
                  </Text>
                ) : null}
                <Box
                  px={12}
                  py={6}
                  maw="78%"
                  style={{
                    borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    backgroundColor: mine
                      ? "var(--color-flag)"
                      : "color-mix(in oklab, var(--color-field-ink) 10%, transparent)",
                    color: mine ? "var(--color-flag-ink)" : "var(--color-field-ink)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.35,
                  }}
                >
                  {message.text}
                </Box>
                {message.pendingSync ? <PendingSyncBadge /> : null}
              </Stack>
            );
          })
        )}
        <div ref={bottomRef} aria-hidden />
      </Stack>
      {readOnly ? null : (
        <Group
          gap={8}
          wrap="nowrap"
          align="flex-end"
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <TextInput
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder="Message"
            aria-label="Message"
            flex={1}
            radius="xl"
            size="md"
            styles={{
              input: {
                minHeight: "2.5rem",
                border: "1px solid var(--color-rule)",
                backgroundColor: "var(--color-canvas)",
                color: "var(--color-field-ink)",
                fontSize: "0.9375rem",
              },
            }}
          />
          <ActionIcon
            type="submit"
            size={40}
            radius="xl"
            variant="filled"
            disabled={draft.trim().length === 0}
            aria-label="Send"
            styles={{
              root: {
                backgroundColor: "var(--color-flag)",
                color: "var(--color-flag-ink)",
                border: "none",
                "&:disabled": {
                  opacity: 0.4,
                },
              },
            }}
          >
            <PaperPlaneTiltIcon size={18} weight="fill" aria-hidden />
          </ActionIcon>
        </Group>
      )}
    </Stack>
  );
}
