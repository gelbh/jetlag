export const OVERPASS_RATE_LIMIT_COOLDOWN_MS = 30_000;

const coolUntilByHost = new Map<string, number>();

export function recordOverpassHostCooldown(host: string, now: number = Date.now()): void {
  if (host) {
    coolUntilByHost.set(host, now + OVERPASS_RATE_LIMIT_COOLDOWN_MS);
  }
}

export function isOverpassHostCooled(host: string, now: number = Date.now()): boolean {
  const until = coolUntilByHost.get(host);
  if (until == null) {
    return false;
  }
  if (now >= until) {
    coolUntilByHost.delete(host);
    return false;
  }
  return true;
}

export function clearOverpassHostCooldownsForTests(): void {
  coolUntilByHost.clear();
}
