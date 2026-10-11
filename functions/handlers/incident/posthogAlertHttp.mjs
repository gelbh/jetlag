import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { resolveAdminEmail } from "../../admin/adminAccess.mjs";
import { handlePosthogAlertRequest } from "../../incident/ingestPosthogAlert.mjs";
import { sendIncidentEmail } from "../../incident/sendIncidentEmail.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { incidentEmailSecret, incidentWorkerBaseUrl, posthogProjectApiKey } from "./shared.mjs";

/** Standard Webhooks signing secret (`whsec_…`) shared with the PostHog error alert. */
export const posthogAlertWebhookSecret = defineSecret("POSTHOG_ALERT_WEBHOOK_SECRET");

/**
 * PostHog Error Tracking "issue created" alert → admin desk incident + email.
 * No App Check: PostHog calls this server-to-server, authenticated by signature.
 */
export const posthogErrorAlert = onRequest(
  {
    secrets: [posthogProjectApiKey, posthogAlertWebhookSecret, incidentEmailSecret],
    enforceAppCheck: false,
    cors: false,
    timeoutSeconds: 30,
  },
  withFunctionsExceptionHandler(async (req, res) => {
    const db = getFirestore();
    const workerBaseUrl = incidentWorkerBaseUrl.value();
    const emailSecret = incidentEmailSecret.value();
    const adminEmail = resolveAdminEmail();

    const response = await handlePosthogAlertRequest(
      { method: req.method, headers: req.headers, rawBody: req.rawBody },
      {
        db,
        secret: posthogAlertWebhookSecret.value(),
        ingest: {
          rateLimit: (options) => consumeRateLimit(db, options),
          sendEmail: ({ subject, text, incidentUrl }) =>
            sendIncidentEmail({
              workerBaseUrl,
              secret: emailSecret,
              adminEmail,
              subject,
              text,
              incidentUrl,
            }),
          incidentUrlBase: workerBaseUrl,
        },
      },
    );

    res.status(response.status).json(response.body);
  }),
);
