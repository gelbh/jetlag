import { useEffect, useRef } from "react";
import { useHotfixThread } from "../../hooks/incident/useHotfixThread";
import type { IncidentThreadMessageRecord } from "../../services/firestore/firestoreIncidentThreads";

export interface AdminHotfixThreadProps {
  incidentId: string;
  className?: string;
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

/**
 * Private admin ↔ coding-agent hotfix thread (read-only client surface).
 */
export function AdminHotfixThread({
  incidentId,
  className = "",
  messagesOverride,
  errorOverride,
}: AdminHotfixThreadProps) {
  const live = useHotfixThread(
    messagesOverride !== undefined ? null : incidentId,
  );
  const messages =
    messagesOverride !== undefined ? messagesOverride : live.messages;
  const error = errorOverride !== undefined ? errorOverride : live.error;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  return (
    <div
      className={`jl-incident-chat ${className}`.trim()}
      data-testid="admin-hotfix-thread"
    >
      <p className="jl-incident-prompt-label">Private hotfix thread</p>
      <p className="text-sm text-ink-muted">
        Coding-agent status only — players cannot read this thread.
      </p>

      {error ? (
        <p
          className="border border-status-error/40 bg-status-error-surface px-2 py-1.5 text-sm font-semibold text-status-error"
          role="alert"
        >
          {error.message}
        </p>
      ) : null}

      <div className="jl-scroll jl-incident-chat-scroll">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-dim">
            No coding-agent activity yet. Clear-bug triage launches here
            automatically.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`jl-incident-msg jl-incident-msg--${
                message.sender === "hotfix_agent" ? "system" : message.sender
              }`}
            >
              <p className="jl-incident-msg-sender">
                {senderLabel(message.sender)} · {formatClock(message.createdAt)}
                {message.kind === "agent_meta" ? " · meta" : ""}
              </p>
              <p className="jl-incident-msg-text">{message.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
