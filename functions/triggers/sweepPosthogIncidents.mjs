import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sweepPosthogIncidents as runSweep } from "../incident/sweepPosthogIncidents.mjs";
import { withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { posthogPersonalApiKey, posthogProjectApiKey } from "../lib/posthog.mjs";

export const sweepPosthogIncidents = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "Europe/Dublin",
    secrets: [posthogProjectApiKey, posthogPersonalApiKey],
    timeoutSeconds: 120,
  },
  withFunctionsExceptionHandler(async () => {
    await runSweep(getFirestore(), { apiKey: posthogPersonalApiKey.value() });
  }),
);
