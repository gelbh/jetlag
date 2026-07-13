import Stripe from "stripe";
import { setCors } from "../lib/cors.mjs";
import { captureFunctionsException } from "../lib/sentry.mjs";
import {
  applyCheckoutSessionCompleted,
  syncSubscriptionEntitlements,
} from "./stripeBilling.mjs";
import { markStripeEventProcessed } from "./premiumEntitlements.mjs";

const STRIPE_SIGNATURE_MISMATCH =
  /No signatures found matching the expected signature/i;

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} webhookSecret
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 */
export async function handleStripeWebhook(db, webhookSecret, req, res) {
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
    event = Stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.type === "StripeSignatureVerificationError" ||
        STRIPE_SIGNATURE_MISMATCH.test(error.message))
    ) {
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    captureFunctionsException(error);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  try {
    const shouldProcess = await markStripeEventProcessed(db, event.id);
    if (!shouldProcess) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = /** @type {Stripe.Checkout.Session} */ (event.data.object);
        if (session.mode === "payment") {
          await applyCheckoutSessionCompleted(db, session);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = /** @type {Stripe.Subscription} */ (
          event.data.object
        );
        await syncSubscriptionEntitlements(db, subscription);
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    captureFunctionsException(error);
    res.status(500).send("Webhook handler failed");
  }
}
