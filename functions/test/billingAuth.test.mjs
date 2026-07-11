import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpsError } from "firebase-functions/v2/https";
import {
  ANONYMOUS_BILLING_MESSAGE,
  rejectAnonymousBillingAuth,
} from "../billingAuth.mjs";

describe("billingAuth", () => {
  it("rejects anonymous billing auth", () => {
    assert.throws(
      () =>
        rejectAnonymousBillingAuth({
          auth: {
            uid: "anon-user",
            token: {
              firebase: { sign_in_provider: "anonymous" },
            },
          },
        }),
      (error) => {
        assert.ok(error instanceof HttpsError);
        assert.equal(error.code, "failed-precondition");
        assert.equal(error.message, ANONYMOUS_BILLING_MESSAGE);
        return true;
      },
    );
  });

  it("allows permanent billing auth", () => {
    assert.doesNotThrow(() =>
      rejectAnonymousBillingAuth({
        auth: {
          uid: "permanent-user",
          token: {
            firebase: { sign_in_provider: "google.com" },
          },
        },
      }),
    );
  });
});
