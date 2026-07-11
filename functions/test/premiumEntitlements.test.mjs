import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCreatePaidPremiumSession,
  hasUnlimitedPremiumEntitlement,
  premiumSessionCredits,
  serializeEntitlementsForClient,
} from "../premiumEntitlements.mjs";

describe("premiumEntitlements", () => {
  it("detects unlimited entitlement from lifetime flag", () => {
    assert.equal(hasUnlimitedPremiumEntitlement({ lifetimePremium: true }), true);
    assert.equal(canCreatePaidPremiumSession({ lifetimePremium: true }), true);
  });

  it("detects active and trialing subscriptions", () => {
    assert.equal(
      hasUnlimitedPremiumEntitlement({
        subscription: { status: "active" },
      }),
      true,
    );
    assert.equal(
      hasUnlimitedPremiumEntitlement({
        subscription: { status: "trialing" },
      }),
      true,
    );
    assert.equal(
      hasUnlimitedPremiumEntitlement({
        subscription: { status: "canceled" },
      }),
      false,
    );
  });

  it("counts session credits", () => {
    assert.equal(premiumSessionCredits({ premiumSessionCredits: 2.8 }), 2);
    assert.equal(premiumSessionCredits({ premiumSessionCredits: 0 }), 0);
    assert.equal(canCreatePaidPremiumSession({ premiumSessionCredits: 1 }), true);
  });

  it("serializes client entitlements", () => {
    const payload = serializeEntitlementsForClient({
      premiumSessionCredits: 3,
      lifetimePremium: false,
      subscription: {
        status: "active",
        plan: "monthly",
      },
    });

    assert.equal(payload.premiumSessionCredits, 3);
    assert.equal(payload.canCreatePremium, true);
    assert.equal(payload.hasUnlimitedPremium, true);
  });
});
