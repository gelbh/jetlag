import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import {
  canCreatePaidPremiumSession,
  consumePremiumSessionCredit,
  hasUnlimitedPremiumEntitlement,
  isAppPremiumTrialActive,
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

  it("detects app-managed free trials", () => {
    const future = Timestamp.fromMillis(Date.now() + 86_400_000);
    const past = Timestamp.fromMillis(Date.now() - 86_400_000);

    assert.equal(
      isAppPremiumTrialActive({
        trialEndsAt: future,
      }),
      true,
    );
    assert.equal(
      hasUnlimitedPremiumEntitlement({
        trialEndsAt: future,
      }),
      true,
    );
    assert.equal(
      isAppPremiumTrialActive({
        trialEndsAt: past,
      }),
      false,
    );
    assert.equal(
      canCreatePaidPremiumSession({
        trialEndsAt: future,
      }),
      true,
    );
  });

  it("keeps session pack credits while unlimited hosting is active", () => {
    const future = Timestamp.fromMillis(Date.now() + 86_400_000);
    const userData = {
      premiumSessionCredits: 3,
      trialEndsAt: future,
    };

    assert.equal(premiumSessionCredits(userData), 3);
    assert.equal(hasUnlimitedPremiumEntitlement(userData), true);

    const transaction = {
      sets: [],
      set(ref, patch, options) {
        this.sets.push({ ref, patch, options });
      },
    };

    consumePremiumSessionCredit(transaction, { id: "user-1" }, userData);
    assert.equal(transaction.sets.length, 0);
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
