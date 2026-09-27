import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import {
  captureFunctionsException,
  withSentryEventHandler,
} from "../lib/sentry.mjs";
import { pollSessionOpsRuns } from "../incident/sessionOpsRunPoller.mjs";
import {
  cursorApiKey,
  sentryDsnSecret,
} from "../handlers/incident/shared.mjs";

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
