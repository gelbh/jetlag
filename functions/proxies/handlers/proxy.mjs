import { onRequest } from "firebase-functions/v2/https";
import { withSentryHttpHandler, getSentryDsnSecret } from "../../lib/sentry.mjs";
import { createProxyRouter } from "../proxyRouter.mjs";
import { overpassHandler } from "./overpass.mjs";
import {
  transitlandHandler,
  transitlandApiKeySecret,
} from "./transitland.mjs";
import {
  vehiclesHandler,
  ctaBusTrackerApiKeySecret,
  ctaTrainTrackerApiKeySecret,
} from "./vehicles.mjs";
import {
  OVERPASS_L2_PARAMS,
  OVERPASS_L2_SECRETS,
} from "../overpassL2Secrets.mjs";
import { OVERPASS_PAID_SECRETS } from "../overpassPaidEnv.mjs";

const sentryDsnSecret = getSentryDsnSecret();

const proxyRouter = createProxyRouter({
  overpass: overpassHandler,
  transitland: transitlandHandler,
  vehicles: vehiclesHandler,
});

export const proxy = onRequest(
  {
    secrets: [
      sentryDsnSecret,
      transitlandApiKeySecret,
      ctaBusTrackerApiKeySecret,
      ctaTrainTrackerApiKeySecret,
      ...OVERPASS_L2_SECRETS,
      ...OVERPASS_PAID_SECRETS,
    ],
    params: OVERPASS_L2_PARAMS,
    enforceAppCheck: true,
    // Multi-MB Overpass admin/landmass payloads OOM'd the 256MiB default
    // (incident 9f05e1c1). Requires a functions deploy to take effect.
    memory: "512MiB",
  },
  withSentryHttpHandler(proxyRouter),
);
