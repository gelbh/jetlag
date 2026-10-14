import {
  Alert,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import { incidentProgress } from "../../../domain/admin/incidentProgress";
import type { IncidentMessageRecord, IncidentRecord } from "../../../domain/incident/incidentTypes";
import { useIncidentThread } from "../../../hooks/incident/useIncidentThread";
import { useStickScrollToBottom } from "../../../hooks/ui/useStickScrollToBottom";
import { incidentStatusChipLabel } from "../../../services/admin/adminIncidents";
import { incidentProgressTone } from "../../../theme/adminTone";
import { SupportAgentChat } from "../../incident/SupportAgentChat";
import { AdminDiagRow } from "../shared/AdminDiagRow";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { AdminHotfixThread } from "./AdminHotfixThread";
import { AdminIncidentMessage, formatIncidentClock } from "./AdminIncidentMessage";

export type AdminIncidentDetailTab = "chat" | "support" | "hotfix" | "diagnostics" | "timeline";

const DETAIL_TABS: { value: AdminIncidentDetailTab; label: string }[] = [
  { value: "chat", label: "Chat" },
  { value: "support", label: "Support" },
  { value: "hotfix", label: "Hotfix" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "timeline", label: "Timeline" },
];

export interface AdminIncidentDetailProps {
  incidentId: string | null;
  /** When provided, skips live subscribe (tests / parent-owned data). */
  incidentOverride?: IncidentRecord | null;
  messagesOverride?: IncidentMessageRecord[];
  errorOverride?: Error | null;
  sendingOverride?: boolean;
  onSendOverride?: (text: string) => Promise<void>;
  emptyTitle?: string;
  emptyBody?: string;
}

function senderLabel(sender: IncidentMessageRecord["sender"]): string {
  switch (sender) {
    case "player":
      return "Player";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    default: {
      const _exhaustive: never = sender;
      return _exhaustive;
    }
  }
}

const detailFrame = {
  gap: "xs",
  flex: 1,
  mih: 0,
  style: { overflow: "hidden" },
} as const;

export function AdminIncidentDetail({
  incidentId,
  incidentOverride,
  messagesOverride,
  errorOverride,
  sendingOverride,
  onSendOverride,
  emptyTitle = "Select an incident",
  emptyBody = "Choose a report from the queue to open chat, diagnostics, and timeline.",
}: AdminIncidentDetailProps) {
  if (!incidentId) {
    return (
      <Stack {...detailFrame} data-testid="admin-incident-detail">
        <AdminEmptyState title={emptyTitle} body={emptyBody} />
      </Stack>
    );
  }

  return (
    <AdminIncidentDetailBody
      key={incidentId}
      incidentId={incidentId}
      incidentOverride={incidentOverride}
      messagesOverride={messagesOverride}
      errorOverride={errorOverride}
      sendingOverride={sendingOverride}
      onSendOverride={onSendOverride}
    />
  );
}

function AdminIncidentDetailBody({
  incidentId,
  incidentOverride,
  messagesOverride,
  errorOverride,
  sendingOverride,
  onSendOverride,
}: AdminIncidentDetailProps & { incidentId: string }) {
  const live = useIncidentThread(incidentOverride !== undefined ? null : incidentId);
  const incident = incidentOverride !== undefined ? incidentOverride : live.incident;
  const messages = messagesOverride !== undefined ? messagesOverride : live.messages;
  const error = errorOverride !== undefined ? errorOverride : live.error;
  const sending = sendingOverride !== undefined ? sendingOverride : live.sending;
  const sendMessage = onSendOverride ?? live.sendMessage;

  const [tab, setTab] = useState<AdminIncidentDetailTab>("chat");
  // Resolved-today vs closed only needs the time the detail opened.
  const [openedAtMs] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useStickScrollToBottom(`${tab}:${messages.length}`);

  const chatMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.kind !== "prompt" && (message.kind === "chat" || message.sender === "system"),
      ),
    [messages],
  );

  const timelineItems = useMemo(() => {
    const fromMessages = messages.filter(
      (message) =>
        message.kind === "mitigation" ||
        message.kind === "hotfix" ||
        message.kind === "agent" ||
        message.sender === "system",
    );
    const fromMitigations = (incident?.mitigations ?? []).map((mitigation) => ({
      id: `mitigation-${mitigation.id}`,
      createdAt: mitigation.appliedAt,
      text: `Mitigation applied: ${mitigation.type}${mitigation.note ? ` - ${mitigation.note}` : ""}`,
    }));
    const hotfix = incident?.hotfix
      ? [
          {
            id: "hotfix-state",
            createdAt: incident.hotfix.publishedAt ?? incident.updatedAt,
            text: `Hotfix ${incident.hotfix.fromVersion} → ${incident.hotfix.toVersion} (${incident.hotfix.graceSeconds}s grace)`,
          },
        ]
      : [];

    return [
      ...fromMessages.map((message) => ({
        id: message.id,
        createdAt: message.createdAt,
        text: message.text,
      })),
      ...fromMitigations,
      ...hotfix,
    ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }, [incident, messages]);

  if (error && !incident) {
    return (
      <Stack {...detailFrame} data-testid="admin-incident-detail">
        <Alert data-tone="mispunch" title="Incident error" role="alert">
          {error.message}
        </Alert>
      </Stack>
    );
  }

  if (!incident) {
    return (
      <Stack {...detailFrame} data-testid="admin-incident-detail" aria-busy="true">
        <AdminEmptyState title="Loading" body="Opening incident…" />
      </Stack>
    );
  }

  const sessionCode = incident.sessionCode?.trim().toUpperCase();

  const send = async () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setSendError(null);
    try {
      await sendMessage(text);
      setDraft("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send the message.");
    }
  };

  return (
    <Stack {...detailFrame} data-testid="admin-incident-detail">
      <Group component="header" justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack gap={2} miw={0}>
          <Text size="sm" ff="monospace" truncate="end" title={incident.id}>
            {incident.id}
          </Text>
          <Group gap="xs" wrap="nowrap">
            {sessionCode ? <SessionCode code={sessionCode} size="sm" /> : null}
            <Text size="xs" c="dimmed">
              {sessionCode ? "" : "No session · "}
              {formatFreshnessAge(incident.updatedAt || incident.createdAt)}
            </Text>
          </Group>
        </Stack>
        <StatusMark
          tone={incidentProgressTone[incidentProgress(incident, openedAtMs)]}
          label={incidentStatusChipLabel(incident.status)}
        />
      </Group>

      <Tabs
        value={tab}
        onChange={(value) => {
          if (
            value === "chat" ||
            value === "support" ||
            value === "hotfix" ||
            value === "diagnostics" ||
            value === "timeline"
          ) {
            setTab(value);
          }
        }}
      >
        <Tabs.List aria-label="Incident views" style={{ flexWrap: "nowrap", overflowX: "auto" }}>
          {DETAIL_TABS.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} style={{ flexShrink: 0 }}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Stack gap="xs" flex={1} mih={0} style={{ overflow: "hidden" }}>
        {tab === "chat" ? (
          <>
            {incident.adminPrompt.trim() ? (
              <Paper component="section" aria-label="Admin prompt" p="xs">
                <Text size="xs" fw={600} tt="uppercase" lts="0.04em" c="dimmed">
                  System (pinned) - admin prompt
                </Text>
                <ScrollArea.Autosize mah="12rem" type="auto">
                  <Text
                    component="pre"
                    m={0}
                    size="xs"
                    ff="monospace"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {incident.adminPrompt}
                  </Text>
                </ScrollArea.Autosize>
              </Paper>
            ) : null}

            {error ? (
              <Alert data-tone="mispunch" role="alert">
                {error.message}
              </Alert>
            ) : null}

            <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
              <Stack gap="xs">
                {chatMessages.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No messages yet.
                  </Text>
                ) : (
                  chatMessages.map((message) => (
                    <AdminIncidentMessage
                      key={message.id}
                      tone={message.sender}
                      meta={`${senderLabel(message.sender)} · ${formatIncidentClock(message.createdAt)}`}
                      text={message.text}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </Stack>
            </ScrollArea>

            {sendError ? (
              <Alert data-tone="mispunch" role="alert">
                {sendError}
              </Alert>
            ) : null}

            <Group gap="xs" wrap="nowrap" align="flex-end">
              <TextInput
                style={{ flex: 1 }}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message player…"
                aria-label="Incident message"
                disabled={sending}
              />
              <Button
                type="button"
                tt="uppercase"
                disabled={sending || draft.trim().length === 0}
                onClick={() => void send()}
              >
                Send
              </Button>
            </Group>
          </>
        ) : null}

        {tab === "support" ? <SupportAgentChat incidentId={incidentId} variant="admin" /> : null}

        {tab === "hotfix" ? <AdminHotfixThread incidentId={incidentId} /> : null}

        {tab === "diagnostics" ? (
          <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
            <Stack component="dl" gap="xs" m={0}>
              {(
                [
                  ["Route", incident.diagnostics.route],
                  ["App version", incident.diagnostics.appVersion],
                  ["Platform", incident.diagnostics.platform],
                  ["Online", incident.diagnostics.online ? "yes" : "no"],
                  ["Visibility", incident.diagnostics.visibilityState],
                  ["Player role", incident.diagnostics.playerRole ?? "-"],
                  ["Session id", incident.diagnostics.sessionId ?? "-"],
                  ["Reporter uid", incident.diagnostics.uid ?? "-"],
                  ["Reported at", incident.diagnostics.reportedAt],
                  [
                    "Last error",
                    incident.diagnostics.lastClientErrors[0]
                      ? `${incident.diagnostics.lastClientErrors[0].name}${
                          incident.diagnostics.lastClientErrors[0].message
                            ? `: ${incident.diagnostics.lastClientErrors[0].message}`
                            : ""
                        }`
                      : "-",
                  ],
                  [
                    "Recent ops",
                    incident.diagnostics.recentOps.length > 0
                      ? incident.diagnostics.recentOps.join(", ")
                      : "-",
                  ],
                  ["User agent", incident.diagnostics.userAgent || "-"],
                  ["Player note", incident.playerNote?.trim() || "-"],
                  ...(incident.posthogIssue
                    ? [
                        [
                          "PostHog issue",
                          incident.posthogIssue.url ? (
                            <a
                              key="posthog-issue"
                              href={incident.posthogIssue.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {incident.posthogIssue.name}
                            </a>
                          ) : (
                            incident.posthogIssue.name
                          ),
                        ] as const,
                      ]
                    : []),
                ] as const
              ).map(([label, value]) => (
                <AdminDiagRow key={label} label={label}>
                  {value}
                </AdminDiagRow>
              ))}
            </Stack>
          </ScrollArea>
        ) : null}

        {tab === "timeline" ? (
          timelineItems.length === 0 ? (
            <AdminEmptyState
              title="No timeline events"
              body="Mitigations and hotfixes appear here when applied."
            />
          ) : (
            <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
              <Stack component="ul" gap="xs" m={0} p={0} style={{ listStyle: "none" }}>
                {timelineItems.map((item) => (
                  <Group component="li" key={item.id} gap="sm" wrap="nowrap" align="baseline">
                    <Text size="xs" ff="monospace" c="dimmed" style={{ flexShrink: 0 }}>
                      {formatIncidentClock(item.createdAt)}
                    </Text>
                    <Text size="sm">{item.text}</Text>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          )
        ) : null}
      </Stack>
    </Stack>
  );
}
