import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const PREMIUM_TRIAL_DAYS = 7;

/** @typedef {'active' | 'trialing' | 'past_due' | 'canceled'} SubscriptionStatus */

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 */
export function userEntitlementsRef(db, uid) {
  return db.collection("users").doc(uid);
}

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function isAppPremiumTrialActive(data) {
  const trialEndsAt = data?.trialEndsAt;
  if (!(trialEndsAt instanceof Timestamp)) {
    return false;
  }

  if (trialEndsAt.toMillis() <= Date.now()) {
    return false;
  }

  if (data?.lifetimePremium === true) {
    return false;
  }

  const status = data?.subscription?.status;
  if (status === "active" || status === "trialing") {
    return false;
  }

  return true;
}

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function hasUnlimitedPremiumEntitlement(data) {
  if (!data) {
    return false;
  }

  if (data.lifetimePremium === true) {
    return true;
  }

  if (isAppPremiumTrialActive(data)) {
    return true;
  }

  const status = data.subscription?.status;
  return status === "active" || status === "trialing";
}

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function premiumSessionCredits(data) {
  const credits = data?.premiumSessionCredits;
  return typeof credits === "number" && Number.isFinite(credits) && credits > 0
    ? Math.floor(credits)
    : 0;
}

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function canCreatePaidPremiumSession(data) {
  return (
    hasUnlimitedPremiumEntitlement(data) || premiumSessionCredits(data) > 0
  );
}

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function serializeEntitlementsForClient(data) {
  const subscription = data?.subscription;
  return {
    premiumSessionCredits: premiumSessionCredits(data),
    lifetimePremium: data?.lifetimePremium === true,
    subscription:
      subscription && typeof subscription === "object"
        ? {
            status: subscription.status ?? null,
            plan: subscription.plan ?? null,
            currentPeriodEnd:
              subscription.currentPeriodEnd instanceof Timestamp
                ? subscription.currentPeriodEnd.toMillis()
                : null,
          }
        : null,
    trialUsedAt:
      data?.trialUsedAt instanceof Timestamp
        ? data.trialUsedAt.toMillis()
        : null,
    trialEndsAt:
      data?.trialEndsAt instanceof Timestamp
        ? data.trialEndsAt.toMillis()
        : null,
    canCreatePremium: canCreatePaidPremiumSession(data),
    hasUnlimitedPremium: hasUnlimitedPremiumEntitlement(data),
  };
}

/**
 * @param {Record<string, unknown> | undefined} source
 * @param {Record<string, unknown> | undefined} target
 */
export function buildMergedEntitlementPatch(source, target) {
  const patch = {};

  const sourceCredits = premiumSessionCredits(source);
  const targetCredits = premiumSessionCredits(target);
  if (sourceCredits > 0) {
    patch.premiumSessionCredits = targetCredits + sourceCredits;
  }

  if (source?.lifetimePremium === true) {
    patch.lifetimePremium = true;
  }

  const sourceSubscription = source?.subscription;
  const targetHasUnlimited = hasUnlimitedPremiumEntitlement(target);
  if (
    sourceSubscription &&
    typeof sourceSubscription === "object" &&
    !targetHasUnlimited
  ) {
    patch.subscription = sourceSubscription;
  }

  if (
    typeof source?.stripeCustomerId === "string" &&
    typeof target?.stripeCustomerId !== "string"
  ) {
    patch.stripeCustomerId = source.stripeCustomerId;
  }

  if (source?.trialUsedAt && !target?.trialUsedAt) {
    patch.trialUsedAt = source.trialUsedAt;
  }

  if (source?.trialEndsAt && !target?.trialEndsAt) {
    patch.trialEndsAt = source.trialEndsAt;
  }

  return patch;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 */
export async function startPremiumTrialHandler(db, uid) {
  const userRef = userEntitlementsRef(db, uid);
  const snapshot = await userRef.get();
  const userData = snapshot.data();

  if (userData?.trialUsedAt) {
    throw new HttpsError(
      "failed-precondition",
      "Free trial already used on this account.",
    );
  }

  if (hasUnlimitedPremiumEntitlement(userData)) {
    throw new HttpsError(
      "failed-precondition",
      "You already have unlimited premium hosting.",
    );
  }

  const trialEndsAt = Timestamp.fromMillis(
    Date.now() + PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );

  await mergeUserEntitlements(db, uid, {
    trialUsedAt: FieldValue.serverTimestamp(),
    trialEndsAt,
  });

  const updated = await userRef.get();
  return serializeEntitlementsForClient(updated.data());
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {Record<string, unknown>} patch
 */
export async function mergeUserEntitlements(db, uid, patch) {
  await userEntitlementsRef(db, uid).set(
    {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {import('firebase-admin/firestore').Transaction} transaction
 * @param {import('firebase-admin/firestore').DocumentReference} userRef
 * @param {Record<string, unknown> | undefined} data
 */
export function consumePremiumSessionCredit(transaction, userRef, data) {
  if (hasUnlimitedPremiumEntitlement(data)) {
    return;
  }

  const credits = premiumSessionCredits(data);
  if (credits <= 0) {
    throw new Error("No premium session credits remaining.");
  }

  transaction.set(
    userRef,
    {
      premiumSessionCredits: credits - 1,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} eventId
 */
export async function markStripeEventProcessed(db, eventId) {
  const ref = db.collection("stripeEvents").doc(eventId);
  const existing = await ref.get();
  if (existing.exists) {
    return false;
  }

  await ref.set({
    processedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

/**
 * @param {number | null | undefined} unixSeconds
 */
export function stripeTimestampToFirestore(unixSeconds) {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) {
    return null;
  }
  return Timestamp.fromMillis(unixSeconds * 1000);
}
