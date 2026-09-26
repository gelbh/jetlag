import { Button, Group, Stack } from "@mantine/core";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import { useVisualViewportBottomInset } from "../../hooks/layout/useVisualViewportBottomInset";
import { iosGrayStyles } from "../ui/apple/iosEntryChrome";
import { SheetHost } from "../ui/sheets/SheetHost";
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
  /** @deprecated Phone chat uses SheetHost; kept for call-site compatibility. */
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
  questionTruths,
  truthsLoading = false,
  truthReferenceModes,
  answerError = null,
  answerSubmitting = false,
  answeredPendingIds,
  onAnswerQuestion,
  onDismissExpiredQuestion,
  readOnly = false,
}: ChatPanelProps) {
  const isDesktop = useDesktopLayout();
  const keyboardInset = useVisualViewportBottomInset(open && !isDesktop);

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
      railTab={isDesktop ? "chat" : undefined}
      maxHeightClassName="max-h-[min(72dvh,640px)]"
      scrollMode="child"
      contentStyle={
        keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined
      }
    >
      <Stack gap={8} style={{ flex: 1, minHeight: 0, height: "100%" }}>
        {isDesktop ? (
          <Group justify="flex-end" className="shrink-0">
            <Button onClick={onClose} styles={iosGrayStyles}>
              Close
            </Button>
          </Group>
        ) : null}
        {body}
      </Stack>
    </SheetHost>
  );
}
