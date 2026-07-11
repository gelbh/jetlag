/** Shared Stripe premium catalog for test seeding and live cutover. */

export const FIREBASE_PROJECT_ID = "jet-lag-map-companion";

export const STRIPE_WEBHOOK_URL =
  "https://us-central1-jet-lag-map-companion.cloudfunctions.net/stripeWebhook";

export const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

export const STRIPE_CHECKOUT_URLS = {
  STRIPE_CHECKOUT_SUCCESS_URL:
    "https://jetlag.gelbhart.dev/premium?checkout=success",
  STRIPE_CHECKOUT_CANCEL_URL:
    "https://jetlag.gelbhart.dev/premium?checkout=cancel",
  STRIPE_PORTAL_RETURN_URL: "https://jetlag.gelbhart.dev/premium",
};

export const ONE_TIME_PRODUCTS = [
  {
    key: "pack_1",
    env: "STRIPE_PRICE_PACK_1",
    name: "Premium session",
    description: "One premium Jet Lag session with live transit.",
    unitAmount: 299,
    credits: 1,
  },
  {
    key: "pack_3",
    env: "STRIPE_PRICE_PACK_3",
    name: "Premium 3-pack",
    description: "Three premium Jet Lag sessions with live transit.",
    unitAmount: 799,
    credits: 3,
  },
  {
    key: "pack_5",
    env: "STRIPE_PRICE_PACK_5",
    name: "Premium 5-pack",
    description: "Five premium Jet Lag sessions with live transit.",
    unitAmount: 1199,
    credits: 5,
  },
  {
    key: "lifetime",
    env: "STRIPE_PRICE_LIFETIME",
    name: "Premium lifetime",
    description: "Unlimited premium Jet Lag sessions, forever.",
    unitAmount: 8999,
    lifetime: true,
  },
];

export const SUBSCRIPTION_PRODUCTS = [
  {
    key: "monthly",
    env: "STRIPE_PRICE_MONTHLY",
    name: "Premium monthly",
    description: "Unlimited premium Jet Lag sessions each month.",
    unitAmount: 899,
    interval: "month",
    trialDays: 7,
  },
  {
    key: "yearly",
    env: "STRIPE_PRICE_YEARLY",
    name: "Premium yearly",
    description: "Unlimited premium Jet Lag sessions for one year.",
    unitAmount: 7499,
    interval: "year",
    trialDays: 7,
  },
];

export const ALL_CATALOG_PRODUCTS = [
  ...ONE_TIME_PRODUCTS,
  ...SUBSCRIPTION_PRODUCTS,
];
