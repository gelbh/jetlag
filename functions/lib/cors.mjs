const PRODUCTION_ORIGIN = "https://jetlag.gelbhart.dev";

/** Vite default 5173 plus remapped local stacks (dev-local next-free ports). */
const LOCAL_VITE_PORT_MIN = 5173;
const LOCAL_VITE_PORT_MAX = 5200;

/**
 * @param {string} origin
 * @returns {boolean}
 */
function isAllowedLocalViteOrigin(origin) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") {
    return false;
  }
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return false;
  }
  const port = Number(url.port || "80");
  return Number.isInteger(port) && port >= LOCAL_VITE_PORT_MIN && port <= LOCAL_VITE_PORT_MAX;
}

/**
 * @param {string} origin
 * @returns {boolean}
 */
function isAllowedOrigin(origin) {
  return origin === PRODUCTION_ORIGIN || isAllowedLocalViteOrigin(origin);
}

/**
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {import("firebase-functions/v2/https").Request} [req]
 */
export function setCors(res, req) {
  const origin = req?.headers?.origin;
  if (typeof origin === "string" && isAllowedOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  } else if (!origin) {
    res.set("Access-Control-Allow-Origin", PRODUCTION_ORIGIN);
  }

  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Session-Id, X-Firebase-AppCheck",
  );
}
