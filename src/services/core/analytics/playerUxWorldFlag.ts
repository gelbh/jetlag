/**
 * PostHog feature flag for the player UX world replace program.
 *
 * Key: `player-ux-world-v2`
 * Default: off (false) for everyone until explicitly targeted.
 *
 * Admin-first rollout (configure in PostHog UI — do not hardcode emails/UIDs here):
 * 1. Create boolean flag `player-ux-world-v2` default OFF.
 * 2. Release conditions: match admin cohort / internal allowlist first.
 * 3. Then percentage → 100%; remove flag after Wave 6 soak.
 */
export const PLAYER_UX_WORLD_FLAG_KEY = "player-ux-world-v2";

/** Test-only override; null = read PostHog / default false. */
let testOverride: boolean | null = null;

export function setPlayerUxWorldFlagForTests(value: boolean | null): void {
  testOverride = value;
}

export function readPlayerUxWorldFlag(
  isFeatureEnabled: (key: string) => boolean | undefined,
): boolean {
  if (testOverride !== null) {
    return testOverride;
  }
  return isFeatureEnabled(PLAYER_UX_WORLD_FLAG_KEY) === true;
}
