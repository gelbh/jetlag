import { useCallback } from "react";
import { isTerminalSessionSyncMessage } from "../../domain/device/sync/terminalSessionMessage";
import {
  userErrorFromTerminalSessionMessage,
  type UserErrorDisplay,
} from "../../domain/device/feedback/userErrors";
import { useSessionExit } from "./useSessionExit";
import { useSyncRetryAction } from "./useSyncRetryAction";

interface UseMapTerminalSessionChromeParams {
  syncMessage: string | null | undefined;
  sessionId: string;
  closeOverlays?: () => void;
}

export function useMapTerminalSessionChrome({
  syncMessage,
  sessionId,
  closeOverlays,
}: UseMapTerminalSessionChromeParams): {
  inactiveChrome: boolean;
  terminalSessionError: UserErrorDisplay | null;
  onReturnToJoin: () => void;
  onSyncRetry: (() => void) | undefined;
} {
  const exitSession = useSessionExit();
  const onSyncRetry = useSyncRetryAction();
  const inactiveChrome = isTerminalSessionSyncMessage(syncMessage);
  const terminalSessionError =
    inactiveChrome && syncMessage
      ? userErrorFromTerminalSessionMessage(syncMessage)
      : null;

  const onReturnToJoin = useCallback(() => {
    void exitSession({
      reason: "reset",
      sessionId,
      navigateTo: "/join",
      replace: true,
      animate: false,
      closeOverlays,
    });
  }, [closeOverlays, exitSession, sessionId]);

  return {
    inactiveChrome,
    terminalSessionError,
    onReturnToJoin,
    onSyncRetry,
  };
}
