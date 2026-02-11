import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { GATHERING } from '../ecs/components/GatheringComponent';
import type { GatheringComponent } from '../ecs/components/GatheringComponent';
import { RESOURCE_NODE } from '../ecs/components/ResourceNodeComponent';
import type { ResourceNodeComponent } from '../ecs/components/ResourceNodeComponent';
import { CARRY } from '../ecs/components/CarryComponent';
import type { CarryComponent } from '../ecs/components/CarryComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { PATH_FOLLOW } from '../ecs/components/PathFollowComponent';
import { CitizenState } from '../types/citizens';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Distance threshold to start gathering */
const GATHER_RANGE = 1.5;

/**
 * GatherSystem — handles resource gathering timer and pickup.
 * When a citizen with GATHERING arrives at the target and the timer completes,
 * resources are picked up and the citizen transitions to Carrying state.
 */
export class GatherSystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('GatherSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(GATHERING, TRANSFORM);

    for (const entityId of entities) {
      const gathering = world.getComponent<GatheringComponent>(entityId, GATHERING)!;
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);

      // If still walking (has PathFollow), wait until arrival
      if (world.getComponent(entityId, PATH_FOLLOW)) continue;

      // Check if we're close enough to the target
      if (gathering.targetEntity != null) {
        const targetTransform = world.getComponent<TransformComponent>(
          gathering.targetEntity,
          TRANSFORM,
        );
        if (targetTransform) {
          const dSq = distanceSq(transform.position, targetTransform.position);
          if (dSq > GATHER_RANGE * GATHER_RANGE) {
            // Too far — gathering component will be cleaned up or citizen re-routed
            continue;
          }
        }
      }

      // Set citizen state to Gathering if not already
      if (citizen && citizen.state !== CitizenState.Gathering) {
        const oldState = citizen.state;
        citizen.state = CitizenState.Gathering;
        this.eventBus.emit('CitizenStateChanged', {
          entityId,
          oldState,
          newState: CitizenState.Gathering,
        });
      }

      // Increment gather timer
      gathering.elapsed += scaledDt;

      if (gathering.elapsed >= gathering.gatherTime) {
        // Gathering complete — pick up resource
        if (gathering.targetEntity != null) {
          const resourceNode = world.getComponent<ResourceNodeComponent>(
            gathering.targetEntity,
            RESOURCE_NODE,
          );
          if (resourceNode && resourceNode.amount > 0) {
            resourceNode.amount -= 1;

            // Set carry component
            world.addComponent<CarryComponent>(entityId, CARRY, {
              resourceType: gathering.resourceType,
              amount: 1,
            });

            // Emit ResourcePickedUp
            this.eventBus.emit('ResourcePickedUp', {
              entityId,
              resourceType: gathering.resourceType,
              amount: 1,
              sourceId: gathering.targetEntity,
            });
          }
        }

        // Remove gathering component
        world.removeComponent(entityId, GATHERING);

        // Change citizen state to Carrying
        if (citizen) {
          const oldState = citizen.state;
          citizen.state = CitizenState.Carrying;
          this.eventBus.emit('CitizenStateChanged', {
            entityId,
            oldState,
            newState: CitizenState.Carrying,
          });
        }
      }
    }
  }
}

