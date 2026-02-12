import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import type { VelocityComponent } from '../ecs/components/VelocityComponent';
import { PATH_FOLLOW } from '../ecs/components/PathFollowComponent';
import type { PathFollowComponent } from '../ecs/components/PathFollowComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { CitizenState } from '../types/citizens';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

/** Distance threshold to consider a waypoint reached */
const ARRIVAL_THRESHOLD = 0.5;

/** How quickly direction interpolates (higher = snappier) */
const STEER_FACTOR = 8;

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * PathFollowSystem — steers entities along their waypoint paths.
 * Sets velocity toward the next waypoint, interpolating direction for smooth steering.
 * Removes PathFollow component when the path is complete.
 */
export class PathFollowSystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('PathFollowSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(TRANSFORM, PATH_FOLLOW, VELOCITY);

    for (const entityId of entities) {
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
      const pathFollow = world.getComponent<PathFollowComponent>(entityId, PATH_FOLLOW)!;
      const vel = world.getComponent<VelocityComponent>(entityId, VELOCITY)!;

      // Update citizen state to Walking if applicable
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
      if (citizen && citizen.state !== CitizenState.Walking) {
        const oldState = citizen.state;
        citizen.state = CitizenState.Walking;
        this.eventBus.emit('CitizenStateChanged', {
          entityId,
          oldState,
          newState: CitizenState.Walking,
        });
      }

      if (pathFollow.currentIndex >= pathFollow.path.length) {
        // Path complete — stop and remove component
        vel.velocity.x = 0;
        vel.velocity.y = 0;
        vel.velocity.z = 0;
        world.removeComponent(entityId, PATH_FOLLOW);
        continue;
      }

      const target = pathFollow.path[pathFollow.currentIndex];
      const pos = transform.position;
      const dSq = distanceSq(pos, target);

      if (dSq < ARRIVAL_THRESHOLD * ARRIVAL_THRESHOLD) {
        // Reached waypoint — advance
        pathFollow.currentIndex++;
        if (pathFollow.currentIndex >= pathFollow.path.length) {
          // Path complete
          vel.velocity.x = 0;
          vel.velocity.y = 0;
          vel.velocity.z = 0;
          world.removeComponent(entityId, PATH_FOLLOW);
          continue;
        }
      }

      // Steer toward current waypoint
      const nextTarget = pathFollow.path[pathFollow.currentIndex];
      const dx = nextTarget.x - pos.x;
      const dz = nextTarget.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.001) {
        const speed = pathFollow.speed;
        const desiredVx = (dx / dist) * speed;
        const desiredVz = (dz / dist) * speed;

        // Smooth steering interpolation
        const t = Math.min(1, STEER_FACTOR * scaledDt);
        vel.velocity.x += (desiredVx - vel.velocity.x) * t;
        vel.velocity.z += (desiredVz - vel.velocity.z) * t;
        vel.velocity.y = 0; // Keep on ground plane
      }
    }
  }
}

