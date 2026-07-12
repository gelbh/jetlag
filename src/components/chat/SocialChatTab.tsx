import { useMemo, useState } from "react";
import type { SessionMessageRecord } from "../../domain/session/sessionChat";
import { createMessageId } from "../../domain/session/sessionChat";
import type { PlayerRole } from "../../domain/session/playerRole";
import { postSocialMessage } from "../../services/firestore/firestoreSessionExtras";

interface SocialChatTabProps {
  messages: readonly SessionMessageRecord[];
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  readOnly?: boolean;
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
  const socialMessages = useMemo(
    () => messages.filter((message) => message.channel === "social"),
    [messages],
  );

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {socialMessages.length === 0 ? (
          <p className="text-sm text-ink-dim">No messages yet.</p>
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
