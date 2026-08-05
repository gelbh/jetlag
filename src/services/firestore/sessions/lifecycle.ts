import {
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { SessionRulesPatch } from "@/domain/session/tools/advancedSessionSettings";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { timerStateToRemote, type TimerState } from "@/domain/session/timer/timer";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import { sessionRulesPatchToFirestore } from "../serialization/serializeSession";
import {
  cancelOpenPendingQuestions,
  postGameSystemMessage,
} from "../firestoreSessionExtras";
import { emitGameEndedActivity } from "@/services/session/emitSessionActivity";
import {
  sessionsCollection,
  endGameTruthAnchorsDoc,
  clearEndGameTruthAnchorsDoc,
  sessionCodeDoc,
  annotationsCollection,
  FIRESTORE_BATCH_LIMIT,
} from "./shared";
import { getRemoteSessionById } from "./join";

export async function endRemoteSession(sessionId: string): Promise<void> {
  const session = await getRemoteSessionById(sessionId);
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endedAt: new Date().toISOString(),
    status: "ended",
    code: deleteField(),
  });

  if (session?.code) {
    await deleteDoc(sessionCodeDoc(session.code));
  }
}

export async function updateSessionTimer(
  sessionId: string,
  state: TimerState,
): Promise<void> {
  const remote = timerStateToRemote(state);
  const patch =
    remote.timerRunningSince === null
      ? {
          timerAccumulatedMs: remote.timerAccumulatedMs,
          timerRunningSince: deleteField(),
        }
      : remote;

  await updateDoc(doc(sessionsCollection(), sessionId), patch);
}

export async function updateSessionRules(
  sessionId: string,
  patch: SessionRulesPatch,
): Promise<void> {
  await updateDoc(
    doc(sessionsCollection(), sessionId),
    sessionRulesPatchToFirestore(patch),
  );
}

/** Seeker/host direct End Game start (no hider Accept). Clears legacy request fields. */
export async function startEndGameSession(
  sessionId: string,
  startedByUid: string,
  anchors: Record<string, { lat: number; lng: number; frozenAt: string }>,
  endGameStartedAt: string = new Date().toISOString(),
): Promise<void> {
  // Sequential create-then-update: session start rules require the freeze doc to
  // already exist. Same-batch exists()+get() against large session docs has denied
  // the write in e2e (optimistic local banner, then permission error).
  const anchorsRef = endGameTruthAnchorsDoc(sessionId);
  let anchorsWritten = false;
  try {
    await setDoc(anchorsRef, { anchors });
    anchorsWritten = true;
    await updateDoc(doc(sessionsCollection(), sessionId), {
      endGameStartedAt,
      endGameStartedByUid: startedByUid,
      // Strip any legacy session-doc anchors (coords belong in endGameTruth/anchors).
      endGameTruthAnchors: deleteField(),
      endGameRequestedAt: deleteField(),
      endGameRequestedByUid: deleteField(),
    });
  } catch (error) {
    // Only roll back an anchors doc this call created — do not delete a prior freeze.
    if (anchorsWritten) {
      await clearEndGameTruthAnchorsDoc(sessionId);
    }
    throw error;
  }
}

/** Clear a pending end-game request only (hider decline / seeker cancel). */
export async function clearEndGameRequestSession(
  sessionId: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
}

/** Clear active or pending end game, including frozen truth anchors. */
export async function resetEndGameSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
  await clearEndGameTruthAnchorsDoc(sessionId);
}

export async function requestFoundHiderSession(
  sessionId: string,
  requestedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundRequestedAt: new Date().toISOString(),
    foundRequestedByUid: requestedByUid,
  });
}

export async function confirmFoundHiderSession(
  sessionId: string,
  confirmedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundConfirmedAt: new Date().toISOString(),
    foundConfirmedByUid: confirmedByUid,
    gameOutcome: "found",
    foundRequestedAt: deleteField(),
    foundRequestedByUid: deleteField(),
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
  // Session outcome already persisted — cleanup must not surface as confirm failure.
  try {
    await clearEndGameTruthAnchorsDoc(sessionId);
  } catch {
    // Best-effort; anchors may already be absent or rules-denied after end.
  }
  emitGameEndedActivity(
    sessionId,
    { outcome: "found", summary: "Hider found" },
    confirmedByUid,
  );
}

export async function resetFoundHiderSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundRequestedAt: deleteField(),
    foundRequestedByUid: deleteField(),
  });
}

export async function resetRemoteSession(
  sessionId: string,
  hostUid: string,
  hostRole: PlayerRole,
): Promise<string> {
  const resetAt = new Date().toISOString();

  const snapshot = await getDocs(annotationsCollection(sessionId));
  const activeDocs = snapshot.docs.filter(
    (annotationDoc) => annotationDoc.data().status === "active",
  );

  for (let index = 0; index < activeDocs.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = activeDocs.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(getFirestoreDb());

    for (const annotationDoc of chunk) {
      batch.update(annotationDoc.ref, {
        status: "deleted",
        updatedAt: resetAt,
      });
    }

    await batch.commit();
  }

  await cancelOpenPendingQuestions(sessionId);

  await updateDoc(doc(sessionsCollection(), sessionId), {
    sessionResetAt: resetAt,
    timerAccumulatedMs: 0,
    timerRunningSince: deleteField(),
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });

  await clearEndGameTruthAnchorsDoc(sessionId);

  await postGameSystemMessage(
    sessionId,
    hostUid,
    hostRole,
    "Session reset by host",
    `reset-${resetAt}`,
  );

  return resetAt;
}

