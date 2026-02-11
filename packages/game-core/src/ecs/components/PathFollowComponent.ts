import type { Vector3 } from './TransformComponent';

/**
 * Path follow component — entity follows a sequence of waypoints.
 */
export interface PathFollowComponent {
  path: Vector3[];
  currentIndex: number;
  speed: number;
}

export const PATH_FOLLOW = 'PathFollow' as const;

export function createPathFollow(
  path: Vector3[],
  speed: number,
  currentIndex = 0,
): PathFollowComponent {
  return { path, currentIndex, speed };
}

