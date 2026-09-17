import { useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import type { SessionMessageRecord } from "../../domain/session/activity/sessionChat";
import { createMessageId } from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { usePlayerUiMantine } from "../../hooks/feature/usePlayerUiMantine";
import { useStickScrollToBottom } from "../../hooks/ui/useStickScrollToBottom";
import { postSocialMessage } from "../../services/firestore/firestoreSessionExtras";
import { EmptyState } from "../ui/feedback/EmptyState";

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
  const [sending, setSending] = useState(false);
  const mantinePlayerUi = usePlayerUiMantine();
  const socialMessages = useMemo(
    () =>
      messages
        .filter((message) => message.channel === "social")
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages],
  );
  const bottomRef = useStickScrollToBottom(socialMessages.length);

  const send = async () => {
    const text = draft.trim();
    if (!text) {
      return;
    }

    setSending(true);
    try {
      await postSocialMessage(
        sessionId,
        senderUid,
        senderRole,
        text,
        createMessageId(),
      );
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  if (mantinePlayerUi) {
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
                !mine &&
                (!prev ||
                  prev.senderUid !== message.senderUid ||
                  prev.kind === "system");

              return (
                <Stack
                  key={message.id}
                  gap={2}
                  align={mine ? "flex-end" : "flex-start"}
                >
                  {showRole ? (
                    <Text
                      size="xs"
                      px={8}
                      c="var(--color-field-ink-muted)"
                      fw={500}
                    >
                      {roleLabel(message.senderRole)}
                    </Text>
                  ) : null}
                  <Box
                    px={12}
                    py={6}
                    maw="78%"
                    style={{
                      borderRadius: mine
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      backgroundColor: mine
                        ? "var(--color-flag)"
                        : "color-mix(in oklab, var(--color-field-ink) 10%, transparent)",
                      color: mine
                        ? "var(--color-flag-ink)"
                        : "var(--color-field-ink)",
                      fontSize: "0.9375rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {message.text}
                  </Box>
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
              void send();
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
              disabled={sending || draft.trim().length === 0}
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
              <PaperPlaneTilt size={18} weight="fill" aria-hidden />
            </ActionIcon>
          </Group>
        )}
      </Stack>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="jl-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {socialMessages.length === 0 ? (
          <EmptyState className="text-ink-dim">No messages yet.</EmptyState>
        ) : (
          socialMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.senderUid === senderUid
                  ? "ml-8 bg-highlight-soft text-ink"
                  : "mr-8 bg-surface-raised text-ink-secondary"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">
                {message.senderRole}
              </p>
              <p>{message.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} aria-hidden />
      </div>
      {readOnly ? null : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void send();
              }
            }}
            className="field-input min-h-11 flex-1"
            placeholder="Message seekers and hiders…"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || draft.trim().length === 0}
            className="btn-primary min-h-11 px-4 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
