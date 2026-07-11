import { cacheTtlMsForKey, writeMemoryEntry } from "./memory";

export const DB_NAME = "jetlag-geographic-cache";
export const STORE_NAME = "entries";
export const DB_VERSION = 1;

interface PersistedCacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
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

export async function readPersistedEntryIgnoringExpiry<T>(
  key: string,
): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    const entry = await new Promise<PersistedCacheEntry<T> | undefined>(
      (resolve, reject) => {
        request.onsuccess = () =>
          resolve(request.result as PersistedCacheEntry<T> | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error("Cache read failed"));
      },
    );

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache read failed"));
    });

    if (!entry) {
      return undefined;
    }

    return entry.value;
  } catch {
    return undefined;
  }
}

export async function readPersistedEntry<T>(key: string): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    const entry = await new Promise<PersistedCacheEntry<T> | undefined>(
      (resolve, reject) => {
        request.onsuccess = () =>
          resolve(request.result as PersistedCacheEntry<T> | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error("Cache read failed"));
      },
    );

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache read failed"));
    });

    if (!entry || entry.expiresAt <= Date.now()) {
      return undefined;
    }

    writeMemoryEntry(key, entry.value);
    return entry.value;
  } catch {
    return undefined;
  }
}

export async function writePersistedEntry<T>(key: string, value: T): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({
      key,
      value,
      expiresAt: Date.now() + cacheTtlMsForKey(key),
    } satisfies PersistedCacheEntry<T>);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache write failed"));
    });
  } catch {
    // Ignore persistence failures; memory cache still helps this session.
  }
}

export async function clearPersistedCacheForTests(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache clear failed"));
    });
  } catch {
    // Ignore persistence failures in tests.
  }
}
