import { getAppCheck } from "firebase-admin/app-check";

/**
 * `onRequest` ignores `enforceAppCheck` (callable-only), so the proxy pipeline verifies the
 * header itself. Log-only until `proxy_app_check` logs show legit clients pass; then flip.
 */
export const PROXY_APP_CHECK_ENFORCED = false;

export async function requireProxyAppCheck(
  req,
  res,
  {
    route,
    enforce = PROXY_APP_CHECK_ENFORCED,
    verifyToken = (value) => getAppCheck().verifyToken(value),
  } = {},
) {
  const token = req.headers["x-firebase-appcheck"];
  let result = "valid";
  let code = null;
  if (typeof token !== "string" || token.length === 0) {
    result = "missing";
  } else {
    try {
      await verifyToken(token);
    } catch (error) {
      result = "invalid";
      code = error?.code ?? error?.name ?? null;
    }
  }
  if (result === "valid") {
    return true;
  }

  console.warn(JSON.stringify({ type: "proxy_app_check", result, code, route, enforced: enforce }));
  if (enforce) {
    res.status(401).json({ error: "App Check required." });
    return false;
  }
  return true;
}
