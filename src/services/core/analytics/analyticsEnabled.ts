export function shouldEnableAnalytics(env: { prod: boolean; mode: string }): boolean {
  return env.prod && env.mode !== "test";
}
