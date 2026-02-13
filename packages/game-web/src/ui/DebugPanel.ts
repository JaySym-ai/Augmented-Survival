/**
 * DebugPanel — Right-side collapsible debug panel.
 * Shows depleted resources with countdown timers and force-spawn buttons.
 */
import {
  World,
  EventBus,
  RESOURCE_NODE,
  DEPLETED_RESOURCE,
  SELECTABLE,
  createSelectable,
  RESOURCE_DEFS,
} from '@augmented-survival/game-core';
import type {
  EntityId,
  GameEventMap,
  ResourceNodeComponent,
  DepletedResourceComponent,
} from '@augmented-survival/game-core';

export class DebugPanel {
  private el: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private sectionToggleBtn: HTMLButtonElement;
  private listEl: HTMLDivElement;
  private collapsed = false;
  private sectionCollapsed = false;

  constructor(
    parent: HTMLElement,
    private world: World,
    private eventBus: EventBus<GameEventMap>,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-debug-panel ui-panel';

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'debug-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'debug-title';
    titleEl.textContent = 'Debug';
    headerEl.appendChild(titleEl);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'debug-toggle';
    this.toggleBtn.textContent = '<';
    this.toggleBtn.setAttribute('aria-label', 'Collapse debug panel');
    this.toggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setCollapsed(!this.collapsed);
    });
    headerEl.appendChild(this.toggleBtn);
    this.el.appendChild(headerEl);

    // Section header: Resource Respawns
    const sectionHeaderEl = document.createElement('div');
    sectionHeaderEl.className = 'debug-section-header';

    const sectionTitleEl = document.createElement('span');
    sectionTitleEl.className = 'debug-section-title';
    sectionTitleEl.textContent = 'Resource Respawns';
    sectionHeaderEl.appendChild(sectionTitleEl);

    this.sectionToggleBtn = document.createElement('button');
    this.sectionToggleBtn.className = 'debug-section-toggle';
    this.sectionToggleBtn.textContent = '▼';
    this.sectionToggleBtn.setAttribute('aria-label', 'Collapse resource respawns');
    this.sectionToggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setSectionCollapsed(!this.sectionCollapsed);
    });
    sectionHeaderEl.appendChild(this.sectionToggleBtn);
    this.el.appendChild(sectionHeaderEl);

    // List container
    this.listEl = document.createElement('div');
    this.listEl.className = 'debug-resource-list';
    this.el.appendChild(this.listEl);

    // Delegated click handler for spawn buttons (stable — survives renderRows rebuilds)
    this.listEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>('.debug-spawn-btn');
      if (!btn) return;
      event.stopPropagation();
      const idAttr = btn.dataset.entityId;
      if (idAttr == null) return;
      const entityId = Number(idAttr) as EntityId;
      this.forceSpawn(entityId);
    });

    parent.appendChild(this.el);
  }

  update(): void {
    if (this.collapsed || this.sectionCollapsed) return;

    const depletedIds = this.world
      .query(RESOURCE_NODE, DEPLETED_RESOURCE)
      .sort((a, b) => a - b);

    this.renderRows(depletedIds);
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
      this.collapsed ? 'Expand debug panel' : 'Collapse debug panel',
    );
  }

  private setSectionCollapsed(collapsed: boolean): void {
    this.sectionCollapsed = collapsed;
    this.listEl.style.display = collapsed ? 'none' : '';
    this.sectionToggleBtn.textContent = collapsed ? '▶' : '▼';
    this.sectionToggleBtn.setAttribute(
      'aria-label',
      collapsed ? 'Expand resource respawns' : 'Collapse resource respawns',
    );
  }

  private renderRows(depletedIds: EntityId[]): void {
    this.listEl.innerHTML = '';

    if (depletedIds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'debug-empty';
      empty.textContent = 'No depleted resources';
      this.listEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const entityId of depletedIds) {
      const resource = this.world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE);
      const depleted = this.world.getComponent<DepletedResourceComponent>(entityId, DEPLETED_RESOURCE);
      if (!resource || !depleted) continue;

      const def = RESOURCE_DEFS[resource.type];
      const remaining = Math.max(0, depleted.respawnDelay - depleted.elapsed);
      const timeStr = this.formatTime(remaining);

      const row = document.createElement('div');
      row.className = 'debug-resource-row';

      const info = document.createElement('span');
      info.className = 'debug-res-info';
      info.textContent = `${def.icon} ${def.displayName} — ${timeStr}`;
      row.appendChild(info);

      const btn = document.createElement('button');
      btn.className = 'debug-spawn-btn';
      btn.textContent = '⚡ Spawn';
      btn.setAttribute('aria-label', `Force spawn ${def.displayName}`);
      btn.dataset.entityId = String(entityId);
      row.appendChild(btn);

      fragment.appendChild(row);
    }

    this.listEl.appendChild(fragment);
  }

  private forceSpawn(entityId: EntityId): void {
    const resource = this.world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE);
    if (!resource) return;

    // Restore resource amount
    resource.amount = resource.maxAmount;

    // Remove depleted marker
    this.world.removeComponent(entityId, DEPLETED_RESOURCE);

    // Re-add selectable
    this.world.addComponent(entityId, SELECTABLE, createSelectable());

    // Emit respawn event so visuals update
    this.eventBus.emit('ResourceRespawned', {
      entityId,
      resourceType: resource.type,
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
