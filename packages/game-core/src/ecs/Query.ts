import { EntityId } from './Entity';
import { ComponentStore } from './Component';

/**
 * Query result — finds entities that have ALL specified components.
 * Uses intersection of component stores.
 */
export function queryEntities(stores: ComponentStore[]): EntityId[] {
  if (stores.length === 0) return [];

  // Find the smallest store to iterate over (optimization)
  let smallest = stores[0];
  for (let i = 1; i < stores.length; i++) {
    if (stores[i].size() < smallest.size()) {
      smallest = stores[i];
    }
  }

  const result: EntityId[] = [];
  for (const entityId of smallest.entities()) {
    let hasAll = true;
    for (const store of stores) {
      if (store !== smallest && !store.has(entityId)) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) {
      result.push(entityId);
    }
  }

  return result;
}

