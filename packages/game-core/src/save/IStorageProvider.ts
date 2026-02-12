/**
 * Platform-agnostic storage interface for save data.
 * Implementations can target localStorage, IndexedDB, filesystem, etc.
 */
export interface IStorageProvider {
  /** Save data to a key. */
  save(key: string, data: string): Promise<void>;

  /** Load data from a key. Returns null if not found. */
  load(key: string): Promise<string | null>;

  /** List all save keys. */
  list(): Promise<string[]>;

  /** Delete a save by key. */
  delete(key: string): Promise<void>;
}

