import { useState } from "react";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";
import { isSessionRoleGated } from "@/domain/session/players/roleGates";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import type { ExitSessionParams } from "@/services/session/sessionExit";
import { useSessionStore } from "@/state/sessionStore";

// Dynamic: Home is prerendered on the App chunk; keep firestore off it.
const loadSessionExit = () => import("@/services/session/sessionExit");
const loadFirebase = () => import("@/services/core/firebase/firebase");
const loadRolePasscodeLifecycle = () => import("@/services/session/rolePasscodeLifecycle");
const loadClearLiveLocation = () => import("@/services/session/clearLiveLocationOnLeave");
const loadClientErrors = () => import("@/services/core/analytics/clientErrors");
const loadAnalytics = () => import("@/services/core/analytics/analytics");
const loadSessionLeaveErrors = () => import("@/services/session/sessionLeaveErrors");

export function useLeaveSessionAndUpdate(): {
  leaving: boolean;
  handleLeaveAndUpdate: () => Promise<void>;
} {
  const navigate = useAppNavigate();
  const { applyUpdate } = useAppUpdateState();
  const session = useSessionStore((state) => state.session);
  const [leaving, setLeaving] = useState(false);

  const exitSession = async (params: Omit<ExitSessionParams, "navigate">) => {
    const { exitSession: runExit } = await loadSessionExit();
    await runExit({ ...params, navigate });
  };

  const handleLeaveAndUpdate = async () => {
    if (!session || leaving) {
      return;
    }

    if (!window.confirm(appUpdateCopy.leaveAndUpdateConfirm)) {
      return;
    }

    setLeaving(true);
    try {
      const isLocalSession = session.id === LOCAL_SESSION_ID;

      if (!isLocalSession) {
        const { ensureAnonymousUser } = await loadFirebase();
        let user: { uid: string };
        try {
          user = await ensureAnonymousUser();
        } catch (error) {
          const { captureException } = await loadClientErrors();
          captureException(error);
          window.alert("Couldn't leave the session. Try again.");
          return;
        }

        const isRemoteHost = session.hostUid === user.uid;
        if (isSessionRoleGated(session) && !isRemoteHost) {
          try {
            const { leaveSessionMembership } = await loadRolePasscodeLifecycle();
            if ((await leaveSessionMembership(session.id)) === "already_left") {
              const { trackSessionLeaveAlreadyLeft } = await loadAnalytics();
              trackSessionLeaveAlreadyLeft();
            }
          } catch (error) {
            const { isExpectedSessionLeaveError } = await loadSessionLeaveErrors();
            if (!isExpectedSessionLeaveError(error)) {
              const { captureException } = await loadClientErrors();
              captureException(error);
              window.alert("Couldn't leave the session. Try again.");
              return;
            }
          }
        }

        try {
          const { clearLiveLocationOnLeave } = await loadClearLiveLocation();
          await clearLiveLocationOnLeave({
            sessionId: session.id,
            uid: user.uid,
            role: session.memberRoles?.[user.uid] ?? "seeker",
            pendingQuestions: [],
          });
        } catch (error) {
          const { captureException } = await loadClientErrors();
          captureException(error);
        }
      }

      await exitSession({
        reason: "leave",
        sessionId: session.id,
        animate: false,
        replace: true,
      });
      applyUpdate();
    } finally {
      setLeaving(false);
    }
  };

  return { leaving, handleLeaveAndUpdate };
}
