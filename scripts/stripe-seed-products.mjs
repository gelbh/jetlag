#!/usr/bin/env node
/**
 * Creates Stripe test-mode products/prices for Jet Lag premium billing.
 * Requires STRIPE_SECRET_KEY in the environment.
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed-products.mjs
 */
import Stripe from "stripe";
import {
  ONE_TIME_PRODUCTS,
  SUBSCRIPTION_PRODUCTS,
} from "./stripe-product-catalog.mjs";

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("Set STRIPE_SECRET_KEY to a Stripe test secret key.");
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const lines = ["# Stripe price IDs (test mode)\n"];

  for (const product of ONE_TIME_PRODUCTS) {
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

  for (const product of SUBSCRIPTION_PRODUCTS) {
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
