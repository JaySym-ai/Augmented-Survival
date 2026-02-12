import { ResourceType } from '../../types/resources';

/**
 * Resource node component — a harvestable resource in the world.
 */
export interface ResourceNodeComponent {
  type: ResourceType;
  amount: number;
  maxAmount: number;
  regenerates: boolean;
}

export const RESOURCE_NODE = 'ResourceNode' as const;

export function createResourceNode(
  type: ResourceType,
  amount: number,
  maxAmount: number,
  regenerates = false,
): ResourceNodeComponent {
  return { type, amount, maxAmount, regenerates };
}

