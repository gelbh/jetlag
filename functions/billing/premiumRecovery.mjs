import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildMergedEntitlementPatch,
  userEntitlementsRef,
} from "./premiumEntitlements.mjs";

export const RECOVER_PREMIUM_ROUTE = "recoverPremium";
export const RECOVER_PREMIUM_DAILY_LIMIT = 5;
export const RECOVER_PREMIUM_WINDOW_MS = 24 * 60 * 60 * 1000;

const VERIFIED_EMAIL_MESSAGE =
  "Verify your email address before recovering purchases.";

/**
 * @param {boolean | undefined} emailVerified
 */
export function requireVerifiedEmailForRecovery(emailVerified) {
  if (emailVerified !== true) {
    throw new HttpsError("failed-precondition", VERIFIED_EMAIL_MESSAGE);
  }
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

    if (typeof sourceData.migratedToUid === "string" && sourceData.migratedToUid) {
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
 * @param {string} email
 */
export async function listStripeCustomersByEmail(stripe, email) {
  const customers = [];
  let startingAfter;

  do {
    const page = await stripe.customers.list({
      email,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    customers.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
  } while (startingAfter);

  return customers;
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} uid
 * @param {string | null | undefined} email
 * @param {boolean | undefined} emailVerified
 */
export async function recoverPremiumByStripeEmailHandler(
  stripe,
  db,
  uid,
  email,
  emailVerified,
) {
  requireVerifiedEmailForRecovery(emailVerified);

  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (!normalizedEmail) {
    throw new HttpsError(
      "failed-precondition",
      "Sign in with an email address to recover purchases.",
    );
  }

  const customers = await listStripeCustomersByEmail(stripe, normalizedEmail);

  let mergedAny = false;

  for (const customer of customers) {
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

export { VERIFIED_EMAIL_MESSAGE };
