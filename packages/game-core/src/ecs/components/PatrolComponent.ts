import type { Vector3 } from './TransformComponent';

export interface PatrolComponent {
  waypoints: Vector3[];
  currentWaypointIndex: number;
  speed: number;
  waitTimeAtWaypoint: number;
  currentWaitTime: number;
  isWaiting: boolean;
}

export const PATROL = 'Patrol' as const;

export function createPatrol(
  waypoints: Vector3[],
  speed: number = 2,
  waitTimeAtWaypoint: number = 2,
): PatrolComponent {
  return {
    waypoints,
    currentWaypointIndex: 0,
    speed,
    waitTimeAtWaypoint,
    currentWaitTime: 0,
    isWaiting: false,
  };
}
