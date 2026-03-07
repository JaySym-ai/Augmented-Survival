import type { AnimalType } from './AnimalComponent';

/**
 * Livestock pen metadata attached to animal housing buildings.
 */
export interface LivestockPenComponent {
  animalType: AnimalType;
  capacity: number;
  spawnCount: number;
  homeRadius: number;
  spawnRadius: number;
}

export const LIVESTOCK_PEN = 'LivestockPen' as const;

export function createLivestockPen(
  animalType: AnimalType,
  capacity: number,
  spawnCount: number,
  homeRadius: number,
  spawnRadius: number,
): LivestockPenComponent {
  return {
    animalType,
    capacity,
    spawnCount,
    homeRadius,
    spawnRadius,
  };
}