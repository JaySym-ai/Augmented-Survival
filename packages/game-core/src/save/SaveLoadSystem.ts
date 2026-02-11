import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { ResourceStoreSystem } from '../systems/ResourceStoreSystem';
import type { TimeSystem } from '../systems/TimeSystem';
import type { SaveData, SavedEntity } from '../types/save';
import type { IStorageProvider } from './IStorageProvider';
import { ResourceType } from '../types/resources';

import { TRANSFORM } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import { RESOURCE_NODE } from '../ecs/components/ResourceNodeComponent';
import { STORAGE } from '../ecs/components/StorageComponent';
import { INVENTORY } from '../ecs/components/InventoryComponent';
import { CONSTRUCTION_SITE } from '../ecs/components/ConstructionSiteComponent';
import { CARRY } from '../ecs/components/CarryComponent';
import { JOB_ASSIGNMENT } from '../ecs/components/JobAssignmentComponent';

/** Current save format version */
const SAVE_VERSION = 1;

/** Components to skip during serialization (transient/rendering-only) */
const TRANSIENT_COMPONENTS = new Set(['MeshRef', 'Selectable', 'PathFollow', 'Gathering']);

/** Components that contain Map fields needing special serialization */
const MAP_FIELDS: Record<string, string[]> = {
  [STORAGE]: ['stored'],
  [INVENTORY]: ['items'],
  [CONSTRUCTION_SITE]: ['requiredMaterials', 'deliveredMaterials'],
};

/** All serializable component names */
const SERIALIZABLE_COMPONENTS = [
  TRANSFORM, VELOCITY, CITIZEN, BUILDING, RESOURCE_NODE,
  STORAGE, INVENTORY, CONSTRUCTION_SITE, CARRY, JOB_ASSIGNMENT,
];

/**
 * Convert Map fields to plain objects for JSON serialization.
 */
function serializeComponent(componentName: string, data: unknown): unknown {
  const mapFields = MAP_FIELDS[componentName];
  if (!mapFields) return data;

  const obj = { ...(data as Record<string, unknown>) };
  for (const field of mapFields) {
    const mapValue = obj[field];
    if (mapValue instanceof Map) {
      obj[field] = Object.fromEntries(mapValue);
    }
  }
  return obj;
}

/**
 * Convert plain objects back to Maps after JSON deserialization.
 */
function deserializeComponent(componentName: string, data: unknown): unknown {
  const mapFields = MAP_FIELDS[componentName];
  if (!mapFields) return data;

  const obj = { ...(data as Record<string, unknown>) };
  for (const field of mapFields) {
    const plainObj = obj[field];
    if (plainObj && typeof plainObj === 'object' && !(plainObj instanceof Map)) {
      obj[field] = new Map(Object.entries(plainObj as Record<string, unknown>));
    }
  }
  return obj;
}

/**
 * Serialize the entire ECS world into a SaveData structure.
 */
export function serialize(
  world: World,
  resourceStore: ResourceStoreSystem,
  timeSystem: TimeSystem,
): SaveData {
  const entities: SavedEntity[] = [];

  for (const entityId of world.getEntities()) {
    const components: Record<string, unknown> = {};

    for (const compName of SERIALIZABLE_COMPONENTS) {
      const comp = world.getComponent(entityId, compName);
      if (comp !== undefined) {
        components[compName] = serializeComponent(compName, comp);
      }
    }

    // Only save entities that have at least one serializable component
    if (Object.keys(components).length > 0) {
      entities.push({ id: entityId, components });
    }
  }

  // Serialize global resources
  const allResources = resourceStore.getAll();
  const globalResources: Partial<Record<ResourceType, number>> = {};
  for (const [type, amount] of allResources) {
    globalResources[type] = amount;
  }

  return {
    version: SAVE_VERSION,
    timestamp: new Date().toISOString(),
    slot: '', // filled in by saveGame
    entities,
    globalResources,
    elapsedTime: 0, // TODO: track elapsed time when TimeSystem supports it
    timeScale: timeSystem.getTimeScale(),
  };
}

/**
 * Deserialize SaveData back into the ECS world.
 * Clears the existing world first, then recreates all entities and components.
 * Maintains an ID mapping to fix cross-entity references.
 */
export function deserialize(
  saveData: SaveData,
  world: World,
  resourceStore: ResourceStoreSystem,
  timeSystem: TimeSystem,
): void {
  // Version check
  if (saveData.version > SAVE_VERSION) {
    throw new Error(
      `Save version ${saveData.version} is newer than supported version ${SAVE_VERSION}. ` +
      'Please update the game.',
    );
  }

  // Clear existing world state (entities + components, but not systems)
  const existingEntities = world.getEntities();
  for (const eid of existingEntities) {
    world.destroyEntity(eid);
  }

  // Create entities and build old→new ID mapping
  const idMap = new Map<number, EntityId>();

  // Sort entities by original ID to create them in order
  const sortedEntities = [...saveData.entities].sort((a, b) => a.id - b.id);

  for (const savedEntity of sortedEntities) {
    const newId = world.createEntity();
    idMap.set(savedEntity.id, newId);
  }

  // Add components to entities, fixing cross-entity references
  for (const savedEntity of sortedEntities) {
    const newId = idMap.get(savedEntity.id)!;

    for (const [compName, compData] of Object.entries(savedEntity.components)) {
      if (TRANSIENT_COMPONENTS.has(compName)) continue;

      let data = deserializeComponent(compName, compData);

      // Fix cross-entity references
      data = fixEntityReferences(compName, data, idMap);

      world.addComponent(newId, compName, data);
    }
  }

  // Restore global resources
  for (const [type, amount] of Object.entries(saveData.globalResources)) {
    if (amount !== undefined) {
      resourceStore.setResource(type as ResourceType, amount);
    }
  }

  // Restore time scale
  timeSystem.setTimeScale(saveData.timeScale);
}

/**
 * Fix entity ID references within component data after ID remapping.
 */
function fixEntityReferences(
  componentName: string,
  data: unknown,
  idMap: Map<number, EntityId>,
): unknown {
  const obj = data as Record<string, unknown>;

  if (componentName === 'Building' && Array.isArray(obj['workers'])) {
    return {
      ...obj,
      workers: (obj['workers'] as number[]).map(
        (oldId) => idMap.get(oldId) ?? oldId,
      ),
    };
  }

  if (componentName === 'JobAssignment' && obj['workplaceEntity'] != null) {
    return {
      ...obj,
      workplaceEntity: idMap.get(obj['workplaceEntity'] as number) ?? obj['workplaceEntity'],
    };
  }

  return data;
}

/**
 * Save the game to a named slot.
 */
export async function saveGame(
  slot: string,
  storageProvider: IStorageProvider,
  world: World,
  resourceStore: ResourceStoreSystem,
  timeSystem: TimeSystem,
  eventBus: EventBus<GameEventMap>,
): Promise<void> {
  const saveData = serialize(world, resourceStore, timeSystem);
  saveData.slot = slot;

  const json = JSON.stringify(saveData);
  await storageProvider.save(slot, json);

  eventBus.emit('GameSaved', {
    slot,
    timestamp: saveData.timestamp,
  });
}

/**
 * Load a game from a named slot.
 * Returns false if no save was found for the slot.
 */
export async function loadGame(
  slot: string,
  storageProvider: IStorageProvider,
  world: World,
  resourceStore: ResourceStoreSystem,
  timeSystem: TimeSystem,
  eventBus: EventBus<GameEventMap>,
): Promise<boolean> {
  const json = await storageProvider.load(slot);
  if (!json) return false;

  const saveData: SaveData = JSON.parse(json);
  deserialize(saveData, world, resourceStore, timeSystem);

  eventBus.emit('GameLoaded', {
    slot,
    timestamp: saveData.timestamp,
  });

  return true;
}

/**
 * List all saves with their metadata.
 */
export async function listSaves(
  storageProvider: IStorageProvider,
): Promise<SaveData[]> {
  const keys = await storageProvider.list();
  const saves: SaveData[] = [];

  for (const key of keys) {
    const json = await storageProvider.load(key);
    if (json) {
      try {
        saves.push(JSON.parse(json) as SaveData);
      } catch {
        // Skip corrupted saves
      }
    }
  }

  return saves;
}

/**
 * Delete a save from a named slot.
 */
export async function deleteSave(
  slot: string,
  storageProvider: IStorageProvider,
): Promise<void> {
  await storageProvider.delete(slot);
}

