import type { World } from './World';

/**
 * Base class for ECS systems.
 * Systems contain logic that operates on entities with specific components.
 * Override the `update` method to implement system behavior.
 */
export abstract class System {
  /** Display name for debugging */
  readonly name: string;

  /** Whether this system is enabled */
  enabled = true;

  constructor(name?: string) {
    this.name = name ?? this.constructor.name;
  }

  /**
   * Called each frame/tick to update entities.
   * @param world - The ECS world
   * @param dt - Delta time in seconds
   */
  abstract update(world: World, dt: number): void;
}

