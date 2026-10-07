import { afterEach, describe, expect, it } from "vitest";
import { createPosthogPlugins, POSTHOG_SOURCEMAP_HOST } from "./vite.posthog";

const ENV_KEYS = [
  "POSTHOG_PERSONAL_API_KEY",
  "POSTHOG_API_KEY",
  "POSTHOG_PROJECT_ID",
  "POSTHOG_HOST",
] as const;

describe("createPosthogPlugins", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (key in saved) {
        const value = saved[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
        delete saved[key];
      }
    }
  });

  function clearPosthogEnv(): void {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  }

  it("returns an empty list when secrets are unset", () => {
    clearPosthogEnv();
    expect(createPosthogPlugins({ appVersion: "1.2.3" })).toEqual([]);
  });

  it("returns an empty list when only the API key is set", () => {
    clearPosthogEnv();
    process.env.POSTHOG_API_KEY = "phx_test";
    expect(createPosthogPlugins({ appVersion: "1.2.3" })).toEqual([]);
  });

  it("returns an empty list when only the project id is set", () => {
    clearPosthogEnv();
    process.env.POSTHOG_PROJECT_ID = "12345";
    expect(createPosthogPlugins({ appVersion: "1.2.3" })).toEqual([]);
  });

  it("exports the EU ingest host default", () => {
    expect(POSTHOG_SOURCEMAP_HOST).toBe("https://eu.i.posthog.com");
  });
});
