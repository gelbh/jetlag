import { createRequire } from "node:module";
import type { PluginOption } from "vite";

/** EU ingest host (matches worker `posthogProxy` / `functions/lib/posthog.mjs`). */
export const POSTHOG_SOURCEMAP_HOST = "https://eu.i.posthog.com";

type PosthogRollupPluginFactory = (options: {
  personalApiKey: string;
  projectId: string;
  host?: string;
  sourcemaps?: {
    enabled?: boolean;
    releaseName?: string;
    releaseVersion?: string;
    deleteAfterUpload?: boolean;
  };
}) => PluginOption;

/**
 * Env-gated PostHog source-map upload (mirrors `createSentryPlugins`).
 * No secrets → []. Secrets present but `@posthog/rollup-plugin` missing → []
 * (install the optional CI dep when enabling upload).
 *
 * Env: `POSTHOG_PERSONAL_API_KEY` or `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`,
 * optional `POSTHOG_HOST` (defaults to EU ingest).
 */
export function createPosthogPlugins(opts: { appVersion: string }): PluginOption[] {
  const personalApiKey =
    process.env.POSTHOG_PERSONAL_API_KEY?.trim() || process.env.POSTHOG_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!(personalApiKey && projectId)) {
    return [];
  }

  const host = process.env.POSTHOG_HOST?.trim() || POSTHOG_SOURCEMAP_HOST;

  let posthogPlugin: PosthogRollupPluginFactory;
  try {
    const require = createRequire(import.meta.url);
    const mod: unknown = require("@posthog/rollup-plugin");
    if (typeof mod === "function") {
      posthogPlugin = mod as PosthogRollupPluginFactory;
    } else if (
      mod &&
      typeof mod === "object" &&
      "default" in mod &&
      typeof (mod as { default: unknown }).default === "function"
    ) {
      posthogPlugin = (mod as { default: PosthogRollupPluginFactory }).default;
    } else {
      return [];
    }
  } catch {
    return [];
  }

  return [
    posthogPlugin({
      personalApiKey,
      projectId,
      host,
      sourcemaps: {
        enabled: true,
        releaseName: `jetlag@${opts.appVersion}`,
        releaseVersion: opts.appVersion,
        deleteAfterUpload: true,
      },
    }),
  ];
}
