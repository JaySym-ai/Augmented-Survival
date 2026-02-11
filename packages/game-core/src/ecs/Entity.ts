/**
 * Entity ID type — entities are numeric IDs.
 * The lower 20 bits are the index, upper 12 bits are the generation.
 */
export type EntityId = number;

/** Bit layout constants for entity IDs */
const INDEX_BITS = 20;
const INDEX_MASK = (1 << INDEX_BITS) - 1;
const GENERATION_SHIFT = INDEX_BITS;

/**
 * Entity ID allocator with generation-based recycling.
 */
export class EntityAllocator {
  private nextIndex = 0;
  private generations: number[] = [];
  private freeIndices: number[] = [];

  /**
   * Allocate a new entity ID.
   */
  allocate(): EntityId {
    let index: number;
    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else {
      index = this.nextIndex++;
      this.generations[index] = 0;
    }
    const generation = this.generations[index];
    return (generation << GENERATION_SHIFT) | (index & INDEX_MASK);
  }

  /**
   * Free an entity ID for recycling. Increments the generation.
   */
  free(entityId: EntityId): void {
    const index = entityId & INDEX_MASK;
    this.generations[index]++;
    this.freeIndices.push(index);
  }

  /**
   * Check if an entity ID is still valid (generation matches).
   */
  isAlive(entityId: EntityId): boolean {
    const index = entityId & INDEX_MASK;
    const generation = entityId >>> GENERATION_SHIFT;
    return this.generations[index] === generation;
  }

  /**
   * Extract the index portion of an entity ID.
   */
  static index(entityId: EntityId): number {
    return entityId & INDEX_MASK;
  }

  /**
   * Extract the generation portion of an entity ID.
   */
  static generation(entityId: EntityId): number {
    return entityId >>> GENERATION_SHIFT;
  }
}

