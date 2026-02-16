import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { CitizenState, Mood } from '../types/citizens';
import type { TimeSystem } from './TimeSystem';

/** Hunger drain rate (per second) when Gathering or Building. */
const HUNGER_RATE_ACTIVE = 0.15;
/** Hunger drain rate (per second) for all other states. */
const HUNGER_RATE_PASSIVE = 0.05;

/** Fatigue increase rate (per second) when active. */
const FATIGUE_RATE_ACTIVE = 0.2;
/** Fatigue recovery rate (per second) when Idle. */
const FATIGUE_RATE_IDLE = 0.3;

/** Stress increase rate (per second) when conditions are bad. */
const STRESS_RATE_INCREASE = 0.05;
/** Stress decrease rate (per second) when conditions are good. */
const STRESS_RATE_DECREASE = 0.1;

/** Hunger threshold below which stress increases. */
const HUNGER_LOW_THRESHOLD = 30;
/** Fatigue threshold above which stress increases. */
const FATIGUE_HIGH_THRESHOLD = 70;
/** Hunger threshold above which stress can decrease. */
const HUNGER_OK_THRESHOLD = 60;
/** Fatigue threshold below which stress can decrease. */
const FATIGUE_OK_THRESHOLD = 40;

/** States considered "active" for hunger drain. */
const HUNGER_ACTIVE_STATES = new Set<CitizenState>([
  CitizenState.Gathering,
  CitizenState.Building,
]);

/** States considered "active" for fatigue increase. */
const FATIGUE_ACTIVE_STATES = new Set<CitizenState>([
  CitizenState.Gathering,
  CitizenState.Building,
  CitizenState.Carrying,
  CitizenState.Walking,
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute mood from hunger, fatigue, and stress.
 *
 * Rules (evaluated top-to-bottom, first match wins):
 * - Joyful:  hunger > 80 AND fatigue < 20 AND stress < 20
 * - Content: hunger > 60 AND fatigue < 40 AND stress < 40
 * - Angry:   stress > 70
 * - Sad:     hunger < 20 OR fatigue > 80
 * - Neutral: otherwise
 */
function computeMood(hunger: number, fatigue: number, stress: number): Mood {
  if (hunger > 80 && fatigue < 20 && stress < 20) return Mood.Joyful;
  if (hunger > 60 && fatigue < 40 && stress < 40) return Mood.Content;
  if (stress > 70) return Mood.Angry;
  if (hunger < 20 || fatigue > 80) return Mood.Sad;
  return Mood.Neutral;
}

/**
 * CitizenNeedsSystem — updates citizen fatigue, hunger, stress, and mood each tick.
 *
 * Must be registered AFTER AutoBuilderSystem and BEFORE ResourceStoreSystem.
 */
export class CitizenNeedsSystem extends System {
  constructor(private timeSystem: TimeSystem) {
    super('CitizenNeedsSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(CITIZEN);

    for (const entityId of entities) {
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
      if (!citizen) continue;

      // --- Hunger ---
      const hungerRate = HUNGER_ACTIVE_STATES.has(citizen.state)
        ? HUNGER_RATE_ACTIVE
        : HUNGER_RATE_PASSIVE;
      citizen.hunger = clamp(citizen.hunger - hungerRate * scaledDt, 0, 100);

      // --- Fatigue ---
      if (FATIGUE_ACTIVE_STATES.has(citizen.state)) {
        citizen.fatigue = clamp(citizen.fatigue + FATIGUE_RATE_ACTIVE * scaledDt, 0, 100);
      } else if (citizen.state === CitizenState.Idle) {
        citizen.fatigue = clamp(citizen.fatigue - FATIGUE_RATE_IDLE * scaledDt, 0, 100);
      }

      // --- Stress ---
      const stressUp = citizen.hunger < HUNGER_LOW_THRESHOLD || citizen.fatigue > FATIGUE_HIGH_THRESHOLD;
      const stressDown = citizen.hunger > HUNGER_OK_THRESHOLD && citizen.fatigue < FATIGUE_OK_THRESHOLD;

      if (stressUp) {
        citizen.stress = clamp(citizen.stress + STRESS_RATE_INCREASE * scaledDt, 0, 100);
      } else if (stressDown) {
        citizen.stress = clamp(citizen.stress - STRESS_RATE_DECREASE * scaledDt, 0, 100);
      }

      // --- Mood ---
      citizen.mood = computeMood(citizen.hunger, citizen.fatigue, citizen.stress);
    }
  }
}

