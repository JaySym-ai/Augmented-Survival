import { describe, it, expect } from 'vitest';
import {
  ResourceType,
  BuildingType,
  JobType,
  CitizenState,
  EquipmentSlot,
  ItemType,
} from './types';
import type { BuildingConfig, GameConfig } from './types/config';
import type { SavedEntity, SaveData } from './types/save';

describe('Types', () => {
  describe('ResourceType', () => {
    it('should have all expected resource types', () => {
      expect(ResourceType.Wood).toBe('Wood');
      expect(ResourceType.Food).toBe('Food');
      expect(ResourceType.Stone).toBe('Stone');
      expect(ResourceType.Iron).toBe('Iron');
      expect(ResourceType.Gold).toBe('Gold');
      expect(ResourceType.Hemp).toBe('Hemp');
      expect(ResourceType.Branch).toBe('Branch');
    });

    it('should have correct string values', () => {
      expect(Object.values(ResourceType)).toEqual([
        'Wood',
        'Food',
        'Stone',
        'Iron',
        'Gold',
        'Hemp',
        'Branch',
      ]);
    });
  });

  describe('BuildingType', () => {
    it('should have all expected building types', () => {
      expect(BuildingType.TownCenter).toBe('TownCenter');
      expect(BuildingType.House).toBe('House');
      expect(BuildingType.StorageBarn).toBe('StorageBarn');
      expect(BuildingType.WoodcutterHut).toBe('WoodcutterHut');
      expect(BuildingType.FarmField).toBe('FarmField');
      expect(BuildingType.Quarry).toBe('Quarry');
    });
  });

  describe('JobType', () => {
    it('should have all expected job types', () => {
      expect(JobType.Idle).toBe('Idle');
      expect(JobType.Woodcutter).toBe('Woodcutter');
      expect(JobType.Farmer).toBe('Farmer');
      expect(JobType.Quarrier).toBe('Quarrier');
      expect(JobType.Builder).toBe('Builder');
      expect(JobType.Hauler).toBe('Hauler');
      expect(JobType.Miner).toBe('Miner');
      expect(JobType.Forager).toBe('Forager');
    });
  });

  describe('CitizenState', () => {
    it('should have all expected citizen states', () => {
      expect(CitizenState.Idle).toBe('Idle');
      expect(CitizenState.Walking).toBe('Walking');
      expect(CitizenState.Gathering).toBe('Gathering');
      expect(CitizenState.Carrying).toBe('Carrying');
      expect(CitizenState.Delivering).toBe('Delivering');
      expect(CitizenState.Building).toBe('Building');
    });
  });

  describe('EquipmentSlot', () => {
    it('should have all expected equipment slots', () => {
      expect(EquipmentSlot.Head).toBe('Head');
      expect(EquipmentSlot.Shoulder).toBe('Shoulder');
      expect(EquipmentSlot.Chest).toBe('Chest');
      expect(EquipmentSlot.Legs).toBe('Legs');
      expect(EquipmentSlot.Feet).toBe('Feet');
      expect(EquipmentSlot.Weapon).toBe('Weapon');
      expect(EquipmentSlot.Trinket).toBe('Trinket');
    });
  });

  describe('ItemType', () => {
    it('should have head equipment items', () => {
      expect(ItemType.LeatherCap).toBe('LeatherCap');
      expect(ItemType.IronHelmet).toBe('IronHelmet');
    });

    it('should have shoulder equipment items', () => {
      expect(ItemType.HideMantle).toBe('HideMantle');
      expect(ItemType.ChainPauldrons).toBe('ChainPauldrons');
    });

    it('should have chest equipment items', () => {
      expect(ItemType.PaddedTunic).toBe('PaddedTunic');
      expect(ItemType.IronChestplate).toBe('IronChestplate');
    });

    it('should have legs equipment items', () => {
      expect(ItemType.LeatherTrousers).toBe('LeatherTrousers');
      expect(ItemType.ChainLeggings).toBe('ChainLeggings');
    });

    it('should have feet equipment items', () => {
      expect(ItemType.RagWraps).toBe('RagWraps');
      expect(ItemType.LeatherBoots).toBe('LeatherBoots');
    });

    it('should have weapon items', () => {
      expect(ItemType.WoodenClub).toBe('WoodenClub');
      expect(ItemType.IronSword).toBe('IronSword');
    });

    it('should have trinket items', () => {
      expect(ItemType.BoneAmulet).toBe('BoneAmulet');
      expect(ItemType.GoldRing).toBe('GoldRing');
    });
  });

  describe('BuildingConfig', () => {
    it('should have correct shape', () => {
      const config: BuildingConfig = {
        type: BuildingType.House,
        displayName: 'House',
        cost: { Wood: 10 },
        workerSlots: 2,
        buildTime: 30,
      };
      expect(config.type).toBe(BuildingType.House);
      expect(config.displayName).toBe('House');
      expect(config.cost.Wood).toBe(10);
      expect(config.workerSlots).toBe(2);
      expect(config.buildTime).toBe(30);
    });
  });

  describe('GameConfig', () => {
    it('should have correct shape', () => {
      const config: GameConfig = {
        mapSize: { width: 100, height: 100 },
        startingResources: { Wood: 50, Food: 50 },
        startingCitizens: 5,
        buildings: {} as Record<BuildingType, BuildingConfig>,
        citizenBaseSpeed: 2,
        gatherRate: 1,
        minTimeScale: 0.1,
        maxTimeScale: 5,
      };
      expect(config.mapSize.width).toBe(100);
      expect(config.startingCitizens).toBe(5);
      expect(config.citizenBaseSpeed).toBe(2);
    });
  });

  describe('SavedEntity', () => {
    it('should have correct shape', () => {
      const entity: SavedEntity = {
        id: 1,
        components: { position: { x: 10, y: 20 } },
      };
      expect(entity.id).toBe(1);
      expect(entity.components.position).toEqual({ x: 10, y: 20 });
    });
  });

  describe('SaveData', () => {
    it('should have correct shape', () => {
      const saveData: SaveData = {
        version: 1,
        timestamp: '2024-01-01T00:00:00Z',
        slot: 'save1',
        entities: [],
        globalResources: { Wood: 100 },
        elapsedTime: 3600,
        timeScale: 1,
      };
      expect(saveData.version).toBe(1);
      expect(saveData.slot).toBe('save1');
      expect(saveData.elapsedTime).toBe(3600);
    });
  });
});
