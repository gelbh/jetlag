import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";
import { getClientEnv } from "../../config/env";
import { APP_VERSION } from "../../domain/device/changelog";

const SESSION_CODE_PATTERN = /\b[A-Z0-9]{4}\b/g;
const FIRESTORE_PERMISSION_DENIED =
  /missing or insufficient permissions/i;
const STORAGE_QUOTA_EXCEEDED = /quota has been exceeded/i;
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

function isFirestorePermissionDeniedEvent(
  event: Parameters<
    NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
  >[0],
): boolean {
  for (const exception of event.exception?.values ?? []) {
    if (
      exception.type === "FirebaseError" &&
      typeof exception.value === "string" &&
      FIRESTORE_PERMISSION_DENIED.test(exception.value)
    ) {
      return true;
    }
  }

  return false;
}

function isIgnoredClientNoiseEvent(
  event: Parameters<
    NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
  >[0],
): boolean {
  if (isFirestorePermissionDeniedEvent(event)) {
    return true;
  }

  for (const exception of event.exception?.values ?? []) {
    if (
      exception.type === "QuotaExceededError" &&
      typeof exception.value === "string" &&
      STORAGE_QUOTA_EXCEEDED.test(exception.value)
    ) {
      return true;
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

  if (isIgnoredClientNoiseEvent(event)) {
    return null;
  }

  return event;
}

export function initSentry(): void {
  if (import.meta.env.MODE === "test") {
    return;
  }

  const env = getClientEnv();
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init(
    {
      dsn,
      environment: env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
      release: `jetlag@${APP_VERSION}`,
      dist: env.VITE_SENTRY_RELEASE_DIST || undefined,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
      beforeSend: scrubEvent,
    },
    SentryReact.init,
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

export function captureException(error: unknown): void {
  Sentry.captureException(error);
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
