import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  PURGE_BATCH_LIMIT,
  selectSessionsToPurge,
} from "../session/purgeStaleSessions.mjs";
import {
  handlePendingQuestionWrite,
  handleSessionMessageWrite,
  handleSessionTimerWrite,
} from "../session/sessionNotificationTriggers.mjs";
import { handleSessionWarmPreloadWrite } from "../session/warmOverpassPreload.mjs";
import { adminDb } from "./proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const purgeStaleSessions = onSchedule(
  { schedule: "0 4 * * *", secrets: [sentryDsnSecret] },
  withSentryEventHandler(async () => {
    const db = adminDb();
    const endedCutoffIso = computeEndedCutoffIso();
    const abandonedCutoffIso = computeAbandonedCutoffIso();

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

    const targets = selectSessionsToPurge(
      endedSnapshot.docs,
      abandonedSnapshot.docs,
      endedCutoffIso,
      abandonedCutoffIso,
      PURGE_BATCH_LIMIT,
    );

    let deleted = 0;
    for (const sessionDoc of targets) {
      await db.recursiveDelete(sessionDoc.ref);
      deleted += 1;
    }

    console.info(
      `purgeStaleSessions deleted ${deleted} session(s); endedCutoff=${endedCutoffIso}; abandonedCutoff=${abandonedCutoffIso}`,
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
