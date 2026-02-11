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
}

export const BUILDING = 'Building' as const;

export function createBuilding(
  type: BuildingType,
  workerSlots: number,
  isConstructed = false,
): BuildingComponent {
  return { type, isConstructed, workers: [], workerSlots };
}

