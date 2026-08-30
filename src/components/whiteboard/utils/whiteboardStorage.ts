import { WhiteboardDocument } from '../types';
import { safeStorage } from '../../../utils/safeStorage';

const DB_NAME = 'edustack_whiteboard_db';
const DB_VERSION = 1;
const STORE_NAME = 'whiteboard_store';
const DOC_KEY = 'active_document';
const LOCAL_STORAGE_KEY = 'edustack_whiteboard_doc';

// In-Memory document cache (ensures zero-latency instant access across section switches and component life cycles)
let memoryCachedDoc: WhiteboardDocument | null = null;

function openWhiteboardDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('Could not open IndexedDB for Whiteboard, falling back to storage/memory.');
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB open error:', err);
      resolve(null);
    }
  });
}

/**
 * Saves the Whiteboard Document to persistent IndexedDB.
 * Supports unlimited storage for high-res imported image layers and annotations.
 */
export async function saveDocumentToIndexedDB(doc: WhiteboardDocument): Promise<void> {
  try {
    const db = await openWhiteboardDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: DOC_KEY,
        doc,
        updatedAt: Date.now(),
      };
      store.put(record);

      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        console.warn('IndexedDB put transaction failed');
        resolve();
      };
    });
  } catch (err) {
    console.warn('Failed to save Whiteboard to IndexedDB:', err);
  }
}

/**
 * Loads the Whiteboard Document from persistent IndexedDB.
 */
export async function loadDocumentFromIndexedDB(): Promise<WhiteboardDocument | null> {
  try {
    const db = await openWhiteboardDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(DOC_KEY);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.doc && Array.isArray(result.doc.pages)) {
          resolve(result.doc as WhiteboardDocument);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to read Whiteboard from IndexedDB:', err);
    return null;
  }
}

/**
 * Synchronous save for immediate in-memory and lightweight safeStorage caching.
 */
export function saveWhiteboardDocSync(doc: WhiteboardDocument): void {
  memoryCachedDoc = doc;
  try {
    safeStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(doc));
  } catch (err) {
    // QuotaExceededError is expected for large base64 image collections; IndexedDB handles persistence
  }
}

/**
 * Main persistence method: writes synchronously to memory and asynchronously to IndexedDB & safeStorage.
 */
export async function saveWhiteboardDoc(doc: WhiteboardDocument): Promise<void> {
  saveWhiteboardDocSync(doc);
  await saveDocumentToIndexedDB(doc);
}

/**
 * Synchronous initial state retriever on component mount.
 */
export function getInitialWhiteboardDoc(fallbackFactory: () => WhiteboardDocument): WhiteboardDocument {
  if (memoryCachedDoc && Array.isArray(memoryCachedDoc.pages) && memoryCachedDoc.pages.length > 0) {
    return memoryCachedDoc;
  }

  try {
    const saved = safeStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        memoryCachedDoc = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('safeStorage read failed for Whiteboard:', e);
  }

  const defaultDoc = fallbackFactory();
  memoryCachedDoc = defaultDoc;
  return defaultDoc;
}

/**
 * Asynchronously hydrator to restore from IndexedDB if more recent or complete.
 */
export async function hydrateWhiteboardDoc(): Promise<WhiteboardDocument | null> {
  const fromIdb = await loadDocumentFromIndexedDB();
  if (fromIdb && Array.isArray(fromIdb.pages) && fromIdb.pages.length > 0) {
    memoryCachedDoc = fromIdb;
    return fromIdb;
  }
  return memoryCachedDoc;
}
