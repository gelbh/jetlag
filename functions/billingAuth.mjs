import { HttpsError } from "firebase-functions/v2/https";

const ANONYMOUS_BILLING_MESSAGE =
  "Sign in with email, Google, or Apple to purchase premium.";

/**
 * @param {import("firebase-functions/v2/https").CallableRequest} request
 */
export function rejectAnonymousBillingAuth(request) {
  if (request.auth?.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("failed-precondition", ANONYMOUS_BILLING_MESSAGE);
  }
}

export { ANONYMOUS_BILLING_MESSAGE };
