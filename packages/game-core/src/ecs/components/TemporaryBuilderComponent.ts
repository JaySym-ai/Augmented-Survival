import { JobType } from '../../types/jobs';

/**
 * Temporary builder component — stores a villager's previous job while they
 * temporarily serve as a Builder for a specific construction site.
 */
export interface TemporaryBuilderComponent {
  /** The job the citizen held before being reassigned as a temporary builder */
  previousJobType: JobType;
  /** The building entity this temporary builder is assigned to construct */
  targetBuilding: number;
}

export const TEMPORARY_BUILDER = 'TemporaryBuilder' as const;

export function createTemporaryBuilder(
  previousJobType: JobType,
  targetBuilding: number,
): TemporaryBuilderComponent {
  return { previousJobType, targetBuilding };
}

