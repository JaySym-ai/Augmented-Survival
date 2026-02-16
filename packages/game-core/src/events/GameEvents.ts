import type { EntityId } from '../ecs/Entity';
import type { ResourceType } from '../types/resources';
import type { BuildingType } from '../types/buildings';
import type { JobType } from '../types/jobs';
import type { CitizenState } from '../types/citizens';
import type { Vector3 } from '../ecs/components/TransformComponent';
import type { EventMap } from './EventBus';

// --- Resource Events ---

export interface ResourcePickedUpEvent {
  entityId: EntityId;
  resourceType: ResourceType;
  amount: number;
  sourceId: EntityId;
}

export interface ResourceDeliveredEvent {
  entityId: EntityId;
  resourceType: ResourceType;
  amount: number;
  destinationBuildingId: EntityId;
}

export interface InventoryChangedEvent {
  entityId: EntityId;
  diff: Partial<Record<ResourceType, number>>;
}

export interface GatherHitEvent {
  entityId: EntityId;
  resourceType: ResourceType;
  currentHit: number;
  totalHits: number;
  targetEntity: EntityId;
}

export interface ResourceDepletedEvent {
  entityId: EntityId;
  resourceType: ResourceType;
}

export interface ResourceRespawnedEvent {
  entityId: EntityId;
  resourceType: ResourceType;
}

// --- Building Events ---

export interface BuildingPlacedEvent {
  buildingId: EntityId;
  buildingType: BuildingType;
  position: Vector3;
}

export interface ConstructionProgressEvent {
  buildingId: EntityId;
  deliveredMaterials: Partial<Record<ResourceType, number>>;
}

export interface ConstructionCompleteEvent {
  buildingId: EntityId;
  buildingType: BuildingType;
}

export interface BuildingDestroyRequestedEvent {
  buildingId: EntityId;
}

// --- Citizen Events ---

export interface CitizenAssignedJobEvent {
  entityId: EntityId;
  jobType: JobType;
}

export interface CitizenStateChangedEvent {
  entityId: EntityId;
  oldState: CitizenState;
  newState: CitizenState;
}

// --- Selection Events ---

export interface EntitySelectedEvent {
  entityId: EntityId;
}

export interface EntityDeselectedEvent {
  entityId: EntityId;
}

// --- Game State Events ---

export interface GameSavedEvent {
  slot: string;
  timestamp: string;
}

export interface GameLoadedEvent {
  slot: string;
  timestamp: string;
}

export interface TimeScaleChangedEvent {
  oldScale: number;
  newScale: number;
}

// --- Aggregate Event Map ---

/**
 * All game events mapped by their string type key.
 * Use with EventBus<GameEventMap> for full type safety.
 */
export interface GameEventMap extends EventMap {
  ResourcePickedUp: ResourcePickedUpEvent;
  ResourceDelivered: ResourceDeliveredEvent;
  InventoryChanged: InventoryChangedEvent;
  GatherHit: GatherHitEvent;
  ResourceDepleted: ResourceDepletedEvent;
  ResourceRespawned: ResourceRespawnedEvent;
  BuildingPlaced: BuildingPlacedEvent;
  ConstructionProgress: ConstructionProgressEvent;
  ConstructionComplete: ConstructionCompleteEvent;
  BuildingDestroyRequested: BuildingDestroyRequestedEvent;
  CitizenAssignedJob: CitizenAssignedJobEvent;
  CitizenStateChanged: CitizenStateChangedEvent;
  EntitySelected: EntitySelectedEvent;
  EntityDeselected: EntityDeselectedEvent;
  GameSaved: GameSavedEvent;
  GameLoaded: GameLoadedEvent;
  TimeScaleChanged: TimeScaleChangedEvent;
}

