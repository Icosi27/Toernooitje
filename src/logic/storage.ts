/**
 * Opslag voor de persist-blob van de app. IndexedDB waar het kan — geen
 * ~5MB-localStorage-quota meer, dus teamlogo's en sponsorafbeeldingen passen
 * ruim — met een synchrone localStorage-fallback voor omgevingen zonder
 * IndexedDB (tests, oude browsers, sommige private-modes).
 *
 * Bevat een eenmalige migratie: bestaande data in localStorage verhuist bij
 * de eerste load naar IndexedDB en wordt daarna uit localStorage verwijderd
 * om de quota vrij te maken.
 */

const DB_NAME = "toernooitje";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function idbGet(key: string): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbSet(key: string, value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function idbDel(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

interface AppStorageHooks {
  /** aangeroepen als een write definitief mislukt (opslag vol/geblokkeerd) */
  onWriteError?: () => void;
  /** aangeroepen zodra een write weer slaagt */
  onWriteOk?: () => void;
}

interface StateStorageLike {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

export function createAppStorage(hooks: AppStorageHooks = {}): StateStorageLike {
  if (typeof indexedDB === "undefined") {
    // synchrone fallback: identiek aan het oude gedrag (incl. quota-signaal)
    return {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => {
        try {
          localStorage.setItem(name, value);
          hooks.onWriteOk?.();
        } catch {
          hooks.onWriteError?.();
        }
      },
      removeItem: (name) => localStorage.removeItem(name),
    };
  }

  return {
    async getItem(name) {
      try {
        const v = await idbGet(name);
        if (v !== null) return v;
        // eenmalige migratie vanaf localStorage
        const legacy = localStorage.getItem(name);
        if (legacy !== null) {
          await idbSet(name, legacy);
          localStorage.removeItem(name);
          return legacy;
        }
        return null;
      } catch {
        return localStorage.getItem(name);
      }
    },
    async setItem(name, value) {
      try {
        await idbSet(name, value);
        hooks.onWriteOk?.();
      } catch {
        try {
          localStorage.setItem(name, value);
          hooks.onWriteOk?.();
        } catch {
          hooks.onWriteError?.();
        }
      }
    },
    async removeItem(name) {
      try {
        await idbDel(name);
      } catch {
        // dan alleen de localStorage-kopie
      }
      localStorage.removeItem(name);
    },
  };
}
