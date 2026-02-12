/**
 * Data-driven resource definitions for all resource types.
 */
import { ResourceType } from '../types/resources.js';

export interface ResourceDef {
  type: ResourceType;
  displayName: string;
  icon: string;
  color: string;
  gatherTime: number;
  gatherAmount: number;
  carryCapacity: number;
}

export const RESOURCE_DEFS: Record<ResourceType, ResourceDef> = {
  [ResourceType.Wood]: {
    type: ResourceType.Wood,
    displayName: 'Wood',
    icon: '🪵',
    color: '#8B4513',
    gatherTime: 3,
    gatherAmount: 1,
    carryCapacity: 10,
  },
  [ResourceType.Food]: {
    type: ResourceType.Food,
    displayName: 'Food',
    icon: '🌾',
    color: '#DAA520',
    gatherTime: 4,
    gatherAmount: 1,
    carryCapacity: 8,
  },
  [ResourceType.Stone]: {
    type: ResourceType.Stone,
    displayName: 'Stone',
    icon: '🪨',
    color: '#808080',
    gatherTime: 5,
    gatherAmount: 1,
    carryCapacity: 5,
  },
  [ResourceType.Iron]: {
    type: ResourceType.Iron,
    displayName: 'Iron',
    icon: '🪙',
    color: '#A0522D',
    gatherTime: 6,
    gatherAmount: 1,
    carryCapacity: 5,
  },
  [ResourceType.Gold]: {
    type: ResourceType.Gold,
    displayName: 'Gold',
    icon: '🪙',
    color: '#FFD700',
    gatherTime: 8,
    gatherAmount: 1,
    carryCapacity: 3,
  },
  [ResourceType.Hemp]: {
    type: ResourceType.Hemp,
    displayName: 'Hemp',
    icon: '🌿',
    color: '#6B8E23',
    gatherTime: 2,
    gatherAmount: 1,
    carryCapacity: 10,
  },
  [ResourceType.Branch]: {
    type: ResourceType.Branch,
    displayName: 'Branch',
    icon: '🥢',
    color: '#8B6914',
    gatherTime: 1,
    gatherAmount: 1,
    carryCapacity: 15,
  },
};

