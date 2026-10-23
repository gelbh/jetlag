import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { resolveAdminEmail } from "../admin/adminAccess.mjs";
import { incidentEmailSecret, incidentWorkerBaseUrl } from "../handlers/incident/shared.mjs";
import { sendIncidentEmail } from "../incident/sendIncidentEmail.mjs";
import { sendPosthogIncidentEmail as runSend } from "../incident/sendPosthogIncidentEmail.mjs";
import { posthogProjectApiKey, withFunctionsExceptionHandler } from "../lib/functionsException.mjs";

/**
 * Admin email for created / reopened PostHog-alert incidents, off the webhook's request path.
 */
export const sendPosthogIncidentEmail = onDocumentWritten(
  {
    document: "incidents/{incidentId}",
    secrets: [posthogProjectApiKey, incidentEmailSecret],
  },
  withFunctionsExceptionHandler(async (event) => {
    const workerBaseUrl = incidentWorkerBaseUrl.value();
    await runSend(getFirestore(), event.params.incidentId, event.data?.after?.data(), {
      sendEmail: ({ subject, text, incidentUrl }) =>
        sendIncidentEmail({
          workerBaseUrl,
          secret: incidentEmailSecret.value(),
          adminEmail: resolveAdminEmail(),
          subject,
          text,
          incidentUrl,
        }),
      incidentUrlBase: workerBaseUrl,
    });
  }),
);
