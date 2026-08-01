import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleSessionWarmPreloadWrite } from "../session/warmOverpassPreload.mjs";
import { OVERPASS_L2_SECRETS } from "../proxies/overpassL2Secrets.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const warmPremiumOverpassPreload = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret, ...OVERPASS_L2_SECRETS],
    // Warms the same multi-MB landmass/coastline Overpass queries that OOM'd
    // the 256MiB default proxy (incident 9f05e1c1). Requires a deploy.
    memory: "512MiB",
  },
  withSentryEventHandler(async (event) => {
    await handleSessionWarmPreloadWrite(event);
  }),
);
