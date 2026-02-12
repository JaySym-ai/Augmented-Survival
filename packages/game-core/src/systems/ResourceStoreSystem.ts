import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import { ResourceType } from '../types/resources';

/**
 * ResourceStoreSystem — global resource tracker.
 * Listens to ResourceDelivered events to increment resource totals.
 * Resources ONLY increase via delivery events — never on timers.
 */
export class ResourceStoreSystem extends System {
  private resources = new Map<ResourceType, number>();

  constructor(private eventBus: EventBus<GameEventMap>) {
    super('ResourceStoreSystem');

    // Initialize all resource types to 0
    this.resources.set(ResourceType.Wood, 0);
    this.resources.set(ResourceType.Food, 0);
    this.resources.set(ResourceType.Stone, 0);
    this.resources.set(ResourceType.Iron, 0);
    this.resources.set(ResourceType.Gold, 0);
    this.resources.set(ResourceType.Hemp, 0);
    this.resources.set(ResourceType.Branch, 0);

    // Listen to ResourceDelivered events to increment totals
    this.eventBus.on('ResourceDelivered', (event) => {
      const current = this.resources.get(event.resourceType) ?? 0;
      this.resources.set(event.resourceType, current + event.amount);
    });
  }

  getResource(type: ResourceType): number {
    return this.resources.get(type) ?? 0;
  }

  setResource(type: ResourceType, amount: number): void {
    this.resources.set(type, amount);
  }

  getAll(): Map<ResourceType, number> {
    return new Map(this.resources);
  }

  /**
   * Check if the player can afford a given cost.
   */
  canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    for (const [type, amount] of Object.entries(cost)) {
      if (amount == null) continue;
      const current = this.resources.get(type as ResourceType) ?? 0;
      if (current < amount) return false;
    }
    return true;
  }

  /**
   * Deduct resources for a cost. Returns false if cannot afford.
   */
  deduct(cost: Partial<Record<ResourceType, number>>): boolean {
    if (!this.canAfford(cost)) return false;

    for (const [type, amount] of Object.entries(cost)) {
      if (amount == null) continue;
      const current = this.resources.get(type as ResourceType) ?? 0;
      this.resources.set(type as ResourceType, current - amount);
    }
    return true;
  }

  update(_world: World, _dt: number): void {
    // Event-driven — nothing to do per-frame
  }
}

