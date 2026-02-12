import { ResourceType } from '../../types/resources';

/**
 * Construction site component — tracks building construction progress.
 */
export interface ConstructionSiteComponent {
  requiredMaterials: Map<ResourceType, number>;
  deliveredMaterials: Map<ResourceType, number>;
  /** Normalized progress 0.0–1.0 */
  progress: number;
  /** Total seconds required to build */
  buildTime: number;
  /** Elapsed seconds of construction work */
  buildProgress: number;
}

export const CONSTRUCTION_SITE = 'ConstructionSite' as const;

export function createConstructionSite(
  requiredMaterials: Map<ResourceType, number>,
  buildTime = 0,
): ConstructionSiteComponent {
  return {
    requiredMaterials,
    deliveredMaterials: new Map(),
    progress: 0,
    buildTime,
    buildProgress: 0,
  };
}

