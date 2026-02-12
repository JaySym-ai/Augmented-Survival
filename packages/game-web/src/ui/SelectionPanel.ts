/**
 * SelectionPanel — Bottom-left entity info panel.
 * Shows details for selected citizens, buildings, or resource nodes.
 */
import {
  World,
  EventBus,
  CITIZEN,
  BUILDING,
  RESOURCE_NODE,
  BUILDING_DEFS,
  RESOURCE_DEFS,
  JOB_ASSIGNMENT,
  createJobAssignment,
  JobType,
  JOB_DEFS,
  PATH_FOLLOW,
  GATHERING,
  CARRY,
  CitizenState,
} from '@augmented-survival/game-core';
import type {
  EntityId,
  GameEventMap,
  CitizenComponent,
  BuildingComponent,
  ResourceNodeComponent,
} from '@augmented-survival/game-core';

export class SelectionPanel {
  private el: HTMLDivElement;
  private contentEl: HTMLDivElement;
  private selectedEntity: EntityId | null = null;
  private onEntitySelected: (e: { entityId: EntityId }) => void;
  private onEntityDeselected: (e: { entityId: EntityId }) => void;

  // Cached citizen DOM elements — created once, updated per-frame
  private citizenBuiltForEntity: EntityId | null = null;
  private citizenJobText: HTMLSpanElement | null = null;
  private citizenStateText: HTMLSpanElement | null = null;
  private citizenHealthFill: HTMLDivElement | null = null;
  private citizenHungerFill: HTMLDivElement | null = null;
  private citizenJobButtons: Map<JobType, HTMLButtonElement> = new Map();

  constructor(
    parent: HTMLElement,
    private world: World,
    private eventBus: EventBus<GameEventMap>,
    private onClose?: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-selection-panel ui-panel';
    this.el.style.display = 'none';

    // Header with close button
    const header = document.createElement('div');
    header.className = 'sel-header';
    header.innerHTML = `<span class="sel-title"></span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sel-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    // Content area
    this.contentEl = document.createElement('div');
    this.el.appendChild(this.contentEl);

    // Event listeners
    this.onEntitySelected = (e) => this.show(e.entityId);
    this.onEntityDeselected = () => this.hide();
    this.eventBus.on('EntitySelected', this.onEntitySelected);
    this.eventBus.on('EntityDeselected', this.onEntityDeselected);

    parent.appendChild(this.el);
  }

  show(entityId: EntityId): void {
    this.selectedEntity = entityId;
    this.el.style.display = '';
    this.renderContent();
  }

  hide(): void {
    this.selectedEntity = null;
    this.el.style.display = 'none';
    this.clearCitizenCache();
    if (this.onClose) this.onClose();
  }

  update(): void {
    if (this.selectedEntity === null) return;
    if (!this.world.isAlive(this.selectedEntity)) {
      this.hide();
      return;
    }
    // If citizen DOM is already built for this entity, just update dynamic values
    if (this.citizenBuiltForEntity === this.selectedEntity) {
      this.updateCitizenValues();
      return;
    }
    this.renderContent();
  }

  private renderContent(): void {
    if (this.selectedEntity === null) return;
    const eid = this.selectedEntity;
    const titleEl = this.el.querySelector('.sel-title') as HTMLSpanElement;

    // Clear cached citizen state when switching away from a citizen
    this.clearCitizenCache();

    // Check entity type and render accordingly
    const citizen = this.world.getComponent<CitizenComponent>(eid, CITIZEN);
    if (citizen) {
      titleEl.textContent = citizen.name;
      this.contentEl.innerHTML = '';
      this.buildCitizenDOM(eid, citizen);
      this.updateCitizenValues();
      return;
    }

    const building = this.world.getComponent<BuildingComponent>(eid, BUILDING);
    if (building) {
      const def = BUILDING_DEFS[building.type];
      titleEl.textContent = def.displayName;
      this.contentEl.innerHTML = this.renderBuilding(building, def.description);
      return;
    }

    const resNode = this.world.getComponent<ResourceNodeComponent>(eid, RESOURCE_NODE);
    if (resNode) {
      const def = RESOURCE_DEFS[resNode.type];
      titleEl.textContent = `${def.icon} ${def.displayName} Node`;
      this.contentEl.innerHTML = this.renderResourceNode(resNode);
      return;
    }

    titleEl.textContent = 'Unknown';
    this.contentEl.innerHTML = '<div class="sel-row">No details available</div>';
  }

  private clearCitizenCache(): void {
    this.citizenBuiltForEntity = null;
    this.citizenJobText = null;
    this.citizenStateText = null;
    this.citizenHealthFill = null;
    this.citizenHungerFill = null;
    this.citizenJobButtons.clear();
  }

  /** Build the citizen DOM structure once and cache element references. */
  private buildCitizenDOM(entityId: EntityId, _c: CitizenComponent): void {
    // Job row
    const jobRow = document.createElement('div');
    jobRow.className = 'sel-row';
    const jobLabel = document.createElement('span');
    jobLabel.className = 'label';
    jobLabel.textContent = 'Job';
    const jobValue = document.createElement('span');
    jobRow.appendChild(jobLabel);
    jobRow.appendChild(jobValue);
    this.citizenJobText = jobValue;

    // State row
    const stateRow = document.createElement('div');
    stateRow.className = 'sel-row';
    const stateLabel = document.createElement('span');
    stateLabel.className = 'label';
    stateLabel.textContent = 'State';
    const stateValue = document.createElement('span');
    stateRow.appendChild(stateLabel);
    stateRow.appendChild(stateValue);
    this.citizenStateText = stateValue;

    // Health label + bar
    const healthLabelRow = document.createElement('div');
    healthLabelRow.className = 'sel-row';
    const healthLabel = document.createElement('span');
    healthLabel.className = 'label';
    healthLabel.textContent = 'Health';
    healthLabelRow.appendChild(healthLabel);

    const healthBar = document.createElement('div');
    healthBar.className = 'bar-container bar-health';
    const healthFill = document.createElement('div');
    healthFill.className = 'bar-fill';
    healthBar.appendChild(healthFill);
    this.citizenHealthFill = healthFill;

    // Hunger label + bar
    const hungerLabelRow = document.createElement('div');
    hungerLabelRow.className = 'sel-row';
    const hungerLabel = document.createElement('span');
    hungerLabel.className = 'label';
    hungerLabel.textContent = 'Hunger';
    hungerLabelRow.appendChild(hungerLabel);

    const hungerBar = document.createElement('div');
    hungerBar.className = 'bar-container bar-hunger';
    const hungerFill = document.createElement('div');
    hungerFill.className = 'bar-fill';
    hungerBar.appendChild(hungerFill);
    this.citizenHungerFill = hungerFill;

    // Append info rows
    this.contentEl.appendChild(jobRow);
    this.contentEl.appendChild(stateRow);
    this.contentEl.appendChild(healthLabelRow);
    this.contentEl.appendChild(healthBar);
    this.contentEl.appendChild(hungerLabelRow);
    this.contentEl.appendChild(hungerBar);

    // Job assignment button row
    const btnRow = document.createElement('div');
    btnRow.className = 'sel-job-row';

    for (const jobType of Object.values(JobType)) {
      const def = JOB_DEFS[jobType];
      const btn = document.createElement('button');
      btn.className = 'sel-job-btn';
      btn.textContent = def.displayName;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assignJob(entityId, jobType);
      });
      this.citizenJobButtons.set(jobType, btn);
      btnRow.appendChild(btn);
    }

    this.contentEl.appendChild(btnRow);

    // Mark which entity this DOM was built for
    this.citizenBuiltForEntity = entityId;
  }

  /** Update only the dynamic values in the cached citizen DOM. */
  private updateCitizenValues(): void {
    if (this.selectedEntity === null) return;
    const citizen = this.world.getComponent<CitizenComponent>(this.selectedEntity, CITIZEN);
    if (!citizen) return;

    const currentJob = citizen.job ?? JobType.Idle;

    if (this.citizenJobText) {
      this.citizenJobText.textContent = citizen.job ?? 'None';
    }
    if (this.citizenStateText) {
      this.citizenStateText.textContent = citizen.state;
    }
    if (this.citizenHealthFill) {
      this.citizenHealthFill.style.width = `${citizen.health}%`;
    }
    if (this.citizenHungerFill) {
      this.citizenHungerFill.style.width = `${citizen.hunger}%`;
    }

    // Update active class on job buttons
    for (const [jobType, btn] of this.citizenJobButtons) {
      btn.classList.toggle('active', jobType === currentJob);
    }
  }

  private assignJob(entityId: EntityId, jobType: JobType): void {
    // Update JOB_ASSIGNMENT component
    this.world.addComponent(entityId, JOB_ASSIGNMENT, createJobAssignment(jobType));

    // Update citizen component
    const citizen = this.world.getComponent<CitizenComponent>(entityId, CITIZEN);
    if (citizen) {
      citizen.job = jobType;
      citizen.state = CitizenState.Idle;
    }

    // Remove PATH_FOLLOW if present
    if (this.world.hasComponent(entityId, PATH_FOLLOW)) {
      this.world.removeComponent(entityId, PATH_FOLLOW);
    }

    // Remove GATHERING if present
    if (this.world.hasComponent(entityId, GATHERING)) {
      this.world.removeComponent(entityId, GATHERING);
    }

    // Remove CARRY if present (clean state for new job)
    if (this.world.hasComponent(entityId, CARRY)) {
      this.world.removeComponent(entityId, CARRY);
    }

    // Update the panel values directly (no DOM rebuild)
    this.updateCitizenValues();
  }

  private renderBuilding(b: BuildingComponent, desc: string): string {
    const status = b.isConstructed ? '✅ Built' : '🏗️ Under Construction';
    return `<div class="sel-desc">${desc}</div>`
      + `<div class="sel-row"><span class="label">Status</span><span>${status}</span></div>`
      + `<div class="sel-row"><span class="label">Workers</span><span>${b.workers.length}/${b.workerSlots}</span></div>`;
  }

  private renderResourceNode(r: ResourceNodeComponent): string {
    return `<div class="sel-row"><span class="label">Amount</span><span>${r.amount}/${r.maxAmount}</span></div>`
      + `<div class="sel-row"><span class="label">Regenerates</span><span>${r.regenerates ? 'Yes' : 'No'}</span></div>`;
  }

  dispose(): void {
    this.eventBus.off('EntitySelected', this.onEntitySelected);
    this.eventBus.off('EntityDeselected', this.onEntityDeselected);
    this.el.remove();
  }
}

