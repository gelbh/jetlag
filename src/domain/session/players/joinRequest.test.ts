import { describe, expect, it } from "vitest";
import {
  JOIN_REQUEST_TTL_MS,
  computeJoinRequestExpiresAt,
  isJoinRequestExpired,
} from "./joinRequest";

describe("joinRequest", () => {
  it("expiresAt is createdAt + 10 minutes ISO", () => {
    const created = Date.parse("2026-08-03T12:00:00.000Z");
    expect(computeJoinRequestExpiresAt(created)).toBe(
      new Date(created + JOIN_REQUEST_TTL_MS).toISOString(),
    );
  });

  it("treats pending past expiresAt as expired", () => {
    expect(
      isJoinRequestExpired(
        {
          status: "pending",
          expiresAt: "2026-08-03T12:00:00.000Z",
        },
        Date.parse("2026-08-03T12:10:01.000Z"),
      ),
    ).toBe(true);
  });
});
