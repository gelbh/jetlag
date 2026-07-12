import { setCors } from "../lib/cors.mjs";
import { captureFunctionsException } from "../lib/sentry.mjs";
import {
  enforceRateLimit,
  requireOverpassProxyAccess,
  requireProxyAccess,
} from "../handlers/proxyShared.mjs";

/**
 * Shared HTTP proxy pipeline: CORS, auth, rate limit, handler.
 * App Check is enforced on the parent `proxy` onRequest function.
 */
export function createProxyHandler({
  routeName,
  methods = ["GET"],
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
      captureFunctionsException(error);
      res.status(502).json({
        error: defaultErrorMessage ?? `${routeName} proxy failed.`,
      });
    }
  };
}

export { requireOverpassProxyAccess, requireProxyAccess };
