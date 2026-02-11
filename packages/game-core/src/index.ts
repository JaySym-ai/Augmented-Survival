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

// Events
export { EventBus } from './events/EventBus';
export type { EventHandler, EventMap } from './events/EventBus';
export type {
  ResourcePickedUpEvent,
  ResourceDeliveredEvent,
  InventoryChangedEvent,
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

// Types
export { ResourceType } from './types/resources';
export { BuildingType } from './types/buildings';
export { JobType } from './types/jobs';
export { CitizenState } from './types/citizens';
export type { BuildingConfig, GameConfig } from './types/config';
export type { SavedEntity, SaveData } from './types/save';
