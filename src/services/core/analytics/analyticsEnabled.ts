/** posthog-free so light UI (consent banner) can gate without loading analytics. */
export function shouldEnableAnalytics(env: { prod: boolean; mode: string }): boolean {
  return env.prod && env.mode !== "test";
}
