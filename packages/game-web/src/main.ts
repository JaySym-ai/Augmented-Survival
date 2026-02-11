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

class GameApp {
  private gameRenderer: GameRenderer;
  private cameraController: RTSCameraController;
  private gameWorld: GameWorld;
  private selectionManager: SelectionManager;
  private buildingGhost: BuildingGhostPreview;
  private lastTime = 0;
  private animationFrameId = 0;

  constructor(container: HTMLElement) {
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
    );

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

  private loop = (time: number): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = time;

    // Update camera with smooth interpolation
    this.cameraController.update(dt);

    // Update game simulation and sync meshes
    this.gameWorld.update(dt);

    // Update selection ring position
    this.selectionManager.update();

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
    this.selectionManager.dispose();
    this.buildingGhost.dispose();
    this.gameWorld.dispose();
    this.cameraController.dispose();
    this.gameRenderer.dispose();
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

