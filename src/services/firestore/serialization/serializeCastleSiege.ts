import type { MultiPolygon, Polygon } from "geojson";
import { parseRegionPackId } from "@/domain/regions/regionPack";
import type { CastleSiegeArena, CastleSiegeArenaSource } from "@/domain/session/castleSiege/arena";
import {
  type CastleSiegeDials,
  normalizeCastleSiegeDials,
  parseCastleSiegeDials,
} from "@/domain/session/castleSiege/dials";
import type {
  CastleSiegeBorderLine,
  CastleSiegeCoinAssignment,
  CastleSiegeHalfSide,
  CastleSiegePlayingTeam,
} from "@/domain/session/castleSiege/pregame";
import {
  isSealCipherEnvelopeV1,
  type SealCipherEnvelopeV1,
} from "@/domain/session/castleSiege/sealCipher";
import {
  assertNoNestedArrays,
  deserializeGameAreaFromFirestore,
  serializeGameAreaForFirestore,
  stripUndefinedValues,
} from "./shared";

const ARENA_SOURCES = new Set<CastleSiegeArenaSource>(["gameArea", "regionPack", "drawn"]);
const HALF_SIDES = new Set<CastleSiegeHalfSide>(["left", "right"]);
const PLAYING_TEAMS = new Set<CastleSiegePlayingTeam>(["teamA", "teamB"]);

export type CastleSiegeSetupPatch = {
  arena?: CastleSiegeArena;
  border?: CastleSiegeBorderLine;
  neutralBelt?: Polygon | MultiPolygon;
  dials?: CastleSiegeDials;
  coinAssignment?: CastleSiegeCoinAssignment;
};

export type TeamSealHashRecord = {
  teamId: CastleSiegePlayingTeam;
  hash: string;
  sealedByUid: string;
  sealedAt: string;
};

export type TeamSealCipherRecord = TeamSealHashRecord & {
  ciphertext: SealCipherEnvelopeV1;
};

const SEAL_HASH_HEX = /^[0-9a-f]{64}$/;

/** True plaintext coords/phrase — never written by clients (V3). */
export const TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS = [
  "anchorName",
  "lat",
  "lng",
  "secretPhrase",
  "revealedAnchor",
] as const;

/**
 * Fields that must never be enemy-readable (V3).
 * Includes ciphertext (own team / referee / host / Functions only).
 */
export const TEAM_SEAL_PLAINTEXT_KEYS = [
  ...TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS,
  "ciphertext",
] as const;

export function isValidSealHash(hash: string): boolean {
  return SEAL_HASH_HEX.test(hash);
}

export function serializeCastleSiegeArenaForFirestore(
  arena: CastleSiegeArena,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    polygon: serializeGameAreaForFirestore(arena.polygon),
    source: arena.source,
    regionPackId: arena.regionPackId,
    subregionId: arena.subregionId,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload, "arena");
  return payload;
}

export function deserializeCastleSiegeArenaFromFirestore(
  value: unknown,
): CastleSiegeArena | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!ARENA_SOURCES.has(record.source as CastleSiegeArenaSource)) {
    return undefined;
  }
  try {
    const polygon = deserializeGameAreaFromFirestore(record.polygon);
    const regionPackId = parseRegionPackId(record.regionPackId);
    return {
      polygon,
      source: record.source as CastleSiegeArenaSource,
      ...(regionPackId !== undefined ? { regionPackId } : {}),
      ...(typeof record.subregionId === "string" ? { subregionId: record.subregionId } : {}),
    };
  } catch {
    return undefined;
  }
}

export function serializeGeometryJsonForFirestore(geometry: object): { geometryJson: string } {
  const payload = { geometryJson: JSON.stringify(geometry) };
  assertNoNestedArrays(payload, "geometry");
  return payload;
}

export function deserializeBorderFromFirestore(value: unknown): CastleSiegeBorderLine | undefined {
  const geometry = parseGeometryJson(value);
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return undefined;
  }
  return geometry as CastleSiegeBorderLine;
}

export function deserializeNeutralBeltFromFirestore(
  value: unknown,
): Polygon | MultiPolygon | undefined {
  const geometry = parseGeometryJson(value);
  if (
    !geometry ||
    (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") ||
    !Array.isArray(geometry.coordinates)
  ) {
    return undefined;
  }
  return geometry as Polygon | MultiPolygon;
}

export function parseCastleSiegeCoinAssignment(
  value: unknown,
): CastleSiegeCoinAssignment | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!HALF_SIDES.has(record.teamA as CastleSiegeHalfSide)) {
    return undefined;
  }
  if (!HALF_SIDES.has(record.teamB as CastleSiegeHalfSide)) {
    return undefined;
  }
  if (record.teamA === record.teamB) {
    return undefined;
  }
  return {
    teamA: record.teamA as CastleSiegeHalfSide,
    teamB: record.teamB as CastleSiegeHalfSide,
  };
}

export function castleSiegeSetupPatchToFirestore(
  patch: CastleSiegeSetupPatch,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (patch.arena) {
    payload.arena = serializeCastleSiegeArenaForFirestore(patch.arena);
  }
  if (patch.border) {
    payload.border = serializeGeometryJsonForFirestore(patch.border);
  }
  if (patch.neutralBelt) {
    payload.neutralBelt = serializeGeometryJsonForFirestore(patch.neutralBelt);
  }
  if (patch.dials) {
    payload.dials = normalizeCastleSiegeDials(patch.dials);
  }
  if (patch.coinAssignment) {
    const coin = parseCastleSiegeCoinAssignment(patch.coinAssignment);
    if (!coin) {
      throw new Error("Invalid Castle Siege coin assignment.");
    }
    payload.coinAssignment = coin;
  }

  assertNoNestedArrays(payload, "castleSiegeSetup");
  return payload;
}

export function parseCastleSiegeSetupFromDocument(document: Record<string, unknown>): {
  arena?: CastleSiegeArena;
  border?: CastleSiegeBorderLine;
  neutralBelt?: Polygon | MultiPolygon;
  dials?: CastleSiegeDials;
  coinAssignment?: CastleSiegeCoinAssignment;
} {
  const arena = deserializeCastleSiegeArenaFromFirestore(document.arena);
  const border = deserializeBorderFromFirestore(document.border);
  const neutralBelt = deserializeNeutralBeltFromFirestore(document.neutralBelt);
  const dials = parseCastleSiegeDials(document.dials);
  const coinAssignment = parseCastleSiegeCoinAssignment(document.coinAssignment);
  return {
    ...(arena !== undefined ? { arena } : {}),
    ...(border !== undefined ? { border } : {}),
    ...(neutralBelt !== undefined ? { neutralBelt } : {}),
    ...(dials !== undefined ? { dials } : {}),
    ...(coinAssignment !== undefined ? { coinAssignment } : {}),
  };
}

function assertNoClientPlaintextSealKeys(data: Record<string, unknown>): void {
  for (const key of TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS) {
    if (key in data) {
      throw new Error(`Team seal docs must not include plaintext field "${key}".`);
    }
  }
}

function serializeSealCipherEnvelope(envelope: SealCipherEnvelopeV1): SealCipherEnvelopeV1 {
  if (!isSealCipherEnvelopeV1(envelope)) {
    throw new Error("Seal ciphertext must be a V1 AES-GCM envelope.");
  }
  return {
    v: 1,
    alg: envelope.alg,
    keyId: envelope.keyId,
    iv: envelope.iv,
    ciphertext: envelope.ciphertext,
    wrappedKey: envelope.wrappedKey,
    wrapIv: envelope.wrapIv,
  };
}

export function buildTeamSealHashDocument(
  seal: Omit<TeamSealHashRecord, "teamId">,
): Record<string, unknown> {
  if (!isValidSealHash(seal.hash)) {
    throw new Error("Seal hash must be a lowercase SHA-256 hex string.");
  }
  if (!seal.sealedByUid || !seal.sealedAt) {
    throw new Error("Seal hash doc requires sealedByUid and sealedAt.");
  }

  const payload = {
    hash: seal.hash,
    sealedByUid: seal.sealedByUid,
    sealedAt: seal.sealedAt,
  };
  assertNoNestedArrays(payload, "teamSeal");
  return payload;
}

export function buildTeamSealCipherDocument(
  seal: Omit<TeamSealCipherRecord, "teamId">,
): Record<string, unknown> {
  const payload = {
    ...buildTeamSealHashDocument(seal),
    ciphertext: serializeSealCipherEnvelope(seal.ciphertext),
  };
  assertNoClientPlaintextSealKeys(payload);
  assertNoNestedArrays(payload, "teamSeal");
  return payload;
}

export function deserializeTeamSealHashFromFirestore(
  teamId: string,
  data: Record<string, unknown>,
): TeamSealHashRecord | null {
  if (!PLAYING_TEAMS.has(teamId as CastleSiegePlayingTeam)) {
    return null;
  }
  if (typeof data.hash !== "string" || !isValidSealHash(data.hash)) {
    return null;
  }
  if (typeof data.sealedByUid !== "string" || typeof data.sealedAt !== "string") {
    return null;
  }
  return {
    teamId: teamId as CastleSiegePlayingTeam,
    hash: data.hash,
    sealedByUid: data.sealedByUid,
    sealedAt: data.sealedAt,
  };
}

export function deserializeTeamSealCipherFromFirestore(
  teamId: string,
  data: Record<string, unknown>,
): TeamSealCipherRecord | null {
  for (const key of TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS) {
    if (key in data) {
      return null;
    }
  }
  const base = deserializeTeamSealHashFromFirestore(teamId, data);
  if (!base || !isSealCipherEnvelopeV1(data.ciphertext)) {
    return null;
  }
  return {
    ...base,
    ciphertext: serializeSealCipherEnvelope(data.ciphertext),
  };
}

function parseGeometryJson(value: unknown): { type?: string; coordinates?: unknown } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.geometryJson !== "string") {
    return null;
  }
  try {
    return JSON.parse(record.geometryJson) as { type?: string; coordinates?: unknown };
  } catch {
    return null;
  }
}
