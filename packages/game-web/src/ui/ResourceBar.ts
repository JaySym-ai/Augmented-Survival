/**
 * ResourceBar — Top-center resource display.
 * Shows all resource counts and Population.
 */
import {
  ResourceType,
  ResourceStoreSystem,
  RESOURCE_DEFS,
  CITIZEN,
  BUILDING,
  BUILDING_DEFS,
  World,
} from '@augmented-survival/game-core';
import type { BuildingComponent } from '@augmented-survival/game-core';

export class ResourceBar {
  private el: HTMLDivElement;
  private valueEls = new Map<string, HTMLSpanElement>();
  private prevValues = new Map<string, number>();

  constructor(
    parent: HTMLElement,
    private resourceStore: ResourceStoreSystem,
    private world: World,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-resource-bar ui-panel';

    // Resource items
    for (const rType of [
      ResourceType.Wood, ResourceType.Branch, ResourceType.Hemp,
      ResourceType.Food, ResourceType.Stone, ResourceType.Iron, ResourceType.Gold,
    ]) {
      const def = RESOURCE_DEFS[rType];
      const item = document.createElement('div');
      item.className = 'res-item';
      item.innerHTML = `<span class="res-icon">${def.icon}</span>`
        + `<span class="res-value" data-res="${rType}">0</span>`
        + `<span class="res-label">${def.displayName}</span>`;
      this.el.appendChild(item);
      this.valueEls.set(rType, item.querySelector('.res-value') as HTMLSpanElement);
      this.prevValues.set(rType, 0);
    }

    // Population
    const popItem = document.createElement('div');
    popItem.className = 'res-item';
    popItem.innerHTML = `<span class="res-icon">👥</span>`
      + `<span class="res-value" data-res="pop">0/0</span>`
      + `<span class="res-label">Pop</span>`;
    this.el.appendChild(popItem);
    this.valueEls.set('pop', popItem.querySelector('.res-value') as HTMLSpanElement);

    parent.appendChild(this.el);
  }

  update(): void {
    // Update resource counts
    for (const rType of [
      ResourceType.Wood, ResourceType.Branch, ResourceType.Hemp,
      ResourceType.Food, ResourceType.Stone, ResourceType.Iron, ResourceType.Gold,
    ]) {
      const val = this.resourceStore.getResource(rType);
      const el = this.valueEls.get(rType)!;
      const prev = this.prevValues.get(rType) ?? 0;

      if (val !== prev) {
        el.textContent = String(Math.floor(val));
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 400);
        this.prevValues.set(rType, val);
      }
    }

    // Update population: count citizens / max from buildings
    const citizenCount = this.world.query(CITIZEN).length;
    let maxPop = 0;
    const buildingEntities = this.world.query(BUILDING);
    for (const eid of buildingEntities) {
      const bc = this.world.getComponent<BuildingComponent>(eid, BUILDING);
      if (bc && bc.isConstructed) {
        const def = BUILDING_DEFS[bc.type];
        if (def) {
          maxPop += def.providesPopulation;
        }
      }
    }
    const popEl = this.valueEls.get('pop')!;
    const popText = `${citizenCount}/${maxPop}`;
    if (popEl.textContent !== popText) {
      popEl.textContent = popText;
    }
  }

  dispose(): void {
    this.el.remove();
  }
}

