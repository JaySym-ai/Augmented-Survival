import { World, CITIZEN, SELECTABLE } from '@augmented-survival/game-core';
import type { CitizenComponent, EntityId } from '@augmented-survival/game-core';

export const VILLAGER_SIDEBAR_SELECT_EVENT = 'villager-sidebar:select';

export class VillagerSidebar {
  private el: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private listEl: HTMLDivElement;
  private collapsed = false;

  constructor(
    parent: HTMLElement,
    private world: World,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-villager-sidebar ui-panel';

    const headerEl = document.createElement('div');
    headerEl.className = 'villager-sidebar-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'villager-sidebar-title';
    titleEl.textContent = 'Villagers';
    headerEl.appendChild(titleEl);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'villager-sidebar-toggle';
    this.toggleBtn.textContent = '<';
    this.toggleBtn.setAttribute('aria-label', 'Collapse villager sidebar');
    this.toggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setCollapsed(!this.collapsed);
    });
    headerEl.appendChild(this.toggleBtn);
    this.el.appendChild(headerEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'villager-sidebar-list';
    this.el.appendChild(this.listEl);

    parent.appendChild(this.el);
  }

  update(): void {
    const villagerIds = this.world
      .query(CITIZEN)
      .filter((entityId) => this.world.isAlive(entityId))
      .sort((a, b) => a - b);

    this.renderRows(villagerIds);
  }

  dispose(): void {
    this.el.remove();
  }

  private setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.el.classList.toggle('collapsed', this.collapsed);
    this.toggleBtn.textContent = this.collapsed ? '>' : '<';
    this.toggleBtn.setAttribute(
      'aria-label',
      this.collapsed ? 'Expand villager sidebar' : 'Collapse villager sidebar',
    );
  }

  private renderRows(villagerIds: EntityId[]): void {
    this.listEl.innerHTML = '';

    if (villagerIds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'villager-sidebar-empty';
      empty.textContent = 'No villagers';
      this.listEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const entityId of villagerIds) {
      const citizen = this.world.getComponent<CitizenComponent>(entityId, CITIZEN);
      if (!citizen) continue;

      const row = document.createElement('div');
      row.className = 'villager-row';
      row.dataset.entityId = `${entityId}`;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.style.cursor = 'pointer';
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        this.el.dispatchEvent(new CustomEvent<{ entityId: EntityId }>(VILLAGER_SIDEBAR_SELECT_EVENT, {
          bubbles: true,
          detail: { entityId },
        }));
      });
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        row.click();
      });

      const selectable = this.world.getComponent(entityId, SELECTABLE) as { selected?: boolean } | undefined;
      const isSelected = Boolean(selectable?.selected);
      row.classList.toggle('selected', isSelected);
      if (isSelected) {
        row.style.borderColor = 'var(--ui-accent)';
        row.style.background = 'rgba(218, 165, 32, 0.22)';
      }

      const name = document.createElement('div');
      name.className = 'villager-name';
      name.textContent = citizen.name || `Villager ${entityId}`;
      row.appendChild(name);

      const activity = document.createElement('div');
      activity.className = 'villager-activity';
      activity.textContent = this.getActivityText(citizen);
      row.appendChild(activity);

      fragment.appendChild(row);
    }

    this.listEl.appendChild(fragment);
  }

  private getActivityText(citizen: CitizenComponent): string {
    const jobText = citizen.job ?? 'No job';
    return `${jobText} - ${citizen.state}`;
  }
}
