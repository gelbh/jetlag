import { Alert, ScrollArea, Stack, Text } from "@mantine/core";
import { useHotfixThread } from "../../../hooks/incident/useHotfixThread";
import { useStickScrollToBottom } from "../../../hooks/ui/useStickScrollToBottom";
import type { IncidentThreadMessageRecord } from "../../../services/firestore/firestoreIncidentThreads";
import { AdminIncidentMessage, formatIncidentClock } from "./AdminIncidentMessage";

export interface AdminHotfixThreadProps {
  incidentId: string;
  /** Injectable for tests. */
  messagesOverride?: IncidentThreadMessageRecord[];
  errorOverride?: Error | null;
}

function senderLabel(sender: IncidentThreadMessageRecord["sender"]): string {
  switch (sender) {
    case "hotfix_agent":
      return "Coding agent";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    case "ops_agent":
      return "Ops agent";
    case "player":
      return "Player";
    default: {
      const _exhaustive: never = sender;
      return _exhaustive;
    }
  }
}

function messageTone(sender: IncidentThreadMessageRecord["sender"]): "player" | "admin" | "system" {
  if (sender === "player" || sender === "admin") return sender;
  return "system";
}

/**
 * Private admin ↔ coding-agent hotfix thread (read-only client surface).
 */
export function AdminHotfixThread({
  incidentId,
  messagesOverride,
  errorOverride,
}: AdminHotfixThreadProps) {
  const live = useHotfixThread(messagesOverride !== undefined ? null : incidentId);
  const messages = messagesOverride !== undefined ? messagesOverride : live.messages;
  const error = errorOverride !== undefined ? errorOverride : live.error;
  const bottomRef = useStickScrollToBottom(messages.length);

  return (
    <Stack gap="xs" flex={1} mih={0} data-testid="admin-hotfix-thread">
      <div>
        <Text size="xs" fw={600} tt="uppercase" lts="0.04em">
          Private hotfix thread
        </Text>
        <Text size="sm" c="dimmed">
          Coding-agent status only. Players cannot read this thread.
        </Text>
      </div>

      {error ? (
        <Alert role="alert" color="halt">
          {error.message}
        </Alert>
      ) : null}

      <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
        <Stack gap="xs">
          {messages.length === 0 ? (
            <Text size="sm" c="dimmed">
              No coding-agent activity yet. Clear-bug triage launches here automatically.
            </Text>
          ) : (
            messages.map((message) => (
              <AdminIncidentMessage
                key={message.id}
                tone={messageTone(message.sender)}
                meta={`${senderLabel(message.sender)} · ${formatIncidentClock(message.createdAt)}${
                  message.kind === "agent_meta" ? " · meta" : ""
                }`}
                text={message.text}
              />
            ))
          )}
          <div ref={bottomRef} />
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
