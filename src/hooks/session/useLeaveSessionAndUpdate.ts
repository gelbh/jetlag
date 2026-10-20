import { useState } from "react";
import {
  type LeaveAndUpdatePrompt,
  resolveLeaveAndUpdatePrompt,
} from "@/domain/device/updates/appUpdateCopy";
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

const LEAVE_FAILED_MESSAGE = "Couldn't leave the session. Try again.";

export function useLeaveSessionAndUpdate(): {
  leaving: boolean;
  prompt: LeaveAndUpdatePrompt | null;
  requestLeaveAndUpdate: () => void;
  dismissLeaveAndUpdatePrompt: () => void;
  confirmLeaveAndUpdate: () => Promise<void>;
} {
  const navigate = useAppNavigate();
  const { applyUpdate } = useAppUpdateState();
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const [leaving, setLeaving] = useState(false);
  const [prompt, setPrompt] = useState<LeaveAndUpdatePrompt | null>(null);

  const exitSession = async (params: Omit<ExitSessionParams, "navigate">) => {
    const { exitSession: runExit } = await loadSessionExit();
    await runExit({ ...params, navigate });
  };

  const requestLeaveAndUpdate = () => {
    if (!session || leaving) {
      return;
    }
    const isLocalSession = session.id === LOCAL_SESSION_ID;
    const isRemoteHost = !isLocalSession && myUid != null && session.hostUid === myUid;
    const aloneHost =
      isRemoteHost && !(session.memberUids ?? []).some((uid) => uid !== (session.hostUid ?? ""));
    setPrompt(
      resolveLeaveAndUpdatePrompt({
        isLocalSession,
        isRemoteHost,
        aloneHost,
      }),
    );
  };

  const dismissLeaveAndUpdatePrompt = () => {
    if (leaving) {
      return;
    }
    setPrompt(null);
  };

  const confirmLeaveAndUpdate = async () => {
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
          throw new Error(LEAVE_FAILED_MESSAGE);
        }

        let pendingQuestions: PendingQuestionRecord[] = [];
        try {
          const { listPendingQuestions } = await loadPendingQuestions();
          pendingQuestions = await listPendingQuestions(session.id);
        } catch (error) {
          const { captureException } = await loadClientErrors();
          captureException(error);
        }

        const { leaveRemoteSessionOnDevice } = await loadLeaveRemote();
        const leaveResult = await leaveRemoteSessionOnDevice({
          session,
          uid: user.uid,
          pendingQuestions,
        });
        if (leaveResult === "failed") {
          throw new Error(LEAVE_FAILED_MESSAGE);
        }
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
        throw new Error(LEAVE_FAILED_MESSAGE);
      }
      applyUpdate();
    } finally {
      setLeaving(false);
    }
  };

  return {
    leaving,
    prompt,
    requestLeaveAndUpdate,
    dismissLeaveAndUpdatePrompt,
    confirmLeaveAndUpdate,
  };
}
