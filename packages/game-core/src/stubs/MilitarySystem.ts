import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';

/**
 * Interface for the military system.
 * TODO: Implement military recruitment, army formation, and defense.
 * - Recruit citizens as soldiers (removes them from civilian workforce)
 * - Form armies from soldiers for offensive/defensive operations
 * - Patrol routes to protect settlement borders
 * - Defend against raids and attacks
 */
export interface IMilitarySystem {
  /** Recruit a citizen as a soldier. */
  recruitSoldier(citizenEntity: EntityId): void;

  /** Form an army from available soldiers. */
  formArmy(soldierEntities: EntityId[]): EntityId;

  /** Assign a patrol route to a soldier or army. */
  patrol(entityId: EntityId, route: string): void;

  /** Set up defenses at a position or building. */
  defend(buildingEntity: EntityId): void;
}

/**
 * Stub implementation of the military system.
 * All methods are no-ops; formArmy returns 0 (invalid entity).
 */
export class MilitarySystemStub extends System implements IMilitarySystem {
  constructor() {
    super('MilitarySystem');
  }

  recruitSoldier(_citizenEntity: EntityId): void {
    // TODO: Convert citizen to soldier, equip with weapons
  }

  formArmy(_soldierEntities: EntityId[]): EntityId {
    // TODO: Create army entity grouping soldiers
    return 0 as EntityId;
  }

  patrol(_entityId: EntityId, _route: string): void {
    // TODO: Assign patrol waypoints, start patrol behavior
  }

  defend(_buildingEntity: EntityId): void {
    // TODO: Station soldiers at building, set up defensive positions
  }

  update(_world: World, _dt: number): void {
    // TODO: Update patrols, process combat, check for threats
  }
}

