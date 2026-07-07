import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";
import { getClientEnv } from "../../config/env";
import { APP_VERSION } from "../../domain/device/changelog";

const SESSION_CODE_PATTERN = /\b[A-Z0-9]{4}\b/g;

function scrubEvent(
  event: Parameters<
    NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
  >[0],
): Parameters<
  NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>
>[0] | null {
  if (typeof event.message === "string") {
    event.message = event.message.replace(SESSION_CODE_PATTERN, "****");
  }

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = exception.value.replace(SESSION_CODE_PATTERN, "****");
    }
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
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
      beforeSend: scrubEvent,
    },
    SentryReact.init,
  );
}

export function captureException(error: unknown): void {
  Sentry.captureException(error);
}
