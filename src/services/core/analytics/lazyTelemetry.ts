import { writeAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import type { syncAnalyticsIdentity, trackPageView } from "./analytics";
import type { AnalyticsEventName, AnalyticsEventProps } from "./analyticsEvents";
import type {
  captureAuthBootstrapFailure,
  captureAuthPersistenceFallback,
  captureErrorBoundaryException,
  captureException,
} from "./clientErrors";

let analyticsModule: Promise<typeof import("./analytics")> | undefined;
let clientErrorsModule: Promise<typeof import("./clientErrors")> | undefined;

function loadAnalytics(): Promise<typeof import("./analytics")> {
  analyticsModule ??= import("./analytics").catch((error: unknown) => {
    analyticsModule = undefined;
    throw error;
  });
  return analyticsModule;
}

function loadClientErrors(): Promise<typeof import("./clientErrors")> {
  clientErrorsModule ??= import("./clientErrors").catch((error: unknown) => {
    clientErrorsModule = undefined;
    throw error;
  });
  return clientErrorsModule;
}

export function syncAnalyticsIdentityLazy(...args: Parameters<typeof syncAnalyticsIdentity>): void {
  void loadAnalytics()
    .then((m) => m.syncAnalyticsIdentity(...args))
    .catch(() => {});
}

export function captureAuthBootstrapFailureLazy(
  ...args: Parameters<typeof captureAuthBootstrapFailure>
): void {
  void loadClientErrors()
    .then((m) => m.captureAuthBootstrapFailure(...args))
    .catch(() => {});
}

export function captureAuthPersistenceFallbackLazy(
  ...args: Parameters<typeof captureAuthPersistenceFallback>
): void {
  void loadClientErrors()
    .then((m) => m.captureAuthPersistenceFallback(...args))
    .catch(() => {});
}

export function trackPageViewLazy(...args: Parameters<typeof trackPageView>): void {
  void loadAnalytics()
    .then((m) => m.trackPageView(...args))
    .catch(() => {});
}

export function trackLazy<E extends AnalyticsEventName>(
  event: E,
  props?: AnalyticsEventProps[E],
): void {
  void loadAnalytics()
    .then((m) => m.track(event, props))
    .catch(() => {});
}

export function captureExceptionLazy(...args: Parameters<typeof captureException>): void {
  void loadClientErrors()
    .then((m) => m.captureException(...args))
    .catch(() => {});
}

export function captureErrorBoundaryExceptionLazy(
  ...args: Parameters<typeof captureErrorBoundaryException>
): void {
  void loadClientErrors()
    .then((m) => m.captureErrorBoundaryException(...args))
    .catch(() => {});
}

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
