/**
 * ExpandableResourceBar — Resource display with expand/collapse toggle.
 * Collapsed: icons + quick values. Expanded: detailed layout with inventory grid.
 */
import {
  ResourceType,
  ResourceStoreSystem,
  RESOURCE_DEFS,
  CITIZEN,
  BUILDING,
  BUILDING_DEFS,
  World,
  InventoryComponent,
  INVENTORY,
} from '@augmented-survival/game-core';
import type { BuildingComponent, ItemComponent } from '@augmented-survival/game-core';

const RESOURCE_TYPES = [
  ResourceType.Wood, ResourceType.Branch, ResourceType.Hemp,
  ResourceType.Food, ResourceType.Stone, ResourceType.Iron, ResourceType.Gold,
];

export class ExpandableResourceBar {
  private el: HTMLDivElement;
  private expanded = false;
  private valueEls = new Map<string, HTMLSpanElement>();
  private prevValues = new Map<string, number>();
  private inventorySlots: HTMLDivElement[] = [];

  constructor(
    parent: HTMLElement,
    private resourceStore: ResourceStoreSystem,
    private world: World,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-resource-bar ui-panel';

    this.buildCollapsedView();
    this.buildExpandedView();

    this.updateExpandedState();
    parent.appendChild(this.el);
  }

  private buildCollapsedView(): void {
    const collapsedContainer = document.createElement('div');
    collapsedContainer.className = 'resource-bar-collapsed';

    for (const rType of RESOURCE_TYPES) {
      const def = RESOURCE_DEFS[rType];
      const item = document.createElement('div');
      item.className = 'res-item';
      item.innerHTML = `<span class="res-icon">${def.icon}</span>`
        + `<span class="res-value" data-res="${rType}">0</span>`;
      collapsedContainer.appendChild(item);
      this.valueEls.set(rType, item.querySelector('.res-value') as HTMLSpanElement);
      this.prevValues.set(rType, 0);
    }

    const popItem = document.createElement('div');
    popItem.className = 'res-item';
    popItem.innerHTML = `<span class="res-icon">👥</span>`
      + `<span class="res-value" data-res="pop">0/0</span>`;
    collapsedContainer.appendChild(popItem);
    this.valueEls.set('pop', popItem.querySelector('.res-value') as HTMLSpanElement);

    this.el.appendChild(collapsedContainer);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'resource-bar-toggle';
    toggleBtn.textContent = '▼';
    toggleBtn.title = 'Expand resources';
    toggleBtn.addEventListener('click', () => this.toggle());
    this.el.appendChild(toggleBtn);
  }

  private buildExpandedView(): void {
    const expandedContainer = document.createElement('div');
    expandedContainer.className = 'resource-bar-expanded';

    const resourcesSection = document.createElement('div');
    resourcesSection.className = 'resource-bar-section';
    resourcesSection.innerHTML = '<div class="resource-bar-section-title">Resources</div>';

    const resourcesGrid = document.createElement('div');
    resourcesGrid.className = 'resource-bar-grid';
    for (const rType of RESOURCE_TYPES) {
      const def = RESOURCE_DEFS[rType];
      const item = document.createElement('div');
      item.className = 'res-item-full';
      item.innerHTML = `<span class="res-icon">${def.icon}</span>`
        + `<span class="res-label">${def.displayName}</span>`
        + `<span class="res-value" data-res="${rType}-full">0</span>`;
      resourcesGrid.appendChild(item);
      this.valueEls.set(`${rType}-full`, item.querySelector('.res-value') as HTMLSpanElement);
      this.prevValues.set(`${rType}-full`, 0);
    }
    resourcesSection.appendChild(resourcesGrid);
    expandedContainer.appendChild(resourcesSection);

    const popSection = document.createElement('div');
    popSection.className = 'resource-bar-section';
    popSection.innerHTML = '<div class="resource-bar-section-title">Population</div>';
    const popItem = document.createElement('div');
    popItem.className = 'res-item-full';
    popItem.innerHTML = `<span class="res-icon">👥</span>`
      + `<span class="res-label">Citizens</span>`
      + `<span class="res-value" data-res="pop-full">0/0</span>`;
    popSection.appendChild(popItem);
    this.valueEls.set('pop-full', popItem.querySelector('.res-value') as HTMLSpanElement);
    this.prevValues.set('pop-full', 0);
    expandedContainer.appendChild(popSection);

    const inventorySection = document.createElement('div');
    inventorySection.className = 'resource-bar-section inventory-section';
    inventorySection.innerHTML = '<div class="resource-bar-section-title">Inventory</div>';
    const inventoryGrid = document.createElement('div');
    inventoryGrid.className = 'inventory-grid';
    for (let i = 0; i < 25; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot empty';
      slot.dataset.index = String(i);
      slot.innerHTML = '<span class="inv-icon"></span><span class="inv-count"></span>';
      slot.addEventListener('click', () => this.handleSlotClick(i));
      inventoryGrid.appendChild(slot);
      this.inventorySlots.push(slot);
    }
    inventorySection.appendChild(inventoryGrid);
    expandedContainer.appendChild(inventorySection);

    this.el.appendChild(expandedContainer);
  }

  private toggle(): void {
    this.expanded = !this.expanded;
    this.updateExpandedState();
  }

  private handleSlotClick(index: number): void {
    console.log(`Inventory slot clicked: ${index}`);
  }

  private updateExpandedState(): void {
    const toggleBtn = this.el.querySelector('.resource-bar-toggle') as HTMLButtonElement;
    const expandedContainer = this.el.querySelector('.resource-bar-expanded') as HTMLElement;

    if (this.expanded) {
      this.el.classList.add('expanded');
      toggleBtn.textContent = '▲';
      toggleBtn.title = 'Collapse resources';
    } else {
      this.el.classList.remove('expanded');
      toggleBtn.textContent = '▼';
      toggleBtn.title = 'Expand resources';
    }
  }

  update(): void {
    for (const rType of RESOURCE_TYPES) {
      const val = this.resourceStore.getResource(rType);

      const collapsedEl = this.valueEls.get(rType);
      if (collapsedEl) {
        const prev = this.prevValues.get(rType) ?? 0;
        if (val !== prev) {
          collapsedEl.textContent = String(Math.floor(val));
          collapsedEl.classList.add('flash');
          setTimeout(() => collapsedEl.classList.remove('flash'), 400);
        }
      }

      const expandedEl = this.valueEls.get(`${rType}-full`);
      if (expandedEl) {
        const prevFull = this.prevValues.get(`${rType}-full`) ?? 0;
        if (val !== prevFull) {
          expandedEl.textContent = String(Math.floor(val));
        }
      }

      this.prevValues.set(rType, val);
      this.prevValues.set(`${rType}-full`, val);
    }

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
    const popText = `${citizenCount}/${maxPop}`;

    const collapsedPopEl = this.valueEls.get('pop');
    if (collapsedPopEl && collapsedPopEl.textContent !== popText) {
      collapsedPopEl.textContent = popText;
    }

    const expandedPopEl = this.valueEls.get('pop-full');
    if (expandedPopEl && expandedPopEl.textContent !== popText) {
      expandedPopEl.textContent = popText;
    }

    this.updateInventory();
  }

  private updateInventory(): void {
    const inventories = this.world.query(INVENTORY);
    const items: Array<{ icon: string; count: number }> = [];

    for (const eid of inventories) {
      const inv = this.world.getComponent<InventoryComponent>(eid, INVENTORY);
      if (inv && inv.items) {
        for (const item of inv.items) {
          items.push({ icon: item.icon, count: item.count });
        }
      }
    }

    for (let i = 0; i < this.inventorySlots.length; i++) {
      const slot = this.inventorySlots[i];
      const item = items[i];
      if (item) {
        slot.classList.remove('empty');
        const iconEl = slot.querySelector('.inv-icon') as HTMLSpanElement;
        const countEl = slot.querySelector('.inv-count') as HTMLSpanElement;
        iconEl.textContent = item.icon;
        countEl.textContent = item.count > 1 ? String(item.count) : '';
      } else {
        slot.classList.add('empty');
        const iconEl = slot.querySelector('.inv-icon') as HTMLSpanElement;
        const countEl = slot.querySelector('.inv-count') as HTMLSpanElement;
        iconEl.textContent = '';
        countEl.textContent = '';
      }
    }
  }

  dispose(): void {
    this.el.remove();
  }
}
