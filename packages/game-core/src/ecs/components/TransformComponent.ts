/**
 * 3D vector type used for positions, velocities, etc.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion for rotation.
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Transform component — position, rotation, and scale in world space.
 */
export interface TransformComponent {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export const TRANSFORM = 'Transform' as const;

export function createTransform(
  position: Vector3 = { x: 0, y: 0, z: 0 },
  rotation: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
  scale: Vector3 = { x: 1, y: 1, z: 1 },
): TransformComponent {
  return { position, rotation, scale };
}

