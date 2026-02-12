/**
 * Data-driven building definitions for all building types.
 */
import { BuildingType } from '../types/buildings.js';
import { BuildingConfig } from '../types/config.js';
import { ResourceType } from '../types/resources.js';

export interface ExtendedBuildingDef extends BuildingConfig {
  description: string;
  size: { width: number; depth: number };
  meshId: string;
  storageCapacity: number;
  providesPopulation: number;
  jobType: string | null;
}

export const BUILDING_DEFS: Record<BuildingType, ExtendedBuildingDef> = {
  [BuildingType.TownCenter]: {
    type: BuildingType.TownCenter,
    displayName: 'Town Center',
    description: 'The heart of your settlement. Stores resources and spawns citizens.',
    cost: {},
    workerSlots: 0,
    buildTime: 0,
    size: { width: 4, depth: 4 },
    meshId: 'building_town_center',
    storageCapacity: 200,
    providesPopulation: 5,
    jobType: null,
  },
  [BuildingType.House]: {
    type: BuildingType.House,
    displayName: 'House',
    description: 'Provides shelter for your citizens.',
    cost: { [ResourceType.Wood]: 10, [ResourceType.Stone]: 5 },
    workerSlots: 0,
    buildTime: 15,
    size: { width: 2, depth: 2 },
    meshId: 'building_house',
    storageCapacity: 0,
    providesPopulation: 4,
    jobType: null,
  },
  [BuildingType.StorageBarn]: {
    type: BuildingType.StorageBarn,
    displayName: 'Storage Barn',
    description: 'Additional storage for resources.',
    cost: { [ResourceType.Wood]: 15 },
    workerSlots: 0,
    buildTime: 10,
    size: { width: 3, depth: 3 },
    meshId: 'building_storage_barn',
    storageCapacity: 300,
    providesPopulation: 0,
    jobType: null,
  },
  [BuildingType.WoodcutterHut]: {
    type: BuildingType.WoodcutterHut,
    displayName: "Woodcutter's Hut",
    description: 'Assigns a woodcutter to chop trees.',
    cost: { [ResourceType.Wood]: 5 },
    workerSlots: 2,
    buildTime: 8,
    size: { width: 2, depth: 2 },
    meshId: 'building_woodcutter',
    storageCapacity: 0,
    providesPopulation: 0,
    jobType: 'Woodcutter',
  },
  [BuildingType.FarmField]: {
    type: BuildingType.FarmField,
    displayName: 'Farm Field',
    description: 'Grows food for your settlement.',
    cost: { [ResourceType.Wood]: 5 },
    workerSlots: 2,
    buildTime: 5,
    size: { width: 4, depth: 4 },
    meshId: 'building_farm',
    storageCapacity: 0,
    providesPopulation: 0,
    jobType: 'Farmer',
  },
  [BuildingType.Quarry]: {
    type: BuildingType.Quarry,
    displayName: 'Quarry',
    description: 'Extracts stone from rock deposits.',
    cost: { [ResourceType.Wood]: 10 },
    workerSlots: 2,
    buildTime: 12,
    size: { width: 3, depth: 3 },
    meshId: 'building_quarry',
    storageCapacity: 0,
    providesPopulation: 0,
    jobType: 'Quarrier',
  },
};

