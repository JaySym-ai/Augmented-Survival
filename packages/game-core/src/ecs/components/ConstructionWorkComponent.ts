/**
 * Construction work component — tracks a citizen actively constructing a building.
 * Attached to a citizen entity when they are assigned to build.
 */
export interface ConstructionWorkComponent {
  /** The building entity this citizen is constructing */
  targetBuilding: number;
}

export const CONSTRUCTION_WORK = 'ConstructionWork' as const;

export function createConstructionWork(
  targetBuilding: number,
): ConstructionWorkComponent {
  return { targetBuilding };
}

