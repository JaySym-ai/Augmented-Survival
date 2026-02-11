/**
 * Default game configuration with all values filled in.
 */
import { GameConfig } from '../types/config.js';
import { BuildingType } from '../types/buildings.js';
import { ResourceType } from '../types/resources.js';
import { BUILDING_DEFS } from './BuildingDefs.js';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mapSize: { width: 200, height: 200 },

  startingResources: {
    [ResourceType.Wood]: 50,
    [ResourceType.Food]: 30,
    [ResourceType.Stone]: 20,
  },

  startingCitizens: 5,

  buildings: {
    [BuildingType.TownCenter]: BUILDING_DEFS[BuildingType.TownCenter],
    [BuildingType.House]: BUILDING_DEFS[BuildingType.House],
    [BuildingType.StorageBarn]: BUILDING_DEFS[BuildingType.StorageBarn],
    [BuildingType.WoodcutterHut]: BUILDING_DEFS[BuildingType.WoodcutterHut],
    [BuildingType.FarmField]: BUILDING_DEFS[BuildingType.FarmField],
    [BuildingType.Quarry]: BUILDING_DEFS[BuildingType.Quarry],
  },

  citizenBaseSpeed: 3.0,
  gatherRate: 1.0,
  minTimeScale: 0,
  maxTimeScale: 3,
};

