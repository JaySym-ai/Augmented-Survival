import { EntityId } from './Entity';

/**
 * A unique identifier for a component type.
 * Used as a key in the World's component storage.
 */
export type ComponentType<T = unknown> = {
  readonly componentName: string;
  new?(...args: unknown[]): T;
};

/**
 * Component storage — a Map from EntityId to component data.
 * Each component type gets its own ComponentStore.
 */
export class ComponentStore<T = unknown> {
  readonly name: string;
  private data = new Map<EntityId, T>();

  constructor(name: string) {
    this.name = name;
  }

  set(entityId: EntityId, component: T): void {
    this.data.set(entityId, component);
  }

  get(entityId: EntityId): T | undefined {
    return this.data.get(entityId);
  }

  has(entityId: EntityId): boolean {
    return this.data.has(entityId);
  }

  remove(entityId: EntityId): boolean {
    return this.data.delete(entityId);
  }

  entities(): IterableIterator<EntityId> {
    return this.data.keys();
  }

  size(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * Registry that maps component names to their stores.
 */
export class ComponentRegistry {
  private stores = new Map<string, ComponentStore>();

  getOrCreate<T>(name: string): ComponentStore<T> {
    let store = this.stores.get(name);
    if (!store) {
      store = new ComponentStore<T>(name);
      this.stores.set(name, store);
    }
    return store as ComponentStore<T>;
  }

  get<T>(name: string): ComponentStore<T> | undefined {
    return this.stores.get(name) as ComponentStore<T> | undefined;
  }

  removeEntity(entityId: EntityId): void {
    for (const store of this.stores.values()) {
      store.remove(entityId);
    }
  }

  clear(): void {
    for (const store of this.stores.values()) {
      store.clear();
    }
  }
}

