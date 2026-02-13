import { BuildingType } from '../../types/buildings';
import type { EntityId } from '../Entity';

/**
 * Building component — data for a placed building.
 */
export interface BuildingComponent {
  type: BuildingType;
  isConstructed: boolean;
  workers: EntityId[];
  workerSlots: number;
  /** Optional wall color as a hex number (e.g. 0xff0000 for red) */
  wallColor?: number;
}

export const BUILDING = 'Building' as const;

export function createBuilding(
  type: BuildingType,
  workerSlots: number,
  isConstructed = false,
  wallColor?: number,
): BuildingComponent {
  return { type, isConstructed, workers: [], workerSlots, wallColor };
}

