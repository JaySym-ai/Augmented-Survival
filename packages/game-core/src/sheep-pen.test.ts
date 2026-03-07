import { describe, expect, it } from 'vitest';
import { EventBus } from './events/EventBus';
import type { GameEventMap } from './events/GameEvents';
import { World } from './ecs/World';
import { TRANSFORM, createTransform } from './ecs/components/TransformComponent';
import { VELOCITY, createVelocity } from './ecs/components/VelocityComponent';
import { ANIMAL, createAnimal } from './ecs/components/AnimalComponent';
import { DOMESTIC_ANIMAL, createDomesticAnimal } from './ecs/components/DomesticAnimalComponent';
import { LIVESTOCK_PEN, type LivestockPenComponent } from './ecs/components/LivestockPenComponent';
import { TimeSystem } from './systems/TimeSystem';
import { AnimalAISystem } from './systems/AnimalAISystem';
import { BuildingPlacementSystem } from './systems/BuildingPlacementSystem';
import { BuildingType } from './types/buildings';
import { BUILDING_DEFS } from './content/BuildingDefs';

describe('SheepPen MVP', () => {
  it('attaches livestock pen data when a sheep pen is placed', () => {
    const world = new World();
    const eventBus = new EventBus<GameEventMap>();
    const placement = new BuildingPlacementSystem(eventBus);
    const def = BUILDING_DEFS[BuildingType.SheepPen];

    const entityId = placement.placeBuilding(world, BuildingType.SheepPen, { x: 8, y: 0, z: -4 }, {
      cost: def.cost,
      workerSlots: def.workerSlots,
      storageCapacity: def.storageCapacity,
      buildTime: def.buildTime,
    });

    expect(entityId).not.toBeNull();

    const pen = world.getComponent<LivestockPenComponent>(entityId!, LIVESTOCK_PEN);
    expect(pen).toMatchObject({
      animalType: 'sheep',
      capacity: 2,
      spawnCount: 2,
      homeRadius: 7,
      spawnRadius: 2.5,
    });
  });

  it('pulls domestic sheep back toward their home pen when they wander too far', () => {
    const world = new World();
    const eventBus = new EventBus<GameEventMap>();
    const timeSystem = new TimeSystem(eventBus);
    const animalAI = new AnimalAISystem(timeSystem);
    const sheepId = world.createEntity();

    world.addComponent(sheepId, TRANSFORM, createTransform({ x: 14, y: 0, z: 0 }));
    world.addComponent(sheepId, VELOCITY, createVelocity());
    world.addComponent(sheepId, ANIMAL, createAnimal('sheep'));
    world.addComponent(sheepId, DOMESTIC_ANIMAL, createDomesticAnimal(sheepId, { x: 0, y: 0, z: 0 }, 6, 8));

    animalAI.update(world, 1);

    const animal = world.getComponent<ReturnType<typeof createAnimal>>(sheepId, ANIMAL);
    const velocity = world.getComponent<ReturnType<typeof createVelocity>>(sheepId, VELOCITY);

    expect(animal?.targetPosition).toEqual({ x: 0, y: 0, z: 0 });
    expect(velocity?.velocity.x ?? 0).toBeLessThan(0);
  });
});