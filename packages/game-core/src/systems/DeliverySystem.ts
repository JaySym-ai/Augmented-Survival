import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { CARRY } from '../ecs/components/CarryComponent';
import type { CarryComponent } from '../ecs/components/CarryComponent';
import { STORAGE } from '../ecs/components/StorageComponent';
import type { StorageComponent } from '../ecs/components/StorageComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { CitizenState } from '../types/citizens';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

/** Distance threshold for delivery */
const DELIVERY_RANGE = 1.5;

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * DeliverySystem — handles resource drop-off at storage buildings.
 * When a Delivering citizen is near a storage building, transfers resources
 * and resets the citizen to Idle state.
 */
export class DeliverySystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('DeliverySystem');
  }

  update(world: World, _dt: number): void {
    if (this.timeSystem.isPaused()) return;

    const entities = world.query(CITIZEN, CARRY, TRANSFORM);

    for (const entityId of entities) {
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN)!;
      if (citizen.state !== CitizenState.Delivering) continue;

      const carry = world.getComponent<CarryComponent>(entityId, CARRY)!;
      if (carry.resourceType == null || carry.amount <= 0) continue;

      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;

      // Find nearest storage building within delivery range
      const storageTarget = this.findNearbyStorage(world, transform.position);
      if (storageTarget == null) continue;

      const storage = world.getComponent<StorageComponent>(storageTarget, STORAGE)!;

      // Add carried resources to storage
      const current = storage.stored.get(carry.resourceType) ?? 0;
      storage.stored.set(carry.resourceType, current + carry.amount);

      // Emit ResourceDelivered — THIS is where global resources increase
      this.eventBus.emit('ResourceDelivered', {
        entityId,
        resourceType: carry.resourceType,
        amount: carry.amount,
        destinationBuildingId: storageTarget,
      });

      // Emit InventoryChanged
      this.eventBus.emit('InventoryChanged', {
        entityId,
        diff: { [carry.resourceType]: -carry.amount } as Partial<Record<string, number>>,
      });

      // Change citizen state to Idle
      const oldState = citizen.state;
      citizen.state = CitizenState.Idle;
      this.eventBus.emit('CitizenStateChanged', {
        entityId,
        oldState,
        newState: CitizenState.Idle,
      });

      // Remove CARRY component entirely so next gather cycle starts clean
      world.removeComponent(entityId, CARRY);
    }
  }

  private findNearbyStorage(world: World, position: Vector3): EntityId | null {
    const storageEntities = world.query(TRANSFORM, STORAGE, BUILDING);
    let bestId: EntityId | null = null;
    let bestDist = DELIVERY_RANGE * DELIVERY_RANGE;

    for (const eid of storageEntities) {
      const building = world.getComponent<BuildingComponent>(eid, BUILDING)!;
      if (!building.isConstructed) continue;

      const t = world.getComponent<TransformComponent>(eid, TRANSFORM)!;
      const d = distanceSq(position, t.position);
      if (d < bestDist) {
        bestDist = d;
        bestId = eid;
      }
    }
    return bestId;
  }
}

