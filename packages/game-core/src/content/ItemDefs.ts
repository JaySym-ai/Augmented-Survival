/**
 * Data-driven item definitions for all equippable item types.
 */
import { EquipmentSlot, ItemType } from '../types/items.js';

export interface ItemDef {
  type: ItemType;
  displayName: string;
  icon: string;
  description: string;
  slot: EquipmentSlot;
  statBonuses?: Partial<Record<string, number>>;
}

export const ITEM_DEFS: Record<ItemType, ItemDef> = {
  // ── Head ──────────────────────────────────────────────
  [ItemType.LeatherCap]: {
    type: ItemType.LeatherCap,
    displayName: 'Leather Cap',
    icon: '🧢',
    description: 'A simple cap stitched from tanned hides.',
    slot: EquipmentSlot.Head,
    statBonuses: { defense: 1 },
  },
  [ItemType.IronHelmet]: {
    type: ItemType.IronHelmet,
    displayName: 'Iron Helmet',
    icon: '🪖',
    description: 'A sturdy helmet forged from iron plates.',
    slot: EquipmentSlot.Head,
    statBonuses: { defense: 3 },
  },

  // ── Shoulder ──────────────────────────────────────────
  [ItemType.HideMantle]: {
    type: ItemType.HideMantle,
    displayName: 'Hide Mantle',
    icon: '🦌',
    description: 'A rough mantle fashioned from animal hides.',
    slot: EquipmentSlot.Shoulder,
    statBonuses: { defense: 1, gatherSpeed: 0.05 },
  },
  [ItemType.ChainPauldrons]: {
    type: ItemType.ChainPauldrons,
    displayName: 'Chain Pauldrons',
    icon: '⛓️',
    description: 'Interlocking chain links protect the shoulders.',
    slot: EquipmentSlot.Shoulder,
    statBonuses: { defense: 3 },
  },

  // ── Chest ─────────────────────────────────────────────
  [ItemType.PaddedTunic]: {
    type: ItemType.PaddedTunic,
    displayName: 'Padded Tunic',
    icon: '👕',
    description: 'A quilted tunic offering light protection.',
    slot: EquipmentSlot.Chest,
    statBonuses: { defense: 2, health: 5 },
  },
  [ItemType.IronChestplate]: {
    type: ItemType.IronChestplate,
    displayName: 'Iron Chestplate',
    icon: '🛡️',
    description: 'Heavy iron armor covering the torso.',
    slot: EquipmentSlot.Chest,
    statBonuses: { defense: 5, health: 10 },
  },

  // ── Legs ──────────────────────────────────────────────
  [ItemType.LeatherTrousers]: {
    type: ItemType.LeatherTrousers,
    displayName: 'Leather Trousers',
    icon: '👖',
    description: 'Durable trousers made from cured leather.',
    slot: EquipmentSlot.Legs,
    statBonuses: { defense: 1, moveSpeed: 0.05 },
  },
  [ItemType.ChainLeggings]: {
    type: ItemType.ChainLeggings,
    displayName: 'Chain Leggings',
    icon: '🦿',
    description: 'Chainmail leggings offering solid leg protection.',
    slot: EquipmentSlot.Legs,
    statBonuses: { defense: 3 },
  },

  // ── Feet ──────────────────────────────────────────────
  [ItemType.RagWraps]: {
    type: ItemType.RagWraps,
    displayName: 'Rag Wraps',
    icon: '🩹',
    description: 'Strips of cloth wrapped around the feet for basic comfort.',
    slot: EquipmentSlot.Feet,
    statBonuses: { moveSpeed: 0.05 },
  },
  [ItemType.LeatherBoots]: {
    type: ItemType.LeatherBoots,
    displayName: 'Leather Boots',
    icon: '👢',
    description: 'Sturdy boots that protect the feet and improve footing.',
    slot: EquipmentSlot.Feet,
    statBonuses: { defense: 1, moveSpeed: 0.1 },
  },

  // ── Weapon ────────────────────────────────────────────
  [ItemType.WoodenClub]: {
    type: ItemType.WoodenClub,
    displayName: 'Wooden Club',
    icon: '🏏',
    description: 'A crude club carved from a heavy branch.',
    slot: EquipmentSlot.Weapon,
    statBonuses: { attack: 2 },
  },
  [ItemType.IronSword]: {
    type: ItemType.IronSword,
    displayName: 'Iron Sword',
    icon: '⚔️',
    description: 'A sharp blade forged from iron, reliable in combat.',
    slot: EquipmentSlot.Weapon,
    statBonuses: { attack: 5 },
  },

  // ── Trinket ───────────────────────────────────────────
  [ItemType.BoneAmulet]: {
    type: ItemType.BoneAmulet,
    displayName: 'Bone Amulet',
    icon: '🦴',
    description: 'A carved bone charm said to ward off illness.',
    slot: EquipmentSlot.Trinket,
    statBonuses: { health: 5, gatherSpeed: 0.05 },
  },
  [ItemType.GoldRing]: {
    type: ItemType.GoldRing,
    displayName: 'Gold Ring',
    icon: '💍',
    description: 'A gleaming gold ring that inspires confidence.',
    slot: EquipmentSlot.Trinket,
    statBonuses: { health: 3, moveSpeed: 0.05 },
  },
};

