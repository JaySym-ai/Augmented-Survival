import type { EntityId } from '../Entity';
import type { Vector3 } from './TransformComponent';

/**
 * Marks an animal as domesticated and bound to a home building.
 */
export interface DomesticAnimalComponent {
  homeBuildingId: EntityId;
  homePosition: Vector3;
  roamRadius: number;
  returnThreshold: number;
}

export const DOMESTIC_ANIMAL = 'DomesticAnimal' as const;

export function createDomesticAnimal(
  homeBuildingId: EntityId,
  homePosition: Vector3,
  roamRadius: number,
  returnThreshold = roamRadius * 1.35,
): DomesticAnimalComponent {
  return {
    homeBuildingId,
    homePosition: { ...homePosition },
    roamRadius,
    returnThreshold,
  };
}