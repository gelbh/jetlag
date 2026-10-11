import {
  enforceRateLimit,
  requireOverpassProxyAccess,
  requireProxyAccess,
} from "../handlers/proxyShared.mjs";
import { setCors } from "../lib/cors.mjs";
import {
  captureFunctionsExceptionWithTags,
  resolveDeployedFunctionName,
} from "../lib/functionsException.mjs";
import { requireProxyAppCheck } from "./verifyProxyAppCheck.mjs";

/**
 * Shared HTTP proxy pipeline: CORS, App Check, auth, rate limit, handler.
 */
export function createProxyHandler({
  routeName,
  methods = ["GET"],
  requireAppCheck = requireProxyAppCheck,
  requireAccess = requireProxyAccess,
  rateLimitRoute,
  resolveRateLimitTier = (authResult) => authResult.tier ?? "free",
  defaultErrorMessage,
  handler,
}) {
  return async (req, res) => {
    setCors(res, req);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (!methods.includes(req.method)) {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    if (!(await requireAppCheck(req, res, { route: routeName }))) {
      return;
    }

    const authResult = await requireAccess(req, res);
    if (!authResult) {
      return;
    }

    const limitRoute = rateLimitRoute ?? routeName;
    const tier = resolveRateLimitTier(authResult);
    if (!(await enforceRateLimit(res, limitRoute, authResult.uid, tier))) {
      return;
    }

    try {
      await handler(req, res, authResult);
    } catch (error) {
      await captureFunctionsExceptionWithTags(error, {
        name: resolveDeployedFunctionName() ?? "proxy",
        extraTags: { proxy_route: routeName },
      });
      res.status(502).json({
        error: defaultErrorMessage ?? `${routeName} proxy failed.`,
      });
    }
  };
}

export { requireOverpassProxyAccess, requireProxyAccess };
