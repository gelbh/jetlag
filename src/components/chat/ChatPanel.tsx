import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import type { PlayerRole } from "../../domain/session/playerRole";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";
import { useVisualViewportBottomInset } from "../../hooks/useVisualViewportBottomInset";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { SheetHost } from "../ui/SheetHost";
import { ChatPanelBody } from "./ChatPanelBody";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: readonly SessionMessageRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  sessionRules?: SessionRulesInput;
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  isHider: boolean;
  bottomClassName?: string;
  questionTruths?: ReadonlyMap<string, HiderTruthResult>;
  truthsLoading?: boolean;
  answerError?: string | null;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
  readOnly?: boolean;
}

export function ChatPanel({
  open,
  onClose,
  messages,
  pendingQuestions = [],
  sessionRules = { gameSize: "medium" },
  sessionId,
  senderUid,
  senderRole,
  isHider,
  bottomClassName = "jl-panel-above-dock",
  questionTruths,
  truthsLoading = false,
  answerError = null,
  onAnswerQuestion,
  readOnly = false,
}: ChatPanelProps) {
  const isDesktop = useDesktopLayout();
  const keyboardInset = useVisualViewportBottomInset(open && !isDesktop);
  const { mounted, animClass, setAnimNode } = useAnimatedPresence({
    open: open && !isDesktop,
    onClose,
    enterClass: "jl-panel-enter",
    exitClass: "jl-panel-exit",
    durationMs: 200,
  });

  const body = (
    <ChatPanelBody
      messages={messages}
      pendingQuestions={pendingQuestions}
      sessionRules={sessionRules}
      sessionId={sessionId}
      senderUid={senderUid}
      senderRole={senderRole}
      isHider={isHider}
      questionTruths={questionTruths}
      truthsLoading={truthsLoading}
      answerError={answerError}
      onAnswerQuestion={onAnswerQuestion}
      readOnly={readOnly}
    />
  );

  if (isDesktop) {
    return (
      <SheetHost open={open} onClose={onClose} ariaLabel="Chat" railTab="chat">
        <div className="mb-3 flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex min-h-11 min-w-11 items-center justify-center px-3"
          >
            Close
          </button>
        </div>
        {body}
      </SheetHost>
    );
  }

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={setAnimNode}
      className={`jl-chat-keyboard-inset pointer-events-auto absolute inset-x-0 z-[var(--z-panel)] px-3 ${animClass} ${bottomClassName}`}
      style={
        keyboardInset > 0
          ? { transform: `translateY(-${keyboardInset}px)` }
          : undefined
      }
    >
      <div className="tool-panel-compact hud-panel mx-auto flex min-h-0 max-h-[min(50dvh,420px)] max-w-xl flex-col overflow-hidden p-3">
        <div className="mb-3 flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex min-h-11 min-w-11 items-center justify-center px-3"
          >
            Close
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
