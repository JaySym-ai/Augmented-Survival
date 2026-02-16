import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from './ecs/World';
import { System } from './ecs/System';
import { EntityAllocator } from './ecs/Entity';
import { ComponentStore, ComponentRegistry } from './ecs/Component';
import { queryEntities } from './ecs/Query';
import { EventBus } from './events/EventBus';
import { GameEventMap } from './events/GameEvents';
import { TimeSystem } from './systems/TimeSystem';
import { ResourceStoreSystem } from './systems/ResourceStoreSystem';
import { MovementSystem } from './systems/MovementSystem';
import { ResourceType } from './types/resources';
import { JobType } from './types/jobs';
import { CitizenState, Gender } from './types/citizens';
import { TRANSFORM, createTransform, TransformComponent } from './ecs/components/TransformComponent';
import { VELOCITY, createVelocity } from './ecs/components/VelocityComponent';
import { CITIZEN, createCitizen, CitizenComponent } from './ecs/components/CitizenComponent';
import { JOB_ASSIGNMENT, createJobAssignment } from './ecs/components/JobAssignmentComponent';
import { JobAssignmentSystem } from './systems/JobAssignmentSystem';

describe('ECS', () => {
  describe('EntityAllocator', () => {
    it('should allocate unique entity IDs', () => {
      const allocator = new EntityAllocator();
      const id1 = allocator.allocate();
      const id2 = allocator.allocate();
      expect(id1).not.toBe(id2);
    });

    it('should recycle freed entity IDs with incremented generation', () => {
      const allocator = new EntityAllocator();
      const id1 = allocator.allocate();
      const index1 = EntityAllocator.index(id1);
      const gen1 = EntityAllocator.generation(id1);
      
      allocator.free(id1);
      const id2 = allocator.allocate();
      const index2 = EntityAllocator.index(id2);
      const gen2 = EntityAllocator.generation(id2);
      
      expect(index1).toBe(index2);
      expect(gen2).toBe(gen1 + 1);
    });

    it('should correctly extract index and generation', () => {
      const allocator = new EntityAllocator();
      const id = allocator.allocate();
      expect(EntityAllocator.index(id)).toBeDefined();
      expect(EntityAllocator.generation(id)).toBe(0);
    });
  });

  describe('ComponentStore', () => {
    it('should store and retrieve components', () => {
      const store = new ComponentStore<{ value: number }>('Test');
      const entityId = 1;
      
      store.set(entityId, { value: 42 });
      expect(store.get(entityId)?.value).toBe(42);
      expect(store.has(entityId)).toBe(true);
    });

    it('should remove components', () => {
      const store = new ComponentStore<{ value: number }>('Test');
      const entityId = 1;
      
      store.set(entityId, { value: 42 });
      store.remove(entityId);
      expect(store.has(entityId)).toBe(false);
    });

    it('should return size and iterate entities', () => {
      const store = new ComponentStore<{ value: number }>('Test');
      store.set(1, { value: 10 });
      store.set(2, { value: 20 });
      
      expect(store.size()).toBe(2);
      const entities = Array.from(store.entities());
      expect(entities).toContain(1);
      expect(entities).toContain(2);
    });
  });

  describe('ComponentRegistry', () => {
    it('should get or create component stores', () => {
      const registry = new ComponentRegistry();
      const store1 = registry.getOrCreate<{ x: number }>('Position');
      const store2 = registry.getOrCreate<{ x: number }>('Position');
      
      expect(store1).toBe(store2);
      expect(registry.get<{ x: number }>('Position')).toBe(store1);
    });

    it('should remove entity from all stores', () => {
      const registry = new ComponentRegistry();
      const storeA = registry.getOrCreate<number>('A');
      const storeB = registry.getOrCreate<string>('B');
      
      storeA.set(1, 10);
      storeB.set(1, 'test');
      
      registry.removeEntity(1);
      
      expect(storeA.has(1)).toBe(false);
      expect(storeB.has(1)).toBe(false);
    });
  });

  describe('queryEntities', () => {
    it('should return empty array for empty stores', () => {
      const store = new ComponentStore<{ value: number }>('Test');
      expect(queryEntities([])).toEqual([]);
      expect(queryEntities([store])).toEqual([]);
    });

    it('should find entities with all components', () => {
      const storeA = new ComponentStore<number>('A');
      const storeB = new ComponentStore<string>('B');
      
      storeA.set(1, 10);
      storeA.set(2, 20);
      storeA.set(3, 30);
      
      storeB.set(1, 'a');
      storeB.set(3, 'c');
      
      const result = queryEntities([storeA, storeB]);
      expect(result).toContain(1);
      expect(result).toContain(3);
      expect(result).not.toContain(2);
    });

    it('should optimize by iterating smallest store', () => {
      const storeA = new ComponentStore<number>('A');
      const storeB = new ComponentStore<string>('B');
      
      for (let i = 0; i < 100; i++) {
        storeA.set(i, i);
      }
      storeB.set(0, 'test');
      
      const result = queryEntities([storeA, storeB]);
      expect(result).toEqual([0]);
    });
  });

  describe('World', () => {
    let world: World;

    beforeEach(() => {
      world = new World();
    });

    it('should create and manage entities', () => {
      const id = world.createEntity();
      expect(world.isAlive(id)).toBe(true);
      expect(world.entityCount()).toBe(1);
      
      world.destroyEntity(id);
      expect(world.isAlive(id)).toBe(false);
      expect(world.entityCount()).toBe(0);
    });

    it('should add and retrieve components', () => {
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });
      
      expect(world.getComponent<{ x: number }>(entity, 'Position')?.x).toBe(10);
      expect(world.hasComponent(entity, 'Position')).toBe(true);
      
      world.removeComponent(entity, 'Position');
      expect(world.hasComponent(entity, 'Position')).toBe(false);
    });

    it('should query entities by components', () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      const e3 = world.createEntity();
      
      world.addComponent(e1, 'A', { value: 1 });
      world.addComponent(e1, 'B', { value: 1 });
      world.addComponent(e2, 'A', { value: 2 });
      world.addComponent(e3, 'B', { value: 3 });
      
      const resultAB = world.query('A', 'B');
      expect(resultAB).toContain(e1);
      expect(resultAB).not.toContain(e2);
      expect(resultAB).not.toContain(e3);
      
      const resultA = world.query('A');
      expect(resultA).toContain(e1);
      expect(resultA).toContain(e2);
    });

    it('should add, remove, and run systems', () => {
      const mockSystem = new (class extends System {
        updateCount = 0;
        update(world: World, dt: number) {
          this.updateCount++;
        }
      })('TestSystem');
      
      world.addSystem(mockSystem);
      expect(world.getSystems()).toContain(mockSystem);
      
      world.step(0.016);
      expect(mockSystem.updateCount).toBe(1);
      
      world.removeSystem(mockSystem);
      world.step(0.016);
      expect(mockSystem.updateCount).toBe(1);
    });

    it('should not run disabled systems', () => {
      const mockSystem = new (class extends System {
        updateCount = 0;
        update() {
          this.updateCount++;
        }
      })('TestSystem');
      
      mockSystem.enabled = false;
      world.addSystem(mockSystem);
      world.step(0.016);
      
      expect(mockSystem.updateCount).toBe(0);
    });

    it('should throw when adding component to dead entity', () => {
      const entity = world.createEntity();
      world.destroyEntity(entity);
      
      expect(() => {
        world.addComponent(entity, 'Test', {});
      }).toThrow();
    });
  });

  describe('System', () => {
    it('should have a default name', () => {
      const system = new (class extends System {
        update() {}
      })();
      
      expect(system.name).toBeDefined();
      expect(system.enabled).toBe(true);
    });

    it('should accept custom name', () => {
      const system = new (class extends System {
        update() {}
      })('CustomName');
      
      expect(system.name).toBe('CustomName');
    });
  });
});

describe('TimeSystem', () => {
  let eventBus: EventBus<GameEventMap>;
  let timeSystem: TimeSystem;

  beforeEach(() => {
    eventBus = new EventBus<GameEventMap>();
    timeSystem = new TimeSystem(eventBus);
  });

  it('should initialize with default values', () => {
    expect(timeSystem.getTimeScale()).toBe(1);
    expect(timeSystem.isPaused()).toBe(false);
  });

  it('should set time scale', () => {
    timeSystem.setTimeScale(2);
    expect(timeSystem.getTimeScale()).toBe(2);
    
    timeSystem.setTimeScale(0.5);
    expect(timeSystem.getTimeScale()).toBe(0.5);
  });

  it('should pause and resume', () => {
    timeSystem.pause();
    expect(timeSystem.isPaused()).toBe(true);
    
    timeSystem.resume();
    expect(timeSystem.isPaused()).toBe(false);
  });

  it('should return scaled dt', () => {
    timeSystem.setTimeScale(2);
    expect(timeSystem.getScaledDt(1)).toBe(2);
    
    timeSystem.pause();
    expect(timeSystem.getScaledDt(1)).toBe(0);
  });

  it('should emit TimeScaleChanged event', () => {
    const handler = vi.fn();
    eventBus.on('TimeScaleChanged', handler);
    
    timeSystem.setTimeScale(2);
    
    expect(handler).toHaveBeenCalledWith({
      oldScale: 1,
      newScale: 2,
    });
  });
});

describe('ResourceStoreSystem', () => {
  let eventBus: EventBus<GameEventMap>;
  let resourceSystem: ResourceStoreSystem;

  beforeEach(() => {
    eventBus = new EventBus<GameEventMap>();
    resourceSystem = new ResourceStoreSystem(eventBus);
  });

  it('should initialize all resource types to 0', () => {
    expect(resourceSystem.getResource(ResourceType.Wood)).toBe(0);
    expect(resourceSystem.getResource(ResourceType.Food)).toBe(0);
    expect(resourceSystem.getResource(ResourceType.Stone)).toBe(0);
  });

  it('should get and set resources', () => {
    resourceSystem.setResource(ResourceType.Wood, 100);
    expect(resourceSystem.getResource(ResourceType.Wood)).toBe(100);
  });

  it('should add resources via events', () => {
    eventBus.emit('ResourceDelivered', {
      entityId: 1,
      resourceType: ResourceType.Wood,
      amount: 50,
      destinationBuildingId: 0,
    });
    
    expect(resourceSystem.getResource(ResourceType.Wood)).toBe(50);
  });

  it('should check if can afford', () => {
    resourceSystem.setResource(ResourceType.Wood, 100);
    resourceSystem.setResource(ResourceType.Stone, 50);
    
    expect(resourceSystem.canAfford({ Wood: 50 })).toBe(true);
    expect(resourceSystem.canAfford({ Wood: 150 })).toBe(false);
    expect(resourceSystem.canAfford({ Wood: 50, Stone: 100 })).toBe(false);
  });

  it('should deduct resources', () => {
    resourceSystem.setResource(ResourceType.Wood, 100);
    
    expect(resourceSystem.deduct({ Wood: 30 })).toBe(true);
    expect(resourceSystem.getResource(ResourceType.Wood)).toBe(70);
    
    expect(resourceSystem.deduct({ Wood: 100 })).toBe(false);
    expect(resourceSystem.getResource(ResourceType.Wood)).toBe(70);
  });

  it('should return all resources', () => {
    resourceSystem.setResource(ResourceType.Wood, 100);
    const all = resourceSystem.getAll();
    expect(all.get(ResourceType.Wood)).toBe(100);
  });
});

describe('MovementSystem', () => {
  let world: World;
  let eventBus: EventBus<GameEventMap>;
  let timeSystem: TimeSystem;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus<GameEventMap>();
    timeSystem = new TimeSystem(eventBus);
    movementSystem = new MovementSystem(timeSystem);
    world.addSystem(movementSystem);
  });

  it('should move entities with velocity', () => {
    const entity = world.createEntity();
    world.addComponent(entity, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(entity, VELOCITY, createVelocity({ x: 10, y: 0, z: 0 }));
    
    world.step(1);
    
    const transform = world.getComponent<TransformComponent>(entity, TRANSFORM);
    expect(transform?.position.x).toBe(10);
  });

  it('should respect time scaling', () => {
    const entity = world.createEntity();
    world.addComponent(entity, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(entity, VELOCITY, createVelocity({ x: 10, y: 0, z: 0 }));
    
    timeSystem.setTimeScale(0.5);
    world.step(1);
    
    const transform = world.getComponent<TransformComponent>(entity, TRANSFORM);
    expect(transform?.position.x).toBe(5);
  });

  it('should not move when paused', () => {
    const entity = world.createEntity();
    world.addComponent(entity, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(entity, VELOCITY, createVelocity({ x: 10, y: 0, z: 0 }));
    
    timeSystem.pause();
    world.step(1);
    
    const transform = world.getComponent<TransformComponent>(entity, TRANSFORM);
    expect(transform?.position.x).toBe(0);
  });

  it('should clamp to map bounds', () => {
    const entity = world.createEntity();
    world.addComponent(entity, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(entity, VELOCITY, createVelocity({ x: 1000, y: 0, z: 0 }));
    movementSystem.setMapSize(50);
    
    world.step(1);
    
    const transform = world.getComponent<TransformComponent>(entity, TRANSFORM);
    expect(transform?.position.x).toBe(50);
    expect(transform?.position.z).toBe(0);
  });

  it('should only process entities with both Transform and Velocity', () => {
    const entity1 = world.createEntity();
    world.addComponent(entity1, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(entity1, VELOCITY, createVelocity({ x: 10, y: 0, z: 0 }));
    
    const entity2 = world.createEntity();
    world.addComponent(entity2, TRANSFORM, createTransform({ x: 100, y: 0, z: 0 }));
    
    world.step(1);
    
    const t1 = world.getComponent<TransformComponent>(entity1, TRANSFORM);
    const t2 = world.getComponent<TransformComponent>(entity2, TRANSFORM);
    
    expect(t1?.position.x).toBe(10);
    expect(t2?.position.x).toBe(100);
  });
});

describe('JobAssignmentSystem', () => {
  let world: World;
  let eventBus: EventBus<GameEventMap>;
  let timeSystem: TimeSystem;
  let jobAssignmentSystem: JobAssignmentSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus<GameEventMap>();
    timeSystem = new TimeSystem(eventBus);
    
    jobAssignmentSystem = new JobAssignmentSystem(timeSystem, eventBus);
    world.addSystem(jobAssignmentSystem);
  });

  it('should create idle citizen with JobAssignment', () => {
    const citizen = world.createEntity();
    world.addComponent(citizen, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(citizen, CITIZEN, createCitizen('Test', Gender.Male, JobType.Woodcutter, CitizenState.Idle));
    world.addComponent(citizen, JOB_ASSIGNMENT, createJobAssignment(JobType.Woodcutter));

    world.step(0.016);

    const citizenComp = world.getComponent<CitizenComponent>(citizen, CITIZEN);
    expect(citizenComp?.state).toBeDefined();
  });

  it('should not run when paused', () => {
    const citizen = world.createEntity();
    world.addComponent(citizen, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(citizen, CITIZEN, createCitizen('Test', Gender.Male, JobType.Woodcutter, CitizenState.Idle));
    world.addComponent(citizen, JOB_ASSIGNMENT, createJobAssignment(JobType.Woodcutter));
    
    timeSystem.pause();
    world.step(1);
    
    const citizenComp = world.getComponent<CitizenComponent>(citizen, CITIZEN);
    expect(citizenComp?.state).toBe(CitizenState.Idle);
  });

  it('should recover stuck Walking citizens', () => {
    const citizen = world.createEntity();
    world.addComponent(citizen, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(citizen, CITIZEN, createCitizen('Test', Gender.Male, JobType.Woodcutter, CitizenState.Walking));
    world.addComponent(citizen, JOB_ASSIGNMENT, createJobAssignment(JobType.Woodcutter));
    
    const stateChangeHandler = vi.fn();
    eventBus.on('CitizenStateChanged', stateChangeHandler);
    
    world.step(0.016);
    
    const citizenComp = world.getComponent<CitizenComponent>(citizen, CITIZEN);
    expect(citizenComp?.state).toBe(CitizenState.Idle);
  });

  it('should recover stuck Delivering citizens', () => {
    const citizen = world.createEntity();
    world.addComponent(citizen, TRANSFORM, createTransform({ x: 0, y: 0, z: 0 }));
    world.addComponent(citizen, CITIZEN, createCitizen('Test', Gender.Male, JobType.Woodcutter, CitizenState.Delivering));
    world.addComponent(citizen, JOB_ASSIGNMENT, createJobAssignment(JobType.Woodcutter));
    
    world.step(0.016);
    
    const citizenComp = world.getComponent<CitizenComponent>(citizen, CITIZEN);
    expect(citizenComp?.state).toBe(CitizenState.Idle);
  });
});
