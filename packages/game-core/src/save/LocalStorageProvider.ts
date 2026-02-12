import type { IStorageProvider } from './IStorageProvider';

const KEY_PREFIX = 'augmented-survival:';

/**
 * Web localStorage implementation of IStorageProvider.
 * All keys are namespaced with 'augmented-survival:' prefix.
 */
export class LocalStorageProvider implements IStorageProvider {
  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(KEY_PREFIX + key, data);
    } catch (e: unknown) {
      // Handle quota exceeded errors gracefully
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new Error(
          `Save failed: localStorage quota exceeded for key "${key}". ` +
          'Try deleting old saves to free space.',
        );
      }
      throw e;
    }
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(KEY_PREFIX + key);
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        keys.push(key.slice(KEY_PREFIX.length));
      }
    }
    return keys;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(KEY_PREFIX + key);
  }
}

