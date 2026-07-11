import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import {
  getSentryDsnSecret,
  withSentryHttpHandler,
} from "../sentry.mjs";
import {
  STRIPE_BILLING_PARAMS,
  STRIPE_BILLING_SECRETS,
  stripeSecretKey,
  stripeWebhookSecret,
} from "../stripeConfig.mjs";
import {
  createBillingPortalSessionHandler,
  createCheckoutSessionHandler,
  createPremiumSessionHandler,
  createStripeClient,
  getPremiumEntitlementsHandler,
} from "../stripeBilling.mjs";
import { rejectAnonymousBillingAuth } from "../billingAuth.mjs";
import { startPremiumTrialHandler } from "../premiumEntitlements.mjs";
import {
  RECOVER_PREMIUM_DAILY_LIMIT,
  RECOVER_PREMIUM_ROUTE,
  RECOVER_PREMIUM_WINDOW_MS,
  recoverPremiumByStripeEmailHandler,
} from "../premiumRecovery.mjs";
import { handleStripeWebhook } from "../stripeWebhook.mjs";
import { consumeRateLimit } from "../firestoreRateLimit.mjs";
import { adminDb } from "./proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

const stripeBillingOptions = {
  secrets: [...STRIPE_BILLING_SECRETS, sentryDsnSecret],
  params: STRIPE_BILLING_PARAMS,
};

export const getPremiumEntitlements = onCall(stripeBillingOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  return getPremiumEntitlementsHandler(adminDb(), request.auth.uid);
});

export const createCheckoutSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    const productKey =
      typeof request.data?.productKey === "string"
        ? request.data.productKey.trim()
        : "";

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
  },
);

export const startPremiumTrial = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    return startPremiumTrialHandler(adminDb(), request.auth.uid);
  },
);

export const createBillingPortalSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    const stripe = createStripeClient(stripeSecretKey.value());
    return createBillingPortalSessionHandler(
      stripe,
      adminDb(),
      request.auth.uid,
    );
  },
);

export const createPremiumSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    rejectAnonymousBillingAuth(request);

    return createPremiumSessionHandler(
      adminDb(),
      request.auth.uid,
      request.data,
    );
  },
);

export const recoverPremiumByStripeEmail = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
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
      throw new HttpsError(
        "resource-exhausted",
        "Too many recovery attempts. Try again tomorrow.",
      );
    }

    const stripe = createStripeClient(stripeSecretKey.value());
    return recoverPremiumByStripeEmailHandler(
      stripe,
      adminDb(),
      request.auth.uid,
      request.auth.token.email,
      request.auth.token.email_verified,
    );
  },
);

export const stripeWebhook = onRequest(
  {
    secrets: [stripeWebhookSecret, sentryDsnSecret],
  },
  withSentryHttpHandler(async (req, res) => {
    await handleStripeWebhook(
      adminDb(),
      stripeWebhookSecret.value(),
      req,
      res,
    );
  }),
);
