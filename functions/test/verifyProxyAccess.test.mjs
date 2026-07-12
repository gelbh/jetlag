import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasPremiumAccessClaim,
  isPremiumSessionMember,
  isSessionMember,
  verifyOverpassProxyAccess,
} from "../proxies/verifyProxyAccess.mjs";

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

  it("detects free and premium session membership", () => {
    assert.equal(
      isSessionMember({ memberUids: ["host", "guest"] }, "guest"),
      true,
    );
    assert.equal(
      isSessionMember({ memberUids: ["host"] }, "guest"),
      false,
    );
  });

  it("requires session membership for overpass proxy access", async () => {
    const auth = {
      async verifyIdToken() {
        return { uid: "guest" };
      },
    };

    const db = {
      collection() {
        return {
          doc(sessionId) {
            return {
              async get() {
                if (sessionId === "session-premium") {
                  return {
                    exists: true,
                    data: () => ({
                      memberUids: ["guest"],
                      tier: "premium",
                    }),
                  };
                }

                return {
                  exists: sessionId === "session-1",
                  data: () => ({ memberUids: ["guest"] }),
                };
              },
            };
          },
        };
      },
    };

    const missingSession = await verifyOverpassProxyAccess(auth, db, {
      headers: { authorization: "Bearer token" },
    });
    assert.equal(missingSession.ok, false);
    assert.equal(missingSession.status, 403);

    const member = await verifyOverpassProxyAccess(auth, db, {
      headers: {
        authorization: "Bearer token",
        "x-session-id": "session-1",
      },
    });
    assert.equal(member.ok, true);
    assert.equal(member.sessionId, "session-1");
    assert.equal(member.tier, "free");

    const premiumMember = await verifyOverpassProxyAccess(auth, db, {
      headers: {
        authorization: "Bearer token",
        "x-session-id": "session-premium",
      },
    });
    assert.equal(premiumMember.ok, true);
    assert.equal(premiumMember.tier, "premium");
  });
});
