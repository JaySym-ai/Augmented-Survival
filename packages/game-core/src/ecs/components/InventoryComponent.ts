import { ResourceType } from '../../types/resources';

/**
 * Inventory component — stores resources carried or held by an entity.
 */
export interface InventoryComponent {
  items: Map<ResourceType, number>;
  capacity: number;
}

export const INVENTORY = 'Inventory' as const;

export function createInventory(capacity = 10): InventoryComponent {
  return { items: new Map(), capacity };
}

