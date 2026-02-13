/**
 * Equipment slot types and item type enums for the equipment system.
 */

/**
 * Slots where equipment can be worn or held.
 */
export enum EquipmentSlot {
  Head = 'Head',
  Shoulder = 'Shoulder',
  Chest = 'Chest',
  Legs = 'Legs',
  Feet = 'Feet',
  Weapon = 'Weapon',
  Trinket = 'Trinket',
}

/**
 * All equippable item types in the game.
 */
export enum ItemType {
  // Head
  LeatherCap = 'LeatherCap',
  IronHelmet = 'IronHelmet',
  // Shoulder
  HideMantle = 'HideMantle',
  ChainPauldrons = 'ChainPauldrons',
  // Chest
  PaddedTunic = 'PaddedTunic',
  IronChestplate = 'IronChestplate',
  // Legs
  LeatherTrousers = 'LeatherTrousers',
  ChainLeggings = 'ChainLeggings',
  // Feet
  RagWraps = 'RagWraps',
  LeatherBoots = 'LeatherBoots',
  // Weapon
  WoodenClub = 'WoodenClub',
  IronSword = 'IronSword',
  // Trinket
  BoneAmulet = 'BoneAmulet',
  GoldRing = 'GoldRing',
}

