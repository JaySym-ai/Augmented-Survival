import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { CONSTRUCTION_SITE } from '../ecs/components/ConstructionSiteComponent';
import type { ConstructionSiteComponent } from '../ecs/components/ConstructionSiteComponent';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';

/**
 * ConstructionSystem — manages building construction progress.
 * Checks if all required materials have been delivered to construction sites.
 * When complete, marks the building as constructed and emits ConstructionComplete.
 */
export class ConstructionSystem extends System {
  constructor(private eventBus: EventBus<GameEventMap>) {
    super('ConstructionSystem');
  }

  update(world: World, _dt: number): void {
    const entities = world.query(CONSTRUCTION_SITE, BUILDING);

    for (const entityId of entities) {
      const site = world.getComponent<ConstructionSiteComponent>(entityId, CONSTRUCTION_SITE)!;
      const building = world.getComponent<BuildingComponent>(entityId, BUILDING)!;

      // Check if all required materials have been delivered
      if (this.isComplete(site)) {
        // Mark building as constructed
        building.isConstructed = true;

        // Remove construction site component
        world.removeComponent(entityId, CONSTRUCTION_SITE);

        // Emit completion event
        this.eventBus.emit('ConstructionComplete', {
          buildingId: entityId,
          buildingType: building.type,
        });
      }
    }
  }

  /**
   * Check if all required materials have been delivered.
   */
  private isComplete(site: ConstructionSiteComponent): boolean {
    for (const [resourceType, required] of site.requiredMaterials) {
      const delivered = site.deliveredMaterials.get(resourceType) ?? 0;
      if (delivered < required) {
        return false;
      }
    }
    return true;
  }
}

