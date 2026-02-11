import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';

/**
 * TimeSystem — manages game time scale and pause state.
 * Other systems should call getScaledDt(dt) to get time-scaled delta.
 */
export class TimeSystem extends System {
  private timeScale = 1;
  private paused = false;

  constructor(private eventBus: EventBus<GameEventMap>) {
    super('TimeSystem');
  }

  setTimeScale(scale: number): void {
    const oldScale = this.timeScale;
    this.timeScale = Math.max(0, scale);
    this.eventBus.emit('TimeScaleChanged', {
      oldScale,
      newScale: this.timeScale,
    });
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Returns dt scaled by the current time scale.
   * Returns 0 if paused.
   */
  getScaledDt(dt: number): number {
    return this.paused ? 0 : dt * this.timeScale;
  }

  update(_world: World, _dt: number): void {
    // Time system is passive — other systems call getScaledDt()
  }
}

