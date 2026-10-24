import { callableErrorMessage } from "@/domain/device/feedback/userErrors";
import { isNeedsConnectionError } from "@/domain/device/network/needsConnectionError";
import type { SessionRecord } from "@/domain/map/annotations";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { isSessionRoleGated } from "@/domain/session/players/roleGates";
import { commitWrite } from "@/services/firestore/commitWrite";
import { endRemoteSession } from "@/services/firestore/firestoreAnnotations";
import { trackSessionEnded, trackSessionLeaveAlreadyLeft } from "../core/analytics/analytics";
import { captureException } from "../core/analytics/clientErrors";
import { clearLiveLocationOnLeave } from "./clearLiveLocationOnLeave";
import {
  allowPlayerLocationPublishes,
  blockPlayerLocationPublishes,
} from "./playerLocationPublishGate";
import { leaveSessionMembership } from "./rolePasscodeLifecycle";
import { isExpectedSessionLeaveError } from "./sessionLeaveErrors";
import { leaveHostSession } from "./sessionLifecycle";

function alertIfNeedsConnection(error: unknown): boolean {
  if (!isNeedsConnectionError(error)) {
    return false;
  }
  window.alert(callableErrorMessage(error, "Try again."));
  return true;
}

export function isAloneHost(session: Pick<SessionRecord, "hostUid" | "memberUids">): boolean {
  const hostUid = session.hostUid ?? "";
  return !(session.memberUids ?? []).some((uid) => uid !== hostUid);
}

/**
 * After the caller has confirmed leave: host transfer/end or gated membership leave,
 * then clear live location. Does not exit the local session UI.
 */
export async function leaveRemoteSessionOnDevice(params: {
  session: SessionRecord;
  uid: string;
  pendingQuestions: readonly PendingQuestionRecord[];
}): Promise<"ok" | "failed"> {
  const { session, uid, pendingQuestions } = params;
  const isRemoteHost = session.hostUid === uid;

  if (isRemoteHost) {
    const alone = isAloneHost(session);
    blockPlayerLocationPublishes();

    try {
      const leaveResult = await leaveHostSession(session.id);
      if (leaveResult.action === "ended") {
        trackSessionEnded("host_leave_ended");
      }
    } catch (error) {
      if (alertIfNeedsConnection(error)) {
        allowPlayerLocationPublishes();
        return "failed";
      }
      if (isExpectedSessionLeaveError(error)) {
        trackSessionEnded("expected_already_ended");
      } else {
        captureException(error);
        if (alone) {
          const sessionId = session.id;
          commitWrite("session.end", () => endRemoteSession(sessionId));
          trackSessionEnded("fallback_client_end");
        } else {
          allowPlayerLocationPublishes();
          window.alert("Couldn't leave the session. Try again.");
          return "failed";
        }
      }
    }
  } else if (isSessionRoleGated(session)) {
    blockPlayerLocationPublishes();
    try {
      if ((await leaveSessionMembership(session.id)) === "already_left") {
        trackSessionLeaveAlreadyLeft();
      }
    } catch (error) {
      if (alertIfNeedsConnection(error)) {
        allowPlayerLocationPublishes();
        return "failed";
      }
      if (!isExpectedSessionLeaveError(error)) {
        captureException(error);
        allowPlayerLocationPublishes();
        window.alert("Couldn't leave the session. Try again.");
        return "failed";
      }
    }
  } else {
    blockPlayerLocationPublishes();
  }

  try {
    await clearLiveLocationOnLeave({
      sessionId: session.id,
      uid,
      role: session.memberRoles?.[uid] ?? "seeker",
      pendingQuestions,
    });
  } catch (error) {
    captureException(error);
  }

  return "ok";
}
