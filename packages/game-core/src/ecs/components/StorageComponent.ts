import { ResourceType } from '../../types/resources';

/**
 * Storage component — a building or entity that stores resources.
 */
export interface StorageComponent {
  stored: Map<ResourceType, number>;
  capacity: number;
}

export const STORAGE = 'Storage' as const;

export function createStorage(capacity: number): StorageComponent {
  return { stored: new Map(), capacity };
}

