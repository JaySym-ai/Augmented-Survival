import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import type { VelocityComponent } from '../ecs/components/VelocityComponent';
import { PATROL } from '../ecs/components/PatrolComponent';
import type { PatrolComponent } from '../ecs/components/PatrolComponent';
import type { TimeSystem } from './TimeSystem';

const ARRIVAL_THRESHOLD = 0.5;

export class PatrolSystem extends System {
  constructor(private timeSystem: TimeSystem) {
    super('PatrolSystem');
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(PATROL, TRANSFORM, VELOCITY);

    for (const entityId of entities) {
      const patrol = world.getComponent<PatrolComponent>(entityId, PATROL)!;
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
      const vel = world.getComponent<VelocityComponent>(entityId, VELOCITY)!;

      if (patrol.isWaiting) {
        patrol.currentWaitTime += scaledDt;
        vel.velocity.x = 0;
        vel.velocity.z = 0;

        if (patrol.currentWaitTime >= patrol.waitTimeAtWaypoint) {
          patrol.isWaiting = false;
          patrol.currentWaitTime = 0;
          patrol.currentWaypointIndex = (patrol.currentWaypointIndex + 1) % patrol.waypoints.length;
        }
        continue;
      }

      const target = patrol.waypoints[patrol.currentWaypointIndex];
      const dx = target.x - transform.position.x;
      const dz = target.z - transform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < ARRIVAL_THRESHOLD) {
        patrol.isWaiting = true;
        patrol.currentWaitTime = 0;
        vel.velocity.x = 0;
        vel.velocity.z = 0;
        continue;
      }

      const speed = patrol.speed;
      vel.velocity.x = (dx / dist) * speed;
      vel.velocity.z = (dz / dist) * speed;
    }
  }
}
