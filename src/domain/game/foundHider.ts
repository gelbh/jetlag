import type { SessionRecord } from "../map/annotations";

export type GameOutcome = "found" | "ended_early" | "abandoned";

export function isFoundHiderPending(
  session:
    | Pick<SessionRecord, "foundConfirmedAt" | "foundRequestedAt">
    | null
    | undefined,
): boolean {
  return (
    typeof session?.foundRequestedAt === "string" &&
    typeof session?.foundConfirmedAt !== "string"
  );
}

export function isRoundComplete(
  session:
    | Pick<SessionRecord, "foundConfirmedAt" | "gameOutcome">
    | null
    | undefined,
): boolean {
  return (
    typeof session?.foundConfirmedAt === "string" ||
    session?.gameOutcome === "ended_early" ||
    session?.gameOutcome === "abandoned"
  );
}

export function foundHiderBlocked(
  session:
    | Pick<
        SessionRecord,
        "foundRequestedAt" | "foundConfirmedAt" | "gameOutcome"
      >
    | null
    | undefined,
): boolean {
  return isFoundHiderPending(session) || isRoundComplete(session);
}
