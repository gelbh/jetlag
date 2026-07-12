const ALLOWED_ORIGINS = new Set([
  "https://jetlag.gelbhart.dev",
  "http://localhost:5173",
]);

/**
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {import("firebase-functions/v2/https").Request} [req]
 */
export function setCors(res, req) {
  const origin = req?.headers?.origin;
  if (typeof origin === "string" && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  } else if (!origin) {
    res.set("Access-Control-Allow-Origin", "https://jetlag.gelbhart.dev");
  }

  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Session-Id, X-Firebase-AppCheck",
  );
}
