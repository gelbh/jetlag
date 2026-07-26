import { useEffect, useRef, useState } from "react";
import { useIncidentThread } from "../../hooks/incident/useIncidentThread";

export interface IncidentChatPanelProps {
  incidentId: string;
  /** Optional close control when embedded in a sheet. */
  onClose?: () => void;
  className?: string;
}

function senderLabel(sender: "player" | "admin" | "system"): string {
  switch (sender) {
    case "player":
      return "You";
    case "admin":
      return "Support";
    case "system":
      return "System";
    default: {
      const _exhaustive: never = sender;
      return _exhaustive;
    }
  }
}

export function IncidentChatPanel({
  incidentId,
  onClose,
  className = "",
}: IncidentChatPanelProps) {
  const { messages, error, sending, sendMessage } = useIncidentThread(incidentId);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

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

  const visibleMessages = messages.filter(
    (message) => message.kind !== "prompt",
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`.trim()}>
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue">
            Incident chat
          </p>
          <p className="text-sm text-ink-muted">
            Report sent — you can chat here.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex min-h-11 min-w-11 items-center justify-center px-3"
          >
            Close
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="border-2 border-status-error/40 bg-status-error-surface px-3 py-2 text-sm font-semibold text-status-error">
          {error.message}
        </p>
      ) : null}

      <div className="jl-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {visibleMessages.length === 0 ? (
          <p className="text-sm text-ink-dim">Waiting for support…</p>
        ) : (
          visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.sender === "player"
                  ? "ml-8 bg-highlight-soft text-ink"
                  : message.sender === "system"
                    ? "border border-border bg-surface-deep text-ink-secondary"
                    : "mr-8 bg-surface-raised text-ink-secondary"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">
                {senderLabel(message.sender)}
              </p>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {sendError ? (
        <p className="text-sm font-semibold text-status-error">{sendError}</p>
      ) : null}

      <div className="flex shrink-0 gap-2">
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
          placeholder="Message support…"
          aria-label="Incident message"
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
    </div>
  );
}
