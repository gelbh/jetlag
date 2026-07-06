import { useMemo, useState } from "react";
import type { SessionMessageRecord } from "../../domain/sessionChat";
import { createMessageId } from "../../domain/sessionChat";
import type { PlayerRole } from "../../domain/playerRole";
import { postSocialMessage } from "../../services/firestoreSessionExtras";
import { GameChatTab } from "./GameChatTab";

interface SocialChatTabProps {
  messages: readonly SessionMessageRecord[];
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
}

export function SocialChatTab({
  messages,
  sessionId,
  senderUid,
  senderRole,
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
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
    </div>
  );
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: readonly SessionMessageRecord[];
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  isHider: boolean;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
  ) => Promise<void>;
}

export function ChatPanel({
  open,
  onClose,
  messages,
  sessionId,
  senderUid,
  senderRole,
  isHider,
  onAnswerQuestion,
}: ChatPanelProps) {
  const [tab, setTab] = useState<"social" | "game">("game");

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom)+var(--chrome-gap-above-dock))] z-[var(--z-panel)] px-3">
      <div className="tool-panel-compact hud-panel mx-auto flex max-h-[min(50dvh,420px)] max-w-xl flex-col overflow-hidden p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("game")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "game"
                  ? "bg-highlight-soft text-highlight"
                  : "text-ink-muted"
              }`}
            >
              Game
            </button>
            <button
              type="button"
              onClick={() => setTab("social")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "social"
                  ? "bg-highlight-soft text-highlight"
                  : "text-ink-muted"
              }`}
            >
              Social
            </button>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-9 px-3">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {tab === "social" ? (
            <SocialChatTab
              messages={messages}
              sessionId={sessionId}
              senderUid={senderUid}
              senderRole={senderRole}
            />
          ) : (
            <GameChatTab
              messages={messages}
              isHider={isHider}
              senderUid={senderUid}
              onAnswerQuestion={onAnswerQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
