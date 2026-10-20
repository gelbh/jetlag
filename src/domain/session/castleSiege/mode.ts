export type SessionMode = "classic" | "castleSiege";

export function sessionModeOf(session: { mode?: SessionMode } | null | undefined): SessionMode {
  return session?.mode === "castleSiege" ? "castleSiege" : "classic";
}

export function isCastleSiegeSession(session: { mode?: SessionMode } | null | undefined): boolean {
  return sessionModeOf(session) === "castleSiege";
}
