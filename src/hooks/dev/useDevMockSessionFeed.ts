import { useEffect, useMemo } from "react";
import {
  buildMockActivityEvents,
  buildMockChatMessages,
  buildMockPendingQuestions,
  isDevMockSessionFeedEnabled,
} from "@/dev/sessionFeedFixtures";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import { useActivityLogStore } from "@/state/activityLogStore";

/**
 * When `jl.dev.mockSessionFeed=1` (DEV only), seed activity log + return mock
 * chat/pending so Settings chrome can polish Chat/Log without Firestore.
 */
export function useDevMockSessionFeed(
  sessionId: string | null | undefined,
  liveMessages: readonly SessionMessageRecord[],
  livePending: readonly PendingQuestionRecord[],
): {
  messages: readonly SessionMessageRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  mockEnabled: boolean;
} {
  const mockEnabled = isDevMockSessionFeedEnabled();
  const appendIfAbsent = useActivityLogStore((state) => state.appendIfAbsent);

  useEffect(() => {
    if (!mockEnabled || !sessionId) {
      return;
    }
    for (const event of buildMockActivityEvents(sessionId)) {
      appendIfAbsent(event);
    }
  }, [appendIfAbsent, mockEnabled, sessionId]);

  const messages = useMemo(() => {
    if (!mockEnabled || !sessionId) {
      return liveMessages;
    }
    if (liveMessages.length > 0) {
      return liveMessages;
    }
    return buildMockChatMessages(sessionId);
  }, [liveMessages, mockEnabled, sessionId]);

  const pendingQuestions = useMemo(() => {
    if (!mockEnabled || !sessionId) {
      return livePending;
    }
    if (livePending.length > 0) {
      return livePending;
    }
    return buildMockPendingQuestions(sessionId);
  }, [livePending, mockEnabled, sessionId]);

  return { messages, pendingQuestions, mockEnabled };
}
