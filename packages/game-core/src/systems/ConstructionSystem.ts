import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { CONSTRUCTION_SITE } from '../ecs/components/ConstructionSiteComponent';
import type { ConstructionSiteComponent } from '../ecs/components/ConstructionSiteComponent';
import { CONSTRUCTION_WORK } from '../ecs/components/ConstructionWorkComponent';
import type { ConstructionWorkComponent } from '../ecs/components/ConstructionWorkComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { CitizenState } from '../types/citizens';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Distance threshold for a builder to work on a construction site */
const BUILD_RANGE = 2.0;

/**
 * ConstructionSystem — manages time-based building construction.
 * Iterates citizens with CONSTRUCTION_WORK + TRANSFORM, checks proximity
 * to target building, advances buildProgress by scaledDt, and handles completion.
 */
export class ConstructionSystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('ConstructionSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    // Iterate all citizens with CONSTRUCTION_WORK
    const workers = world.query(CONSTRUCTION_WORK, TRANSFORM);

    // Track which buildings had progress this frame (for events)
    const progressBuildings = new Set<EntityId>();

    for (const entityId of workers) {
      const work = world.getComponent<ConstructionWorkComponent>(entityId, CONSTRUCTION_WORK)!;
      const workerTransform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;

      const targetId = work.targetBuilding as EntityId;

      // Validate target still has a construction site
      const site = world.getComponent<ConstructionSiteComponent>(targetId, CONSTRUCTION_SITE);
      if (!site) {
        // Building already completed or removed — clean up worker
        world.removeComponent(entityId, CONSTRUCTION_WORK);
        const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
        if (citizen && citizen.state === CitizenState.Building) {
          const oldState = citizen.state;
          citizen.state = CitizenState.Idle;
          this.eventBus.emit('CitizenStateChanged', { entityId, oldState, newState: CitizenState.Idle });
        }
        continue;
      }

      // Check proximity to target building
      const buildingTransform = world.getComponent<TransformComponent>(targetId, TRANSFORM);
      if (!buildingTransform) continue;

      const dist = distanceSq(workerTransform.position, buildingTransform.position);
      if (dist > BUILD_RANGE * BUILD_RANGE) continue;

      // Close enough — set citizen state to Building and advance progress
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
      if (citizen && citizen.state !== CitizenState.Building) {
        const oldState = citizen.state;
        citizen.state = CitizenState.Building;
        this.eventBus.emit('CitizenStateChanged', { entityId, oldState, newState: CitizenState.Building });
      }

      site.buildProgress += scaledDt;
      site.progress = site.buildTime > 0 ? Math.min(site.buildProgress / site.buildTime, 1.0) : 1.0;
      progressBuildings.add(targetId);
    }

    // Emit progress events and check for completion
    for (const buildingId of progressBuildings) {
      const site = world.getComponent<ConstructionSiteComponent>(buildingId, CONSTRUCTION_SITE);
      if (!site) continue;

      this.eventBus.emit('ConstructionProgress', {
        buildingId,
        deliveredMaterials: {},
      });

      // Check completion
      if (site.buildProgress >= site.buildTime) {
        const building = world.getComponent<BuildingComponent>(buildingId, BUILDING);
        if (building) {
          building.isConstructed = true;
        }

        // Remove construction site
        world.removeComponent(buildingId, CONSTRUCTION_SITE);

        // Remove CONSTRUCTION_WORK from ALL builders targeting this building
        // and set them to Idle
        const allWorkers = world.query(CONSTRUCTION_WORK);
        for (const workerId of allWorkers) {
          const w = world.getComponent<ConstructionWorkComponent>(workerId, CONSTRUCTION_WORK);
          if (w && (w.targetBuilding as EntityId) === buildingId) {
            world.removeComponent(workerId, CONSTRUCTION_WORK);
            const citizen = world.getComponent<CitizenComponent>(workerId, CITIZEN);
            if (citizen) {
              const oldState = citizen.state;
              citizen.state = CitizenState.Idle;
              this.eventBus.emit('CitizenStateChanged', { entityId: workerId, oldState, newState: CitizenState.Idle });
            }
          }
        }

        // Emit completion event
        if (building) {
          this.eventBus.emit('ConstructionComplete', {
            buildingId,
            buildingType: building.type,
          });
        }
      }
    }
  }
}

