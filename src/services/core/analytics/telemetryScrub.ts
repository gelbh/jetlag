/**
 * Shared sensitive-string scrubbing for Sentry beforeSend and PostHog exception sinks.
 */

export const SESSION_CODE_PATTERN = /\b[A-Z0-9]{4}\b/g;

export const SENSITIVE_EXTRA_KEYS = new Set(["sessionId", "authUid", "memberUids", "uid"]);

export function scrubString(value: string): string {
  return value.replace(SESSION_CODE_PATTERN, "****");
}

export function scrubUnknown(value: unknown): unknown {
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

/** Clone Errors so scrubbing does not mutate caller-owned instances. */
export function scrubTelemetryError(error: unknown): unknown {
  if (typeof error === "string") {
    return scrubString(error);
  }
  if (!(error instanceof Error)) {
    return error;
  }
  const scrubbed = new Error(scrubString(error.message));
  scrubbed.name = scrubString(error.name);
  if (typeof error.stack === "string") {
    scrubbed.stack = scrubString(error.stack);
  }
  return scrubbed;
}

/** Scrub PostHog `$exception` capture properties before they leave the device. */
export function scrubPosthogExceptionProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!properties) {
    return properties;
  }

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (SENSITIVE_EXTRA_KEYS.has(key)) {
      scrubbed[key] = "[redacted]";
      continue;
    }
    if (key === "$exception_list" && Array.isArray(value)) {
      scrubbed[key] = value.map((entry) => {
        if (!entry || typeof entry !== "object") {
          return entry;
        }
        const record = { ...(entry as Record<string, unknown>) };
        if (typeof record.value === "string") {
          record.value = scrubString(record.value);
        }
        if (typeof record.type === "string") {
          record.type = scrubString(record.type);
        }
        return record;
      });
      continue;
    }
    scrubbed[key] = scrubUnknown(value);
  }
  return scrubbed;
}
