import { EquipmentSlot } from '../../types/items.js';
import { ItemType } from '../../types/items.js';

/**
 * Equipment component — tracks items equipped in each slot on an entity.
 */
export interface EquipmentComponent {
  slots: Partial<Record<EquipmentSlot, ItemType>>;
}

export const EQUIPMENT = 'Equipment' as const;

export function createEquipment(): EquipmentComponent {
  return { slots: {} };
}

