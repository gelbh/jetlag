import type { SessionMode } from "./mode";

export type CastleSiegeAskResolvePath = "honor" | "oracle";

export function resolveAskPath(mode: SessionMode | null | undefined): CastleSiegeAskResolvePath {
  return mode === "castleSiege" ? "oracle" : "honor";
}
