import Stripe from "stripe";
import { setCors } from "../lib/cors.mjs";
import { captureFunctionsException } from "../lib/functionsException.mjs";
import { captureAnalyticsEvent } from "../lib/posthog.mjs";
import { markStripeEventProcessed } from "./premiumEntitlements.mjs";
import {
  applyCheckoutSessionCompleted,
  clearStripeCustomerIdForDeletedCustomer,
  syncSubscriptionEntitlements,
} from "./stripeBilling.mjs";

const STRIPE_SIGNATURE_MISMATCH = /No signatures found matching the expected signature/i;

/**
 * Capture once per subscription id when status first reaches active/trialing
 * (created or updated). Stable uuidSeed dedupes Stripe retries / incomplete→active.
 * @param {Stripe.Subscription} subscription
 * @param {{
 *   posthogApiKey?: string,
 *   captureAnalyticsEvent?: typeof captureAnalyticsEvent,
 *   captureImpl?: { capture: Function, shutdown: Function },
 * }} options
 */
export async function captureSubscriptionPurchaseIfEligible(subscription, options = {}) {
  const uid = subscription.metadata?.firebaseUid;
  const plan = subscription.metadata?.plan;
  const analyticsPlan = plan === "monthly" || plan === "yearly" ? plan : undefined;
  const subscriptionId = typeof subscription.id === "string" ? subscription.id : "";
  if (
    !uid ||
    !analyticsPlan ||
    !subscriptionId ||
    (subscription.status !== "active" && subscription.status !== "trialing")
  ) {
    return;
  }

  const captureEvent = options.captureAnalyticsEvent ?? captureAnalyticsEvent;
  try {
    await captureEvent({
      apiKey: options.posthogApiKey ?? "",
      distinctId: uid,
      event: "premium_purchase_completed",
      uuidSeed: `premium_purchase_completed:sub:${subscriptionId}`,
      properties: { productKey: analyticsPlan, source: "stripe_webhook" },
      captureImpl: options.captureImpl,
    });
  } catch {
    // Soft-fail: entitlements already synced; do not fail the webhook.
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} webhookSecret
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {{
 *   posthogApiKey?: string,
 *   captureAnalyticsEvent?: typeof captureAnalyticsEvent,
 *   captureImpl?: { capture: Function, shutdown: Function },
 * } | undefined} [options]
 */
export async function handleStripeWebhook(db, webhookSecret, req, res, options) {
  const posthogApiKey = options?.posthogApiKey ?? "";
  const captureEvent = options?.captureAnalyticsEvent ?? captureAnalyticsEvent;
  const purchaseCaptureOptions = {
    posthogApiKey,
    captureAnalyticsEvent: captureEvent,
    captureImpl: options?.captureImpl,
  };
  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  if (!webhookSecret) {
    res.status(503).send("Stripe webhook is not configured");
    return;
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.type === "StripeSignatureVerificationError" ||
        STRIPE_SIGNATURE_MISMATCH.test(error.message))
    ) {
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    await captureFunctionsException(error);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  try {
    // customer.deleted: clear first, then mark processed so a failed clear can retry.
    if (event.type === "customer.deleted") {
      const existing = await db.collection("stripeEvents").doc(event.id).get();
      if (existing.exists) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      const customer = /** @type {Stripe.Customer | Stripe.DeletedCustomer} */ (event.data.object);
      await clearStripeCustomerIdForDeletedCustomer(db, customer);
      await markStripeEventProcessed(db, event.id);
      res.status(200).json({ received: true });
      return;
    }

    const shouldProcess = await markStripeEventProcessed(db, event.id);
    if (!shouldProcess) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = /** @type {Stripe.Checkout.Session} */ (event.data.object);
        if (session.mode === "payment") {
          await applyCheckoutSessionCompleted(db, session, {
            stripeEventId: event.id,
            posthogApiKey,
            captureAnalyticsEvent: captureEvent,
            captureImpl: options?.captureImpl,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = /** @type {Stripe.Subscription} */ (event.data.object);
        await syncSubscriptionEntitlements(db, subscription);
        await captureSubscriptionPurchaseIfEligible(subscription, purchaseCaptureOptions);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = /** @type {Stripe.Subscription} */ (event.data.object);
        await syncSubscriptionEntitlements(db, subscription);
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    await captureFunctionsException(error);
    res.status(500).send("Webhook handler failed");
  }
}
