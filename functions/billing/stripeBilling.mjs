import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { buildInitialRoleSecrets } from "../session/roleGateShared.mjs";
import { generateSessionCode } from "../session/sessionCodes.mjs";
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
import {
  PREMIUM_PRODUCT_KEYS,
  PREMIUM_PRODUCTS,
  resolveStripePriceId,
  stripeCheckoutCancelUrl,
  stripeCheckoutSuccessUrl,
  stripePortalReturnUrl,
} from "./stripeConfig.mjs";

const CHECKOUT_BILLING_ERROR_MESSAGE = "Couldn't start checkout. Try again.";
const PORTAL_BILLING_ERROR_MESSAGE = "Couldn't open billing portal. Try again.";

/**
 * @param {unknown} error
 */
export function isStaleStripeCustomerError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const stripeError =
    /** @type {{ type?: string; code?: string; message?: string; param?: string }} */ (error);

  const message = stripeError.message ?? "";
  if (
    message.includes("exists in test mode, but a live mode key") ||
    message.includes("exists in live mode, but a test mode key")
  ) {
    return true;
  }

  if (
    stripeError.code === "resource_missing" &&
    (message.includes("No such customer") || stripeError.param === "customer")
  ) {
    return true;
  }

  return false;
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
    context === "portal" ? PORTAL_BILLING_ERROR_MESSAGE : CHECKOUT_BILLING_ERROR_MESSAGE;

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
 * @param {string} uid
 * @returns {Promise<string | null>}
 */
async function findStripeCustomerIdByFirebaseUid(stripe, uid) {
  try {
    const result = await stripe.customers.search({
      query: `metadata['firebaseUid']:'${uid}'`,
    });
    const match = (result?.data ?? []).find(
      (customer) =>
        customer &&
        typeof customer === "object" &&
        typeof customer.id === "string" &&
        !("deleted" in customer && customer.deleted === true),
    );
    return match?.id ?? null;
  } catch (error) {
    console.warn(`Stripe customer search failed for uid ${uid}:`, error);
    return null;
  }
}

/**
 * Clears users/{uid}.stripeCustomerId after Stripe emits customer.deleted.
 * Resolves uid from metadata.firebaseUid, else Firestore query by customer id.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Pick<Stripe.Customer | Stripe.DeletedCustomer, "id" | "metadata">} customer
 */
export async function clearStripeCustomerIdForDeletedCustomer(db, customer) {
  const metadataUid = customer?.metadata?.firebaseUid;
  let uid =
    typeof metadataUid === "string" && metadataUid.trim().length > 0 ? metadataUid.trim() : null;

  if (!uid) {
    const customerId = typeof customer?.id === "string" ? customer.id : null;
    if (!customerId) {
      return;
    }

    const snapshot = await db
      .collection("users")
      .where("stripeCustomerId", "==", customerId)
      .limit(5)
      .get();

    if (snapshot.empty || snapshot.docs.length === 0) {
      return;
    }

    uid = snapshot.docs[0].id;
  }

  await mergeUserEntitlements(db, uid, {
    stripeCustomerId: FieldValue.delete(),
  });
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
    typeof snapshot.data()?.stripeCustomerId === "string" ? snapshot.data().stripeCustomerId : null;

  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId);
      if (
        existing &&
        typeof existing === "object" &&
        "deleted" in existing &&
        existing.deleted === true
      ) {
        console.warn(`Replacing deleted Stripe customer ${existingCustomerId} for uid ${uid}.`);
      } else {
        return existingCustomerId;
      }
    } catch (error) {
      if (!isStaleStripeCustomerError(error)) {
        throw mapStripeBillingError(error, "checkout");
      }

      console.warn(`Replacing stale Stripe customer ${existingCustomerId} for uid ${uid}.`);
    }
  }

  const searchedCustomerId = await findStripeCustomerIdByFirebaseUid(stripe, uid);
  if (searchedCustomerId) {
    await mergeUserEntitlements(db, uid, {
      stripeCustomerId: searchedCustomerId,
    });
    return searchedCustomerId;
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
    subscription: FieldValue.delete(),
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
export async function createCheckoutSessionHandler(stripe, db, uid, email, productKey) {
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
export async function createBillingPortalSessionHandler(stripe, db, uid, email) {
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
  let observerPasscode;
  let rolePasscode;

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
      throw new HttpsError("resource-exhausted", "Could not allocate session code.");
    }

    consumePremiumSessionCredit(transaction, userRef, userData);

    const createdAt = new Date().toISOString();
    sessionPayload = buildPremiumSessionFirestoreDocument(input, code, uid, createdAt);
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
      status: "active",
    });

    const secrets = buildInitialRoleSecrets(input.hostRole);
    observerPasscode = secrets.observer.code;
    rolePasscode = secrets[input.hostRole]?.code;
    transaction.set(db.collection("sessionRoleSecrets").doc(sessionId), secrets);
  });

  return {
    session: {
      id: sessionId,
      ...sessionPayload,
    },
    observerPasscode,
    rolePasscode,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Stripe.Checkout.Session} session
 */
export async function applyCheckoutSessionCompleted(db, session) {
  const uid = session.metadata?.firebaseUid ?? session.client_reference_id ?? null;
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
      stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
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

  const plan = subscription.metadata?.plan === "yearly" ? "yearly" : "monthly";
  const status = subscription.status;
  const patch = {
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : undefined,
    subscription: {
      status,
      plan,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: stripeTimestampToFirestore(subscription.current_period_end),
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
      currentPeriodEnd: stripeTimestampToFirestore(subscription.current_period_end),
    };
  }

  await mergeUserEntitlements(db, uid, patch);
}
