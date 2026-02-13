/**
 * GameUI — Main UI manager.
 * Creates and coordinates all HUD panels as an HTML overlay on the Three.js canvas.
 */
import {
  World,
  EventBus,
  ResourceStoreSystem,
  TimeSystem,
  BuildingPlacementSystem,
  BuildingType,
} from '@augmented-survival/game-core';
import type { EntityId, GameEventMap } from '@augmented-survival/game-core';
import { GameRenderer } from '../renderer/GameRenderer.js';
import { injectUIStyles } from './UIStyles.js';
import { ResourceBar } from './ResourceBar.js';
import { BuildMenu } from './BuildMenu.js';
import { SelectionPanel } from './SelectionPanel.js';
import { VillagerSidebar } from './VillagerSidebar.js';
import { TimeControls } from './TimeControls.js';
import { SettingsPanel } from './SettingsPanel.js';

export interface GameUIConfig {
  container: HTMLElement;
  eventBus: EventBus<GameEventMap>;
  resourceStore: ResourceStoreSystem;
  timeSystem: TimeSystem;
  buildingPlacement: BuildingPlacementSystem;
  world: World;
  gameRenderer: GameRenderer;
  onBuildingSelected?: (type: BuildingType) => void;
  onBuildingCancelled?: () => void;
}

export class GameUI {
  private root: HTMLDivElement;
  private resourceBar: ResourceBar;
  private buildMenu: BuildMenu;
  private villagerSidebar: VillagerSidebar;
  private selectionPanel: SelectionPanel;
  private timeControls: TimeControls;
  private settingsPanel: SettingsPanel;

  constructor(private config: GameUIConfig) {
    // Inject CSS
    injectUIStyles();

    // Create root overlay
    this.root = document.createElement('div');
    this.root.id = 'game-ui';
    config.container.appendChild(this.root);

    // Create sub-panels
    this.resourceBar = new ResourceBar(
      this.root,
      config.resourceStore,
      config.world,
    );

    this.buildMenu = new BuildMenu(
      this.root,
      config.resourceStore,
      (type) => {
        if (config.onBuildingSelected) config.onBuildingSelected(type);
      },
      () => {
        if (config.onBuildingCancelled) config.onBuildingCancelled();
      },
    );

    this.villagerSidebar = new VillagerSidebar(
      this.root,
      config.world,
    );

    this.selectionPanel = new SelectionPanel(
      this.root,
      config.world,
      config.eventBus,
    );

    this.settingsPanel = new SettingsPanel(
      this.root,
      config.gameRenderer,
    );

    this.timeControls = new TimeControls(
      this.root,
      config.timeSystem,
      config.eventBus,
      () => this.settingsPanel.open(),
    );
  }

  /** Called every frame to update dynamic values */
  update(): void {
    this.resourceBar.update();
    this.buildMenu.update();
    this.villagerSidebar.update();
    this.selectionPanel.update();
    this.timeControls.update();
    this.settingsPanel.update();
  }

  /** Show selection panel for a specific entity */
  showSelection(entityId: EntityId): void {
    this.selectionPanel.show(entityId);
  }

  /** Hide selection panel */
  hideSelection(): void {
    this.selectionPanel.hide();
  }

  /** Enable build mode for a building type */
  enterBuildMode(type: BuildingType): void {
    this.buildMenu.enterBuildMode(type);
  }

  /** Exit build mode */
  exitBuildMode(): void {
    this.buildMenu.exitBuildMode();
  }

  /** Clean up all UI elements and event listeners */
  dispose(): void {
    this.resourceBar.dispose();
    this.buildMenu.dispose();
    this.villagerSidebar.dispose();
    this.selectionPanel.dispose();
    this.timeControls.dispose();
    this.settingsPanel.dispose();
    this.root.remove();
  }
}
