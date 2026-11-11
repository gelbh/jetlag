const PERMISSION_DENIED_MESSAGE = "Missing or insufficient permissions.";

export function readFirebaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

/**
 * Normalize Firebase diagnostic codes onto `$exception` properties.
 * Maps legacy `code` → `firebase_code`, and infers `permission-denied`
 * from the stable FirebaseError message when autocapture omitted the code.
 */
export function enrichFirebaseExceptionProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!properties) {
    return properties;
  }

  const next: Record<string, unknown> = { ...properties };

  if ("code" in next) {
    if (next.firebase_code === undefined && typeof next.code === "string") {
      next.firebase_code = next.code;
    }
    delete next.code;
  }

  if (next.firebase_code === undefined) {
    const list = next.$exception_list;
    if (Array.isArray(list)) {
      for (const entry of list) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const record = entry as Record<string, unknown>;
        if (typeof record.code === "string" && record.code.length > 0) {
          next.firebase_code = record.code;
          break;
        }
        if (record.type === "FirebaseError" && record.value === PERMISSION_DENIED_MESSAGE) {
          next.firebase_code = "permission-denied";
          break;
        }
      }
    }
  }

  return next;
}
