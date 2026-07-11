/**
 * App Check prep: log missing tokens until Firebase console enforcement is enabled.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {string} route
 */
export function logMissingAppCheckToken(req, route) {
  const token = req.headers["x-firebase-appcheck"];
  if (typeof token !== "string" || token.length === 0) {
    console.warn(`App Check token missing on ${route} proxy request.`);
  }
}
