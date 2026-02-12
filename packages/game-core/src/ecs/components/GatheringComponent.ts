import { ResourceType } from '../../types/resources';

/**
 * Gathering component — tracks an entity's resource gathering activity.
 */
export interface GatheringComponent {
  targetEntity: number | null;
  gatherTime: number;
  elapsed: number;
  resourceType: ResourceType;
}

export const GATHERING = 'Gathering' as const;

export function createGathering(
  resourceType: ResourceType,
  gatherTime: number,
  targetEntity: number | null = null,
): GatheringComponent {
  return { targetEntity, gatherTime, elapsed: 0, resourceType };
}

