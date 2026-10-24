import { describe, expect, it } from "vitest";
import { arenaFromGameArea } from "@/domain/session/castleSiege/arena";
import { DEFAULT_CASTLE_SIEGE_DIALS } from "@/domain/session/castleSiege/dials";
import {
  encryptSealPayload,
  SEAL_WRAP_KEY_ID_TEST,
  TEST_SEAL_WRAP_KEY_BYTES,
} from "@/domain/session/castleSiege/sealCipher";
import { canonicalSealPayload } from "@/domain/session/castleSiege/sealHash";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import {
  buildTeamSealCipherDocument,
  buildTeamSealHashDocument,
  castleSiegeSetupPatchToFirestore,
  deserializeTeamSealCipherFromFirestore,
  deserializeTeamSealHashFromFirestore,
  parseCastleSiegeSetupFromDocument,
  TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS,
  TEAM_SEAL_PLAINTEXT_KEYS,
} from "./serializeCastleSiege";

const SAMPLE_BORDER = {
  type: "LineString" as const,
  coordinates: [
    [-6.3, 53.33],
    [-6.2, 53.37],
  ],
};

const SAMPLE_BELT = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-6.28, 53.34],
      [-6.22, 53.34],
      [-6.22, 53.36],
      [-6.28, 53.36],
      [-6.28, 53.34],
    ],
  ],
};

const SAMPLE_HASH = "a".repeat(64);

describe("castleSiegeSetupPatchToFirestore", () => {
  it("serializes arena, border, belt, dials, and coin without nested arrays", () => {
    const arena = arenaFromGameArea(DUBLIN_CITY_GAME_AREA);
    const payload = castleSiegeSetupPatchToFirestore({
      arena,
      border: SAMPLE_BORDER,
      neutralBelt: SAMPLE_BELT,
      dials: DEFAULT_CASTLE_SIEGE_DIALS,
      coinAssignment: { teamA: "left", teamB: "right" },
    });

    expect(payload.arena).toMatchObject({
      source: "gameArea",
      polygon: expect.objectContaining({
        geometryJson: expect.any(String),
        south: expect.any(Number),
      }),
    });
    expect(payload.border).toEqual({ geometryJson: JSON.stringify(SAMPLE_BORDER) });
    expect(payload.neutralBelt).toEqual({ geometryJson: JSON.stringify(SAMPLE_BELT) });
    expect(payload.dials).toEqual(DEFAULT_CASTLE_SIEGE_DIALS);
    expect(payload.coinAssignment).toEqual({ teamA: "left", teamB: "right" });
  });

  it("round-trips through parseCastleSiegeSetupFromDocument", () => {
    const arena = arenaFromGameArea(DUBLIN_CITY_GAME_AREA);
    const payload = castleSiegeSetupPatchToFirestore({
      arena,
      border: SAMPLE_BORDER,
      neutralBelt: SAMPLE_BELT,
      dials: { ...DEFAULT_CASTLE_SIEGE_DIALS, maxRounds: 9 },
      coinAssignment: { teamA: "right", teamB: "left" },
    });

    const restored = parseCastleSiegeSetupFromDocument(payload);
    expect(restored.arena?.source).toBe("gameArea");
    expect(restored.arena?.polygon).toEqual(DUBLIN_CITY_GAME_AREA);
    expect(restored.border).toEqual(SAMPLE_BORDER);
    expect(restored.neutralBelt).toEqual(SAMPLE_BELT);
    expect(restored.dials?.maxRounds).toBe(9);
    expect(restored.coinAssignment).toEqual({ teamA: "right", teamB: "left" });
  });
});

describe("buildTeamSealHashDocument", () => {
  it("writes hash-only fields", () => {
    expect(
      buildTeamSealHashDocument({
        hash: SAMPLE_HASH,
        sealedByUid: "uid-a",
        sealedAt: "2026-10-20T12:00:00.000Z",
      }),
    ).toEqual({
      hash: SAMPLE_HASH,
      sealedByUid: "uid-a",
      sealedAt: "2026-10-20T12:00:00.000Z",
    });
  });

  it("rejects non-hex hashes and lists plaintext keys for rules parity", () => {
    expect(() =>
      buildTeamSealHashDocument({
        hash: "not-a-hash",
        sealedByUid: "uid-a",
        sealedAt: "2026-10-20T12:00:00.000Z",
      }),
    ).toThrow(/SHA-256/);
    expect(TEAM_SEAL_PLAINTEXT_KEYS).toEqual(
      expect.arrayContaining(["anchorName", "lat", "lng", "secretPhrase", "ciphertext"]),
    );
  });

  it("deserializes a hash-only team seal doc", () => {
    expect(
      deserializeTeamSealHashFromFirestore("teamA", {
        hash: SAMPLE_HASH,
        sealedByUid: "uid-a",
        sealedAt: "2026-10-20T12:00:00.000Z",
      }),
    ).toEqual({
      teamId: "teamA",
      hash: SAMPLE_HASH,
      sealedByUid: "uid-a",
      sealedAt: "2026-10-20T12:00:00.000Z",
    });
  });
});

describe("buildTeamSealCipherDocument", () => {
  it("round-trips hash + ciphertext envelope without plaintext keys", async () => {
    const ciphertext = await encryptSealPayload(
      canonicalSealPayload("Castle", 53.35, -6.26, "s3cret"),
      {
        wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
        keyId: SEAL_WRAP_KEY_ID_TEST,
      },
    );

    const payload = buildTeamSealCipherDocument({
      hash: SAMPLE_HASH,
      sealedByUid: "uid-a",
      sealedAt: "2026-10-20T12:00:00.000Z",
      ciphertext,
    });

    expect(payload).toEqual({
      hash: SAMPLE_HASH,
      sealedByUid: "uid-a",
      sealedAt: "2026-10-20T12:00:00.000Z",
      ciphertext,
    });
    for (const key of TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS) {
      expect(payload).not.toHaveProperty(key);
    }

    expect(deserializeTeamSealCipherFromFirestore("teamA", payload)).toEqual({
      teamId: "teamA",
      hash: SAMPLE_HASH,
      sealedByUid: "uid-a",
      sealedAt: "2026-10-20T12:00:00.000Z",
      ciphertext,
    });
  });

  it("rejects invalid envelopes and docs that still carry plaintext", async () => {
    expect(() =>
      buildTeamSealCipherDocument({
        hash: SAMPLE_HASH,
        sealedByUid: "uid-a",
        sealedAt: "2026-10-20T12:00:00.000Z",
        ciphertext: { v: 1 } as never,
      }),
    ).toThrow(/envelope/);

    expect(
      deserializeTeamSealCipherFromFirestore("teamA", {
        hash: SAMPLE_HASH,
        sealedByUid: "uid-a",
        sealedAt: "2026-10-20T12:00:00.000Z",
        ciphertext: await encryptSealPayload("x", {
          wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
          keyId: SEAL_WRAP_KEY_ID_TEST,
        }),
        secretPhrase: "leaked",
      }),
    ).toBeNull();
  });

  it("still lists ciphertext among enemy-restricted keys for rules parity", () => {
    expect(TEAM_SEAL_PLAINTEXT_KEYS).toEqual(
      expect.arrayContaining([...TEAM_SEAL_CLIENT_FORBIDDEN_PLAINTEXT_KEYS, "ciphertext"]),
    );
  });
});
