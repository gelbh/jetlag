import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasPremiumAccessClaim,
  isPremiumSessionMember,
} from "../verifyProxyAccess.mjs";

describe("verifyProxyAccess helpers", () => {
  it("detects premium access claims", () => {
    assert.equal(hasPremiumAccessClaim({ access: true }), true);
    assert.equal(hasPremiumAccessClaim({ access: false }), false);
    assert.equal(hasPremiumAccessClaim({}), false);
  });

  it("detects premium session membership", () => {
    assert.equal(
      isPremiumSessionMember(
        { tier: "premium", memberUids: ["host", "guest"] },
        "guest",
      ),
      true,
    );
    assert.equal(
      isPremiumSessionMember(
        { tier: "free", memberUids: ["host", "guest"] },
        "guest",
      ),
      false,
    );
    assert.equal(
      isPremiumSessionMember(
        { tier: "premium", memberUids: ["host"] },
        "guest",
      ),
      false,
    );
  });
});
