import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasPremiumAccessClaim,
  isPremiumSessionMember,
} from "../verifyProxyAccess.mjs";

describe("index proxy access smoke", () => {
  it("rejects non-premium members for premium-only proxy paths", () => {
    assert.equal(
      isPremiumSessionMember(
        { tier: "free", memberUids: ["host", "guest"] },
        "guest",
      ),
      false,
    );
    assert.equal(hasPremiumAccessClaim({ access: true }), true);
  });
});
