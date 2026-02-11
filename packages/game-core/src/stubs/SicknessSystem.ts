import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';

/**
 * Interface for the sickness/health system.
 * TODO: Implement disease spread, health checks, and curing.
 * - Citizens can get sick based on conditions (hunger, crowding, etc.)
 * - Diseases spread between nearby citizens
 * - Healers and hospitals can cure sickness
 */
export interface ISicknessSystem {
  /** Check the health status of a citizen entity. Returns true if healthy. */
  checkHealth(entityId: EntityId): boolean;

  /** Apply a sickness to a citizen entity. */
  applySickness(entityId: EntityId, sicknessType: string): void;

  /** Attempt to cure a citizen entity. */
  cure(entityId: EntityId): void;
}

/**
 * Stub implementation of the sickness system.
 * All methods are no-ops; checkHealth always returns true (healthy).
 */
export class SicknessSystemStub extends System implements ISicknessSystem {
  constructor() {
    super('SicknessSystem');
  }

  checkHealth(_entityId: EntityId): boolean {
    // TODO: Check citizen health status, disease state
    return true; // Always healthy in stub
  }

  applySickness(_entityId: EntityId, _sicknessType: string): void {
    // TODO: Apply disease effects, reduce health/productivity
  }

  cure(_entityId: EntityId): void {
    // TODO: Remove sickness, restore health
  }

  update(_world: World, _dt: number): void {
    // TODO: Spread diseases, update sickness timers, check recovery
  }
}

