import { useCallback, useState } from "react";
import { useAppNavigate } from "../useAppNavigate";
import { usePermanentAuthUser } from "../billing/usePermanentAuthUser";
import { joinRemoteSessionByCode } from "../../services/firestore/firestoreAnnotations";
import { setPremiumApiContext } from "../../services/core/premiumApiContext";
import { useSessionStore } from "../../state/sessionStore";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

interface UseAdminJoinSessionOptions {
  onRefresh?: (options?: { background?: boolean }) => void;
}

export function useAdminJoinSession(options: UseAdminJoinSessionOptions = {}) {
  const { onRefresh } = options;
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const { user } = usePermanentAuthUser();
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const joinSession = useCallback(
    async (
      summary: AdminSessionSummary,
      options: { navigate?: boolean } = {},
    ) => {
      const navigateToMap = options.navigate !== false;
      if (!user) {
        return false;
      }

      setJoiningCode(summary.code);
      setError(null);

      try {
        const result = await joinRemoteSessionByCode(
          summary.code,
          user.uid,
          "admin",
        );

        if (result.status === "missing") {
          setError("That session is no longer available.");
          onRefresh?.({ background: true });
          return false;
        }

        if (result.status === "ended") {
          setError("That session has ended.");
          onRefresh?.({ background: true });
          return false;
        }

        if (result.status === "incompatible") {
          setError("Your app version is older than the host's.");
          return false;
        }

        setSession(result.session, user.uid);
        setPremiumApiContext(result.session);
        if (navigateToMap) {
          navigate("/map");
        }
        return true;
      } catch (joinError) {
        setError(
          joinError instanceof Error
            ? joinError.message
            : "Couldn't join as admin.",
        );
        return false;
      } finally {
        setJoiningCode(null);
      }
    },
    [navigate, onRefresh, setSession, user],
  );

  return {
    joinSession,
    joiningCode,
    error,
    setError,
  };
}
