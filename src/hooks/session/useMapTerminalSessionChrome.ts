import { useCallback } from "react";
import {
  type UserErrorDisplay,
  userErrorFromTerminalSessionMessage,
} from "../../domain/device/feedback/userErrors";
import { isTerminalSessionSyncMessage } from "../../domain/device/sync/terminalSessionMessage";
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
    inactiveChrome && syncMessage ? userErrorFromTerminalSessionMessage(syncMessage) : null;

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
