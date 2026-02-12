import { ResourceType } from '../../types/resources';

/**
 * Gathering component — tracks an entity's resource gathering activity.
 * Supports hit-based gathering: totalHits strikes over gatherTime seconds.
 */
export interface GatheringComponent {
  targetEntity: number | null;
  gatherTime: number;
  elapsed: number;
  resourceType: ResourceType;
  /** Total hits needed to complete gathering (e.g. 3–6) */
  totalHits: number;
  /** Hits completed so far */
  currentHits: number;
  /** Seconds between each hit (= gatherTime / totalHits) */
  hitInterval: number;
  /** Time accumulated toward the next hit */
  hitElapsed: number;
}

export const GATHERING = 'Gathering' as const;

export function createGathering(
  resourceType: ResourceType,
  gatherTime: number,
  targetEntity: number | null = null,
  totalHits = 1,
  currentHits = 0,
): GatheringComponent {
  return {
    targetEntity,
    gatherTime,
    elapsed: 0,
    resourceType,
    totalHits,
    currentHits,
    hitInterval: gatherTime / totalHits,
    hitElapsed: 0,
  };
}

