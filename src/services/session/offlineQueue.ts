import type { AnnotationRecord } from "../../domain/map/annotations";

const DB_NAME = "jetlag-offline-queue";
const STORE_NAME = "writes";
const DB_VERSION = 3;
const MAX_FAILURE_COUNT = 5;
const BASE_BACKOFF_MS = 1_000;

export type QueuedWrite = {
  kind: "annotation";
  id: string;
  sessionId: string;
  annotation: AnnotationRecord;
  createdAt: string;
  failureCount?: number;
  lastFailedAt?: string;
};

let databasePromise: Promise<IDBDatabase> | null = null;
let openDatabaseHandle: IDBDatabase | null = null;

const IDB_DATABASE_DELETED = /Database deleted by request of the user/i;

function isDatabaseDeletedError(error: unknown): boolean {
  if (!(error instanceof DOMException) && !(error instanceof Error)) {
    return false;
  }

  return IDB_DATABASE_DELETED.test(error.message);
}

function resetDatabaseConnection(): void {
  openDatabaseHandle?.close();
  openDatabaseHandle = null;
  databasePromise = null;
}

async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isDatabaseDeletedError(error)) {
      throw error;
    }

    resetDatabaseConnection();
    return await operation();
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? transaction!.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (!store.indexNames.contains("sessionId")) {
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!store.indexNames.contains("kind")) {
        store.createIndex("kind", "kind", { unique: false });
      }

      if (event.oldVersion < 3) {
        const migrateRequest = store.getAll();
        migrateRequest.onsuccess = () => {
          for (const entry of migrateRequest.result as QueuedWrite[]) {
            if (entry.kind !== "annotation") {
              store.put({ ...entry, kind: "annotation" });
            }
          }
        };
      }
    };

    request.onsuccess = () => {
      openDatabaseHandle = request.result;
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("IndexedDB open failed"));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("IndexedDB upgrade blocked."));
    };
  });

  return databasePromise;
}

export function shouldRetryOfflineWrite(entry: QueuedWrite): boolean {
  const failureCount = entry.failureCount ?? 0;
  if (failureCount === 0) {
    return true;
  }

  if (failureCount >= MAX_FAILURE_COUNT) {
    return false;
  }

  const lastFailedAt = entry.lastFailedAt
    ? Date.parse(entry.lastFailedAt)
    : 0;
  const delay = BASE_BACKOFF_MS * 2 ** (failureCount - 1);
  return Date.now() >= lastFailedAt + delay;
}

export async function enqueueOfflineWrite(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  await withDatabaseRetry(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const entry: QueuedWrite = {
      kind: "annotation",
      id: annotation.id,
      sessionId,
      annotation,
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };

    store.put(entry);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Queue write failed"));
    });
  });
}

export async function readOfflineQueue(): Promise<QueuedWrite[]> {
  return withDatabaseRetry(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise<QueuedWrite[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as QueuedWrite[]) ?? []);
      request.onerror = () =>
        reject(request.error ?? new Error("Queue read failed"));
    });
  });
}

export async function readOfflineQueueForSession(
  sessionId: string,
): Promise<QueuedWrite[]> {
  return withDatabaseRetry(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("sessionId");
    const request = index.getAll(sessionId);

    return new Promise<QueuedWrite[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as QueuedWrite[]) ?? []);
      request.onerror = () =>
        reject(request.error ?? new Error("Queue read failed"));
    });
  });
}

export async function recordOfflineWriteFailure(
  id: string,
): Promise<QueuedWrite | null> {
  return withDatabaseRetry(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    const entry = await new Promise<QueuedWrite | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as QueuedWrite | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error("Queue read failed"));
    });

    if (!entry) {
      return null;
    }

    const updated: QueuedWrite = {
      ...entry,
      failureCount: (entry.failureCount ?? 0) + 1,
      lastFailedAt: new Date().toISOString(),
    };

    store.put(updated);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Queue update failed"));
    });

    return updated;
  });
}

export async function removeOfflineWrite(id: string): Promise<void> {
  await withDatabaseRetry(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Queue delete failed"));
    });
  });
}

export async function clearOfflineQueueForSession(
  sessionId: string,
): Promise<void> {
  const entries = await readOfflineQueueForSession(sessionId);
  await Promise.all(entries.map((entry) => removeOfflineWrite(entry.id)));
}

export async function countOfflineQueueForSession(
  sessionId: string,
): Promise<number> {
  const entries = await readOfflineQueueForSession(sessionId);
  return entries.length;
}
