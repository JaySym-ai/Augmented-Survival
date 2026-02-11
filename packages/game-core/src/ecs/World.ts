import { EntityId, EntityAllocator } from './Entity';
import { ComponentStore, ComponentRegistry } from './Component';
import { System } from './System';
import { queryEntities } from './Query';

/**
 * The ECS World — manages entities, components, and systems.
 */
export class World {
  private allocator = new EntityAllocator();
  private registry = new ComponentRegistry();
  private systems: System[] = [];
  private aliveEntities = new Set<EntityId>();

  /**
   * Create a new entity.
   */
  createEntity(): EntityId {
    const id = this.allocator.allocate();
    this.aliveEntities.add(id);
    return id;
  }

  /**
   * Destroy an entity and remove all its components.
   */
  destroyEntity(entityId: EntityId): void {
    if (!this.aliveEntities.has(entityId)) return;
    this.registry.removeEntity(entityId);
    this.aliveEntities.delete(entityId);
    this.allocator.free(entityId);
  }

  /**
   * Check if an entity is alive.
   */
  isAlive(entityId: EntityId): boolean {
    return this.aliveEntities.has(entityId);
  }

  /**
   * Get all alive entity IDs.
   */
  getEntities(): EntityId[] {
    return Array.from(this.aliveEntities);
  }

  /**
   * Get the number of alive entities.
   */
  entityCount(): number {
    return this.aliveEntities.size;
  }

  /**
   * Add a component to an entity.
   */
  addComponent<T>(entityId: EntityId, componentName: string, data: T): void {
    if (!this.aliveEntities.has(entityId)) {
      throw new Error(`Entity ${entityId} is not alive`);
    }
    const store = this.registry.getOrCreate<T>(componentName);
    store.set(entityId, data);
  }

  /**
   * Remove a component from an entity.
   */
  removeComponent(entityId: EntityId, componentName: string): void {
    const store = this.registry.get(componentName);
    if (store) {
      store.remove(entityId);
    }
  }

  /**
   * Get a component from an entity.
   */
  getComponent<T>(entityId: EntityId, componentName: string): T | undefined {
    const store = this.registry.get<T>(componentName);
    return store?.get(entityId);
  }

  /**
   * Check if an entity has a component.
   */
  hasComponent(entityId: EntityId, componentName: string): boolean {
    const store = this.registry.get(componentName);
    return store?.has(entityId) ?? false;
  }

  /**
   * Query for entities that have ALL specified components.
   */
  query(...componentNames: string[]): EntityId[] {
    const stores: ComponentStore[] = [];
    for (const name of componentNames) {
      const store = this.registry.get(name);
      if (!store) return []; // If any component type has no store, no entities match
      stores.push(store);
    }
    return queryEntities(stores);
  }

  /**
   * Get the component store for a given component name.
   */
  getStore<T>(componentName: string): ComponentStore<T> | undefined {
    return this.registry.get<T>(componentName);
  }

  /**
   * Register a system. Systems execute in registration order.
   */
  addSystem(system: System): void {
    this.systems.push(system);
  }

  /**
   * Remove a system.
   */
  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  /**
   * Get all registered systems.
   */
  getSystems(): readonly System[] {
    return this.systems;
  }

  /**
   * Step the world forward by dt seconds.
   * Calls all enabled systems in registration order.
   */
  step(dt: number): void {
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(this, dt);
      }
    }
  }

  /**
   * Remove all entities, components, and systems.
   */
  clear(): void {
    this.aliveEntities.clear();
    this.registry.clear();
    this.systems.length = 0;
  }
}

