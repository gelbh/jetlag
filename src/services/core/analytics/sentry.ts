import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";
import { getClientEnv } from "../../../config/env";
import { APP_VERSION } from "../../../domain/device/changelog";
import type { StorageEstimateSnapshot } from "../../../domain/device/pwa/pwaStorageBudget";
import {
  applyClientSentryDisposition,
  CLIENT_SENTRY_IGNORE_ERRORS,
  classifyClientSentryEvent,
  isFirestorePermissionDeniedEvent,
} from "./sentryEventPolicy";

const SESSION_CODE_PATTERN = /\b[A-Z0-9]{4}\b/g;
const REACT_REFRESH_FRAME = /@react-refresh/i;
const SENSITIVE_EXTRA_KEYS = new Set([
  "sessionId",
  "authUid",
  "memberUids",
  "uid",
]);

function scrubString(value: string): string {
  return value.replace(SESSION_CODE_PATTERN, "****");
}

function scrubUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubUnknown(entry));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const scrubbed: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (SENSITIVE_EXTRA_KEYS.has(key)) {
        scrubbed[key] = "[redacted]";
        continue;
      }
      scrubbed[key] = scrubUnknown(entry);
    }
    return scrubbed;
  }

  return value;
}

function isReactRefreshNoiseEvent(
  event: Parameters<
    NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
  >[0],
): boolean {
  if (event.environment === "development") {
    for (const exception of event.exception?.values ?? []) {
      for (const frame of exception.stacktrace?.frames ?? []) {
        if (frame.filename && REACT_REFRESH_FRAME.test(frame.filename)) {
          return true;
        }
      }
    }
  }

  return false;
}

function scrubEvent(
  event: Parameters<
    NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
  >[0],
): Parameters<
  NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
>[0] | null {
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = scrubString(exception.value);
    }
  }

  if (event.extra) {
    for (const [key, value] of Object.entries(event.extra)) {
      if (SENSITIVE_EXTRA_KEYS.has(key)) {
        event.extra[key] = "[redacted]";
        continue;
      }
      event.extra[key] = scrubUnknown(value);
    }
  }

  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (typeof breadcrumb.message === "string") {
        breadcrumb.message = scrubString(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = scrubUnknown(breadcrumb.data) as Record<string, unknown>;
      }
    }
  }

  // Side effect only — disposition still comes from classifyClientSentryEvent.
  if (isFirestorePermissionDeniedEvent(event)) {
    Sentry.addBreadcrumb({
      category: "firestore",
      message: "permission-denied",
      level: "warning",
    });
  }

  const disposition = classifyClientSentryEvent(event);
  const next = applyClientSentryDisposition(event, disposition, Math.random);
  if (!next) {
    return null;
  }

  if (isReactRefreshNoiseEvent(next)) {
    return null;
  }

  return next;
}

export function initSentry(): void {
  if (import.meta.env.MODE === "test" || import.meta.env.DEV) {
    return;
  }

  const env = getClientEnv();
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  // Forward options into @sentry/react init so beforeSend stays on the browser client.
  // ignoreErrors belt shares CLIENT_SENTRY_IGNORE_ERRORS with drop matchers (not canaries).
  Sentry.init(
    {
      dsn,
      tunnel: "/api/sentry-tunnel",
      environment: env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
      release: `jetlag@${APP_VERSION}`,
      dist: env.VITE_SENTRY_RELEASE_DIST || undefined,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
      ignoreErrors: CLIENT_SENTRY_IGNORE_ERRORS,
      integrations: [
        SentryReact.browserTracingIntegration({
          enableInp: true,
        }),
        SentryReact.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend: scrubEvent,
    },
    (browserOptions) => {
      SentryReact.init({
        ...browserOptions,
        beforeSend: scrubEvent,
        ignoreErrors: CLIENT_SENTRY_IGNORE_ERRORS,
        replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
        replaysOnErrorSampleRate: 1.0,
      });
    },
  );
}

function withSentryScope(run: (scope: Sentry.Scope) => void): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.withScope(run);
}

export function setBootstrapTag(phase: string): void {
  withSentryScope((scope) => {
    scope.setTag("bootstrap_phase", phase);
    Sentry.addBreadcrumb({
      category: "bootstrap",
      message: phase,
      level: "info",
    });
  });
}

export function captureAuthPersistenceFallback(
  mode: "session" | "memory",
  error?: unknown,
): void {
  withSentryScope((scope) => {
    scope.setTag("auth_persistence", mode);
    if (error) {
      Sentry.captureException(error);
      return;
    }
    Sentry.captureMessage(`Auth persistence fell back to ${mode}`, "warning");
  });
}

export function captureAuthBootstrapFailure(error: unknown): void {
  withSentryScope((scope) => {
    scope.setTag("bootstrap_phase", "auth_failed");
    Sentry.captureException(error);
  });
}

export type AppCheckCaptureContext = {
  source?: string;
  reason?: "timeout" | "blocked" | "error" | string;
  soft?: boolean;
};

export function captureAppCheckTokenFailure(
  error: unknown,
  context?: AppCheckCaptureContext,
): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  const soft = context?.soft === true;
  const breadcrumbData = context
    ? {
        reason: context.reason,
        source: context.source,
        soft: soft || undefined,
      }
    : undefined;

  if (soft) {
    // Soft failures must not open a temporary scope — breadcrumbs would be discarded.
    Sentry.addBreadcrumb({
      category: "app_check",
      message: "App Check soft failure",
      level: "warning",
      data: breadcrumbData,
    });
    return;
  }

  withSentryScope((scope) => {
    scope.setTag("app_check_token", "failed");
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.addBreadcrumb({
      category: "app_check",
      message: "App Check token fetch failed",
      level: "warning",
      data: breadcrumbData,
    });
    Sentry.captureException(error);
  });
}

export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

/** Expected join/heal permission-denied — breadcrumb only (no Sentry issue). */
export function reportJoinPermissionDenied(phase: "initial" | "retry"): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.addBreadcrumb({
    category: "join",
    message: "Join permission denied",
    level: "warning",
    data: { op: "join", code: "permission-denied", phase },
  });
}

export function capturePhotoUploadFailure(
  error: unknown,
  stage: "compress" | "storage" | "firestore",
  context?: Record<string, unknown>,
): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("photo_upload", stage);
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

export function capturePendingResolveFailure(
  error: unknown,
  context: { toolType: string; pendingQuestionId?: string },
): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("pending_resolve_failed", "true");
    scope.setTag("toolType", context.toolType);
    if (context.pendingQuestionId) {
      scope.setExtra("pendingQuestionId", context.pendingQuestionId);
    }
    Sentry.addBreadcrumb({
      category: "pending.resolve",
      message: "Pending question resolve failed",
      level: "error",
      data: {
        toolType: context.toolType,
        pendingQuestionId: context.pendingQuestionId,
      },
    });
    Sentry.captureException(error);
  });
}

export function addPhotoUploadBreadcrumb(details: Record<string, unknown>): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.addBreadcrumb({
    category: "photo.upload",
    message: "Photo upload attempt",
    level: "info",
    data: details,
  });
}

export interface SlowRouteTransitionDetails {
  preload_ms: number;
  ready_wait_ms: number;
  total_ms: number;
  target_path: string;
  final_path: string;
  readiness_kind: string;
  warm_chunk: boolean;
  warm_ready: boolean;
}

export function reportSlowRouteTransition(
  details: SlowRouteTransitionDetails,
): void {
  if (import.meta.env.MODE === "test" || details.total_ms <= 2000) {
    return;
  }

  withSentryScope((scope) => {
    scope.setTag("route_transition", "slow");
    scope.setTag("readiness_kind", details.readiness_kind);
    scope.setTag("warm_chunk", String(details.warm_chunk));
    scope.setTag("warm_ready", String(details.warm_ready));
    for (const [key, value] of Object.entries(details)) {
      scope.setExtra(key, value);
    }
    Sentry.addBreadcrumb({
      category: "route_transition",
      message: "Slow route transition",
      level: "warning",
      data: details,
    });
  });
}

export interface AppResumeContext {
  pathname: string;
  backgroundMs: number;
  standalone: boolean;
  iosStandalone: boolean;
}

export function addAppResumeBreadcrumb(context: AppResumeContext): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.addBreadcrumb({
    category: "app.resume",
    message: "App resumed",
    level: "info",
    data: context,
  });
}

export function addPwaStoragePressureBreadcrumb(
  snapshot: StorageEstimateSnapshot,
): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  Sentry.addBreadcrumb({
    category: "pwa.storage",
    message: "PWA storage over soft cap",
    level: "warning",
    data: snapshot,
  });
}

export function captureResumeShellUnresponsive(
  context: Omit<AppResumeContext, "backgroundMs"> & {
    backgroundMs: number;
    adminRoute?: boolean;
  },
): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  withSentryScope((scope) => {
    scope.setTag("resume_watchdog", "unresponsive");
    scope.setTag("standalone", String(context.standalone));
    scope.setTag("ios_standalone", String(context.iosStandalone));
    scope.setExtra("pathname", context.pathname);
    scope.setExtra("backgroundMs", context.backgroundMs);
    if (context.adminRoute) {
      scope.setExtra("admin_route", true);
    }
    Sentry.addBreadcrumb({
      category: "app.resume",
      message: "resume_shell_unresponsive",
      level: "error",
      data: context,
    });
    Sentry.captureMessage("resume_shell_unresponsive", "error");
  });
}

export function addIdbDeleteFailureBreadcrumb(error: unknown): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "IndexedDB delete failed";

  Sentry.addBreadcrumb({
    category: "idb",
    message: "IndexedDB delete failed",
    level: "warning",
    data: { message },
  });
}

