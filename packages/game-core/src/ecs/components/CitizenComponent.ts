import { JobType } from '../../types/jobs';
import { CitizenState, Gender, Mood, LifeGoal } from '../../types/citizens';

/**
 * Citizen component — data for a citizen NPC.
 */
export interface CitizenComponent {
  name: string;
  /** Gender of the citizen. */
  gender: Gender;
  job: JobType | null;
  state: CitizenState;
  hunger: number;
  health: number;
  /** 0-100 fatigue level; high values slow the citizen down. */
  fatigue: number;
  /** 0-100 stress level; high values affect mood negatively. */
  stress: number;
  /** Current emotional mood of the citizen. */
  mood: Mood;
  /** Age of the citizen in years. */
  age: number;
  /** Long-term life goal driving autonomous decisions. */
  lifeGoal: LifeGoal;
  /** Entity ID of the citizen's partner, or null if single. */
  partnerId: number | null;
  /** Seconds remaining before the citizen can pick a new wander destination. */
  wanderCooldown: number;
}

export const CITIZEN = 'Citizen' as const;

export function createCitizen(
  name: string,
  gender: Gender = Gender.Male,
  job: JobType | null = null,
  state: CitizenState = CitizenState.Idle,
  hunger = 100,
  health = 100,
  fatigue = 0,
  stress = 0,
  mood: Mood = Mood.Neutral,
  age = 25,
  lifeGoal: LifeGoal = LifeGoal.Survive,
  partnerId: number | null = null,
): CitizenComponent {
  return { name, gender, job, state, hunger, health, fatigue, stress, mood, age, lifeGoal, partnerId, wanderCooldown: 0 };
}

