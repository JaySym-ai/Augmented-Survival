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
};

