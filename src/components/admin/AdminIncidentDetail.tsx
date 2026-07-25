import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IncidentMessageRecord,
  IncidentRecord,
} from "../../domain/incident/incidentTypes";
import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import {
  incidentStatusChipLabel,
  incidentStatusChipTone,
} from "../../services/admin/adminIncidents";
import { useIncidentThread } from "../../hooks/incident/useIncidentThread";

export type AdminIncidentDetailTab = "chat" | "diagnostics" | "timeline";

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

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso || "—";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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
  const live = useIncidentThread(
    incidentOverride !== undefined ? null : incidentId,
  );
  const incident =
    incidentOverride !== undefined ? incidentOverride : live.incident;
  const messages =
    messagesOverride !== undefined ? messagesOverride : live.messages;
  const error = errorOverride !== undefined ? errorOverride : live.error;
  const sending =
    sendingOverride !== undefined ? sendingOverride : live.sending;
  const sendMessage = onSendOverride ?? live.sendMessage;

  const [tab, setTab] = useState<AdminIncidentDetailTab>("chat");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab("chat");
    setDraft("");
    setSendError(null);
  }, [incidentId]);

  useEffect(() => {
    if (tab === "chat") {
      bottomRef.current?.scrollIntoView?.({ block: "end" });
    }
  }, [messages.length, tab]);

  const chatMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.kind === "chat" ||
          message.kind === "prompt" ||
          message.sender === "system",
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
      text: `Mitigation applied: ${mitigation.type}${mitigation.note ? ` — ${mitigation.note}` : ""}`,
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

  if (!incidentId) {
    return (
      <div className="jl-incident-detail" data-testid="admin-incident-detail">
        <div className="jl-incident-empty">
          <p className="jl-incident-empty-title">{emptyTitle}</p>
          <p className="jl-incident-empty-body">{emptyBody}</p>
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="jl-incident-detail" data-testid="admin-incident-detail">
        <div className="jl-incident-empty" role="alert">
          <p className="jl-incident-empty-title">Incident error</p>
          <p className="jl-incident-empty-body">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="jl-incident-detail" data-testid="admin-incident-detail">
        <div className="jl-incident-empty" aria-busy="true">
          <p className="jl-incident-empty-title">Loading</p>
          <p className="jl-incident-empty-body">Opening incident…</p>
        </div>
      </div>
    );
  }

  const tone = incidentStatusChipTone(incident.status);

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
      setSendError(
        err instanceof Error ? err.message : "Could not send the message.",
      );
    }
  };

  return (
    <div className="jl-incident-detail" data-testid="admin-incident-detail">
      <header className="jl-incident-detail-header">
        <div>
          <h2 className="jl-incident-detail-id">{incident.id}</h2>
          <p className="jl-incident-detail-meta">
            Session{" "}
            {incident.sessionCode?.trim()
              ? incident.sessionCode.trim().toUpperCase()
              : "—"}{" "}
            · {formatFreshnessAge(incident.updatedAt || incident.createdAt)}
          </p>
        </div>
        <span className={`jl-incident-chip jl-incident-chip--${tone}`}>
          {incidentStatusChipLabel(incident.status)}
        </span>
      </header>

      <div className="jl-incident-tabs" role="tablist" aria-label="Incident views">
        {(
          [
            ["chat", "Chat"],
            ["diagnostics", "Diagnostics"],
            ["timeline", "Timeline"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`jl-incident-tab${tab === id ? " jl-incident-tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="jl-incident-detail-body">
        {tab === "chat" ? (
          <>
            {incident.adminPrompt.trim() ? (
              <section className="jl-incident-prompt" aria-label="Admin prompt">
                <p className="jl-incident-prompt-label">
                  System (pinned) — admin prompt
                </p>
                <pre className="jl-incident-prompt-body">{incident.adminPrompt}</pre>
              </section>
            ) : null}

            {error ? (
              <p
                className="border border-status-error/40 bg-status-error-surface px-2 py-1.5 text-sm font-semibold text-status-error"
                role="alert"
              >
                {error.message}
              </p>
            ) : null}

            <div className="jl-incident-chat">
              <div className="jl-incident-chat-scroll">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-ink-dim">No messages yet.</p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`jl-incident-msg jl-incident-msg--${message.sender}`}
                    >
                      <p className="jl-incident-msg-sender">
                        {senderLabel(message.sender)} ·{" "}
                        {formatClock(message.createdAt)}
                      </p>
                      <p className="jl-incident-msg-text">{message.text}</p>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {sendError ? (
                <p className="text-sm font-semibold text-status-error" role="alert">
                  {sendError}
                </p>
              ) : null}

              <div className="jl-incident-composer">
                <input
                  className="field-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
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
                <button
                  type="button"
                  className="btn-primary uppercase"
                  disabled={sending || draft.trim().length === 0}
                  onClick={() => void send()}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : null}

        {tab === "diagnostics" ? (
          <dl className="jl-incident-diag-list">
            {(
              [
                ["Route", incident.diagnostics.route],
                ["App version", incident.diagnostics.appVersion],
                ["Platform", incident.diagnostics.platform],
                ["Online", incident.diagnostics.online ? "yes" : "no"],
                ["Visibility", incident.diagnostics.visibilityState],
                ["Player role", incident.diagnostics.playerRole ?? "—"],
                ["Session id", incident.diagnostics.sessionId ?? "—"],
                ["Reporter uid", incident.diagnostics.uid ?? "—"],
                ["Reported at", incident.diagnostics.reportedAt],
                [
                  "Last error",
                  incident.diagnostics.lastClientErrors[0]
                    ? `${incident.diagnostics.lastClientErrors[0].name}${
                        incident.diagnostics.lastClientErrors[0].message
                          ? `: ${incident.diagnostics.lastClientErrors[0].message}`
                          : ""
                      }`
                    : "—",
                ],
                [
                  "Recent ops",
                  incident.diagnostics.recentOps.length > 0
                    ? incident.diagnostics.recentOps.join(", ")
                    : "—",
                ],
                ["User agent", incident.diagnostics.userAgent || "—"],
                ["Player note", incident.playerNote?.trim() || "—"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="admin-diag-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {tab === "timeline" ? (
          timelineItems.length === 0 ? (
            <div className="jl-incident-empty">
              <p className="jl-incident-empty-title">No timeline events</p>
              <p className="jl-incident-empty-body">
                Mitigations and hotfixes appear here when applied.
              </p>
            </div>
          ) : (
            <ul className="jl-incident-timeline">
              {timelineItems.map((item) => (
                <li key={item.id} className="jl-incident-timeline-item">
                  <span className="jl-incident-timeline-time">
                    {formatClock(item.createdAt)}
                  </span>
                  <p className="jl-incident-timeline-text">{item.text}</p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
