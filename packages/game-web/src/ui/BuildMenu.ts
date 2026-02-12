/**
 * BuildMenu — Bottom-center building selection panel.
 * Shows available buildings with cost, disables unaffordable ones.
 */
import {
  BuildingType,
  ResourceType,
  ResourceStoreSystem,
  BUILDING_DEFS,
  RESOURCE_DEFS,
} from '@augmented-survival/game-core';

/** Emoji icons for building types */
const BUILDING_ICONS: Record<BuildingType, string> = {
  [BuildingType.TownCenter]: '🏰',
  [BuildingType.House]: '🏠',
  [BuildingType.StorageBarn]: '🏚️',
  [BuildingType.WoodcutterHut]: '🪓',
  [BuildingType.FarmField]: '🌾',
  [BuildingType.Quarry]: '⛏️',
};

/** Building types available in the build menu (skip TownCenter) */
const BUILDABLE: BuildingType[] = [
  BuildingType.House,
  BuildingType.StorageBarn,
  BuildingType.WoodcutterHut,
  BuildingType.FarmField,
  BuildingType.Quarry,
];

export class BuildMenu {
  private el: HTMLDivElement;
  private cards = new Map<BuildingType, HTMLButtonElement>();
  private activeType: BuildingType | null = null;

  constructor(
    parent: HTMLElement,
    private resourceStore: ResourceStoreSystem,
    private onSelect: (type: BuildingType) => void,
    private onCancel: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-build-menu ui-panel';

    for (const bType of BUILDABLE) {
      const def = BUILDING_DEFS[bType];
      const card = document.createElement('button');
      card.className = 'ui-build-card';
      card.innerHTML = `<span class="build-icon">${BUILDING_ICONS[bType]}</span>`
        + `<span class="build-name">${def.displayName}</span>`
        + `<span class="build-cost">${this.formatCost(def.cost)}</span>`;

      card.addEventListener('click', () => this.handleClick(bType));
      this.el.appendChild(card);
      this.cards.set(bType, card);
    }

    // ESC key to cancel build mode
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);

    parent.appendChild(this.el);
  }

  private formatCost(cost: Partial<Record<ResourceType, number>>): string {
    const parts: string[] = [];
    for (const [rType, amount] of Object.entries(cost)) {
      if (amount == null || amount <= 0) continue;
      const def = RESOURCE_DEFS[rType as ResourceType];
      if (def) {
        parts.push(`${def.icon}${amount}`);
      }
    }
    return parts.join(' ') || 'Free';
  }

  private handleClick(type: BuildingType): void {
    if (this.activeType === type) {
      // Clicking active building cancels
      this.exitBuildMode();
      this.onCancel();
    } else {
      this.activeType = type;
      this.updateActiveState();
      this.onSelect(type);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.activeType !== null) {
      this.exitBuildMode();
      this.onCancel();
    }
  }

  private updateActiveState(): void {
    for (const [bType, card] of this.cards) {
      card.classList.toggle('active', bType === this.activeType);
    }
  }

  /** Enter build mode for a specific type (called externally) */
  enterBuildMode(type: BuildingType): void {
    this.activeType = type;
    this.updateActiveState();
  }

  /** Exit build mode (called externally or on cancel) */
  exitBuildMode(): void {
    this.activeType = null;
    this.updateActiveState();
  }

  /** Update affordability each frame */
  update(): void {
    for (const [bType, card] of this.cards) {
      const def = BUILDING_DEFS[bType];
      const canAfford = this.resourceStore.canAfford(def.cost);
      card.disabled = !canAfford;
    }
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.el.remove();
  }
}

