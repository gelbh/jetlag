import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { cursorApiKey, sentryDsnSecret } from "../handlers/incident/shared.mjs";
import { pollSessionOpsRuns } from "../incident/sessionOpsRunPoller.mjs";
import { captureFunctionsException, withSentryEventHandler } from "../lib/sentry.mjs";

/**
 * Poll Cursor session-ops runs every minute and persist terminal results.
 */
export const pollSessionOpsAgentRuns = onSchedule(
  {
    schedule: "every 1 minutes",
    secrets: [sentryDsnSecret, cursorApiKey],
    timeoutSeconds: 60,
  },
  withSentryEventHandler(async () => {
    const db = getFirestore();
    try {
      await pollSessionOpsRuns(db, {
        apiKey: cursorApiKey.value(),
      });
    } catch (error) {
      captureFunctionsException(error);
      throw error;
    }
  }),
);
