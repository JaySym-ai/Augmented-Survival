import { ResourceType } from '../../types/resources';

/**
 * Construction site component — tracks building construction progress.
 */
export interface ConstructionSiteComponent {
  requiredMaterials: Map<ResourceType, number>;
  deliveredMaterials: Map<ResourceType, number>;
  progress: number;
}

export const CONSTRUCTION_SITE = 'ConstructionSite' as const;

export function createConstructionSite(
  requiredMaterials: Map<ResourceType, number>,
): ConstructionSiteComponent {
  return {
    requiredMaterials,
    deliveredMaterials: new Map(),
    progress: 0,
  };
}

