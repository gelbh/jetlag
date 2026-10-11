import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { rejectAnonymousBillingAuth } from "../billing/billingAuth.mjs";
import { startPremiumTrialHandler } from "../billing/premiumEntitlements.mjs";
import {
  RECOVER_PREMIUM_DAILY_LIMIT,
  RECOVER_PREMIUM_ROUTE,
  RECOVER_PREMIUM_WINDOW_MS,
  recoverPremiumByStripeEmailHandler,
} from "../billing/premiumRecovery.mjs";
import {
  createBillingPortalSessionHandler,
  createCheckoutSessionHandler,
  createPremiumSessionHandler,
  createStripeClient,
  getPremiumEntitlementsHandler,
} from "../billing/stripeBilling.mjs";
import {
  STRIPE_BILLING_PARAMS,
  STRIPE_BILLING_SECRETS,
  stripeSecretKey,
  stripeWebhookSecret,
} from "../billing/stripeConfig.mjs";
import { handleStripeWebhook } from "../billing/stripeWebhook.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";
import { withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { posthogProjectApiKey } from "../lib/posthog.mjs";
import { adminDb } from "./proxyShared.mjs";

const stripeBillingOptions = {
  secrets: [...STRIPE_BILLING_SECRETS, posthogProjectApiKey],
  params: STRIPE_BILLING_PARAMS,
};

export const getPremiumEntitlements = onCall(
  stripeBillingOptions,
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    return getPremiumEntitlementsHandler(adminDb(), request.auth.uid);
  }),
);

export const createCheckoutSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    const productKey =
      typeof request.data?.productKey === "string" ? request.data.productKey.trim() : "";

    if (!productKey) {
      throw new HttpsError("invalid-argument", "Product key required.");
    }

    const stripe = createStripeClient(stripeSecretKey.value());
    return createCheckoutSessionHandler(
      stripe,
      adminDb(),
      request.auth.uid,
      request.auth.token.email,
      productKey,
    );
  }),
);

export const startPremiumTrial = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    return startPremiumTrialHandler(adminDb(), request.auth.uid);
  }),
);

export const createBillingPortalSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    const stripe = createStripeClient(stripeSecretKey.value());
    return createBillingPortalSessionHandler(
      stripe,
      adminDb(),
      request.auth.uid,
      request.auth.token.email,
    );
  }),
);

export const createPremiumSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    return createPremiumSessionHandler(adminDb(), request.auth.uid, request.data);
  }),
);

export const recoverPremiumByStripeEmail = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    const rateLimit = await consumeRateLimit(adminDb(), {
      route: RECOVER_PREMIUM_ROUTE,
      uid: request.auth.uid,
      limit: RECOVER_PREMIUM_DAILY_LIMIT,
      windowMs: RECOVER_PREMIUM_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      throw new HttpsError("resource-exhausted", "Too many recovery attempts. Try again tomorrow.");
    }

    const stripe = createStripeClient(stripeSecretKey.value());
    return recoverPremiumByStripeEmailHandler(
      stripe,
      adminDb(),
      request.auth.uid,
      request.auth.token.email,
      request.auth.token.email_verified,
    );
  }),
);

// Stripe webhooks authenticate via signature verification only — App Check is not applicable.
export const stripeWebhook = onRequest(
  {
    secrets: [stripeWebhookSecret, posthogProjectApiKey],
  },
  withFunctionsExceptionHandler(async (req, res) => {
    await handleStripeWebhook(adminDb(), stripeWebhookSecret.value(), req, res, {
      posthogApiKey: posthogProjectApiKey.value(),
    });
  }),
);
