import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { handlePosthogAlertRequest } from "../../incident/ingestPosthogAlert.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { posthogProjectApiKey } from "./shared.mjs";

/** Standard Webhooks signing secret (`whsec_…`) shared with the PostHog error alert. */
export const posthogAlertWebhookSecret = defineSecret("POSTHOG_ALERT_WEBHOOK_SECRET");

/**
 * PostHog Error Tracking "issue created" / "issue reopened" alert → admin desk incident.
 * The admin email goes out from the `sendPosthogIncidentEmail` trigger, not this request.
 * No App Check: PostHog calls this server-to-server, authenticated by signature.
 * One warm instance: a cold start (~4s) outlasts PostHog's ~3s fetch timeout.
 */
export const posthogErrorAlert = onRequest(
  {
    secrets: [posthogProjectApiKey, posthogAlertWebhookSecret],
    enforceAppCheck: false,
    cors: false,
    timeoutSeconds: 30,
    minInstances: 1,
  },
  withFunctionsExceptionHandler(async (req, res) => {
    const db = getFirestore();

    const response = await handlePosthogAlertRequest(
      { method: req.method, headers: req.headers, rawBody: req.rawBody },
      {
        db,
        secret: posthogAlertWebhookSecret.value(),
        ingest: {
          rateLimit: (options) => consumeRateLimit(db, options),
        },
      },
    );

    res.status(response.status).json(response.body);
  }),
);
