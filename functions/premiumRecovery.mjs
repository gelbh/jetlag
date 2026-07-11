import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  hasUnlimitedPremiumEntitlement,
  mergeUserEntitlements,
  premiumSessionCredits,
  userEntitlementsRef,
} from "./premiumEntitlements.mjs";

/**
 * @param {Record<string, unknown> | undefined} source
 * @param {Record<string, unknown> | undefined} target
 */
function buildMergedEntitlementPatch(source, target) {
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

  return patch;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} sourceUid
 * @param {string} targetUid
 */
export async function mergeEntitlementsBetweenUsers(db, sourceUid, targetUid) {
  if (sourceUid === targetUid) {
    return { merged: false };
  }

  const sourceRef = userEntitlementsRef(db, sourceUid);
  const targetRef = userEntitlementsRef(db, targetUid);

  return db.runTransaction(async (transaction) => {
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(targetRef),
    ]);

    const sourceData = sourceSnapshot.data();
    if (!sourceData) {
      return { merged: false };
    }

    const patch = buildMergedEntitlementPatch(sourceData, targetSnapshot.data());
    if (Object.keys(patch).length === 0) {
      return { merged: false };
    }

    transaction.set(
      targetRef,
      {
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      sourceRef,
      {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: FieldValue.delete(),
        migratedToUid: targetUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { merged: true };
  });
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} uid
 * @param {string | null | undefined} email
 */
export async function recoverPremiumByStripeEmailHandler(
  stripe,
  db,
  uid,
  email,
) {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (!normalizedEmail) {
    throw new HttpsError(
      "failed-precondition",
      "Sign in with an email address to recover purchases.",
    );
  }

  const customers = await stripe.customers.list({
    email: normalizedEmail,
    limit: 10,
  });

  let mergedAny = false;

  for (const customer of customers.data) {
    const sourceUid = customer.metadata?.firebaseUid;
    if (typeof sourceUid !== "string" || !sourceUid || sourceUid === uid) {
      continue;
    }

    const result = await mergeEntitlementsBetweenUsers(db, sourceUid, uid);
    if (result.merged) {
      mergedAny = true;
    }
  }

  return { recovered: mergedAny };
}
