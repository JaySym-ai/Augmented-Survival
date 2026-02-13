/**
 * @augmented-survival/game-core
 * Core game logic, ECS framework, and shared types.
 */

export const GAME_VERSION = '0.1.0';

// ECS Framework
export { World } from './ecs/World';
export { EntityAllocator } from './ecs/Entity';
export type { EntityId } from './ecs/Entity';
export { ComponentStore, ComponentRegistry } from './ecs/Component';
export type { ComponentType } from './ecs/Component';
export { System } from './ecs/System';
export { queryEntities } from './ecs/Query';

// ECS Components
export type {
  Vector3,
  Quaternion,
  TransformComponent,
} from './ecs/components/TransformComponent';
export { TRANSFORM, createTransform } from './ecs/components/TransformComponent';

export type { VelocityComponent } from './ecs/components/VelocityComponent';
export { VELOCITY, createVelocity } from './ecs/components/VelocityComponent';

export type { MeshRefComponent } from './ecs/components/MeshRefComponent';
export { MESH_REF, createMeshRef } from './ecs/components/MeshRefComponent';

export type { SelectableComponent } from './ecs/components/SelectableComponent';
export { SELECTABLE, createSelectable } from './ecs/components/SelectableComponent';

export type { CitizenComponent } from './ecs/components/CitizenComponent';
export { CITIZEN, createCitizen } from './ecs/components/CitizenComponent';

export type { InventoryComponent } from './ecs/components/InventoryComponent';
export { INVENTORY, createInventory } from './ecs/components/InventoryComponent';

export type { BuildingComponent } from './ecs/components/BuildingComponent';
export { BUILDING, createBuilding } from './ecs/components/BuildingComponent';

export type { ConstructionSiteComponent } from './ecs/components/ConstructionSiteComponent';
export { CONSTRUCTION_SITE, createConstructionSite } from './ecs/components/ConstructionSiteComponent';

export type { ResourceNodeComponent } from './ecs/components/ResourceNodeComponent';
export { RESOURCE_NODE, createResourceNode } from './ecs/components/ResourceNodeComponent';

export type { PathFollowComponent } from './ecs/components/PathFollowComponent';
export { PATH_FOLLOW, createPathFollow } from './ecs/components/PathFollowComponent';

export type { GatheringComponent } from './ecs/components/GatheringComponent';
export { GATHERING, createGathering } from './ecs/components/GatheringComponent';

export type { CarryComponent } from './ecs/components/CarryComponent';
export { CARRY, createCarry } from './ecs/components/CarryComponent';

export type { StorageComponent } from './ecs/components/StorageComponent';
export { STORAGE, createStorage } from './ecs/components/StorageComponent';

export type { JobAssignmentComponent } from './ecs/components/JobAssignmentComponent';
export { JOB_ASSIGNMENT, createJobAssignment } from './ecs/components/JobAssignmentComponent';

export type { ConstructionWorkComponent } from './ecs/components/ConstructionWorkComponent';
export { CONSTRUCTION_WORK, createConstructionWork } from './ecs/components/ConstructionWorkComponent';

export type { DepletedResourceComponent } from './ecs/components/DepletedResourceComponent';
export { DEPLETED_RESOURCE, createDepletedResource } from './ecs/components/DepletedResourceComponent';

export type { EquipmentComponent } from './ecs/components/EquipmentComponent';
export { EQUIPMENT, createEquipment } from './ecs/components/EquipmentComponent';

export type { AnimalComponent, AnimalType, AnimalState, FlockingData } from './ecs/components/AnimalComponent';
export { ANIMAL, createAnimal } from './ecs/components/AnimalComponent';

// Events
export { EventBus } from './events/EventBus';
export type { EventHandler, EventMap } from './events/EventBus';
export type {
  ResourcePickedUpEvent,
  ResourceDeliveredEvent,
  InventoryChangedEvent,
  GatherHitEvent,
  ResourceDepletedEvent,
  ResourceRespawnedEvent,
  BuildingPlacedEvent,
  ConstructionProgressEvent,
  ConstructionCompleteEvent,
  CitizenAssignedJobEvent,
  CitizenStateChangedEvent,
  EntitySelectedEvent,
  EntityDeselectedEvent,
  GameSavedEvent,
  GameLoadedEvent,
  TimeScaleChangedEvent,
  GameEventMap,
} from './events/GameEvents';

// Terrain
export { TerrainGenerator, sampleTerrainHeight } from './terrain/TerrainGenerator';
export type { TerrainData } from './terrain/TerrainGenerator';

// Systems
export { TimeSystem } from './systems/TimeSystem';
export { MovementSystem } from './systems/MovementSystem';
export { PathFollowSystem } from './systems/PathFollowSystem';
export { JobAssignmentSystem, findNearestEntity, findNearestStorage } from './systems/JobAssignmentSystem';
export { GatherSystem } from './systems/GatherSystem';
export { CarrySystem } from './systems/CarrySystem';
export { DeliverySystem } from './systems/DeliverySystem';
export { ConstructionSystem } from './systems/ConstructionSystem';
export { ResourceStoreSystem } from './systems/ResourceStoreSystem';
export { BuildingPlacementSystem } from './systems/BuildingPlacementSystem';
export { ResourceDepletionSystem } from './systems/ResourceDepletionSystem';
export { AnimalAISystem } from './systems/AnimalAISystem';

// Types
export { ResourceType } from './types/resources';
export { BuildingType } from './types/buildings';
export { JobType } from './types/jobs';
export { CitizenState } from './types/citizens';
export { EquipmentSlot, ItemType } from './types/items';
export type { BuildingConfig, GameConfig } from './types/config';
export type { SavedEntity, SaveData } from './types/save';

// Content — data-driven definitions
export { BUILDING_DEFS } from './content/BuildingDefs';
export type { ExtendedBuildingDef } from './content/BuildingDefs';
export { RESOURCE_DEFS } from './content/ResourceDefs';
export type { ResourceDef } from './content/ResourceDefs';
export { JOB_DEFS } from './content/JobDefs';
export type { JobDef } from './content/JobDefs';
export { ITEM_DEFS } from './content/ItemDefs';
export type { ItemDef } from './content/ItemDefs';
export { DEFAULT_GAME_CONFIG } from './content/DefaultGameConfig';

// Save/Load
export type { IStorageProvider } from './save/IStorageProvider';
export { LocalStorageProvider } from './save/LocalStorageProvider';
export {
  serialize,
  deserialize,
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
} from './save/SaveLoadSystem';

// Stub Systems — interfaces and no-op implementations for future features
export type { ITradeSystem } from './stubs/TradeSystem';
export { TradeSystemStub } from './stubs/TradeSystem';
export type { IEconomySystem } from './stubs/EconomySystem';
export { EconomySystemStub } from './stubs/EconomySystem';
export type { ISicknessSystem } from './stubs/SicknessSystem';
export { SicknessSystemStub } from './stubs/SicknessSystem';
export type { ILivestockSystem } from './stubs/LivestockSystem';
export { LivestockSystemStub } from './stubs/LivestockSystem';
export type { IMilitarySystem } from './stubs/MilitarySystem';
export { MilitarySystemStub } from './stubs/MilitarySystem';
export type { IExplorationSystem } from './stubs/ExplorationSystem';
export { ExplorationSystemStub } from './stubs/ExplorationSystem';
