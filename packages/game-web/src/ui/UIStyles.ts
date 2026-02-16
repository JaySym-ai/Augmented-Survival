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
  display: flex; gap: 8px;
  padding: 8px 16px;
  align-items: center;
  transition: all 0.3s ease;
}
.ui-resource-bar.expanded {
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px;
  min-width: 320px;
}
.ui-resource-bar .resource-bar-collapsed {
  display: flex; gap: 16px;
  align-items: center;
}
.ui-resource-bar .resource-bar-toggle {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  color: var(--ui-text-muted);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  pointer-events: auto;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ui-resource-bar .resource-bar-toggle:hover {
  border-color: var(--ui-accent);
  color: var(--ui-accent);
  background: var(--ui-bg-hover);
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

/* Expanded view */
.ui-resource-bar .resource-bar-expanded {
  display: none;
  width: 100%;
}
.ui-resource-bar.expanded .resource-bar-expanded {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ui-resource-bar.expanded .resource-bar-collapsed {
  display: none;
}
.ui-resource-bar .resource-bar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ui-resource-bar .resource-bar-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--ui-accent);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.ui-resource-bar .resource-bar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ui-resource-bar .res-item-full {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}
.ui-resource-bar .res-item-full .res-icon { font-size: 16px; }
.ui-resource-bar .res-item-full .res-label { font-size: 11px; }
.ui-resource-bar .res-item-full .res-value { font-size: 13px; }

/* ===== Inventory Grid (standalone) ===== */
.ui-inventory-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 8px;
}
.ui-inventory-grid .inv-slot {
  width: 40px;
  height: 40px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: all 0.15s ease;
}
.ui-inventory-grid .inv-slot:hover {
  border-color: var(--ui-accent);
  background: var(--ui-bg-hover);
}
.ui-inventory-grid .inv-slot.empty {
  opacity: 0.4;
  border-style: dashed;
}

/* Inventory grid */
.ui-resource-bar .inventory-section {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}
.ui-resource-bar .inventory-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.ui-resource-bar .inventory-slot {
  width: 36px;
  height: 36px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  position: relative;
}
.ui-resource-bar .inventory-slot.empty {
  opacity: 0.4;
  border-style: dashed;
}
.ui-resource-bar .inventory-slot .inv-icon {
  font-size: 16px;
  line-height: 1;
}
.ui-resource-bar .inventory-slot .inv-count {
  position: absolute;
  bottom: 2px;
  right: 3px;
  font-size: 9px;
  color: var(--ui-text-muted);
}

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
  transition: all 0.3s ease;
}
.ui-build-menu.collapsed {
  padding: 8px 12px;
  gap: 0;
}

.build-menu-toggle {
  display: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--ui-accent);
  background: linear-gradient(145deg, rgba(40, 30, 20, 0.95), rgba(20, 15, 10, 0.98));
  color: var(--ui-accent);
  cursor: pointer;
  font-size: 24px;
  pointer-events: auto;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 215, 0, 0.15),
    0 0 20px rgba(218, 165, 32, 0.1);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.build-menu-toggle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.2), transparent 60%);
  opacity: 0;
  transition: opacity 0.25s;
}
.build-menu-toggle:hover {
  border-color: var(--ui-accent-hover);
  color: var(--ui-accent-hover);
  transform: scale(1.08);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 215, 0, 0.25),
    0 0 30px rgba(240, 192, 64, 0.35),
    0 0 60px rgba(218, 165, 32, 0.15);
}
.build-menu-toggle:hover::before {
  opacity: 1;
}
.build-menu-toggle:active {
  transform: scale(0.95);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 215, 0, 0.15),
    0 0 20px rgba(240, 192, 64, 0.25);
}

.ui-build-menu.collapsed .ui-build-card {
  display: none;
}
.ui-build-menu.collapsed .build-menu-toggle {
  display: flex;
}
.ui-build-menu.collapsed .build-menu-minimize {
  display: none;
}

.build-menu-minimize {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--ui-border);
  background: linear-gradient(145deg, rgba(40, 30, 20, 0.95), rgba(20, 15, 10, 0.98));
  color: var(--ui-text-muted);
  cursor: pointer;
  font-size: 14px;
  pointer-events: auto;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}
.build-menu-minimize:hover {
  border-color: var(--ui-accent);
  color: var(--ui-accent);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 10px rgba(218, 165, 32, 0.2);
}
.build-menu-minimize:active {
  transform: scale(0.95);
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

/* ===== Villager Sidebar ===== */
.ui-villager-sidebar {
  position: absolute;
  top: 132px; left: 12px;
  width: 260px;
  max-height: 48vh;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}
.ui-villager-sidebar.collapsed {
  width: 112px;
}
.ui-villager-sidebar .villager-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ui-villager-sidebar .villager-sidebar-title {
  font-weight: 700;
  font-size: 14px;
}
.ui-villager-sidebar .villager-sidebar-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
}
.ui-villager-sidebar .villager-sidebar-toggle:hover {
  background: var(--ui-bg-hover);
}
.ui-villager-sidebar .villager-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 2px;
}
.ui-villager-sidebar .villager-row {
  border: 1px solid rgba(139, 115, 85, 0.5);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 8px;
}
.ui-villager-sidebar .villager-name {
  font-size: 13px;
  font-weight: 600;
}
.ui-villager-sidebar .villager-activity {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ui-text-muted);
}
.ui-villager-sidebar .villager-sidebar-empty {
  font-size: 12px;
  color: var(--ui-text-muted);
  padding: 4px 2px;
}
.ui-villager-sidebar.collapsed .villager-sidebar-list {
  display: none;
}

/* ===== Selection Panel ===== */
.ui-selection-panel {
  position: absolute;
  bottom: 12px; left: 12px;
  min-width: 220px; max-width: 280px;
  padding: var(--panel-padding);
}
.ui-selection-panel .sel-header {
  display: flex; align-items: center;
  margin-bottom: 8px; gap: 4px;
}
.ui-selection-panel .sel-title { font-weight: 700; font-size: 15px; flex: 1; }
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
.ui-selection-panel .bar-construction .bar-fill { background: #f59e0b; }
.ui-selection-panel .construction-pct {
  font-size: 12px; color: var(--ui-text-muted);
  text-align: right; margin-top: 2px;
}

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

/* Equipment slots */
.ui-selection-panel .sel-equip-label {
  color: var(--ui-text-muted);
  font-size: 13px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}
.ui-selection-panel .sel-equip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.ui-selection-panel .sel-equip-slot {
  width: 48px;
  height: 48px;
  border: 2px solid #888;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
}
.ui-selection-panel .sel-equip-slot.empty {
  opacity: 0.4;
  border: 2px dashed #555;
}
.ui-selection-panel .sel-equip-icon {
  font-size: 20px;
  line-height: 1.2;
}
.ui-selection-panel .sel-equip-name {
  font-size: 9px;
  color: var(--ui-text-muted);
  line-height: 1;
}

/* Bag inventory slots */
.ui-selection-panel .sel-bag-label {
  color: var(--ui-text-muted);
  font-size: 13px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}
.ui-selection-panel .sel-bag-grid {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.ui-selection-panel .sel-bag-slot {
  width: 48px;
  height: 48px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
}
.ui-selection-panel .sel-bag-slot.empty {
  opacity: 0.4;
  border-style: dashed;
}
.ui-selection-panel .sel-bag-icon {
  font-size: 20px;
}
.ui-selection-panel .sel-bag-count {
  font-size: 10px;
  color: var(--ui-text-muted);
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

/* ===== Debug Panel ===== */
.ui-debug-panel {
  position: absolute;
  top: 72px; right: 12px;
  width: 280px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}
.ui-debug-panel.collapsed {
  width: 112px;
}
.ui-debug-panel .debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ui-debug-panel .debug-title {
  font-weight: 700;
  font-size: 14px;
}
.ui-debug-panel .debug-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
}
.ui-debug-panel .debug-toggle:hover {
  background: var(--ui-bg-hover);
}
.ui-debug-panel .debug-section-toggle {
  width: 24px;
  height: 24px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 10px;
  line-height: 1;
}
.ui-debug-panel .debug-section-toggle:hover {
  background: var(--ui-bg-hover);
}
.ui-debug-panel .debug-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-muted);
  border-bottom: 1px solid var(--ui-border);
}
.ui-debug-panel .debug-section-header:hover {
  color: var(--ui-text);
}
.ui-debug-panel .debug-resource-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding-right: 2px;
}
.ui-debug-panel .debug-resource-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  border: 1px solid rgba(139, 115, 85, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}
.ui-debug-panel .debug-res-info {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.ui-debug-panel .debug-res-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.ui-debug-panel .debug-res-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-debug-panel .debug-timer {
  font-family: 'Courier New', monospace;
  color: var(--ui-text-muted);
  font-size: 11px;
  margin-left: 4px;
  flex-shrink: 0;
}
.ui-debug-panel .debug-spawn-btn {
  background: transparent;
  border: 1px solid var(--ui-accent);
  border-radius: 4px;
  color: var(--ui-accent);
  padding: 2px 8px;
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;
  letter-spacing: inherit;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  margin-left: 6px;
}
.ui-debug-panel .debug-spawn-btn:hover {
  background: var(--ui-accent);
  color: #1a1206;
}
.ui-debug-panel .debug-empty {
  font-size: 12px;
  color: var(--ui-text-muted);
  padding: 4px 2px;
}
.ui-debug-panel.collapsed .debug-resource-list,
.ui-debug-panel.collapsed .debug-section-header,
.ui-debug-panel.collapsed .debug-empty {
  display: none;
}

/* Destroy building button (icon in header) */
.ui-selection-panel .sel-destroy-btn {
  background: none;
  border: none;
  color: var(--ui-text-muted);
  cursor: pointer;
  font-size: 15px;
  padding: 0 4px;
  pointer-events: auto;
  line-height: 1;
  transition: color 0.15s;
}
.ui-selection-panel .sel-destroy-btn:hover {
  color: var(--ui-danger);
}

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .ui-resource-bar { gap: 8px; padding: 6px 12px; font-size: 12px; }
  .ui-build-menu { gap: 4px; padding: 6px 8px; }
  .ui-build-card { width: 64px; height: 80px; }
  .ui-build-card .build-icon { font-size: 18px; }
  .ui-build-card .build-name { font-size: 10px; }
  .ui-villager-sidebar { top: 112px; width: 220px; max-height: 42vh; }
  .ui-villager-sidebar.collapsed { width: 106px; }
  .ui-selection-panel { min-width: 180px; max-width: 220px; }
  .ui-settings-modal { min-width: 280px; padding: 16px; }
  .ui-debug-panel { width: 220px; max-height: 50vh; top: 60px; }
  .ui-debug-panel.collapsed { width: 106px; }
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
