import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { CARRY } from '../ecs/components/CarryComponent';

/**
 * CarrySystem — manages carry state data.
 * Currently a lightweight system that ensures CARRY queries work.
 * Future: could update visual indicators for carried resources.
 */
export class CarrySystem extends System {
  constructor() {
    super('CarrySystem');
  }

  update(world: World, _dt: number): void {
    // Query entities with CARRY to keep the system active
    // Future: update visual carry indicators
    const _entities = world.query(CARRY);
    // No per-frame logic needed — carry state is managed by
    // GatherSystem (sets carry) and DeliverySystem (clears carry)
  }
}

