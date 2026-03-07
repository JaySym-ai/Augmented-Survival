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

describe('ChickenCoop', () => {
  it('attaches livestock pen data when a chicken coop is placed', () => {
    const world = new World();
    const eventBus = new EventBus<GameEventMap>();
    const placement = new BuildingPlacementSystem(eventBus);
    const def = BUILDING_DEFS[BuildingType.ChickenCoop];

    const entityId = placement.placeBuilding(world, BuildingType.ChickenCoop, { x: 6, y: 0, z: -3 }, {
      cost: def.cost,
      workerSlots: def.workerSlots,
      storageCapacity: def.storageCapacity,
      buildTime: def.buildTime,
    });

    expect(entityId).not.toBeNull();

    const pen = world.getComponent<LivestockPenComponent>(entityId!, LIVESTOCK_PEN);
    expect(pen).toMatchObject({
      animalType: 'chicken',
      capacity: 4,
      spawnCount: 4,
      homeRadius: 5,
      spawnRadius: 2,
    });
  });

  it('pulls domestic chickens back toward their home coop when they wander too far', () => {
    const world = new World();
    const eventBus = new EventBus<GameEventMap>();
    const timeSystem = new TimeSystem(eventBus);
    const animalAI = new AnimalAISystem(timeSystem);
    const chickenId = world.createEntity();

    world.addComponent(chickenId, TRANSFORM, createTransform({ x: 12, y: 0, z: 0 }));
    world.addComponent(chickenId, VELOCITY, createVelocity());
    world.addComponent(chickenId, ANIMAL, createAnimal('chicken'));
    world.addComponent(chickenId, DOMESTIC_ANIMAL, createDomesticAnimal(chickenId, { x: 0, y: 0, z: 0 }, 5, 6));

    animalAI.update(world, 1);

    const animal = world.getComponent<ReturnType<typeof createAnimal>>(chickenId, ANIMAL);
    const velocity = world.getComponent<ReturnType<typeof createVelocity>>(chickenId, VELOCITY);

    expect(animal?.targetPosition).toEqual({ x: 0, y: 0, z: 0 });
    expect(velocity?.velocity.x ?? 0).toBeLessThan(0);
  });
});