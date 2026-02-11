import { ResourceType } from './resources';
import { BuildingType } from './buildings';
import { JobType } from './jobs';
import { CitizenState } from './citizens';

/**
 * Serialized entity data for save files.
 */
export interface SavedEntity {
  id: number;
  components: Record<string, unknown>;
}

/**
 * Versioned save data structure.
 */
export interface SaveData {
  /** Save format version for migration support */
  version: number;

  /** ISO timestamp of when the save was created */
  timestamp: string;

  /** Save slot identifier */
  slot: string;

  /** All entities and their component data */
  entities: SavedEntity[];

  /** Global resource stockpile totals */
  globalResources: Partial<Record<ResourceType, number>>;

  /** Game elapsed time in seconds */
  elapsedTime: number;

  /** Current time scale */
  timeScale: number;
}

