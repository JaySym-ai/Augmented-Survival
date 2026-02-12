/**
 * UIStyles — CSS-in-JS styles for the game HUD overlay.
 * Injects a <style> tag into <head> with all UI styles.
 */

const CSS = /* css */ `
/* ===== Design Tokens ===== */
:root {
  --ui-bg: rgba(20, 15, 10, 0.85);
  --ui-bg-hover: rgba(40, 30, 20, 0.9);
  --ui-border: rgba(139, 115, 85, 0.6);
  --ui-text: #e8d5b7;
  --ui-text-muted: #a89070;
  --ui-accent: #daa520;
  --ui-accent-hover: #f0c040;
  --ui-danger: #c0392b;
  --ui-success: #27ae60;
  --panel-radius: 8px;
  --panel-padding: 12px;
}

/* ===== Root Overlay ===== */
#game-ui {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 100;
  font-family: 'Segoe UI', system-ui, sans-serif;
  letter-spacing: 0.5px;
  color: var(--ui-text);
  font-size: 14px;
  user-select: none;
}

#game-ui * { box-sizing: border-box; }

/* ===== Shared Panel ===== */
.ui-panel {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--panel-radius);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

/* ===== Resource Bar ===== */
.ui-resource-bar {
  position: absolute;
  top: 12px; left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 16px;
  padding: 8px 20px;
  align-items: center;
}
.ui-resource-bar .res-item {
  display: flex; align-items: center; gap: 4px;
  white-space: nowrap;
}
.ui-resource-bar .res-icon { font-size: 18px; }
.ui-resource-bar .res-value {
  font-weight: 600;
  min-width: 28px;
  text-align: right;
  transition: color 0.3s;
}
.ui-resource-bar .res-value.flash { color: var(--ui-accent); }
.ui-resource-bar .res-label { color: var(--ui-text-muted); font-size: 12px; }

/* ===== Time Controls ===== */
.ui-time-controls {
  position: absolute;
  top: 12px; right: 12px;
  display: flex; gap: 4px;
  padding: 6px 10px;
  align-items: center;
}
.ui-time-controls button {
  background: transparent;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  color: var(--ui-text);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 14px;
  pointer-events: auto;
  transition: background 0.15s, border-color 0.15s;
}
.ui-time-controls button:hover { background: var(--ui-bg-hover); }
.ui-time-controls button.active {
  background: var(--ui-accent);
  color: #1a1206;
  border-color: var(--ui-accent);
  font-weight: 700;
}
.ui-time-controls .settings-btn {
  margin-left: 8px;
  font-size: 16px;
}

/* ===== Build Menu ===== */
.ui-build-menu {
  position: absolute;
  bottom: 12px; left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 8px;
  padding: 10px 16px;
}
.ui-build-card {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  width: 80px; height: 100px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  padding: 6px 4px;
  font-family: inherit;
  letter-spacing: inherit;
}
.ui-build-card:hover:not(:disabled) { background: var(--ui-bg-hover); border-color: var(--ui-accent); }
.ui-build-card.active { border-color: var(--ui-accent); background: rgba(218,165,32,0.2); }
.ui-build-card:disabled { opacity: 0.4; cursor: not-allowed; }
.ui-build-card .build-icon { font-size: 24px; margin-bottom: 2px; }
.ui-build-card .build-name { font-size: 11px; font-weight: 600; text-align: center; line-height: 1.2; }
.ui-build-card .build-cost { font-size: 10px; color: var(--ui-text-muted); text-align: center; margin-top: 2px; }

/* ===== Selection Panel ===== */
.ui-selection-panel {
  position: absolute;
  bottom: 12px; left: 12px;
  min-width: 220px; max-width: 280px;
  padding: var(--panel-padding);
}
.ui-selection-panel .sel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.ui-selection-panel .sel-title { font-weight: 700; font-size: 15px; }
.ui-selection-panel .sel-close {
  background: none; border: none; color: var(--ui-text-muted);
  cursor: pointer; font-size: 16px; pointer-events: auto;
  padding: 0 4px;
}
.ui-selection-panel .sel-close:hover { color: var(--ui-text); }
.ui-selection-panel .sel-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 3px 0; font-size: 13px;
}
.ui-selection-panel .sel-row .label { color: var(--ui-text-muted); }
.ui-selection-panel .sel-desc {
  font-size: 12px; color: var(--ui-text-muted);
  margin-bottom: 6px; line-height: 1.3;
}
.ui-selection-panel .bar-container {
  width: 100%; height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px; overflow: hidden;
  margin-top: 2px;
}
.ui-selection-panel .bar-fill {
  height: 100%; border-radius: 3px;
  transition: width 0.3s;
}
.ui-selection-panel .bar-health .bar-fill { background: var(--ui-success); }
.ui-selection-panel .bar-hunger .bar-fill { background: var(--ui-accent); }

/* Job assignment buttons */
.ui-selection-panel .sel-job-row {
  display: flex; flex-wrap: wrap; gap: 4px;
  margin-top: 8px; padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}
.ui-selection-panel .sel-job-btn {
  background: transparent;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  color: var(--ui-text);
  padding: 3px 8px;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  letter-spacing: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.ui-selection-panel .sel-job-btn:hover { background: var(--ui-bg-hover); border-color: var(--ui-accent); }
.ui-selection-panel .sel-job-btn.active {
  background: var(--ui-accent);
  color: #1a1206;
  border-color: var(--ui-accent);
  font-weight: 700;
}

/* ===== Settings Overlay ===== */
.ui-settings-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto;
}
.ui-settings-modal {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--panel-radius);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 20px 24px;
  min-width: 320px; max-width: 400px;
}
.ui-settings-modal h2 {
  margin: 0 0 16px; font-size: 18px; font-weight: 700;
  color: var(--ui-accent);
}
.ui-settings-modal .setting-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0;
}
.ui-settings-modal .setting-label { font-size: 13px; }
.ui-settings-modal select, .ui-settings-modal input[type="range"] {
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  color: var(--ui-text);
  padding: 4px 8px;
  font-size: 13px;
  font-family: inherit;
}
.ui-settings-modal select { min-width: 120px; }
.ui-settings-modal input[type="range"] { width: 120px; }
.ui-settings-modal .toggle-switch {
  position: relative; width: 40px; height: 22px;
  background: rgba(255,255,255,0.1);
  border-radius: 11px; cursor: pointer;
  border: 1px solid var(--ui-border);
  transition: background 0.2s;
}
.ui-settings-modal .toggle-switch.on { background: var(--ui-accent); }
.ui-settings-modal .toggle-switch .toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: var(--ui-text);
  border-radius: 50%;
  transition: left 0.2s;
}
.ui-settings-modal .toggle-switch.on .toggle-knob { left: 20px; }
.ui-settings-modal .settings-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  margin-top: 16px; padding-top: 12px;
  border-top: 1px solid var(--ui-border);
}
.ui-settings-modal .btn {
  background: transparent;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  color: var(--ui-text);
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  letter-spacing: inherit;
  transition: background 0.15s;
}
.ui-settings-modal .btn:hover { background: var(--ui-bg-hover); }
.ui-settings-modal .btn-primary {
  background: var(--ui-accent);
  color: #1a1206;
  border-color: var(--ui-accent);
  font-weight: 600;
}
.ui-settings-modal .btn-primary:hover { background: var(--ui-accent-hover); }

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .ui-resource-bar { gap: 8px; padding: 6px 12px; font-size: 12px; }
  .ui-build-menu { gap: 4px; padding: 6px 8px; }
  .ui-build-card { width: 64px; height: 80px; }
  .ui-build-card .build-icon { font-size: 18px; }
  .ui-build-card .build-name { font-size: 10px; }
  .ui-selection-panel { min-width: 180px; max-width: 220px; }
  .ui-settings-modal { min-width: 280px; padding: 16px; }
}
`;

let injected = false;

/** Inject the UI stylesheet into the document head. Idempotent. */
export function injectUIStyles(): void {
  if (injected) return;
  const style = document.createElement('style');
  style.id = 'game-ui-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}

