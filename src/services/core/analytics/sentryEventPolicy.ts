/**
 * Client Sentry drop / keep / meter policy.
 * Retuned or newly added denylist entries require a production message fixture in tests.
 */
import {
  isAppCheckSoftFailureMessage,
  isBrowserExtensionNoiseMessage,
  isFirestoreIdbPersistenceNoiseMessage,
  isIdbConnectionClosingMessage,
  isRecaptchaOtTypeErrorMessage,
  isRecaptchaTimeoutMessage,
} from "../network/clientNoiseErrors";
import { isHtml2CanvasUnsupportedColorMessage } from "../capture/html2canvasErrors";
import { isExpectedSessionLeaveMessage } from "../../session/sessionLeaveErrors";

export const QUOTA_SAMPLE_RATE = 0.05;

const STORAGE_QUOTA_EXCEEDED = /quota has been exceeded/i;
const FIRESTORE_PERMISSION_DENIED =
  /missing or insufficient permissions/i;
const AUTH_NETWORK_FAILED = /auth\/network-request-failed/i;
const STORAGE_UNAUTHORIZED = /storage\/unauthorized/i;
const LEAFLET_POS_ERROR = /_leaflet_pos/i;
const LEAFLET_CLASSLIST_ERROR = /evaluating 'e\.classList'/i;
const BATTERY_ADD_EVENT_LISTENER = /addEventListener is not a function/i;
const IDB_DATABASE_DELETED = /Database deleted by request of the user/i;
const RECAPTCHA_ALREADY_RENDERED = /reCAPTCHA has already been rendered/i;
const VIEW_TRANSITION_ABORTED =
  /Transition was aborted because of invalid state/i;
const APP_CHECK_INVALID_SESSION = /Invalid session .*: Invalid input/i;

/** Belt-and-suspenders for Sentry.init ignoreErrors — high-volume drop subset only (not the full classify matrix; not canaries). */
export const CLIENT_SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  "This operation was aborted",
  "App Check probe timed out",
  /appCheck\/(?:initial-throttle|throttled)/i,
  "Session already ended.",
  "Only the host can do that.",
];

export type SentryEventLike = {
  type?: string;
  message?: string;
  exception?: { values?: Array<{ type?: string; value?: string }> };
  fingerprint?: string[];
  level?: string;
  spans?: Array<{ description?: string }>;
};

export type ClientSentryDisposition = "drop" | "send" | "meter_quota";

function isGenericClientNoiseMessage(message: string): boolean {
  return (
    IDB_DATABASE_DELETED.test(message) ||
    isIdbConnectionClosingMessage(message) ||
    isFirestoreIdbPersistenceNoiseMessage(message) ||
    isHtml2CanvasUnsupportedColorMessage(message) ||
    RECAPTCHA_ALREADY_RENDERED.test(message) ||
    isRecaptchaTimeoutMessage(message) ||
    VIEW_TRANSITION_ABORTED.test(message) ||
    isExpectedSessionLeaveMessage(message) ||
    isBrowserExtensionNoiseMessage(message) ||
    isAppCheckSoftFailureMessage(message)
  );
}

/** True when any exception is Firebase permission-denied (for breadcrumb side effect). */
export function isFirestorePermissionDeniedEvent(
  event: SentryEventLike,
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

/**
 * Classify whether a client Sentry event should drop, send, or meter quota.
 * Does not filter module-script import failures or WebKit "Load failed" canaries.
 */
export function classifyClientSentryEvent(
  event: SentryEventLike,
): ClientSentryDisposition {
  if (event.type === "transaction") {
    const hasOverpassSpan = event.spans?.some((span) =>
      span.description?.includes("proxy/overpass"),
    );
    if (hasOverpassSpan) {
      return "drop";
    }
  }

  for (const exception of event.exception?.values ?? []) {
    const value = exception.value;
    if (typeof value !== "string") {
      continue;
    }

    if (
      exception.type === "QuotaExceededError" &&
      STORAGE_QUOTA_EXCEEDED.test(value)
    ) {
      return "meter_quota";
    }

    if (
      exception.type === "FirebaseError" &&
      FIRESTORE_PERMISSION_DENIED.test(value)
    ) {
      return "drop";
    }

    if (
      exception.type === "FirebaseError" &&
      (AUTH_NETWORK_FAILED.test(value) || STORAGE_UNAUTHORIZED.test(value))
    ) {
      return "drop";
    }

    if (exception.type === "AbortError" && /aborted/i.test(value)) {
      return "drop";
    }

    if (
      exception.type === "ReferenceError" &&
      /window is not defined/i.test(value)
    ) {
      return "drop";
    }

    if (
      exception.type === "TypeError" &&
      (LEAFLET_POS_ERROR.test(value) ||
        LEAFLET_CLASSLIST_ERROR.test(value) ||
        BATTERY_ADD_EVENT_LISTENER.test(value) ||
        isRecaptchaOtTypeErrorMessage(value))
    ) {
      return "drop";
    }

    if (
      exception.type === "Error" &&
      APP_CHECK_INVALID_SESSION.test(value)
    ) {
      return "drop";
    }

    if (isGenericClientNoiseMessage(value)) {
      return "drop";
    }
  }

  if (
    typeof event.message === "string" &&
    isGenericClientNoiseMessage(event.message)
  ) {
    return "drop";
  }

  return "send";
}

/**
 * Apply disposition. Mutates `event` in place for meter_quota (fingerprint/level)
 * so Sentry beforeSend can return the same object reference.
 */
export function applyClientSentryDisposition<T extends SentryEventLike>(
  event: T,
  disposition: ClientSentryDisposition,
  random: () => number,
): T | null {
  switch (disposition) {
    case "drop":
      return null;
    case "send":
      return event;
    case "meter_quota": {
      if (random() >= QUOTA_SAMPLE_RATE) {
        return null;
      }
      event.fingerprint = ["storage-quota-exceeded"];
      event.level = "warning";
      return event;
    }
    default: {
      const _exhaustive: never = disposition;
      return _exhaustive;
    }
  }
}
