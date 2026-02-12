import { ResourceType } from './resources';
import { BuildingType } from './buildings';

/**
 * Configuration for building costs and properties.
 */
export interface BuildingConfig {
  type: BuildingType;
  displayName: string;
  cost: Partial<Record<ResourceType, number>>;
  workerSlots: number;
  buildTime: number;
}

/**
 * Global game configuration.
 */
export interface GameConfig {
  /** Map dimensions in world units */
  mapSize: { width: number; height: number };

  /** Starting resources for a new game */
  startingResources: Partial<Record<ResourceType, number>>;

  /** Number of citizens at game start */
  startingCitizens: number;

  /** Configuration for each building type */
  buildings: Record<BuildingType, BuildingConfig>;

  /** Base movement speed for citizens */
  citizenBaseSpeed: number;

  /** Base gather rate (units per second) */
  gatherRate: number;

  /** Time scale bounds */
  minTimeScale: number;
  maxTimeScale: number;
}

