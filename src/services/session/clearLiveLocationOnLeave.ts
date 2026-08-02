import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { listWalkingThermometerQuestionIds } from "../../domain/questions";
import { captureException } from "../core/analytics/sentry";
import { isFirestorePermissionDenied } from "../firestore/firestoreAnnotations";
import {
  cancelWalkingThermometersAndAnnounce,
  deletePlayerLocation,
} from "../firestore/firestoreSessionExtras";
import { blockPlayerLocationPublishes } from "./playerLocationPublishGate";

/** Stop live GPS publishes, cancel open walks, and delete the live pin. */
export async function clearLiveLocationOnLeave(params: {
  sessionId: string;
  uid: string;
  role: PlayerRole;
  pendingQuestions: readonly PendingQuestionRecord[];
}): Promise<void> {
  blockPlayerLocationPublishes();

  const walkIds = listWalkingThermometerQuestionIds(
    params.pendingQuestions,
    params.uid,
  );

  const results = await Promise.allSettled([
    cancelWalkingThermometersAndAnnounce(
      params.sessionId,
      walkIds,
      params.uid,
      params.role,
      "left",
    ),
    deletePlayerLocation(params.sessionId, params.uid),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      const error = result.reason;
      if (!isFirestorePermissionDenied(error)) {
        captureException(error);
      }
    }
  }
}
