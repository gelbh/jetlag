import { defineSecret, defineString } from "firebase-functions/params";

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export const stripePricePack1 = defineString("STRIPE_PRICE_PACK_1", {
  default: "",
});
export const stripePricePack3 = defineString("STRIPE_PRICE_PACK_3", {
  default: "",
});
export const stripePricePack5 = defineString("STRIPE_PRICE_PACK_5", {
  default: "",
});
export const stripePriceMonthly = defineString("STRIPE_PRICE_MONTHLY", {
  default: "",
});
export const stripePriceYearly = defineString("STRIPE_PRICE_YEARLY", {
  default: "",
});
export const stripePriceLifetime = defineString("STRIPE_PRICE_LIFETIME", {
  default: "",
});

export const stripeCheckoutSuccessUrl = defineString(
  "STRIPE_CHECKOUT_SUCCESS_URL",
  { default: "https://jetlag.gelbhart.dev/premium?checkout=success" },
);
export const stripeCheckoutCancelUrl = defineString(
  "STRIPE_CHECKOUT_CANCEL_URL",
  { default: "https://jetlag.gelbhart.dev/premium?checkout=cancel" },
);
export const stripePortalReturnUrl = defineString("STRIPE_PORTAL_RETURN_URL", {
  default: "https://jetlag.gelbhart.dev/premium",
});

/** @typedef {'pack_1' | 'pack_3' | 'pack_5' | 'monthly' | 'yearly' | 'lifetime'} PremiumProductKey */

export const PREMIUM_PRODUCT_KEYS = [
  "pack_1",
  "pack_3",
  "pack_5",
  "monthly",
  "yearly",
  "lifetime",
];

/** @type {Record<PremiumProductKey, { mode: 'payment' | 'subscription', credits?: number, lifetime?: boolean, plan?: 'monthly' | 'yearly', trialDays?: number }>} */
export const PREMIUM_PRODUCTS = {
  pack_1: { mode: "payment", credits: 1 },
  pack_3: { mode: "payment", credits: 3 },
  pack_5: { mode: "payment", credits: 5 },
  monthly: { mode: "subscription", plan: "monthly", trialDays: 7 },
  yearly: { mode: "subscription", plan: "yearly", trialDays: 7 },
  lifetime: { mode: "payment", lifetime: true },
};

const PRICE_RESOLVERS = {
  pack_1: () => stripePricePack1.value(),
  pack_3: () => stripePricePack3.value(),
  pack_5: () => stripePricePack5.value(),
  monthly: () => stripePriceMonthly.value(),
  yearly: () => stripePriceYearly.value(),
  lifetime: () => stripePriceLifetime.value(),
};

/**
 * @param {PremiumProductKey} productKey
 */
export function resolveStripePriceId(productKey) {
  const resolver = PRICE_RESOLVERS[productKey];
  const priceId = resolver?.()?.trim();
  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${productKey}.`);
  }
  return priceId;
}

export const STRIPE_BILLING_SECRETS = [
  stripeSecretKey,
  stripeWebhookSecret,
];

export const STRIPE_BILLING_PARAMS = [
  stripePricePack1,
  stripePricePack3,
  stripePricePack5,
  stripePriceMonthly,
  stripePriceYearly,
  stripePriceLifetime,
  stripeCheckoutSuccessUrl,
  stripeCheckoutCancelUrl,
  stripePortalReturnUrl,
];
