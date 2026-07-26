import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSessionOpsCaps,
  remainingSummons,
  resolveSessionOpsCapTier,
} from "../../domain/incident/sessionOpsCaps";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import { usePendingHostConfirm } from "../../hooks/incident/usePendingHostConfirm";
import { useSupportThread } from "../../hooks/incident/useSupportThread";
import type { IncidentThreadMessageRecord } from "../../services/firestore/firestoreIncidentThreads";
import { usePremiumEntitlementsStore } from "../../state/premiumEntitlementsStore";
import { useSessionStore } from "../../state/sessionStore";
import { HostConfirmSheet } from "./HostConfirmSheet";
import "./SupportAgentChat.css";

export type SupportAgentChatVariant = "player" | "admin";

export interface SupportAgentChatProps {
  incidentId: string;
  variant?: SupportAgentChatVariant;
  onClose?: () => void;
  className?: string;
  /** Injectable for tests. */
  incidentOverride?: IncidentRecord | null;
  messagesOverride?: IncidentThreadMessageRecord[];
  errorOverride?: Error | null;
  sendingOverride?: boolean;
  summonIdOverride?: string | null;
  onSendOverride?: (text: string) => Promise<void>;
  isHostOverride?: boolean;
}

function senderLabel(
  sender: IncidentThreadMessageRecord["sender"],
  variant: SupportAgentChatVariant,
): string {
  switch (sender) {
    case "player":
      return variant === "admin" ? "Player" : "You";
    case "admin":
      return "Admin";
    case "ops_agent":
      return "Fix agent";
    case "system":
      return "System";
    case "hotfix_agent":
      return "System";
    default: {
      const _exhaustive: never = sender;
      return _exhaustive;
    }
  }
}

function formatToolLabel(tool: string | undefined): string {
  if (!tool) {
    return "tool";
  }
  return tool.replaceAll("_", " ");
}

function isWaitingOnHost(messages: IncidentThreadMessageRecord[]): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.kind === "host_confirm") {
      return true;
    }
    if (
      message.kind === "tool_result" &&
      message.toolCall?.status === "host_confirm_required"
    ) {
      return true;
    }
    if (message.kind === "tool_result" && message.toolCall?.status === "ok") {
      return false;
    }
  }
  return false;
}

export function SupportAgentChat({
  incidentId,
  variant = "player",
  onClose,
  className = "",
  incidentOverride,
  messagesOverride,
  errorOverride,
  sendingOverride,
  summonIdOverride,
  onSendOverride,
  isHostOverride,
}: SupportAgentChatProps) {
  const live = useSupportThread(
    incidentOverride !== undefined ? null : incidentId,
  );
  const incident =
    incidentOverride !== undefined ? incidentOverride : live.incident;
  const messages =
    messagesOverride !== undefined ? messagesOverride : live.messages;
  const error = errorOverride !== undefined ? errorOverride : live.error;
  const sending =
    sendingOverride !== undefined ? sendingOverride : live.sending;
  const summonId =
    summonIdOverride !== undefined ? summonIdOverride : live.summonId;
  const sendTurn = onSendOverride ?? live.sendTurn;

  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const storeIsHost =
    Boolean(session?.hostUid && myUid && session.hostUid === myUid);
  const isHost = isHostOverride ?? storeIsHost;

  const entitlements = usePremiumEntitlementsStore(
    (state) => state.entitlements,
  );
  const tier = resolveSessionOpsCapTier({
    hasUnlimitedPremium: entitlements?.hasUnlimitedPremium === true,
    sessionTier: session?.tier ?? null,
  });
  const caps = getSessionOpsCaps(tier);
  const summonCount = incident?.sessionOpsSummonCount ?? 0;
  const summonsLeft = remainingSummons({ summonCount }, caps);
  const hasActiveSummon = Boolean(
    summonId || incident?.activeSessionOpsSummonId,
  );

  const { pending } = usePendingHostConfirm(incidentId);
  const [dismissedConfirmId, setDismissedConfirmId] = useState<string | null>(
    null,
  );
  const hostSheetOpen = Boolean(
    isHost && pending && pending.id !== dismissedConfirmId,
  );

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  const waitingOnHost = useMemo(() => isWaitingOnHost(messages), [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setSendError(null);
    try {
      await sendTurn(trimmed);
      setDraft("");
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Could not reach the fix agent.",
      );
    }
  };

  const summon = () => {
    void send(
      "Please help fix this session. Ask me clarifying questions if needed.",
    );
  };

  return (
    <div
      className={`jl-support-chat ${className}`.trim()}
      data-testid="support-agent-chat"
      data-variant={variant}
    >
      <div className="jl-support-chat-header">
        <div>
          <p className="jl-support-chat-eyebrow">Fix agent</p>
          <p className="jl-support-chat-title">
            {variant === "admin"
              ? "Join the player ↔ ops-agent thread."
              : "Ask the fix agent about this session."}
          </p>
          <p className="jl-support-chat-caps" data-testid="support-agent-caps">
            {tier === "premium" ? "Premium" : "Free"} · {summonsLeft} summon
            {summonsLeft === 1 ? "" : "s"} left
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

      {waitingOnHost ? (
        <p className="jl-support-chat-banner" role="status">
          {isHost
            ? "A destructive change is waiting for your approval."
            : "Waiting on the session host to approve a change."}
        </p>
      ) : null}

      {error ? (
        <p className="jl-support-chat-error" role="alert">
          {error.message}
        </p>
      ) : null}

      {sendError ? (
        <p className="jl-support-chat-error" role="alert">
          {sendError}
        </p>
      ) : null}

      <div className="jl-scroll jl-support-chat-scroll">
        {messages.length === 0 ? (
          <p className="jl-support-empty">
            {hasActiveSummon
              ? "Agent is ready — send a message."
              : "No fix-agent messages yet."}
          </p>
        ) : (
          messages.map((message) => {
            const isToolRow =
              message.kind === "tool_result" ||
              message.kind === "host_confirm";
            const rowClass = isToolRow
              ? "jl-support-msg jl-support-msg--tool"
              : `jl-support-msg jl-support-msg--${message.sender}`;
            return (
              <div key={message.id} className={rowClass}>
                <p className="jl-support-msg-sender">
                  {isToolRow
                    ? "Tool"
                    : senderLabel(message.sender, variant)}
                </p>
                {isToolRow && message.toolCall?.name ? (
                  <p className="jl-support-msg-text">
                    <span className="jl-support-msg-tool-name">
                      {formatToolLabel(message.toolCall.name)}
                    </span>
                    {message.toolCall.status
                      ? ` · ${message.toolCall.status.replaceAll("_", " ")}`
                      : ""}
                    {message.text ? ` — ${message.text}` : ""}
                  </p>
                ) : (
                  <p className="jl-support-msg-text">{message.text}</p>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {!hasActiveSummon && messages.length === 0 ? (
        <div className="jl-support-summon">
          <button
            type="button"
            className="btn-primary min-h-11 px-4"
            disabled={sending || summonsLeft <= 0}
            onClick={summon}
          >
            {sending ? "Summoning…" : "Ask fix agent"}
          </button>
          {summonsLeft <= 0 ? (
            <p className="jl-support-chat-caps">
              Summon limit reached for this session.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="jl-support-composer">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void send(draft);
              }
            }}
            className="field-input min-h-11 flex-1"
            placeholder={
              variant === "admin"
                ? "Message the fix agent…"
                : "Reply to the fix agent…"
            }
            aria-label="Fix agent message"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void send(draft)}
            disabled={sending || draft.trim().length === 0}
            className="btn-primary min-h-11 px-4 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}

      <HostConfirmSheet
        open={hostSheetOpen}
        confirm={pending}
        onClose={() => setDismissedConfirmId(pending?.id ?? null)}
      />
    </div>
  );
}
