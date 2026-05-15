import type { AnnotationRecord } from '../domain/annotations'

const DB_NAME = 'jetlag-offline-queue'
const STORE_NAME = 'writes'

interface QueuedWrite {
  id: string
  sessionId: string
  annotation: AnnotationRecord
  createdAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

export async function enqueueOfflineWrite(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const entry: QueuedWrite = {
    id: annotation.id,
    sessionId,
    annotation,
    createdAt: new Date().toISOString(),
  }

  store.put(entry)

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Queue write failed'))
  })

  database.close()
}

export async function readOfflineQueue(): Promise<QueuedWrite[]> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const request = store.getAll()

  const entries = await new Promise<QueuedWrite[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as QueuedWrite[]) ?? [])
    request.onerror = () => reject(request.error ?? new Error('Queue read failed'))
  })

  database.close()
  return entries
}

export async function removeOfflineWrite(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).delete(id)

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Queue delete failed'))
  })

  database.close()
}
