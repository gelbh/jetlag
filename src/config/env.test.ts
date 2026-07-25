import { afterEach, describe, expect, it } from "vitest";
import {
  parseClientEnv,
  readFirebaseConfigFromEnv,
  resetClientEnvForTests,
} from "./env";

const validFirebaseEnv = {
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "demo.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "demo-jetlag",
  VITE_FIREBASE_STORAGE_BUCKET: "demo-jetlag.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  VITE_FIREBASE_APP_ID: "1:1234567890:web:demo",
};

describe("parseClientEnv", () => {
  afterEach(() => {
    resetClientEnvForTests();
  });

  it("accepts a complete Firebase configuration", () => {
    const env = parseClientEnv(validFirebaseEnv);

    expect(readFirebaseConfigFromEnv(env)).toEqual({
      apiKey: "demo-api-key",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-jetlag",
      storageBucket: "demo-jetlag.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:demo",
    });
  });

  it("accepts missing Firebase configuration", () => {
    const env = parseClientEnv({});

    expect(readFirebaseConfigFromEnv(env)).toBeNull();
  });

  it("rejects partial Firebase configuration", () => {
    expect(() =>
      parseClientEnv({
        ...validFirebaseEnv,
        VITE_FIREBASE_APP_ID: "",
      }),
    ).toThrow(/Firebase environment variables must all be set or all omitted/);
  });

  it("accepts optional proxy, Sentry, and PostHog vars", () => {
    const env = parseClientEnv({
      ...validFirebaseEnv,
      VITE_OVERPASS_PROXY_URL: "https://proxy.example/overpass",
      VITE_SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      VITE_SENTRY_ENVIRONMENT: "production",
      VITE_POSTHOG_KEY: "phc_test_key",
    });

    expect(env.VITE_OVERPASS_PROXY_URL).toBe("https://proxy.example/overpass");
    expect(env.VITE_SENTRY_ENVIRONMENT).toBe("production");
    expect(env.VITE_POSTHOG_KEY).toBe("phc_test_key");
  });


  it("accepts optional geometry mask kernel mode", () => {
    const env = parseClientEnv({
      ...validFirebaseEnv,
      VITE_GEOMETRY_MASK_KERNEL: "dual",
    });

    expect(env.VITE_GEOMETRY_MASK_KERNEL).toBe("dual");
  });

  it("omits empty or invalid geometry mask kernel mode", () => {
    expect(
      parseClientEnv({
        ...validFirebaseEnv,
        VITE_GEOMETRY_MASK_KERNEL: "",
      }).VITE_GEOMETRY_MASK_KERNEL,
    ).toBeUndefined();

    expect(
      parseClientEnv({
        ...validFirebaseEnv,
        VITE_GEOMETRY_MASK_KERNEL: "nope",
      }).VITE_GEOMETRY_MASK_KERNEL,
    ).toBeUndefined();
  });

  it("rejects invalid proxy URLs", () => {
    expect(() =>
      parseClientEnv({
        ...validFirebaseEnv,
        VITE_TRANSIT_PROXY_URL: "not-a-url",
      }),
    ).toThrow(/Invalid client environment/);
  });
});
