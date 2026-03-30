import { beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../ecs/World';
import { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import { ResourceStoreSystem } from '../systems/ResourceStoreSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { BUILDING, createBuilding, type BuildingComponent } from '../ecs/components/BuildingComponent';
import { STORAGE, createStorage, type StorageComponent } from '../ecs/components/StorageComponent';
import { INVENTORY, createInventory, type InventoryComponent } from '../ecs/components/InventoryComponent';
import {
  CONSTRUCTION_SITE,
  createConstructionSite,
  type ConstructionSiteComponent,
} from '../ecs/components/ConstructionSiteComponent';
import {
  JOB_ASSIGNMENT,
  createJobAssignment,
  type JobAssignmentComponent,
} from '../ecs/components/JobAssignmentComponent';
import { ANIMAL, createAnimal, type AnimalComponent } from '../ecs/components/AnimalComponent';
import {
  DEPLETED_RESOURCE,
  createDepletedResource,
  type DepletedResourceComponent,
} from '../ecs/components/DepletedResourceComponent';
import { SELECTABLE, type SelectableComponent } from '../ecs/components/SelectableComponent';
import { TRANSFORM, createTransform, type TransformComponent } from '../ecs/components/TransformComponent';
import { BuildingType } from '../types/buildings';
import { JobType } from '../types/jobs';
import { ResourceType } from '../types/resources';
import type { SaveData } from '../types/save';
import type { IStorageProvider } from './IStorageProvider';
import {
  deleteSave,
  deserialize,
  listSaves,
  loadGame,
  saveGame,
  serialize,
} from './SaveLoadSystem';

class MemoryStorageProvider implements IStorageProvider {
  readonly data = new Map<string, string>();

  async save(key: string, data: string): Promise<void> {
    this.data.set(key, data);
  }

  async load(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async list(): Promise<string[]> {
    return [...this.data.keys()];
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

function createSystems() {
  const eventBus = new EventBus<GameEventMap>();
  return {
    eventBus,
    resourceStore: new ResourceStoreSystem(eventBus),
    timeSystem: new TimeSystem(eventBus),
  };
}

function createSaveData(slot: string): SaveData {
  return {
    version: 1,
    timestamp: '2024-01-01T00:00:00.000Z',
    slot,
    entities: [],
    globalResources: { [ResourceType.Wood]: 5 },
    elapsedTime: 0,
    timeScale: 1,
  };
}

describe('SaveLoadSystem', () => {
  let world: World;
  let eventBus: EventBus<GameEventMap>;
  let resourceStore: ResourceStoreSystem;
  let timeSystem: TimeSystem;

  beforeEach(() => {
    world = new World();
    ({ eventBus, resourceStore, timeSystem } = createSystems());
  });

  it('serializes maps, resources, and only serializable entities', () => {
    const entity = world.createEntity();
    const storage = createStorage(50);
    storage.stored.set(ResourceType.Wood, 20);

    const inventory = createInventory(5);
    inventory.items.set(ResourceType.Food, 3);

    const site = createConstructionSite(new Map([[ResourceType.Wood, 10]]), 30);
    site.deliveredMaterials.set(ResourceType.Wood, 7);

    world.addComponent(entity, TRANSFORM, createTransform({ x: 1, y: 2, z: 3 }));
    world.addComponent(entity, STORAGE, storage);
    world.addComponent(entity, INVENTORY, inventory);
    world.addComponent(entity, CONSTRUCTION_SITE, site);

    const transientOnlyEntity = world.createEntity();
    world.addComponent(transientOnlyEntity, 'MeshRef', { meshId: 'temporary' });

    resourceStore.setResource(ResourceType.Wood, 99);
    timeSystem.setTimeScale(3);

    const saveData = serialize(world, resourceStore, timeSystem);
    const components = saveData.entities[0].components as Record<string, any>;

    expect(saveData.slot).toBe('');
    expect(saveData.timeScale).toBe(3);
    expect(saveData.globalResources[ResourceType.Wood]).toBe(99);
    expect(saveData.entities).toHaveLength(1);
    expect(components[STORAGE].stored).toEqual({ Wood: 20 });
    expect(components[INVENTORY].items).toEqual({ Food: 3 });
    expect(components[CONSTRUCTION_SITE].requiredMaterials).toEqual({ Wood: 10 });
    expect(components[CONSTRUCTION_SITE].deliveredMaterials).toEqual({ Wood: 7 });
    expect(components[STORAGE].stored).not.toBeInstanceOf(Map);
  });

  it('deserializes maps and remaps cross-entity references', () => {
    const sourceWorld = new World();
    const sourceSystems = createSystems();
    const buildingId = sourceWorld.createEntity();
    const workerId = sourceWorld.createEntity();
    const constructionId = sourceWorld.createEntity();
    const animalId = sourceWorld.createEntity();
    const depletedResourceId = sourceWorld.createEntity();

    const building = createBuilding(BuildingType.StorageBarn, 1, true);
    building.workers.push(workerId);
    const storage = createStorage(100);
    storage.stored.set(ResourceType.Wood, 12);

    const inventory = createInventory(8);
    inventory.items.set(ResourceType.Food, 4);

    const site = createConstructionSite(new Map([[ResourceType.Stone, 6]]), 45);
    site.deliveredMaterials.set(ResourceType.Stone, 2);

    sourceWorld.addComponent(buildingId, BUILDING, building);
    sourceWorld.addComponent(buildingId, STORAGE, storage);
    sourceWorld.addComponent(buildingId, SELECTABLE, { selected: false, hoverHighlight: false });
    sourceWorld.addComponent(workerId, INVENTORY, inventory);
    sourceWorld.addComponent(workerId, JOB_ASSIGNMENT, createJobAssignment(JobType.Woodcutter, buildingId));
    sourceWorld.addComponent(workerId, SELECTABLE, { selected: true, hoverHighlight: false });
    sourceWorld.addComponent(constructionId, CONSTRUCTION_SITE, site);
    sourceWorld.addComponent(animalId, ANIMAL, createAnimal('sheep', 'wandering', { x: 3, y: 0, z: 4 }));
    sourceWorld.addComponent(animalId, SELECTABLE, { selected: false, hoverHighlight: true });
    sourceWorld.addComponent(depletedResourceId, DEPLETED_RESOURCE, createDepletedResource(45));
    sourceWorld.getComponent<DepletedResourceComponent>(depletedResourceId, DEPLETED_RESOURCE)!.elapsed = 12;

    sourceSystems.resourceStore.setResource(ResourceType.Stone, 42);
    sourceSystems.timeSystem.setTimeScale(2);
    const saveData = serialize(sourceWorld, sourceSystems.resourceStore, sourceSystems.timeSystem);

    world.createEntity();
    world.createEntity();
    resourceStore.setResource(ResourceType.Wood, 999);
    timeSystem.setTimeScale(5);

    deserialize(saveData, world, resourceStore, timeSystem);

    const loadedBuildingId = world.query(BUILDING)[0];
    const loadedWorkerId = world.query(JOB_ASSIGNMENT)[0];
    const loadedConstructionId = world.query(CONSTRUCTION_SITE)[0];
    const loadedAnimalId = world.query(ANIMAL)[0];
    const loadedDepletedResourceId = world.query(DEPLETED_RESOURCE)[0];

    const loadedBuilding = world.getComponent<BuildingComponent>(loadedBuildingId, BUILDING)!;
    const loadedStorage = world.getComponent<StorageComponent>(loadedBuildingId, STORAGE)!;
    const loadedInventory = world.getComponent<InventoryComponent>(loadedWorkerId, INVENTORY)!;
    const loadedJobAssignment = world.getComponent<JobAssignmentComponent>(loadedWorkerId, JOB_ASSIGNMENT)!;
    const loadedSite = world.getComponent<ConstructionSiteComponent>(loadedConstructionId, CONSTRUCTION_SITE)!;
    const loadedWorkerSelectable = world.getComponent<SelectableComponent>(loadedWorkerId, SELECTABLE)!;
    const loadedAnimal = world.getComponent<AnimalComponent>(loadedAnimalId, ANIMAL)!;
    const loadedAnimalSelectable = world.getComponent<SelectableComponent>(loadedAnimalId, SELECTABLE)!;
    const loadedDepletedResource = world.getComponent<DepletedResourceComponent>(loadedDepletedResourceId, DEPLETED_RESOURCE)!;

    expect(world.entityCount()).toBe(5);
    expect(loadedBuildingId).not.toBe(buildingId);
    expect(loadedWorkerId).not.toBe(workerId);
    expect(loadedBuilding.workers).toEqual([loadedWorkerId]);
    expect(loadedJobAssignment.workplaceEntity).toBe(loadedBuildingId);
    expect(loadedStorage.stored).toBeInstanceOf(Map);
    expect(loadedStorage.stored.get(ResourceType.Wood)).toBe(12);
    expect(loadedInventory.items).toBeInstanceOf(Map);
    expect(loadedInventory.items.get(ResourceType.Food)).toBe(4);
    expect(loadedSite.requiredMaterials).toBeInstanceOf(Map);
    expect(loadedSite.deliveredMaterials.get(ResourceType.Stone)).toBe(2);
    expect(loadedWorkerSelectable.selected).toBe(true);
    expect(loadedAnimal.type).toBe('sheep');
    expect(loadedAnimal.state).toBe('wandering');
    expect(loadedAnimal.targetPosition).toEqual({ x: 3, y: 0, z: 4 });
    expect(loadedAnimalSelectable.hoverHighlight).toBe(true);
    expect(loadedDepletedResource.respawnDelay).toBe(45);
    expect(loadedDepletedResource.elapsed).toBe(12);
    expect(resourceStore.getResource(ResourceType.Stone)).toBe(42);
    expect(timeSystem.getTimeScale()).toBe(2);
  });

  it('saveGame persists the slot payload and emits GameSaved', async () => {
    const provider = new MemoryStorageProvider();
    const onSaved = vi.fn();
    eventBus.on('GameSaved', onSaved);

    const entity = world.createEntity();
    world.addComponent(entity, TRANSFORM, createTransform({ x: 4, y: 0, z: 9 }));
    resourceStore.setResource(ResourceType.Food, 12);
    timeSystem.setTimeScale(4);

    await saveGame('slot-1', provider, world, resourceStore, timeSystem, eventBus);

    const savedJson = provider.data.get('slot-1');
    const savedData = JSON.parse(savedJson!) as SaveData;

    expect(savedData.slot).toBe('slot-1');
    expect(savedData.timeScale).toBe(4);
    expect(savedData.globalResources[ResourceType.Food]).toBe(12);
    expect(onSaved).toHaveBeenCalledWith({
      slot: 'slot-1',
      timestamp: expect.any(String),
    });
  });

  it('loadGame returns false and does not emit when a slot is missing', async () => {
    const provider = new MemoryStorageProvider();
    const onLoaded = vi.fn();
    eventBus.on('GameLoaded', onLoaded);

    await expect(loadGame('missing', provider, world, resourceStore, timeSystem, eventBus)).resolves.toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('loadGame restores saved world state and emits GameLoaded', async () => {
    const provider = new MemoryStorageProvider();
    const sourceWorld = new World();
    const sourceSystems = createSystems();
    const sourceEntity = sourceWorld.createEntity();
    sourceWorld.addComponent(sourceEntity, TRANSFORM, createTransform({ x: 8, y: 1, z: 2 }));
    sourceSystems.resourceStore.setResource(ResourceType.Gold, 7);
    sourceSystems.timeSystem.setTimeScale(6);

    await saveGame(
      'slot-2',
      provider,
      sourceWorld,
      sourceSystems.resourceStore,
      sourceSystems.timeSystem,
      sourceSystems.eventBus,
    );

    const onLoaded = vi.fn();
    eventBus.on('GameLoaded', onLoaded);
    world.createEntity();

    const loaded = await loadGame('slot-2', provider, world, resourceStore, timeSystem, eventBus);
    const loadedEntity = world.getEntities()[0];
    const transform = world.getComponent<TransformComponent>(loadedEntity, TRANSFORM)!;

    expect(loaded).toBe(true);
    expect(world.entityCount()).toBe(1);
    expect(transform.position).toEqual({ x: 8, y: 1, z: 2 });
    expect(resourceStore.getResource(ResourceType.Gold)).toBe(7);
    expect(timeSystem.getTimeScale()).toBe(6);
    expect(onLoaded).toHaveBeenCalledWith({
      slot: 'slot-2',
      timestamp: expect.any(String),
    });
  });

  it('listSaves returns valid saves and skips corrupted entries', async () => {
    const provider = new MemoryStorageProvider();
    await provider.save('slot-a', JSON.stringify(createSaveData('slot-a')));
    await provider.save('broken', '{not valid json');
    await provider.save('slot-b', JSON.stringify(createSaveData('slot-b')));

    const saves = await listSaves(provider);

    expect(saves.map((save) => save.slot).sort()).toEqual(['slot-a', 'slot-b']);
  });

  it('deleteSave removes a stored slot', async () => {
    const provider = new MemoryStorageProvider();
    await provider.save('slot-z', JSON.stringify(createSaveData('slot-z')));

    await deleteSave('slot-z', provider);

    await expect(provider.load('slot-z')).resolves.toBeNull();
  });
});