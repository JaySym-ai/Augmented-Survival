import { JobType } from '../../types/jobs';
import { CitizenState } from '../../types/citizens';

/**
 * Citizen component — data for a citizen NPC.
 */
export interface CitizenComponent {
  name: string;
  job: JobType | null;
  state: CitizenState;
  hunger: number;
  health: number;
  /** Seconds remaining before the citizen can pick a new wander destination. */
  wanderCooldown: number;
}

export const CITIZEN = 'Citizen' as const;

export function createCitizen(
  name: string,
  job: JobType | null = null,
  state: CitizenState = CitizenState.Idle,
  hunger = 100,
  health = 100,
): CitizenComponent {
  return { name, job, state, hunger, health, wanderCooldown: 0 };
}

