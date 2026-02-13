import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { RESOURCE_NODE } from '../ecs/components/ResourceNodeComponent';
import type { ResourceNodeComponent } from '../ecs/components/ResourceNodeComponent';
import { DEPLETED_RESOURCE } from '../ecs/components/DepletedResourceComponent';
import type { DepletedResourceComponent } from '../ecs/components/DepletedResourceComponent';
import { createDepletedResource } from '../ecs/components/DepletedResourceComponent';
import { SELECTABLE } from '../ecs/components/SelectableComponent';
import { createSelectable } from '../ecs/components/SelectableComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

/** Minimum respawn delay in seconds (5 minutes) */
const MIN_RESPAWN_DELAY = 300;
/** Maximum respawn delay in seconds (20 minutes) */
const MAX_RESPAWN_DELAY = 1200;
/** Distance threshold for building proximity check (world units) */
const BUILDING_BLOCK_RANGE = 5;
/** Retry delay when a building blocks respawn (seconds) */
const BLOCKED_RETRY_DELAY = 60;

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * ResourceDepletionSystem — detects depleted resource nodes and manages respawn timers.
 *
 * Each tick:
 * 1. Finds resource nodes with amount <= 0 that are not yet marked depleted.
 *    Marks them depleted with a random respawn delay, removes SELECTABLE, emits ResourceDepleted.
 * 2. Advances respawn timers on depleted nodes. When ready, checks for blocking buildings.
 *    If clear, restores amount, removes DEPLETED_RESOURCE, re-adds SELECTABLE, emits ResourceRespawned.
 *    If blocked, resets timer to retry in 60 seconds.
 */
export class ResourceDepletionSystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('ResourceDepletionSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    this.detectDepletion(world);
    this.advanceRespawnTimers(world, scaledDt);
  }

  /**
   * Detect resource nodes that have been depleted (amount <= 0)
   * but not yet marked with DEPLETED_RESOURCE.
   */
  private detectDepletion(world: World): void {
    const resourceEntities = world.query(RESOURCE_NODE);

    for (const entityId of resourceEntities) {
      // Skip if already marked depleted
      if (world.hasComponent(entityId, DEPLETED_RESOURCE)) continue;

      const resource = world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE)!;
      if (resource.amount > 0) continue;

      // Mark as depleted with random delay
      const delay = MIN_RESPAWN_DELAY + Math.random() * (MAX_RESPAWN_DELAY - MIN_RESPAWN_DELAY);
      world.addComponent(entityId, DEPLETED_RESOURCE, createDepletedResource(delay));

      // Remove selectable so player can't interact
      if (world.hasComponent(entityId, SELECTABLE)) {
        world.removeComponent(entityId, SELECTABLE);
      }

      // Emit depletion event
      this.eventBus.emit('ResourceDepleted', {
        entityId,
        resourceType: resource.type,
      });
    }
  }

  /**
   * Advance respawn timers on depleted resource nodes.
   * When timer completes, check for blocking buildings before respawning.
   */
  private advanceRespawnTimers(world: World, scaledDt: number): void {
    const depletedEntities = world.query(RESOURCE_NODE, DEPLETED_RESOURCE);

    for (const entityId of depletedEntities) {
      const depleted = world.getComponent<DepletedResourceComponent>(entityId, DEPLETED_RESOURCE)!;
      depleted.elapsed += scaledDt;

      if (depleted.elapsed < depleted.respawnDelay) continue;

      // Timer complete — check for blocking buildings
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (transform && this.isBuildingNearby(world, transform.position)) {
        // Blocked — reset timer to retry
        depleted.elapsed = 0;
        depleted.respawnDelay = BLOCKED_RETRY_DELAY;
        continue;
      }

      // Clear to respawn
      const resource = world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE)!;
      resource.amount = resource.maxAmount;

      // Remove depleted marker
      world.removeComponent(entityId, DEPLETED_RESOURCE);

      // Re-add selectable
      world.addComponent(entityId, SELECTABLE, createSelectable());

      // Emit respawn event
      this.eventBus.emit('ResourceRespawned', {
        entityId,
        resourceType: resource.type,
      });
    }
  }

  /**
   * Check if any building entity is within BUILDING_BLOCK_RANGE of the given position.
   */
  private isBuildingNearby(world: World, position: Vector3): boolean {
    const buildings = world.query(BUILDING, TRANSFORM);
    const rangeSq = BUILDING_BLOCK_RANGE * BUILDING_BLOCK_RANGE;

    for (const buildingId of buildings) {
      const buildingTransform = world.getComponent<TransformComponent>(buildingId, TRANSFORM)!;
      if (distanceSq(position, buildingTransform.position) <= rangeSq) {
        return true;
      }
    }

    return false;
  }
}

