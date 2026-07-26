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
    ],
    enforceAppCheck: true,
    // Multi-MB Overpass admin/landmass payloads OOM'd the 256MiB default
    // (incident 9f05e1c1). Requires a functions deploy to take effect.
    memory: "512MiB",
  },
  withSentryHttpHandler(proxyRouter),
);
