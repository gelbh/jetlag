import { useState } from "react";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import type { ExitSessionParams } from "@/services/session/sessionExit";
import { useSessionStore } from "@/state/sessionStore";

// Dynamic: Home is prerendered on the App chunk; keep firestore off it.
const loadSessionExit = () => import("@/services/session/sessionExit");
const loadFirebase = () => import("@/services/core/firebase/firebase");
const loadClientErrors = () => import("@/services/core/analytics/clientErrors");
const loadLeaveRemote = () => import("@/services/session/leaveRemoteSessionOnDevice");
const loadPendingQuestions = () => import("@/services/firestore/firestoreSessionExtras");

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

    const isLocalSession = session.id === LOCAL_SESSION_ID;

    setLeaving(true);
    try {
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

        const { isAloneHost, leaveRemoteSessionOnDevice } = await loadLeaveRemote();
        const isRemoteHost = session.hostUid === user.uid;

        if (isRemoteHost) {
          const alone = isAloneHost(session);
          const confirmMessage = alone
            ? "You're the only player. Leaving will end this session, then install the update."
            : "Another player will become host so others can keep playing. Leave and update anyway?";
          if (!window.confirm(confirmMessage)) {
            return;
          }
        } else if (!window.confirm(appUpdateCopy.leaveAndUpdateConfirm)) {
          return;
        }

        let pendingQuestions: PendingQuestionRecord[] = [];
        try {
          const { listPendingQuestions } = await loadPendingQuestions();
          pendingQuestions = await listPendingQuestions(session.id);
        } catch (error) {
          const { captureException } = await loadClientErrors();
          captureException(error);
        }

        const leaveResult = await leaveRemoteSessionOnDevice({
          session,
          uid: user.uid,
          pendingQuestions,
        });
        if (leaveResult === "failed") {
          return;
        }
      } else if (!window.confirm(appUpdateCopy.leaveAndUpdateConfirm)) {
        return;
      }

      try {
        await exitSession({
          reason: "leave",
          sessionId: session.id,
          animate: false,
          replace: true,
        });
      } catch (error) {
        const { captureException } = await loadClientErrors();
        captureException(error);
        window.alert("Couldn't leave the session. Try again.");
        return;
      }
      applyUpdate();
    } finally {
      setLeaving(false);
    }
  };

  return { leaving, handleLeaveAndUpdate };
}
