import { ResourceType } from '../../types/resources';

/**
 * Carry component — what resource an entity is currently carrying.
 */
export interface CarryComponent {
  resourceType: ResourceType | null;
  amount: number;
}

export const CARRY = 'Carry' as const;

export function createCarry(
  resourceType: ResourceType | null = null,
  amount = 0,
): CarryComponent {
  return { resourceType, amount };
}

