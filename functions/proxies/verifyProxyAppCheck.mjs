import { getAppCheck } from "firebase-admin/app-check";

/**
 * `onRequest` ignores `enforceAppCheck` (callable-only), so the proxy pipeline verifies the
 * header itself. Log-only until `proxy_app_check` logs show legit clients pass; then flip.
 */
export const PROXY_APP_CHECK_ENFORCED = false;

/**
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {{ verifyToken?: (token: string) => Promise<unknown> }} [deps]
 * @returns {Promise<"missing" | "invalid" | "valid">}
 */
export async function checkProxyAppCheck(req, deps = {}) {
  const token = req.headers["x-firebase-appcheck"];
  if (typeof token !== "string" || token.length === 0) {
    return "missing";
  }

  const verifyToken = deps.verifyToken ?? ((value) => getAppCheck().verifyToken(value));
  try {
    await verifyToken(token);
    return "valid";
  } catch {
    return "invalid";
  }
}
