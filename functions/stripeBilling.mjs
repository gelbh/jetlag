import Stripe from "stripe";
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_KEYS,
  resolveStripePriceId,
  stripeCheckoutCancelUrl,
  stripeCheckoutSuccessUrl,
  stripePortalReturnUrl,
  stripeSecretKey,
} from "./stripeConfig.mjs";
import {
  canCreatePaidPremiumSession,
  consumePremiumSessionCredit,
  mergeUserEntitlements,
  premiumSessionCredits,
  serializeEntitlementsForClient,
  stripeTimestampToFirestore,
  userEntitlementsRef,
} from "./premiumEntitlements.mjs";
import {
  buildPremiumSessionFirestoreDocument,
  parseCreatePremiumSessionInput,
} from "./premiumSessionDocument.mjs";
import { generateSessionCode } from "./sessionCodes.mjs";

const CHECKOUT_BILLING_ERROR_MESSAGE = "Couldn't start checkout. Try again.";
const PORTAL_BILLING_ERROR_MESSAGE = "Couldn't open billing portal. Try again.";

/**
 * @param {unknown} error
 */
export function isStaleStripeCustomerError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const stripeError = /** @type {{ type?: string; code?: string; message?: string }} */ (
    error
  );

  if (
    stripeError.type === "StripeInvalidRequestError" &&
    stripeError.code === "resource_missing"
  ) {
    return true;
  }

  const message = stripeError.message ?? "";
  return (
    message.includes("exists in test mode, but a live mode key") ||
    message.includes("exists in live mode, but a test mode key")
  );
}

/**
 * @param {unknown} error
 * @param {"checkout" | "portal"} context
 */
export function mapStripeBillingError(error, context) {
  if (error instanceof HttpsError) {
    return error;
  }

  const message =
    context === "portal"
      ? PORTAL_BILLING_ERROR_MESSAGE
      : CHECKOUT_BILLING_ERROR_MESSAGE;

  console.error(`Stripe billing error (${context}):`, error);
  return new HttpsError("failed-precondition", message);
}

/**
 * @param {string} secret
 */
export function createStripeClient(secret) {
  if (!secret) {
    throw new Error("Stripe secret key is not configured.");
  }
  return new Stripe(secret);
}

/**
 * @param {Stripe} stripe
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {string | null | undefined} email
 */
export async function ensureStripeCustomer(stripe, db, uid, email) {
  const userRef = userEntitlementsRef(db, uid);
  const snapshot = await userRef.get();
  const existingCustomerId =
    typeof snapshot.data()?.stripeCustomerId === "string"
      ? snapshot.data().stripeCustomerId
      : null;

  if (existingCustomerId) {
    try {
      await stripe.customers.retrieve(existingCustomerId);
      return existingCustomerId;
    } catch (error) {
      if (!isStaleStripeCustomerError(error)) {
        throw mapStripeBillingError(error, "checkout");
      }

      console.warn(
        `Replacing stale Stripe customer ${existingCustomerId} for uid ${uid}.`,
      );
    }
  }

  let customer;
  try {
    customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { firebaseUid: uid },
    });
  } catch (error) {
    throw mapStripeBillingError(error, "checkout");
  }

  await mergeUserEntitlements(db, uid, {
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 */
export async function getPremiumEntitlementsHandler(db, uid) {
  const snapshot = await userEntitlementsRef(db, uid).get();
  return serializeEntitlementsForClient(snapshot.data());
}

/**
 * @param {Stripe} stripe
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {string | null | undefined} email
 * @param {string} productKey
 */
export async function createCheckoutSessionHandler(
  stripe,
  db,
  uid,
  email,
  productKey,
) {
  if (!PREMIUM_PRODUCT_KEYS.includes(productKey)) {
    throw new HttpsError("invalid-argument", "Unknown premium product.");
  }

  const product = PREMIUM_PRODUCTS[productKey];

  try {
    const customerId = await ensureStripeCustomer(stripe, db, uid, email);
    const priceId = resolveStripePriceId(productKey);

    /** @type {Stripe.Checkout.SessionCreateParams} */
    const params = {
      mode: product.mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${stripeCheckoutSuccessUrl.value()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeCheckoutCancelUrl.value(),
      client_reference_id: uid,
      metadata: {
        firebaseUid: uid,
        productKey,
      },
    };

    if (product.mode === "subscription") {
      params.subscription_data = {
        metadata: {
          firebaseUid: uid,
          productKey,
          plan: product.plan ?? productKey,
        },
      };
    } else {
      params.payment_intent_data = {
        metadata: {
          firebaseUid: uid,
          productKey,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(params);
    if (!session.url) {
      throw new HttpsError("internal", CHECKOUT_BILLING_ERROR_MESSAGE);
    }

    return { url: session.url };
  } catch (error) {
    throw mapStripeBillingError(error, "checkout");
  }
}

/**
 * @param {Stripe} stripe
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {string | null | undefined} email
 */
export async function createBillingPortalSessionHandler(
  stripe,
  db,
  uid,
  email,
) {
  try {
    const customerId = await ensureStripeCustomer(stripe, db, uid, email);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: stripePortalReturnUrl.value(),
    });

    return { url: session.url };
  } catch (error) {
    throw mapStripeBillingError(error, "portal");
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {unknown} rawInput
 */
export async function createPremiumSessionHandler(db, uid, rawInput) {
  let input;
  try {
    input = parseCreatePremiumSessionInput(rawInput);
  } catch {
    throw new HttpsError("invalid-argument", "Invalid premium session payload.");
  }

  const userRef = userEntitlementsRef(db, uid);
  let sessionId = "";
  let sessionPayload = null;

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.data();

    if (!canCreatePaidPremiumSession(userData)) {
      throw new HttpsError(
        "permission-denied",
        "Premium unlock required. Buy a session or subscription first.",
      );
    }

    let code = generateSessionCode();
    let codeRef = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidateRef = db.collection("sessionCodes").doc(code);
      const codeSnapshot = await transaction.get(candidateRef);
      if (!codeSnapshot.exists) {
        codeRef = candidateRef;
        break;
      }
      code = generateSessionCode();
    }

    if (!codeRef) {
      throw new HttpsError(
        "resource-exhausted",
        "Could not allocate session code.",
      );
    }

    consumePremiumSessionCredit(transaction, userRef, userData);

    const createdAt = new Date().toISOString();
    sessionPayload = buildPremiumSessionFirestoreDocument(
      input,
      code,
      uid,
      createdAt,
    );
    const sessionRef = db.collection("sessions").doc();
    sessionId = sessionRef.id;

    transaction.set(sessionRef, {
      ...sessionPayload,
      createdAtServer: FieldValue.serverTimestamp(),
    });
    transaction.set(codeRef, {
      sessionId,
      hostUid: uid,
      createdAt,
    });
  });

  return {
    session: {
      id: sessionId,
      ...sessionPayload,
    },
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Stripe.Checkout.Session} session
 */
export async function applyCheckoutSessionCompleted(db, session) {
  const uid =
    session.metadata?.firebaseUid ??
    session.client_reference_id ??
    null;
  const productKey = session.metadata?.productKey;

  if (!uid || typeof productKey !== "string") {
    return;
  }

  const product = PREMIUM_PRODUCTS[productKey];
  if (!product) {
    return;
  }

  if (product.lifetime) {
    await mergeUserEntitlements(db, uid, {
      lifetimePremium: true,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : undefined,
    });
    return;
  }

  if (typeof product.credits === "number" && product.credits > 0) {
    const userRef = userEntitlementsRef(db, uid);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      const current = premiumSessionCredits(snapshot.data());
      transaction.set(
        userRef,
        {
          premiumSessionCredits: current + product.credits,
          stripeCustomerId:
            typeof session.customer === "string"
              ? session.customer
              : snapshot.data()?.stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Stripe.Subscription} subscription
 */
export async function syncSubscriptionEntitlements(db, subscription) {
  const uid = subscription.metadata?.firebaseUid;
  if (!uid) {
    return;
  }

  const plan =
    subscription.metadata?.plan === "yearly" ? "yearly" : "monthly";
  const status = subscription.status;
  const patch = {
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : undefined,
    subscription: {
      status,
      plan,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: stripeTimestampToFirestore(
        subscription.current_period_end,
      ),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === "trialing") {
    patch.trialUsedAt = FieldValue.serverTimestamp();
  }

  if (status === "canceled" || status === "incomplete_expired") {
    patch.subscription = {
      status: "canceled",
      plan,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: stripeTimestampToFirestore(
        subscription.current_period_end,
      ),
    };
  }

  await mergeUserEntitlements(db, uid, patch);
}
