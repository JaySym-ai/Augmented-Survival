import type { Vector3 } from './TransformComponent';

/**
 * Velocity component — linear velocity and max speed.
 */
export interface VelocityComponent {
  velocity: Vector3;
  maxSpeed: number;
}

export const VELOCITY = 'Velocity' as const;

export function createVelocity(
  velocity: Vector3 = { x: 0, y: 0, z: 0 },
  maxSpeed = 5,
): VelocityComponent {
  return { velocity, maxSpeed };
}

