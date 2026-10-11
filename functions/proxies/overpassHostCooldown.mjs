export const OVERPASS_RATE_LIMIT_COOLDOWN_MS = 30_000;

/** @type {Map<string, number>} host → coolUntilMs */
const coolUntilByHost = new Map();

/**
 * @param {string} host
 * @param {number} [now]
 */
export function recordOverpassHostCooldown(host, now = Date.now()) {
  if (host) {
    coolUntilByHost.set(host, now + OVERPASS_RATE_LIMIT_COOLDOWN_MS);
  }
}

/**
 * @param {string} host
 * @param {number} [now]
 * @returns {boolean}
 */
export function isOverpassHostCooled(host, now = Date.now()) {
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

export function clearOverpassHostCooldownsForTests() {
  coolUntilByHost.clear();
}
