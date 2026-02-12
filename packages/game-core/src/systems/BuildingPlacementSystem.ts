import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { CONSTRUCTION_SITE } from '../ecs/components/ConstructionSiteComponent';
import type { ConstructionSiteComponent } from '../ecs/components/ConstructionSiteComponent';
import { STORAGE } from '../ecs/components/StorageComponent';
import type { StorageComponent } from '../ecs/components/StorageComponent';
import { SELECTABLE } from '../ecs/components/SelectableComponent';
import type { SelectableComponent } from '../ecs/components/SelectableComponent';
import { BuildingType } from '../types/buildings';
import { ResourceType } from '../types/resources';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';

/**
 * BuildingPlacementSystem — handles placing new buildings.
 * Called by UI to create building entities with construction sites.
 */
export class BuildingPlacementSystem extends System {
  constructor(private eventBus: EventBus<GameEventMap>) {
    super('BuildingPlacementSystem');
  }

  /**
   * Place a building at the given position.
   * Creates an entity with TRANSFORM, BUILDING, CONSTRUCTION_SITE, and optionally STORAGE.
   * Returns the entity ID, or null if placement failed.
   */
  placeBuilding(
    world: World,
    type: BuildingType,
    position: Vector3,
    config: {
      cost: Partial<Record<ResourceType, number>>;
      workerSlots: number;
      storageCapacity: number;
    },
  ): EntityId | null {
    const entityId = world.createEntity();

    // Add transform
    world.addComponent<TransformComponent>(entityId, TRANSFORM, {
      position: { ...position },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });

    // Add building component (not yet constructed)
    world.addComponent<BuildingComponent>(entityId, BUILDING, {
      type,
      isConstructed: false,
      workers: [],
      workerSlots: config.workerSlots,
    });

    // Add construction site with required materials
    const requiredMaterials = new Map<ResourceType, number>();
    for (const [resType, amount] of Object.entries(config.cost)) {
      if (amount != null && amount > 0) {
        requiredMaterials.set(resType as ResourceType, amount);
      }
    }
    world.addComponent<ConstructionSiteComponent>(entityId, CONSTRUCTION_SITE, {
      requiredMaterials,
      deliveredMaterials: new Map(),
      progress: 0,
    });

    // Add storage component if building has storage capacity
    if (config.storageCapacity > 0) {
      world.addComponent<StorageComponent>(entityId, STORAGE, {
        stored: new Map(),
        capacity: config.storageCapacity,
      });
    }

    // Add selectable component
    world.addComponent<SelectableComponent>(entityId, SELECTABLE, {
      selected: false,
      hoverHighlight: false,
    });

    // Emit BuildingPlaced event
    this.eventBus.emit('BuildingPlaced', {
      buildingId: entityId,
      buildingType: type,
      position: { ...position },
    });

    return entityId;
  }

  update(_world: World, _dt: number): void {
    // Placement is user-triggered — nothing per-frame
  }
}

