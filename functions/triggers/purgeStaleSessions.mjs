import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  captureFunctionsException,
  getSentryDsnSecret,
  withSentryEventHandler,
} from "../lib/sentry.mjs";
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
import { adminDb } from "../handlers/proxyShared.mjs";

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

    let orphansDeleted = 0;
    try {
      orphansDeleted = await sweepOrphanSessionCodes(db, {
        limit: ORPHAN_CODE_SWEEP_LIMIT,
      });
    } catch (error) {
      console.error("purgeStaleSessions orphan sweep failed", error);
      captureFunctionsException(error);
    }

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
