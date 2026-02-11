import { System } from '../ecs/System';
import type { World } from '../ecs/World';

/**
 * Interface for the exploration system.
 * TODO: Implement world exploration, discovery, and random events.
 * - Send scouts to discover new locations on the map
 * - Trigger random events (bandits, treasure, ruins, etc.)
 * - Find ancient ruins with loot and lore
 */
export interface IExplorationSystem {
  /** Discover a new location on the map. */
  discoverLocation(locationId: string): void;

  /** Trigger a random exploration event. */
  triggerEvent(eventType: string): void;

  /** Attempt to find and explore a ruin. */
  findRuin(): string | null;
}

/**
 * Stub implementation of the exploration system.
 * All methods are no-ops; findRuin returns null.
 */
export class ExplorationSystemStub extends System implements IExplorationSystem {
  constructor() {
    super('ExplorationSystem');
  }

  discoverLocation(_locationId: string): void {
    // TODO: Reveal map area, add location to known places
  }

  triggerEvent(_eventType: string): void {
    // TODO: Process exploration event, apply effects
  }

  findRuin(): string | null {
    // TODO: Random chance to discover ruins based on scout skill
    return null;
  }

  update(_world: World, _dt: number): void {
    // TODO: Update active explorations, check for discoveries
  }
}

