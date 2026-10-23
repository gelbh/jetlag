import type { StandoffTeamId } from "./standoffTurn";

/** Declare Siege / Last Word / Dual / Dusk pure helpers (no coords leaked). */

export type DeclareOutcome = "breach" | "misfire";

export type DeclareSiegeInput = {
  declaringTeam: StandoffTeamId;
  namedAnchor: string;
  /** Sealed landmark name from decrypt (Functions-only). Must match namedAnchor. */
  sealedAnchorName: string;
  /** Haversine (or planar) meters from named guess to sealed anchor — Functions-only. */
  distanceMeters: number;
  breachToleranceMeters: number;
};

export function normalizeNamedAnchor(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function evaluateDeclare(input: DeclareSiegeInput): DeclareOutcome {
  const name = normalizeNamedAnchor(input.namedAnchor);
  const sealedName = normalizeNamedAnchor(input.sealedAnchorName);
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

export type DuskGuess = {
  teamId: StandoffTeamId;
  /** Distance meters from guess to true anchor (Functions-only). */
  distanceMeters: number;
};

/**
 * Closer guess wins 15 min Siege head start. Tie → dualSiege (both attack).
 * Never returns coordinates.
 */
export function scoreDuskGuesses(
  guesses: [DuskGuess, DuskGuess],
): { kind: "headStart"; teamId: StandoffTeamId; headStartSeconds: number } | { kind: "dualSiege" } {
  const [a, b] = guesses;
  if (!Number.isFinite(a.distanceMeters) || !Number.isFinite(b.distanceMeters)) {
    return { kind: "dualSiege" };
  }
  if (a.distanceMeters === b.distanceMeters) {
    return { kind: "dualSiege" };
  }
  const winner = a.distanceMeters < b.distanceMeters ? a.teamId : b.teamId;
  return { kind: "headStart", teamId: winner, headStartSeconds: 15 * 60 };
}

export type EndgameKind = "lastWord" | "dualSiege" | "dusk";

export function endgameAfterBreach(opts: {
  alreadyBreachedBy: StandoffTeamId | null;
  thisBreachBy: StandoffTeamId;
}): EndgameKind | "continueLastWord" {
  if (opts.alreadyBreachedBy === null) {
    return "continueLastWord";
  }
  if (opts.alreadyBreachedBy === opts.thisBreachBy) {
    return "dusk";
  }
  return "dualSiege";
}
