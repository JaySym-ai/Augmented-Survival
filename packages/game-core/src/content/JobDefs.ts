/**
 * Data-driven job definitions for all job types.
 */
import { JobType } from '../types/jobs.js';
import { ResourceType } from '../types/resources.js';

export interface JobDef {
  type: JobType;
  displayName: string;
  targetResource: ResourceType | null;
  description: string;
}

export const JOB_DEFS: Record<JobType, JobDef> = {
  [JobType.Idle]: {
    type: JobType.Idle,
    displayName: 'Idle',
    targetResource: null,
    description: 'Unassigned citizen waiting for work.',
  },
  [JobType.Woodcutter]: {
    type: JobType.Woodcutter,
    displayName: 'Woodcutter',
    targetResource: ResourceType.Wood,
    description: 'Chops trees to gather wood.',
  },
  [JobType.Farmer]: {
    type: JobType.Farmer,
    displayName: 'Farmer',
    targetResource: ResourceType.Food,
    description: 'Tends crops to produce food.',
  },
  [JobType.Quarrier]: {
    type: JobType.Quarrier,
    displayName: 'Quarrier',
    targetResource: ResourceType.Stone,
    description: 'Mines stone from rock deposits.',
  },
  [JobType.Builder]: {
    type: JobType.Builder,
    displayName: 'Builder',
    targetResource: null,
    description: 'Constructs buildings at construction sites.',
  },
  [JobType.Hauler]: {
    type: JobType.Hauler,
    displayName: 'Hauler',
    targetResource: null,
    description: 'Carries resources between buildings.',
  },
};

