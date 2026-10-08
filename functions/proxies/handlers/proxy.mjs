import { onRequest } from "firebase-functions/v2/https";
import {
  posthogProjectApiKey,
  withFunctionsExceptionHandler,
} from "../../lib/functionsException.mjs";
import { OVERPASS_L2_PARAMS, OVERPASS_L2_SECRETS } from "../overpassL2Secrets.mjs";
import { OVERPASS_PAID_SECRETS } from "../overpassPaidEnv.mjs";
import { PROXY_TIMEOUT_SECONDS_CEILING } from "../overpassProxyCore.mjs";
import { createProxyRouter } from "../proxyRouter.mjs";
import { overpassHandler } from "./overpass.mjs";
import { transitlandApiKeySecret, transitlandHandler } from "./transitland.mjs";
import {
  ctaBusTrackerApiKeySecret,
  ctaTrainTrackerApiKeySecret,
  vehiclesHandler,
} from "./vehicles.mjs";

const proxyRouter = createProxyRouter({
  overpass: overpassHandler,
  transitland: transitlandHandler,
  vehicles: vehiclesHandler,
});

export const proxy = onRequest(
  {
    secrets: [
      posthogProjectApiKey,
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
    // Ceiling: PROXY_TIMEOUT_SECONDS_CEILING (Jevons — do not raise further
    // without revisiting Overpass failover budget + structured timeout logs).
    // 90s leaves headroom for Postpass/stale L2 after the 50s Overpass budget
    // so clients get JSON errors instead of naked Cloud Run 504s.
    timeoutSeconds: PROXY_TIMEOUT_SECONDS_CEILING,
  },
  withFunctionsExceptionHandler(proxyRouter),
);
