import type { SessionMessageRecord } from "../../domain/sessionChat";

interface GameChatTabProps {
  messages: readonly SessionMessageRecord[];
  isHider: boolean;
  senderUid: string;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
  ) => Promise<void>;
}

export function GameChatTab({
  messages,
  isHider,
  senderUid,
  onAnswerQuestion,
}: GameChatTabProps) {
  const gameMessages = messages.filter((message) => message.channel === "game");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      {gameMessages.length === 0 ? (
        <p className="text-sm text-ink-dim">No game messages yet.</p>
      ) : (
        gameMessages.map((message) => {
          if (message.kind === "system") {
            return (
              <p
                key={message.id}
                className="rounded-lg bg-surface-raised px-3 py-2 text-center text-xs text-ink-muted"
              >
                {message.text}
              </p>
            );
          }

          if (message.kind !== "question") {
            return null;
          }

          const answered = message.status === "answered" || message.status === "resolved";

          return (
            <div
              key={message.id}
              className="rounded-xl border border-border bg-surface-deep px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {message.toolType ?? "Question"}
              </p>
              <p className="mt-1 text-sm text-ink">{message.promptText}</p>
              {isHider && !answered && message.replyOptions ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {message.replyOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        void onAnswerQuestion(
                          message.pendingQuestionId!,
                          message.id,
                          option.id,
                          option.id,
                        )
                      }
                      className="btn-secondary min-h-11"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {answered ? (
                <p className="mt-2 text-xs text-ink-dim">
                  Answered: {message.selectedReply ?? "—"}
                </p>
              ) : !isHider ? (
                <p className="mt-2 text-xs text-ink-dim">Waiting for hider…</p>
              ) : null}
              {message.senderUid === senderUid ? null : null}
            </div>
          );
        })
      )}
    </div>
  );
}
