import { setCors } from "../lib/cors.mjs";

export const PROXY_ROUTE_NAMES = ["overpass", "transitland", "vehicles"];

/**
 * @param {string | undefined} path
 * @returns {string | null}
 */
export function resolveProxyRoute(path) {
  if (typeof path !== "string") {
    return null;
  }

  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return null;
  }

  const segment = normalized.split("/")[0];
  return PROXY_ROUTE_NAMES.includes(segment) ? segment : null;
}

/**
 * @param {Record<string, (req: import("firebase-functions/v2/https").Request, res: import("firebase-functions/v2/https").Response) => Promise<void>>} routeHandlers
 */
export function createProxyRouter(routeHandlers) {
  return async (req, res) => {
    const route = resolveProxyRoute(req.path);
    const handler = route ? routeHandlers[route] : null;

    if (!handler) {
      setCors(res, req);
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      res.status(404).json({ error: "Not found." });
      return;
    }

    await handler(req, res);
  };
}
