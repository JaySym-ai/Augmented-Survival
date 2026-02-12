/**
 * SettingsPanel — Graphics settings modal overlay.
 * Preset dropdown, individual toggles, shadow quality, resolution scale.
 */
import { GameRenderer } from '../renderer/GameRenderer.js';
import {
  type RenderSettings,
  RENDER_PRESETS,
  type RenderPresetName,
} from '../renderer/RenderSettings.js';

const SHADOW_OPTIONS: RenderSettings['shadowQuality'][] = ['off', 'low', 'medium', 'high', 'ultra'];
const PRESET_NAMES: { key: RenderPresetName; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'ultra', label: 'Ultra' },
];

export class SettingsPanel {
  private el: HTMLDivElement;
  private settings: RenderSettings;
  private handleKeyDown: (e: KeyboardEvent) => void;

  // Form elements
  private presetSelect!: HTMLSelectElement;
  private shadowSelect!: HTMLSelectElement;
  private resSlider!: HTMLInputElement;
  private resLabel!: HTMLSpanElement;
  private ssaoToggle!: HTMLDivElement;
  private bloomToggle!: HTMLDivElement;
  private fxaaToggle!: HTMLDivElement;
  private fogToggle!: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private gameRenderer: GameRenderer,
  ) {
    this.settings = { ...this.gameRenderer.getSettings() };

    this.el = document.createElement('div');
    this.el.className = 'ui-settings-overlay';
    this.el.style.display = 'none';

    // Click backdrop to close
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    const modal = document.createElement('div');
    modal.className = 'ui-settings-modal';
    modal.innerHTML = `<h2>⚙️ Graphics Settings</h2>`;

    // Preset row
    modal.appendChild(this.createSelectRow('Preset', PRESET_NAMES.map(p => p.label), (val) => {
      const preset = PRESET_NAMES.find(p => p.label === val);
      if (preset) {
        this.settings = { ...RENDER_PRESETS[preset.key] };
        this.syncFormToSettings();
      }
    }, (sel) => { this.presetSelect = sel; }));

    // Shadow quality
    modal.appendChild(this.createSelectRow('Shadows', SHADOW_OPTIONS.map(s => s.charAt(0).toUpperCase() + s.slice(1)), (val) => {
      this.settings.shadowQuality = val.toLowerCase() as RenderSettings['shadowQuality'];
    }, (sel) => { this.shadowSelect = sel; }));

    // Toggles
    this.ssaoToggle = this.createToggleRow('SSAO', this.settings.ssaoEnabled, (v) => { this.settings.ssaoEnabled = v; });
    modal.appendChild(this.ssaoToggle);
    this.bloomToggle = this.createToggleRow('Bloom', this.settings.bloomEnabled, (v) => { this.settings.bloomEnabled = v; });
    modal.appendChild(this.bloomToggle);
    this.fxaaToggle = this.createToggleRow('FXAA', this.settings.fxaaEnabled, (v) => { this.settings.fxaaEnabled = v; });
    modal.appendChild(this.fxaaToggle);
    this.fogToggle = this.createToggleRow('Fog', this.settings.fogEnabled, (v) => { this.settings.fogEnabled = v; });
    modal.appendChild(this.fogToggle);

    // Resolution scale slider
    const resRow = document.createElement('div');
    resRow.className = 'setting-row';
    this.resLabel = document.createElement('span');
    this.resLabel.className = 'setting-label';
    this.resLabel.textContent = `Resolution: ${Math.round(this.settings.resolutionScale * 100)}%`;
    this.resSlider = document.createElement('input');
    this.resSlider.type = 'range';
    this.resSlider.min = '50';
    this.resSlider.max = '100';
    this.resSlider.step = '5';
    this.resSlider.value = String(Math.round(this.settings.resolutionScale * 100));
    this.resSlider.addEventListener('input', () => {
      const pct = parseInt(this.resSlider.value, 10);
      this.settings.resolutionScale = pct / 100;
      this.resLabel.textContent = `Resolution: ${pct}%`;
    });
    resRow.appendChild(this.resLabel);
    resRow.appendChild(this.resSlider);
    modal.appendChild(resRow);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'settings-actions';
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => {
      this.gameRenderer.applySettings(this.settings);
      this.close();
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.close());
    actions.appendChild(cancelBtn);
    actions.appendChild(applyBtn);
    modal.appendChild(actions);

    this.el.appendChild(modal);

    // ESC to close
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.el.style.display !== 'none') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);

    parent.appendChild(this.el);
  }

  open(): void {
    this.settings = { ...this.gameRenderer.getSettings() };
    this.syncFormToSettings();
    this.el.style.display = '';
  }

  close(): void {
    this.el.style.display = 'none';
  }

  isOpen(): boolean {
    return this.el.style.display !== 'none';
  }

  private syncFormToSettings(): void {
    // Shadow
    const shadowIdx = SHADOW_OPTIONS.indexOf(this.settings.shadowQuality);
    if (shadowIdx >= 0) this.shadowSelect.selectedIndex = shadowIdx;

    // Toggles
    this.setToggle(this.ssaoToggle, this.settings.ssaoEnabled);
    this.setToggle(this.bloomToggle, this.settings.bloomEnabled);
    this.setToggle(this.fxaaToggle, this.settings.fxaaEnabled);
    this.setToggle(this.fogToggle, this.settings.fogEnabled);

    // Resolution
    this.resSlider.value = String(Math.round(this.settings.resolutionScale * 100));
    this.resLabel.textContent = `Resolution: ${Math.round(this.settings.resolutionScale * 100)}%`;
  }

  private setToggle(row: HTMLDivElement, value: boolean): void {
    const sw = row.querySelector('.toggle-switch') as HTMLDivElement;
    if (sw) sw.classList.toggle('on', value);
  }

  private createSelectRow(
    label: string,
    options: string[],
    onChange: (val: string) => void,
    refSetter: (sel: HTMLSelectElement) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const lbl = document.createElement('span');
    lbl.className = 'setting-label';
    lbl.textContent = label;
    const sel = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    row.appendChild(lbl);
    row.appendChild(sel);
    refSetter(sel);
    return row;
  }

  private createToggleRow(
    label: string,
    initial: boolean,
    onChange: (val: boolean) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const lbl = document.createElement('span');
    lbl.className = 'setting-label';
    lbl.textContent = label;
    const sw = document.createElement('div');
    sw.className = `toggle-switch${initial ? ' on' : ''}`;
    sw.innerHTML = '<div class="toggle-knob"></div>';
    sw.addEventListener('click', () => {
      const isOn = sw.classList.toggle('on');
      onChange(isOn);
    });
    row.appendChild(lbl);
    row.appendChild(sw);
    return row;
  }

  update(): void {
    // Settings panel is modal — no per-frame updates needed
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.el.remove();
  }
}

