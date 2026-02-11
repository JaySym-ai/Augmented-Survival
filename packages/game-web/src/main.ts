/**
 * Augmented Survival — Medieval City Builder
 * Web entry point: creates GameApp, starts render loop
 */
import { GameRenderer } from './renderer/GameRenderer.js';
import { PRESET_HIGH } from './renderer/RenderSettings.js';
import { RTSCameraController } from './camera/RTSCameraController.js';

class GameApp {
  private gameRenderer: GameRenderer;
  private cameraController: RTSCameraController;
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

    // Resize handling
    window.addEventListener('resize', this.onResize);
    this.onResize();

    console.log('[Augmented Survival] Game initialized');
  }

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

