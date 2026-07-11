#!/usr/bin/env node
/**
 * Live Stripe cutover for Jet Lag premium billing.
 *
 * Uses the Stripe CLI with STRIPE_API_KEY (pass sk_live via STRIPE_SECRET_KEY).
 * Default `stripe --live` uses a restricted rk_live key and cannot create products.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-live-cutover.mjs
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-live-cutover.mjs --set-firebase-secrets --deploy-functions
 *
 * Options:
 *   --dry-run               Log actions only
 *   --set-firebase-secrets  Write STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to Firebase
 *   --replace-webhook       Delete an existing webhook at the same URL and recreate it
 *   --deploy-functions      firebase deploy --only functions after env + secrets update
 *   --project <id>          Firebase project (default: jet-lag-map-companion)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALL_CATALOG_PRODUCTS,
  FIREBASE_PROJECT_ID,
  STRIPE_CHECKOUT_URLS,
  STRIPE_WEBHOOK_EVENTS,
  STRIPE_WEBHOOK_URL,
} from "./stripe-product-catalog.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const envFilePath = resolve(projectRoot, "functions/.env.jet-lag-map-companion");

function parseArgs(argv) {
  const options = {
    dryRun: false,
    setFirebaseSecrets: false,
    replaceWebhook: false,
    deployFunctions: false,
    project: FIREBASE_PROJECT_ID,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--set-firebase-secrets") {
      options.setFirebaseSecrets = true;
    } else if (arg === "--replace-webhook") {
      options.replaceWebhook = true;
    } else if (arg === "--deploy-functions") {
      options.deployFunctions = true;
    } else if (arg === "--project") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--project requires a value.");
      }
      options.project = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function assertLiveSecretKey(secret) {
  if (!secret.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a live secret key (sk_live_...). Test keys stay on sk_test_.",
    );
  }
}

function runStripe(args, secret, { json = true } = {}) {
  const result = spawnSync("stripe", args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      STRIPE_API_KEY: secret,
    },
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`stripe ${args.join(" ")} failed:\n${output}`);
  }

  if (!json) {
    return output;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`stripe ${args.join(" ")} returned non-JSON output:\n${output}`);
  }
}

function listAllStripeResources(args, secret) {
  const items = [];
  let startingAfter;

  while (true) {
    const pageArgs = [...args, "--limit", "100"];
    if (startingAfter) {
      pageArgs.push("--starting-after", startingAfter);
    }

    const page = runStripe(pageArgs, secret);
    items.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }

  return items;
}

function productMetadata(product) {
  return {
    productKey: product.key,
    ...(product.credits ? { credits: String(product.credits) } : {}),
    ...(product.lifetime ? { lifetime: "true" } : {}),
    ...(product.interval ? { plan: product.key } : {}),
  };
}

function priceMatchesCatalog(price, product) {
  if (price.currency !== "eur" || price.unit_amount !== product.unitAmount) {
    return false;
  }

  if (product.interval) {
    const recurring = price.recurring;
    return (
      recurring?.interval === product.interval &&
      recurring?.trial_period_days === product.trialDays
    );
  }

  return !price.recurring;
}

function findMatchingPrice(prices, product) {
  return prices.find((price) => price.active && priceMatchesCatalog(price, product));
}

function createProduct(secret, product, dryRun) {
  const metadata = productMetadata(product);
  if (dryRun) {
    console.log(`[dry-run] create product ${product.key}`);
    return { id: `prod_dry_${product.key}` };
  }

  const args = [
    "products",
    "create",
    "--name",
    product.name,
    "--description",
    product.description,
  ];

  for (const [key, value] of Object.entries(metadata)) {
    args.push("-d", `metadata[${key}]=${value}`);
  }

  return runStripe(args, secret);
}

function createPrice(secret, product, productId, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] create price ${product.key}`);
    return { id: `price_dry_${product.key}` };
  }

  const args = [
    "prices",
    "create",
    "--product",
    productId,
    "--currency",
    "eur",
    "--unit-amount",
    String(product.unitAmount),
  ];

  if (product.interval) {
    args.push(
      "-d",
      `recurring[interval]=${product.interval}`,
      "-d",
      `recurring[trial_period_days]=${product.trialDays}`,
    );
  }

  return runStripe(args, secret);
}

function ensureCatalogPrice(secret, product, productsByKey, pricesByProductId, dryRun) {
  const existingProduct = productsByKey.get(product.key);
  if (existingProduct) {
    const prices = pricesByProductId.get(existingProduct.id) ?? [];
    const existingPrice = findMatchingPrice(prices, product);
    if (existingPrice) {
      console.log(`${product.key}: reuse ${existingPrice.id}`);
      return existingPrice.id;
    }

    console.log(`${product.key}: product exists, creating missing price`);
    const price = createPrice(secret, product, existingProduct.id, dryRun);
    console.log(`${product.key}: ${price.id}`);
    return price.id;
  }

  const createdProduct = createProduct(secret, product, dryRun);
  const price = createPrice(secret, product, createdProduct.id, dryRun);
  console.log(`${product.key}: ${price.id}`);
  return price.id;
}

function buildEnvContents(priceIdsByEnv) {
  const lines = [];

  for (const product of ALL_CATALOG_PRODUCTS) {
    lines.push(`${product.env}=${priceIdsByEnv[product.env]}`);
  }

  for (const [key, value] of Object.entries(STRIPE_CHECKOUT_URLS)) {
    lines.push(`${key}=${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function writeEnvFile(priceIdsByEnv, dryRun) {
  const contents = buildEnvContents(priceIdsByEnv);
  if (dryRun) {
    console.log("[dry-run] would write functions/.env.jet-lag-map-companion:\n");
    console.log(contents);
    return;
  }

  writeFileSync(envFilePath, contents, "utf8");
  console.log(`Wrote ${envFilePath}`);
}

function findWebhookEndpoint(secret) {
  const endpoints = listAllStripeResources(["webhook_endpoints", "list"], secret);
  return endpoints.find((endpoint) => endpoint.url === STRIPE_WEBHOOK_URL) ?? null;
}

function ensureWebhook(secret, { replaceWebhook, dryRun }) {
  const existing = dryRun ? null : findWebhookEndpoint(secret);

  if (existing && !replaceWebhook) {
    console.log(
      `Webhook already exists at ${STRIPE_WEBHOOK_URL} (${existing.id}).`,
    );
    console.log(
      "Stripe only shows the signing secret once. Use --replace-webhook to recreate it, or keep the existing whsec_ value.",
    );
    return null;
  }

  if (existing && replaceWebhook) {
    if (dryRun) {
      console.log(`[dry-run] delete webhook ${existing.id}`);
    } else {
      runStripe(["webhook_endpoints", "delete", existing.id], secret, { json: false });
      console.log(`Deleted webhook ${existing.id}`);
    }
  }

  if (dryRun) {
    console.log(`[dry-run] create webhook ${STRIPE_WEBHOOK_URL}`);
    return "whsec_dry_run";
  }

  const args = [
    "webhook_endpoints",
    "create",
    "--url",
    STRIPE_WEBHOOK_URL,
    ...STRIPE_WEBHOOK_EVENTS.flatMap((event) => ["--enabled-events", event]),
  ];

  const endpoint = runStripe(args, secret);
  console.log(`Created webhook ${endpoint.id}`);
  if (!endpoint.secret) {
    throw new Error("Stripe did not return a webhook signing secret.");
  }

  return endpoint.secret;
}

function setFirebaseSecret(name, value, project, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] firebase functions:secrets:set ${name} --project ${project}`);
    return;
  }

  const result = spawnSync(
    "firebase",
    [
      "functions:secrets:set",
      name,
      "--project",
      project,
      "--data-file",
      "-",
      "--force",
    ],
    {
      cwd: projectRoot,
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  if (result.status !== 0) {
    throw new Error(`Failed to set Firebase secret ${name}.`);
  }

  console.log(`Set Firebase secret ${name}`);
}

function deployFunctions(project, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] firebase deploy --only functions --project ${project}`);
    return;
  }

  const result = spawnSync(
    "firebase",
    ["deploy", "--only", "functions", "--project", project],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error("Firebase functions deploy failed.");
  }
}

function verifyStripeCli() {
  const result = spawnSync("stripe", ["--version"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Stripe CLI is not installed or not on PATH.");
  }
}

function summarizeNextSteps(options, wroteWebhookSecret) {
  const steps = [];

  if (!options.setFirebaseSecrets) {
    steps.push(
      "Re-run with --set-firebase-secrets after confirming the env file looks correct.",
    );
  }

  if (!wroteWebhookSecret) {
    steps.push(
      "If you skipped webhook secret rotation, confirm STRIPE_WEBHOOK_SECRET in Firebase still matches the live endpoint.",
    );
  }

  if (!options.deployFunctions) {
    steps.push("Deploy functions: npm run deploy or --deploy-functions.");
  }

  steps.push("Live smoke test: sign in at /premium, buy the €2.99 pack, confirm credits + webhook 200.");

  if (steps.length > 0) {
    console.log("\nNext:");
    for (const step of steps) {
      console.log(`- ${step}`);
    }
  }
}

async function main() {
  verifyStripeCli();

  const options = parseArgs(process.argv.slice(2));
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("Set STRIPE_SECRET_KEY to your live secret key (sk_live_...).");
  }

  assertLiveSecretKey(secret);

  if (options.dryRun) {
    console.log("Dry run only. No Stripe, Firebase, or file changes will be made.\n");
  } else {
    const account = runStripe(["accounts", "retrieve"], secret);
    if (!account.charges_enabled) {
      throw new Error("Stripe account is not live yet (charges_enabled=false).");
    }

    console.log(
      `Stripe account ${account.id}: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`,
    );
  }

  const products = options.dryRun
    ? []
    : listAllStripeResources(["products", "list"], secret);
  const productsByKey = new Map(
    products
      .filter((product) => typeof product.metadata?.productKey === "string")
      .map((product) => [product.metadata.productKey, product]),
  );

  const prices = options.dryRun
    ? []
    : listAllStripeResources(["prices", "list"], secret);
  const pricesByProductId = new Map();
  for (const price of prices) {
    const productId =
      typeof price.product === "string" ? price.product : price.product?.id;
    if (!productId) {
      continue;
    }
    const bucket = pricesByProductId.get(productId) ?? [];
    bucket.push(price);
    pricesByProductId.set(productId, bucket);
  }

  /** @type {Record<string, string>} */
  const priceIdsByEnv = {};

  for (const product of ALL_CATALOG_PRODUCTS) {
    priceIdsByEnv[product.env] = ensureCatalogPrice(
      secret,
      product,
      productsByKey,
      pricesByProductId,
      options.dryRun,
    );
  }

  writeEnvFile(priceIdsByEnv, options.dryRun);

  const webhookSecret = ensureWebhook(secret, {
    replaceWebhook: options.replaceWebhook,
    dryRun: options.dryRun,
  });

  if (options.setFirebaseSecrets) {
    setFirebaseSecret("STRIPE_SECRET_KEY", secret, options.project, options.dryRun);
    if (webhookSecret) {
      setFirebaseSecret(
        "STRIPE_WEBHOOK_SECRET",
        webhookSecret,
        options.project,
        options.dryRun,
      );
    }
  }

  if (options.deployFunctions) {
    deployFunctions(options.project, options.dryRun);
  }

  summarizeNextSteps(options, Boolean(webhookSecret));

  if (!options.dryRun && existsSync(envFilePath)) {
    const envPreview = readFileSync(envFilePath, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("STRIPE_PRICE_"))
      .join("\n");
    console.log("\nLive price IDs:\n");
    console.log(envPreview);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
