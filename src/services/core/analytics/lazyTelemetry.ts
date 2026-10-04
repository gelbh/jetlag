/**
 * Fire-and-forget facades over sentry/analytics. Static imports would pull
 * posthog and @sentry into the entry critical path; dynamic import defers them.
 * Calls to one module resolve in call order (same import promise).
 */
import { writeAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import type { syncAnalyticsIdentity, trackPageView } from "./analytics";
import type {
  addRecoverableErrorBreadcrumb,
  captureAuthBootstrapFailure,
  captureAuthPersistenceFallback,
  captureErrorBoundaryException,
  captureException,
  reportSlowRouteTransition,
  setBootstrapTag,
  setTransactionName,
  syncSentryUser,
} from "./sentry";

let analyticsModule: Promise<typeof import("./analytics")> | undefined;
let sentryModule: Promise<typeof import("./sentry")> | undefined;

function loadAnalytics(): Promise<typeof import("./analytics")> {
  analyticsModule ??= import("./analytics").catch((error: unknown) => {
    // Let a later call retry after a transient chunk-load failure.
    analyticsModule = undefined;
    throw error;
  });
  return analyticsModule;
}

function loadSentry(): Promise<typeof import("./sentry")> {
  sentryModule ??= import("./sentry").catch((error: unknown) => {
    sentryModule = undefined;
    throw error;
  });
  return sentryModule;
}

export function syncAnalyticsIdentityLazy(...args: Parameters<typeof syncAnalyticsIdentity>): void {
  void loadAnalytics()
    .then((m) => m.syncAnalyticsIdentity(...args))
    .catch(() => {});
}

export function syncSentryUserLazy(...args: Parameters<typeof syncSentryUser>): void {
  void loadSentry()
    .then((m) => m.syncSentryUser(...args))
    .catch(() => {});
}

export function setBootstrapTagLazy(...args: Parameters<typeof setBootstrapTag>): void {
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

export function trackPageViewLazy(...args: Parameters<typeof trackPageView>): void {
  void loadAnalytics()
    .then((m) => m.trackPageView(...args))
    .catch(() => {});
}

export function captureExceptionLazy(...args: Parameters<typeof captureException>): void {
  void loadSentry()
    .then((m) => m.captureException(...args))
    .catch(() => {});
}

export function setTransactionNameLazy(...args: Parameters<typeof setTransactionName>): void {
  void loadSentry()
    .then((m) => m.setTransactionName(...args))
    .catch(() => {});
}

export function captureErrorBoundaryExceptionLazy(
  ...args: Parameters<typeof captureErrorBoundaryException>
): void {
  void loadSentry()
    .then((m) => m.captureErrorBoundaryException(...args))
    .catch(() => {});
}

export function addRecoverableErrorBreadcrumbLazy(
  ...args: Parameters<typeof addRecoverableErrorBreadcrumb>
): void {
  void loadSentry()
    .then((m) => m.addRecoverableErrorBreadcrumb(...args))
    .catch(() => {});
}

export function reportSlowRouteTransitionLazy(
  ...args: Parameters<typeof reportSlowRouteTransition>
): void {
  void loadSentry()
    .then((m) => m.reportSlowRouteTransition(...args))
    .catch(() => {});
}

/** Persists consent synchronously; posthog init/opt-out follows once loaded. */
export function grantAnalyticsConsentLazy(): void {
  writeAnalyticsConsent("granted");
  void loadAnalytics()
    .then((m) => m.grantAnalyticsConsent())
    .catch(() => {});
}

export function denyAnalyticsConsentLazy(): void {
  writeAnalyticsConsent("denied");
  void loadAnalytics()
    .then((m) => m.denyAnalyticsConsent())
    .catch(() => {});
}
