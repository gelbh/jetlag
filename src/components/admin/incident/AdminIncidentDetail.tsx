import { Alert, Box, Button, Group, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import type { IncidentMessageRecord, IncidentRecord } from "../../../domain/incident/incidentTypes";
import { useIncidentThread } from "../../../hooks/incident/useIncidentThread";
import { useStickScrollToBottom } from "../../../hooks/ui/useStickScrollToBottom";
import { SupportAgentChat } from "../../incident/SupportAgentChat";
import { AdminDiagRow } from "../shared/AdminDiagRow";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminSegmented } from "../shared/AdminSegmented";
import { DESK_HAIRLINE } from "../shared/adminSurface";
import { AdminHotfixThread } from "./AdminHotfixThread";
import { AdminIncidentMessage, formatIncidentClock } from "./AdminIncidentMessage";

export type AdminIncidentDetailTab = "chat" | "hotfix" | "details";

const DETAIL_TABS: { value: AdminIncidentDetailTab; label: string }[] = [
  { value: "chat", label: "Chat" },
  { value: "hotfix", label: "Hotfix" },
  { value: "details", label: "Details" },
];

const sectionLabel = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-ink-muted)",
} as const;

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack component="section" aria-label={label} gap={8}>
      <Box component="h3" m={0} style={sectionLabel}>
        {label}
      </Box>
      {children}
    </Stack>
  );
}

export interface AdminIncidentDetailProps {
  incidentId: string | null;
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
        <Alert color="halt" title="Incident error" role="alert">
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

  const diagnosticRows = [
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
      incident.diagnostics.recentOps.length > 0 ? incident.diagnostics.recentOps.join(", ") : "-",
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
  ] as const;

  return (
    <Stack {...detailFrame} gap={12} data-testid="admin-incident-detail">
      <Box px={20} style={{ flex: "none", maxWidth: 400 }}>
        <AdminSegmented
          aria-label="Incident views"
          value={tab}
          fullWidth
          onChange={(value) => {
            if (value === "chat" || value === "hotfix" || value === "details") {
              setTab(value);
            }
          }}
          data={DETAIL_TABS}
        />
      </Box>

      <Stack gap="xs" flex={1} mih={0} style={{ overflow: "hidden" }}>
        {tab === "chat" ? (
          <>
            <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
              <Stack gap={10} px={20} pb={14} pt={4}>
                {incident.adminPrompt.trim() ? (
                  <AdminIncidentMessage
                    tone="system"
                    meta="Admin prompt"
                    text={incident.adminPrompt}
                    mono
                  />
                ) : null}

                {error ? (
                  <Alert color="halt" role="alert">
                    {error.message}
                  </Alert>
                ) : null}

                {chatMessages.length === 0 ? (
                  <Text size="sm" c="var(--color-ink-muted)">
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
              <Alert color="halt" role="alert" mx={20}>
                {sendError}
              </Alert>
            ) : null}

            <Group
              gap={8}
              wrap="nowrap"
              px={20}
              pt={12}
              pb={16}
              style={{
                flex: "none",
                borderTop: DESK_HAIRLINE,
              }}
            >
              <TextInput
                style={{ flex: 1 }}
                radius={12}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message the reporter…"
                aria-label="Incident message"
                disabled={sending}
                styles={{ input: { height: 36, minHeight: 36 } }}
              />
              <Button
                type="button"
                variant="default"
                h={36}
                radius={12}
                disabled={sending || draft.trim().length === 0}
                onClick={() => void send()}
              >
                Send
              </Button>
            </Group>
          </>
        ) : null}

        {tab === "hotfix" ? (
          <Box px={20} pb={14} style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <AdminHotfixThread incidentId={incidentId} />
          </Box>
        ) : null}

        {tab === "details" ? (
          <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
            <Stack gap={20} px={20} pb={16} pt={4}>
              <DetailSection label="Incident">
                <Stack component="dl" gap="xs" m={0}>
                  <AdminDiagRow label="Incident id">{incident.id}</AdminDiagRow>
                </Stack>
              </DetailSection>

              <DetailSection label="Support">
                <Box h={360} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <SupportAgentChat incidentId={incidentId} variant="admin" />
                </Box>
              </DetailSection>

              <DetailSection label="Diagnostics">
                <Stack component="dl" gap="xs" m={0}>
                  {diagnosticRows.map(([label, value]) => (
                    <AdminDiagRow key={label} label={label}>
                      {value}
                    </AdminDiagRow>
                  ))}
                </Stack>
              </DetailSection>

              <DetailSection label="Timeline">
                {timelineItems.length === 0 ? (
                  <AdminEmptyState
                    title="No timeline events"
                    body="Mitigations and hotfixes appear here when applied."
                  />
                ) : (
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
                )}
              </DetailSection>
            </Stack>
          </ScrollArea>
        ) : null}
      </Stack>
    </Stack>
  );
}
