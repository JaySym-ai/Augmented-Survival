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
    if (this.onClose) this.onClose();
  }

  update(): void {
    if (this.selectedEntity === null) return;
    if (!this.world.isAlive(this.selectedEntity)) {
      this.hide();
      return;
    }
    this.renderContent();
  }

  private renderContent(): void {
    if (this.selectedEntity === null) return;
    const eid = this.selectedEntity;
    const titleEl = this.el.querySelector('.sel-title') as HTMLSpanElement;

    // Check entity type and render accordingly
    const citizen = this.world.getComponent<CitizenComponent>(eid, CITIZEN);
    if (citizen) {
      titleEl.textContent = citizen.name;
      this.contentEl.innerHTML = '';
      this.renderCitizen(eid, citizen);
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

  private renderCitizen(entityId: EntityId, c: CitizenComponent): void {
    // Info rows (HTML string for the static parts)
    const infoHtml = `<div class="sel-row"><span class="label">Job</span><span>${c.job ?? 'None'}</span></div>`
      + `<div class="sel-row"><span class="label">State</span><span>${c.state}</span></div>`
      + `<div class="sel-row"><span class="label">Health</span></div>`
      + `<div class="bar-container bar-health"><div class="bar-fill" style="width:${c.health}%"></div></div>`
      + `<div class="sel-row"><span class="label">Hunger</span></div>`
      + `<div class="bar-container bar-hunger"><div class="bar-fill" style="width:${c.hunger}%"></div></div>`;

    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = infoHtml;
    this.contentEl.appendChild(infoDiv);

    // Job assignment button row
    const jobRow = document.createElement('div');
    jobRow.className = 'sel-job-row';

    const currentJob = c.job ?? JobType.Idle;

    for (const jobType of Object.values(JobType)) {
      const def = JOB_DEFS[jobType];
      const btn = document.createElement('button');
      btn.className = 'sel-job-btn';
      if (jobType === currentJob) {
        btn.classList.add('active');
      }
      btn.textContent = def.displayName;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assignJob(entityId, jobType);
      });
      jobRow.appendChild(btn);
    }

    this.contentEl.appendChild(jobRow);
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

    // Re-render the panel
    this.renderContent();
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

