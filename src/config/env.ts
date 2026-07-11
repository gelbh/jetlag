import { z } from "zod";

const optionalNonEmptyString = z
  .union([z.string(), z.undefined()])
  .transform((value) => (value ?? "").trim())
  .pipe(z.union([z.string().min(1), z.literal("")]))
  .optional();

const optionalUrl = z
  .union([z.string(), z.undefined()])
  .transform((value) => (value ?? "").trim())
  .pipe(z.union([z.url(), z.literal("")]))
  .optional();

const firebaseEnvSchema = z.object({
  VITE_FIREBASE_API_KEY: optionalNonEmptyString,
  VITE_FIREBASE_AUTH_DOMAIN: optionalNonEmptyString,
  VITE_FIREBASE_PROJECT_ID: optionalNonEmptyString,
  VITE_FIREBASE_STORAGE_BUCKET: optionalNonEmptyString,
  VITE_FIREBASE_MESSAGING_SENDER_ID: optionalNonEmptyString,
  VITE_FIREBASE_APP_ID: optionalNonEmptyString,
});

const clientEnvSchema = firebaseEnvSchema
  .extend({
    VITE_USE_FIREBASE_EMULATOR: z.enum(["true", "false"]).optional(),
    VITE_FIREBASE_APP_CHECK_SITE_KEY: optionalNonEmptyString,
    VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN: optionalNonEmptyString,
    VITE_OVERPASS_PROXY_URL: optionalUrl,
    VITE_TRANSIT_PROXY_URL: optionalUrl,
    VITE_TRANSITLAND_PROXY_URL: optionalUrl,
    VITE_SENTRY_DSN: optionalUrl,
    VITE_SENTRY_ENVIRONMENT: optionalNonEmptyString,
    VITE_SENTRY_RELEASE_DIST: optionalNonEmptyString,
    VITE_GA_MEASUREMENT_ID: optionalNonEmptyString,
  })
  .superRefine((env, ctx) => {
    const firebaseFields = [
      env.VITE_FIREBASE_API_KEY,
      env.VITE_FIREBASE_AUTH_DOMAIN,
      env.VITE_FIREBASE_PROJECT_ID,
      env.VITE_FIREBASE_STORAGE_BUCKET,
      env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      env.VITE_FIREBASE_APP_ID,
    ];
    const configuredCount = firebaseFields.filter(
      (value) => typeof value === "string" && value.length > 0,
    ).length;

    if (configuredCount > 0 && configuredCount < firebaseFields.length) {
      ctx.addIssue({
        code: "custom",
        message: "Firebase environment variables must all be set or all omitted.",
      });
    }
  });

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let cachedClientEnv: ClientEnv | null = null;

function readRawClientEnv(): Record<string, unknown> {
  return {
    VITE_USE_FIREBASE_EMULATOR: import.meta.env.VITE_USE_FIREBASE_EMULATOR,
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_APP_CHECK_SITE_KEY:
      import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY,
    VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN:
      import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN,
    VITE_OVERPASS_PROXY_URL: import.meta.env.VITE_OVERPASS_PROXY_URL,
    VITE_TRANSIT_PROXY_URL: import.meta.env.VITE_TRANSIT_PROXY_URL,
    VITE_TRANSITLAND_PROXY_URL: import.meta.env.VITE_TRANSITLAND_PROXY_URL,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    VITE_SENTRY_RELEASE_DIST: import.meta.env.VITE_SENTRY_RELEASE_DIST,
    VITE_GA_MEASUREMENT_ID: import.meta.env.VITE_GA_MEASUREMENT_ID,
  };
}

export function parseClientEnv(
  raw: Record<string, unknown> = readRawClientEnv(),
): ClientEnv {
  const result = clientEnvSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join("; ");
    throw new Error(`Invalid client environment: ${message}`);
  }

  return result.data;
}

export function getClientEnv(): ClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = parseClientEnv();
  }

  return cachedClientEnv;
}

export function resetClientEnvForTests(): void {
  cachedClientEnv = null;
}

export function clientEnvUsesFirebaseEmulator(env: ClientEnv = getClientEnv()): boolean {
  return env.VITE_USE_FIREBASE_EMULATOR === "true";
}

export function readFirebaseConfigFromEnv(
  env: ClientEnv = getClientEnv(),
): FirebaseClientConfig | null {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: env.VITE_FIREBASE_APP_ID ?? "",
  };

  return Object.values(config).every((value) => value.length > 0) ? config : null;
}

export function isFirebaseConfiguredFromEnv(
  env: ClientEnv = getClientEnv(),
): boolean {
  return readFirebaseConfigFromEnv(env) !== null;
}
