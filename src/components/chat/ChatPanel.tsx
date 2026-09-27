import { Stack } from "@mantine/core";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { useVisualViewportBottomInset } from "../../hooks/layout/useVisualViewportBottomInset";
import { SheetHost } from "../ui/sheets/SheetHost";
import { ChatPanelBody } from "./ChatPanelBody";

export type ChatPanelModel = {
  open: boolean;
  onClose: () => void;
  messages: readonly SessionMessageRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  sessionRules?: SessionRulesInput;
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  isHider: boolean;
  /** @deprecated Ignored; kept for call-site compatibility. */
  bottomClassName?: string;
  questionTruths?: ReadonlyMap<string, HiderTruthResult>;
  truthsLoading?: boolean;
  truthReferenceModes?: ReadonlyMap<string, HiderTruthReferenceMode>;
  answerError?: string | null;
  answerSubmitting?: boolean;
  answeredPendingIds?: ReadonlySet<string>;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
  onDismissExpiredQuestion?: (
    pendingQuestionId: string,
    messageId: string,
  ) => Promise<void>;
  readOnly?: boolean;
};

export type ChatPanelProps = {
  model: ChatPanelModel;
};

export function ChatPanel({ model }: ChatPanelProps) {
  const {
    open,
    onClose,
    messages,
    pendingQuestions = [],
    sessionRules = { gameSize: "medium" },
    sessionId,
    senderUid,
    senderRole,
    isHider,
    questionTruths,
    truthsLoading = false,
    truthReferenceModes,
    answerError = null,
    answerSubmitting = false,
    answeredPendingIds,
    onAnswerQuestion,
    onDismissExpiredQuestion,
    readOnly = false,
  } = model;
  const keyboardInset = useVisualViewportBottomInset(open);

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
      truthReferenceModes={truthReferenceModes}
      answerError={answerError}
      answerSubmitting={answerSubmitting}
      answeredPendingIds={answeredPendingIds}
      onAnswerQuestion={onAnswerQuestion}
      onDismissExpiredQuestion={onDismissExpiredQuestion}
      readOnly={readOnly}
    />
  );

  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Chat"
      maxHeightClassName="max-h-[min(72dvh,640px)]"
      scrollMode="child"
      contentStyle={
        keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined
      }
    >
      <Stack gap={8} style={{ flex: 1, minHeight: 0, height: "100%" }}>
        {body}
      </Stack>
    </SheetHost>
  );
}
