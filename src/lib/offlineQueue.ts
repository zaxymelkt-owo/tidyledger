/** IndexedDB offline queue for field actions when network is unavailable */

const DB_NAME = 'tidyledger-offline'
const STORE = 'queue'
const DB_VERSION = 1

export type OfflineActionType = 'checkin' | 'photo_meta' | 'signature_meta' | 'job_status'

export type OfflineAction = {
  id: string
  type: OfflineActionType
  payload: Record<string, unknown>
  createdAt: string
  retries: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueue(action: Omit<OfflineAction, 'id' | 'createdAt' | 'retries'>): Promise<string> {
  const db = await openDb()
  const id = crypto.randomUUID()
  const row: OfflineAction = {
    id,
    type: action.type,
    payload: action.payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(row)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return id
}

export async function listQueue(): Promise<OfflineAction[]> {
  const db = await openDb()
  const rows = await new Promise<OfflineAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as OfflineAction[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function bumpRetry(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const row = getReq.result as OfflineAction | undefined
      if (row) {
        row.retries += 1
        store.put(row)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
