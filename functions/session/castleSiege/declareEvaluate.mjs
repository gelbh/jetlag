/** Mirror of client `declareSiege.evaluateDeclare` for Functions (no TS import). */

export function normalizeNamedAnchor(name) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}

/**
 * @param {{
 *   declaringTeam: string,
 *   namedAnchor: string,
 *   distanceMeters: number,
 *   breachToleranceMeters: number,
 * }} input
 * @returns {"breach"|"misfire"}
 */
export function evaluateDeclare(input) {
  const name = normalizeNamedAnchor(input.namedAnchor);
  const sealedName = normalizeNamedAnchor(input.sealedAnchorName ?? "");
  if (
    !name ||
    !sealedName ||
    name.toLowerCase() !== sealedName.toLowerCase() ||
    !Number.isFinite(input.distanceMeters) ||
    input.distanceMeters < 0
  ) {
    return "misfire";
  }
  return input.distanceMeters <= input.breachToleranceMeters ? "breach" : "misfire";
}
