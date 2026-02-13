import type { Vector3 } from './TransformComponent';

export type AnimalType = 'chicken' | 'sheep';

export type AnimalState = 'idle' | 'wandering' | 'pecking';

export interface FlockingData {
  alignment: Vector3;
  cohesion: Vector3;
  separation: Vector3;
  neighbors: number;
}

export interface AnimalComponent {
  type: AnimalType;
  state: AnimalState;
  targetPosition: Vector3 | null;
  flocking: FlockingData;
  stateTimer: number;
}

export const ANIMAL = 'Animal' as const;

export function createAnimal(
  type: AnimalType,
  state: AnimalState = 'idle',
  targetPosition: Vector3 | null = null,
): AnimalComponent {
  return {
    type,
    state,
    targetPosition,
    flocking: {
      alignment: { x: 0, y: 0, z: 0 },
      cohesion: { x: 0, y: 0, z: 0 },
      separation: { x: 0, y: 0, z: 0 },
      neighbors: 0,
    },
    stateTimer: 0,
  };
}
