/**
 * Depleted resource component — marks a resource node as depleted and tracks respawn timer.
 */
export interface DepletedResourceComponent {
  /** Total seconds until respawn */
  respawnDelay: number;
  /** Seconds elapsed so far */
  elapsed: number;
}

export const DEPLETED_RESOURCE = 'DepletedResource' as const;

export function createDepletedResource(respawnDelay: number): DepletedResourceComponent {
  return { respawnDelay, elapsed: 0 };
}

