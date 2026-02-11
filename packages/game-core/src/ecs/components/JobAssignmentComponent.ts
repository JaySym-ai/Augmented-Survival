import { JobType } from '../../types/jobs';

/**
 * Job assignment component — links a citizen to a specific job and workplace.
 */
export interface JobAssignmentComponent {
  jobType: JobType;
  workplaceEntity: number | null;
}

export const JOB_ASSIGNMENT = 'JobAssignment' as const;

export function createJobAssignment(
  jobType: JobType,
  workplaceEntity: number | null = null,
): JobAssignmentComponent {
  return { jobType, workplaceEntity };
}

