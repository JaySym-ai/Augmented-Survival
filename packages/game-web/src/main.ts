/**
 * Augmented Survival — Medieval City Builder
 * Web entry point: creates GameApp, wires all systems, starts game loop
 */
import { GameRenderer } from './renderer/GameRenderer.js';
import { PRESET_HIGH } from './renderer/RenderSettings.js';
import { RTSCameraController } from './camera/RTSCameraController.js';
import { GameWorld } from './game/GameWorld.js';
import { SelectionManager } from './game/SelectionManager.js';
import { BuildingGhostPreview } from './game/BuildingGhostPreview.js';
import { GameUI } from './ui/GameUI.js';
import { VILLAGER_SIDEBAR_SELECT_EVENT } from './ui/VillagerSidebar.js';
import { CITIZEN, TRANSFORM } from '@augmented-survival/game-core';
import type { EntityId, TransformComponent } from '@augmented-survival/game-core';

class GameApp {
  private gameRenderer: GameRenderer;
  private cameraController: RTSCameraController;
  private gameWorld: GameWorld;
  private selectionManager: SelectionManager;
  private buildingGhost: BuildingGhostPreview;
  private gameUI: GameUI;
  private container: HTMLElement;
  private lastTime = 0;
  private animationFrameId = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // Camera controller (creates THREE.PerspectiveCamera internally)
    this.cameraController = new RTSCameraController(container, {
      fov: 50,
      tiltAngle: 45,
      initialDistance: 60,
      minDistance: 10,
      maxDistance: 200,
    });

    // Core renderer (creates scene, lights, sky, ground, postprocessing)
    this.gameRenderer = new GameRenderer(container, this.cameraController.camera, PRESET_HIGH);

    // Remove the default ground plane — we use terrain instead
    this.gameRenderer.scene.remove(this.gameRenderer.groundPlane);

    // Create game world (wires ECS, terrain, environment, systems)
    this.gameWorld = new GameWorld(this.gameRenderer.scene);

    // Selection
    this.selectionManager = new SelectionManager(
      this.gameWorld,
      this.cameraController,
      container,
      this.gameWorld.eventBus,
    );

    // Building ghost preview
    this.buildingGhost = new BuildingGhostPreview(
      this.gameRenderer.scene,
      this.gameWorld.meshFactory,
      container,
      this.cameraController.camera,
      this.gameWorld.terrainMesh,
    );

    // UI overlay — connects HUD panels to game systems
    this.gameUI = new GameUI({
      container,
      eventBus: this.gameWorld.eventBus,
      resourceStore: this.gameWorld.resourceStore,
      timeSystem: this.gameWorld.timeSystem,
      buildingPlacement: this.gameWorld.buildingPlacement,
      world: this.gameWorld.world,
      gameRenderer: this.gameRenderer,
      onBuildingSelected: (type) => {
        this.buildingGhost.startPlacement(type);
      },
      onBuildingCancelled: () => {
        this.buildingGhost.cancel();
      },
    });

    // Wire click-to-place: capture phase so it fires before SelectionManager
    container.addEventListener('click', this.onPlacementClick, true);
    container.addEventListener(VILLAGER_SIDEBAR_SELECT_EVENT, this.onSidebarSelect as EventListener);

    // Wire selection events to UI
    this.gameWorld.eventBus.on('EntitySelected', ({ entityId }) => {
      this.gameUI.showSelection(entityId);
      this.focusCameraOnVillagerSelection(entityId);
    });
    this.gameWorld.eventBus.on('EntityDeselected', () => {
      this.gameUI.hideSelection();
    });

    // Expose to window for UI layer access
    (window as unknown as Record<string, unknown>).__gameApp = this;

    // Resize handling
    window.addEventListener('resize', this.onResize);
    this.onResize();

    console.log('[Augmented Survival] Game initialized');
  }

  // Public API for UI
  getGameWorld(): GameWorld { return this.gameWorld; }
  getSelectionManager(): SelectionManager { return this.selectionManager; }
  getBuildingGhost(): BuildingGhostPreview { return this.buildingGhost; }
  getCameraController(): RTSCameraController { return this.cameraController; }
  getRenderer(): GameRenderer { return this.gameRenderer; }

  /** Start the render loop */
  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** Handle click-to-place when building ghost is active */
  private onPlacementClick = (event: MouseEvent): void => {
    if (!this.buildingGhost.isActive()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('#game-ui')) return;

    // Prevent SelectionManager from also handling this click
    event.stopPropagation();

    const type = this.buildingGhost.getActiveType()!;
    const pos = this.buildingGhost.confirm();
    if (pos && type) {
      this.gameWorld.placeBuilding(type, pos);
    }
  };

  private loop = (time: number): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = time;

    // Update camera with smooth interpolation
    this.cameraController.update(dt);

    // Update game simulation and sync meshes
    this.gameWorld.update(dt);

    // Update selection ring position and command markers
    this.selectionManager.update(dt);

    // Update UI overlay (resource bar, build menu affordability, etc.)
    this.gameUI.update();

    // Render through postprocessing pipeline
    this.gameRenderer.render();
  };

  private onResize = (): void => {
    this.cameraController.onResize();
    this.gameRenderer.onResize();
  };

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('click', this.onPlacementClick, true);
    this.container.removeEventListener(VILLAGER_SIDEBAR_SELECT_EVENT, this.onSidebarSelect as EventListener);
    this.gameUI.dispose();
    this.selectionManager.dispose();
    this.buildingGhost.dispose();
    this.gameWorld.dispose();
    this.cameraController.dispose();
    this.gameRenderer.dispose();
  }

  private onSidebarSelect = (event: Event): void => {
    const custom = event as CustomEvent<{ entityId?: EntityId }>;
    const entityId = custom.detail?.entityId;
    if (entityId == null) return;
    this.selectionManager.select(entityId);
  };

  private focusCameraOnVillagerSelection(entityId: EntityId): void {
    const citizen = this.gameWorld.world.getComponent(entityId, CITIZEN);
    if (!citizen) return;

    const transform = this.gameWorld.world.getComponent<TransformComponent>(entityId, TRANSFORM);
    if (!transform) return;

    const target = this.cameraController.getLookAtPosition();
    target.set(transform.position.x, 0, transform.position.z);
    this.cameraController.setTarget(target);
  }
}

// ---- Bootstrap ----
const container = document.getElementById('app');
if (!container) {
  throw new Error('Missing #app container element');
}

const app = new GameApp(container);
app.start();

// Export type for UI
export type { GameApp };
