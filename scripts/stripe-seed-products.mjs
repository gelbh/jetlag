#!/usr/bin/env node
/**
 * Creates Stripe test-mode products/prices for Jet Lag premium billing.
 * Requires STRIPE_SECRET_KEY in the environment.
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed-products.mjs
 */
import Stripe from "stripe";

const PRODUCTS = [
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

const SUBSCRIPTIONS = [
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

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("Set STRIPE_SECRET_KEY to a Stripe test secret key.");
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const lines = ["# Stripe price IDs (test mode)\n"];

  for (const product of PRODUCTS) {
    const created = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: {
        productKey: product.key,
        ...(product.credits ? { credits: String(product.credits) } : {}),
        ...(product.lifetime ? { lifetime: "true" } : {}),
      },
    });

    const price = await stripe.prices.create({
      product: created.id,
      currency: "eur",
      unit_amount: product.unitAmount,
    });

    lines.push(`${product.env}=${price.id}`);
    console.log(`${product.key}: ${price.id}`);
  }

  for (const product of SUBSCRIPTIONS) {
    const created = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: {
        productKey: product.key,
        plan: product.key,
      },
    });

    const price = await stripe.prices.create({
      product: created.id,
      currency: "eur",
      unit_amount: product.unitAmount,
      recurring: {
        interval: product.interval,
        trial_period_days: product.trialDays,
      },
    });

    lines.push(`${product.env}=${price.id}`);
    console.log(`${product.key}: ${price.id}`);
  }

  console.log("\nAdd to Firebase function params or .env:\n");
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
