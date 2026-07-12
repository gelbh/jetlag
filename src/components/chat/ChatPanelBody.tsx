import { useState } from "react";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import type { PlayerRole } from "../../domain/session/playerRole";
import { SegmentControl } from "../ui/SegmentControl";
import { GameChatTab } from "./GameChatTab";
import { SocialChatTab } from "./SocialChatTab";

interface ChatPanelBodyProps {
  messages: readonly SessionMessageRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  sessionRules?: SessionRulesInput;
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  isHider: boolean;
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

export function ChatPanelBody({
  messages,
  pendingQuestions = [],
  sessionRules = { gameSize: "medium" },
  sessionId,
  senderUid,
  senderRole,
  isHider,
  questionTruths,
  truthsLoading = false,
  answerError = null,
  onAnswerQuestion,
  readOnly = false,
}: ChatPanelBodyProps) {
  const [tab, setTab] = useState<"social" | "game">("game");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 shrink-0">
        <SegmentControl
          variant="pill"
          value={tab}
          options={[
            { value: "game", label: "Game" },
            { value: "social", label: "Social" },
          ]}
          onChange={setTab}
          aria-label="Chat tabs"
        />
      </div>
      <div
        key={tab}
        className="jl-game-chat-scroll jl-chat-tab-enter min-h-0 flex-1 overflow-y-auto overscroll-contain motion-reduce:animate-none"
      >
        {tab === "social" ? (
          <SocialChatTab
            messages={messages}
            sessionId={sessionId}
            senderUid={senderUid}
            senderRole={senderRole}
            readOnly={readOnly}
          />
        ) : (
          <GameChatTab
            messages={messages}
            pendingQuestions={pendingQuestions}
            sessionRules={sessionRules}
            sessionId={sessionId}
            isHider={isHider}
            senderUid={senderUid}
            questionTruths={questionTruths}
            truthsLoading={truthsLoading}
            answerError={answerError}
            onAnswerQuestion={onAnswerQuestion}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
