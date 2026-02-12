import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';

/**
 * Interface for the livestock system.
 * TODO: Implement animal husbandry — raising, breeding, and slaughtering animals.
 * - Animals provide food, leather, wool, etc.
 * - Breeding increases herd size over time
 * - Requires pastures and animal pens
 */
export interface ILivestockSystem {
  /** Add an animal of the given type to the world. */
  addAnimal(animalType: string, penEntity: EntityId): void;

  /** Attempt to breed animals in a pen. */
  breed(penEntity: EntityId): void;

  /** Slaughter an animal for resources. */
  slaughter(animalEntity: EntityId): void;
}

/**
 * Stub implementation of the livestock system.
 * All methods are no-ops.
 */
export class LivestockSystemStub extends System implements ILivestockSystem {
  constructor() {
    super('LivestockSystem');
  }

  addAnimal(_animalType: string, _penEntity: EntityId): void {
    // TODO: Create animal entity, assign to pen
  }

  breed(_penEntity: EntityId): void {
    // TODO: Check breeding conditions, spawn offspring
  }

  slaughter(_animalEntity: EntityId): void {
    // TODO: Remove animal, produce food/leather resources
  }

  update(_world: World, _dt: number): void {
    // TODO: Update animal hunger, growth, breeding timers
  }
}

