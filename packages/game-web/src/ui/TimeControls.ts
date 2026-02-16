/**
 * TimeControls — Top-right pause/play/speed controls.
 * Buttons: Pause | 1x | 2x | 3x, plus a settings gear icon.
 */
import {
  TimeSystem,
  EventBus,
} from '@augmented-survival/game-core';
import type { GameEventMap } from '@augmented-survival/game-core';

interface SpeedOption {
  label: string;
  scale: number;
  isPause: boolean;
}

const SPEED_OPTIONS: SpeedOption[] = [
  { label: '⏸️', scale: 0, isPause: true },
  { label: '▶️ 1×', scale: 1, isPause: false },
  { label: '⏩ 2×', scale: 2, isPause: false },
  { label: '⏩ 3×', scale: 3, isPause: false },
  { label: '⏩ 5×', scale: 5, isPause: false },
];

export class TimeControls {
  private el: HTMLDivElement;
  private buttons: HTMLButtonElement[] = [];
  private settingsBtn: HTMLButtonElement;
  private onTimeScaleChanged: (e: { oldScale: number; newScale: number }) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
    private onSettingsClick: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-time-controls ui-panel';

    // Speed buttons
    for (const opt of SPEED_OPTIONS) {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => this.setSpeed(opt));
      this.el.appendChild(btn);
      this.buttons.push(btn);
    }

    // Settings gear
    this.settingsBtn = document.createElement('button');
    this.settingsBtn.className = 'settings-btn';
    this.settingsBtn.textContent = '⚙️';
    this.settingsBtn.addEventListener('click', () => this.onSettingsClick());
    this.el.appendChild(this.settingsBtn);

    // Listen for external time scale changes
    this.onTimeScaleChanged = () => this.updateActiveButton();
    this.eventBus.on('TimeScaleChanged', this.onTimeScaleChanged);

    // Keyboard shortcuts
    this.handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (this.timeSystem.isPaused()) {
            this.timeSystem.resume();
            this.timeSystem.setTimeScale(1);
          } else {
            this.timeSystem.pause();
          }
          this.updateActiveButton();
          break;
        case '1':
          this.timeSystem.resume();
          this.timeSystem.setTimeScale(1);
          this.updateActiveButton();
          break;
        case '2':
          this.timeSystem.resume();
          this.timeSystem.setTimeScale(2);
          this.updateActiveButton();
          break;
        case '3':
          this.timeSystem.resume();
          this.timeSystem.setTimeScale(3);
          this.updateActiveButton();
          break;
        case '5':
          this.timeSystem.resume();
          this.timeSystem.setTimeScale(5);
          this.updateActiveButton();
          break;
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);

    // Initial state
    this.updateActiveButton();

    parent.appendChild(this.el);
  }

  private setSpeed(opt: SpeedOption): void {
    if (opt.isPause) {
      this.timeSystem.pause();
    } else {
      this.timeSystem.resume();
      this.timeSystem.setTimeScale(opt.scale);
    }
    this.updateActiveButton();
  }

  private updateActiveButton(): void {
    const paused = this.timeSystem.isPaused();
    const scale = this.timeSystem.getTimeScale();

    for (let i = 0; i < SPEED_OPTIONS.length; i++) {
      const opt = SPEED_OPTIONS[i];
      const isActive = opt.isPause ? paused : (!paused && scale === opt.scale);
      this.buttons[i].classList.toggle('active', isActive);
    }
  }

  update(): void {
    // Active button state is event-driven, nothing to poll
  }

  dispose(): void {
    this.eventBus.off('TimeScaleChanged', this.onTimeScaleChanged);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.el.remove();
  }
}

