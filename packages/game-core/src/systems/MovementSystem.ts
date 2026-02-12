import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import type { VelocityComponent } from '../ecs/components/VelocityComponent';
import type { TimeSystem } from './TimeSystem';

/** Default map bounds (half-extent from origin) */
const DEFAULT_MAP_HALF_SIZE = 128;

/**
 * MovementSystem — applies velocity to transform each tick.
 * Clamps entity positions to map bounds.
 */
export class MovementSystem extends System {
  private mapHalfSize = DEFAULT_MAP_HALF_SIZE;

  constructor(private timeSystem: TimeSystem) {
    super('MovementSystem');
  }

  setMapSize(halfSize: number): void {
    this.mapHalfSize = halfSize;
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(TRANSFORM, VELOCITY);

    for (const entityId of entities) {
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
      const vel = world.getComponent<VelocityComponent>(entityId, VELOCITY)!;

      // Apply velocity to position
      transform.position.x += vel.velocity.x * scaledDt;
      transform.position.y += vel.velocity.y * scaledDt;
      transform.position.z += vel.velocity.z * scaledDt;

      // Clamp to map bounds
      const half = this.mapHalfSize;
      transform.position.x = Math.max(-half, Math.min(half, transform.position.x));
      transform.position.z = Math.max(-half, Math.min(half, transform.position.z));
    }
  }
}

