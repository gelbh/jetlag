import { onSchedule } from "firebase-functions/v2/scheduler";
import { adminDb } from "../handlers/proxyShared.mjs";
import {
  captureFunctionsException,
  posthogProjectApiKey,
  withFunctionsExceptionHandler,
} from "../lib/functionsException.mjs";
import {
  autoEndIdleSession,
  computeIdleCutoffIso,
  selectIdleActiveSessions,
} from "../session/autoEndIdleSessions.mjs";
import {
  ORPHAN_CODE_SWEEP_LIMIT,
  sweepOrphanSessionCodes,
} from "../session/orphanSessionCodes.mjs";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  IDLE_PURGE_BATCH_LIMIT,
  PURGE_BATCH_LIMIT,
  purgeSelectedSessions,
  selectSessionsToPurge,
} from "../session/purgeStaleSessions.mjs";

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
  { schedule: "0 4 * * *", secrets: [posthogProjectApiKey] },
  withFunctionsExceptionHandler(async () => {
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
      await autoEndIdleSession(db, sessionDoc, {
        posthogApiKey: posthogProjectApiKey.value(),
      });
      autoEnded += 1;
    }

    let orphansDeleted = 0;
    try {
      orphansDeleted = await sweepOrphanSessionCodes(db, {
        limit: ORPHAN_CODE_SWEEP_LIMIT,
      });
    } catch (error) {
      console.error("purgeStaleSessions orphan sweep failed", error);
      await captureFunctionsException(error);
    }

    const targets = selectSessionsToPurge(
      endedSnapshot.docs,
      abandonedSnapshot.docs,
      endedCutoffIso,
      abandonedCutoffIso,
      PURGE_BATCH_LIMIT,
    );

    const deleted = await purgeSelectedSessions(db, targets, {
      captureException: captureFunctionsException,
    });

    console.info(
      `purgeStaleSessions autoEnded=${autoEnded} orphansDeleted=${orphansDeleted} deleted=${deleted}; idleCutoff=${idleCutoffIso}; endedCutoff=${endedCutoffIso}; abandonedCutoff=${abandonedCutoffIso}`,
    );
  }),
);
