import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  autoEndIdleSession,
  computeIdleCutoffIso,
  selectIdleActiveSessions,
} from "../session/autoEndIdleSessions.mjs";
import { sweepOrphanSessionCodes, ORPHAN_CODE_SWEEP_LIMIT } from "../session/orphanSessionCodes.mjs";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  IDLE_PURGE_BATCH_LIMIT,
  PURGE_BATCH_LIMIT,
  selectSessionsToPurge,
} from "../session/purgeStaleSessions.mjs";
import { handleCaptureStartingLocationsWrite } from "../session/captureStartingLocations.mjs";
import { handleFinalizeGameResultWrite } from "../session/finalizeGameResult.mjs";
import {
  handlePendingQuestionWrite,
  handleSessionMessageWrite,
  handleSessionTimerWrite,
} from "../session/sessionNotificationTriggers.mjs";
import { handleSessionWarmPreloadWrite } from "../session/warmOverpassPreload.mjs";
import { adminDb } from "./proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

async function deleteSessionCodeIfPresent(db, code) {
  if (typeof code !== "string" || code.length === 0) {
    return;
  }

  await db.collection("sessionCodes").doc(code).delete();
}

async function fetchIdleActiveSessionDocs(db, idleCutoffIso) {
  try {
    const [idleIndexedSnapshot, idleLegacySnapshot] = await Promise.all([
      db
        .collection("sessions")
        .where("status", "==", "active")
        .where("lastActiveAt", "<", idleCutoffIso)
        .limit(IDLE_PURGE_BATCH_LIMIT)
        .get(),
      db
        .collection("sessions")
        .where("status", "==", "active")
        .where("createdAt", "<", idleCutoffIso)
        .limit(IDLE_PURGE_BATCH_LIMIT)
        .get(),
    ]);

    return selectIdleActiveSessions(
      idleIndexedSnapshot.docs,
      idleLegacySnapshot.docs,
      idleCutoffIso,
      IDLE_PURGE_BATCH_LIMIT,
    );
  } catch (error) {
    console.error("purgeStaleSessions idle query failed", error);
    return [];
  }
}

export const purgeStaleSessions = onSchedule(
  { schedule: "0 4 * * *", secrets: [sentryDsnSecret] },
  withSentryEventHandler(async () => {
    const db = adminDb();
    const idleCutoffIso = computeIdleCutoffIso();
    const endedCutoffIso = computeEndedCutoffIso();
    const abandonedCutoffIso = computeAbandonedCutoffIso();

    const idleTargets = await fetchIdleActiveSessionDocs(db, idleCutoffIso);

    const [endedSnapshot, abandonedSnapshot] = await Promise.all([
      db
        .collection("sessions")
        .where("status", "==", "ended")
        .where("endedAt", "<", endedCutoffIso)
        .limit(PURGE_BATCH_LIMIT)
        .get(),
      db
        .collection("sessions")
        .where("createdAt", "<", abandonedCutoffIso)
        .limit(PURGE_BATCH_LIMIT)
        .get(),
    ]);

    let autoEnded = 0;
    for (const sessionDoc of idleTargets) {
      await autoEndIdleSession(db, sessionDoc);
      autoEnded += 1;
    }

    const orphansDeleted = await sweepOrphanSessionCodes(db, {
      limit: ORPHAN_CODE_SWEEP_LIMIT,
    });

    const targets = selectSessionsToPurge(
      endedSnapshot.docs,
      abandonedSnapshot.docs,
      endedCutoffIso,
      abandonedCutoffIso,
      PURGE_BATCH_LIMIT,
    );

    let deleted = 0;
    for (const sessionDoc of targets) {
      const code = sessionDoc.data().code;
      await db.recursiveDelete(sessionDoc.ref);
      await deleteSessionCodeIfPresent(db, code);
      deleted += 1;
    }

    console.info(
      `purgeStaleSessions autoEnded=${autoEnded} orphansDeleted=${orphansDeleted} deleted=${deleted}; idleCutoff=${idleCutoffIso}; endedCutoff=${endedCutoffIso}; abandonedCutoff=${abandonedCutoffIso}`,
    );
  }),
);

export const notifyPendingQuestion = onDocumentWritten(
  {
    document: "sessions/{sessionId}/pendingQuestions/{questionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handlePendingQuestionWrite(adminDb(), event);
  }),
);

export const notifySessionTimer = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionTimerWrite(adminDb(), event);
  }),
);

export const warmPremiumOverpassPreload = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionWarmPreloadWrite(event);
  }),
);

export const notifySessionMessage = onDocumentWritten(
  {
    document: "sessions/{sessionId}/messages/{messageId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionMessageWrite(adminDb(), event);
  }),
);

export const captureStartingLocations = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleCaptureStartingLocationsWrite(adminDb(), event);
  }),
);

export const finalizeGameResult = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleFinalizeGameResultWrite(adminDb(), event);
  }),
);
