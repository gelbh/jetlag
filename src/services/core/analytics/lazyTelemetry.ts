/**
 * Fire-and-forget facades over sentry/analytics. Static imports would pull
 * posthog and @sentry into the entry critical path; dynamic import defers them.
 * Calls to one module resolve in call order (same import promise).
 */
import type { syncAnalyticsIdentity } from "./analytics";
import type {
  captureAuthBootstrapFailure,
  captureAuthPersistenceFallback,
  setBootstrapTag,
} from "./sentry";

let analyticsModule: Promise<typeof import("./analytics")> | undefined;
let sentryModule: Promise<typeof import("./sentry")> | undefined;

function loadAnalytics(): Promise<typeof import("./analytics")> {
  analyticsModule ??= import("./analytics");
  return analyticsModule;
}

function loadSentry(): Promise<typeof import("./sentry")> {
  sentryModule ??= import("./sentry");
  return sentryModule;
}

export function syncAnalyticsIdentityLazy(
  ...args: Parameters<typeof syncAnalyticsIdentity>
): void {
  void loadAnalytics()
    .then((m) => m.syncAnalyticsIdentity(...args))
    .catch(() => {});
}

export function setBootstrapTagLazy(
  ...args: Parameters<typeof setBootstrapTag>
): void {
  void loadSentry()
    .then((m) => m.setBootstrapTag(...args))
    .catch(() => {});
}

export function captureAuthBootstrapFailureLazy(
  ...args: Parameters<typeof captureAuthBootstrapFailure>
): void {
  void loadSentry()
    .then((m) => m.captureAuthBootstrapFailure(...args))
    .catch(() => {});
}

export function captureAuthPersistenceFallbackLazy(
  ...args: Parameters<typeof captureAuthPersistenceFallback>
): void {
  void loadSentry()
    .then((m) => m.captureAuthPersistenceFallback(...args))
    .catch(() => {});
}
