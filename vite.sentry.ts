import { sentryVitePlugin } from "@sentry/vite-plugin";
import type { PluginOption } from "vite";
import { resolveSentryReleaseDist } from "./vite.sentry-dist";

export { resolveSentryReleaseDist } from "./vite.sentry-dist";

export function createSentryPlugins(opts: { appVersion: string }): PluginOption[] {
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;

  if (!(sentryAuthToken && sentryOrg && sentryProject)) {
    return [];
  }

  const dist = resolveSentryReleaseDist();

  return [
    sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      url: "https://de.sentry.io",
      release: {
        name: `jetlag@${opts.appVersion}`,
        ...(dist ? { dist } : {}),
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ];
}
