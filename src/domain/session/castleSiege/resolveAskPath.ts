import type { SessionMode } from "./mode";

/** Classic (and absent mode) keeps honor typing; Castle Siege uses the Functions oracle. */
export type CastleSiegeAskResolvePath = "honor" | "oracle";

export function resolveAskPath(mode: SessionMode | null | undefined): CastleSiegeAskResolvePath {
  return mode === "castleSiege" ? "oracle" : "honor";
}
