/** Same dist source as runtime `Sentry.init({ dist })` (CI sets `VITE_SENTRY_RELEASE_DIST`). */
export function resolveSentryReleaseDist(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const dist = env.VITE_SENTRY_RELEASE_DIST || env.SENTRY_RELEASE_DIST;
  if (typeof dist !== "string") {
    return undefined;
  }
  const trimmed = dist.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
