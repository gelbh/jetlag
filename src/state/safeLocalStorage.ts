import type { AnnotationRecord } from "../domain/map/annotations";

const JETLAG_SESSION_KEY = "jetlag-session";

type PersistedAnnotationsPayload = {
  state?: { annotations?: AnnotationRecord[] };
  version?: number;
};

export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return true;
  }
  if (error instanceof Error) {
    if (error.name === "QuotaExceededError") {
      return true;
    }
    if (/quota/i.test(error.message)) {
      return true;
    }
  }
  return false;
}

export function readSessionIdFromLocalStorage(
  storage: Pick<Storage, "getItem"> = localStorage,
): string | undefined {
  try {
    const raw = storage.getItem(JETLAG_SESSION_KEY);
    return raw
      ? (JSON.parse(raw) as { state?: { session?: { id?: string } } }).state
          ?.session?.id
      : undefined;
  } catch {
    return undefined;
  }
}

function parseAnnotationsPayload(value: string): PersistedAnnotationsPayload | null {
  try {
    return JSON.parse(value) as PersistedAnnotationsPayload;
  } catch {
    return null;
  }
}

function serializeAnnotationsPayload(
  parsed: PersistedAnnotationsPayload,
  annotations: AnnotationRecord[],
): string {
  return JSON.stringify({
    ...parsed,
    state: {
      ...parsed.state,
      annotations,
    },
  });
}

export function dropDeletedAnnotations(value: string): string {
  const parsed = parseAnnotationsPayload(value);
  if (!parsed?.state?.annotations) {
    return value;
  }

  const annotations = parsed.state.annotations.filter(
    (annotation) => annotation.status !== "deleted",
  );

  if (annotations.length === parsed.state.annotations.length) {
    return value;
  }

  return serializeAnnotationsPayload(parsed, annotations);
}

export function keepSessionAnnotations(
  value: string,
  sessionId: string | undefined = readSessionIdFromLocalStorage(),
): string {
  const parsed = parseAnnotationsPayload(value);
  if (!parsed?.state?.annotations || sessionId === undefined) {
    return value;
  }

  const annotations = parsed.state.annotations.filter(
    (annotation) => annotation.sessionId === sessionId,
  );

  if (annotations.length === parsed.state.annotations.length) {
    return value;
  }

  return serializeAnnotationsPayload(parsed, annotations);
}

function trySetItem(
  storage: Storage,
  name: string,
  value: string,
): "ok" | "quota" | "error" {
  try {
    storage.setItem(name, value);
    return "ok";
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return "quota";
    }
    throw error;
  }
}

function clearStorageItem(storage: Storage, name: string): void {
  try {
    storage.removeItem(name);
  } catch {
    // In-memory state remains; persistence is best-effort under quota pressure.
  }
}

export function safeSetItemForAnnotations(
  storage: Storage,
  name: string,
  value: string,
): void {
  if (trySetItem(storage, name, value) === "ok") {
    return;
  }

  const withoutDeleted = dropDeletedAnnotations(value);
  if (withoutDeleted !== value && trySetItem(storage, name, withoutDeleted) === "ok") {
    return;
  }

  const base = withoutDeleted !== value ? withoutDeleted : value;
  const sessionScoped = keepSessionAnnotations(base);
  if (sessionScoped !== base && trySetItem(storage, name, sessionScoped) === "ok") {
    return;
  }

  clearStorageItem(storage, name);
}

export function createSafeLocalStorage(
  base: Storage = localStorage,
  annotateKey = "jetlag-annotations",
): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  return {
    getItem: (name) => base.getItem(name),
    removeItem: (name) => base.removeItem(name),
    setItem: (name, value) => {
      if (name === annotateKey) {
        safeSetItemForAnnotations(base, name, value);
        return;
      }

      if (trySetItem(base, name, value) === "quota") {
        clearStorageItem(base, name);
      }
    },
  };
}
