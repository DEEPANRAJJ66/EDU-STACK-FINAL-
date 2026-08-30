// Safe Local & Session Storage with in-memory fallback for sandboxed iframes

const inMemoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage access blocked by iframe policy
    }
    return inMemoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage access blocked by iframe policy
    }
    inMemoryStore[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access blocked by iframe policy
    }
    delete inMemoryStore[key];
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Storage access blocked by iframe policy
    }
    for (const k of Object.keys(inMemoryStore)) {
      delete inMemoryStore[k];
    }
  },
};
