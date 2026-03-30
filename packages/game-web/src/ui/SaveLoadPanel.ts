import type { SaveData } from '@augmented-survival/game-core';
import {
  createDefaultSaveSlot,
  formatSaveTimestamp,
  sanitizeSaveSlotName,
} from '../utils/SaveFileUtils.js';

export type SaveLoadMode = 'save' | 'load';
export type SaveLoadPlatform = 'desktop' | 'web';

export interface SaveLoadController {
  platform: SaveLoadPlatform;
  listSaves(): Promise<SaveData[]>;
  saveToSlot(slot: string): Promise<void>;
  loadFromSlot(slot: string): Promise<boolean>;
  deleteSave(slot: string): Promise<void>;
  downloadSave(slot: string): Promise<void>;
  importSaveFile(file: File): Promise<boolean>;
}

export class SaveLoadPanel {
  private readonly el: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly subtitleEl: HTMLParagraphElement;
  private readonly inputRow: HTMLDivElement;
  private readonly slotInput: HTMLInputElement;
  private readonly listSection: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly emptyEl: HTMLParagraphElement;
  private readonly statusEl: HTMLParagraphElement;
  private readonly cancelBtn: HTMLButtonElement;
  private readonly deleteBtn: HTMLButtonElement;
  private readonly confirmBtn: HTMLButtonElement;
  private readonly fileInput: HTMLInputElement;
  private readonly handleKeyDown: (event: KeyboardEvent) => void;
  private mode: SaveLoadMode = 'save';
  private selectedSlot: string | null = null;
  private busy = false;

  constructor(parent: HTMLElement, private readonly controller: SaveLoadController) {
    this.el = document.createElement('div');
    this.el.className = 'ui-settings-overlay ui-save-load-overlay';
    this.el.style.display = 'none';
    this.el.addEventListener('click', (event) => {
      if (event.target === this.el) {
        this.close();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'ui-settings-modal ui-save-load-modal';

    this.titleEl = document.createElement('h2');
    modal.appendChild(this.titleEl);

    this.subtitleEl = document.createElement('p');
    this.subtitleEl.className = 'save-load-subtitle';
    modal.appendChild(this.subtitleEl);

    this.inputRow = document.createElement('div');
    this.inputRow.className = 'setting-row save-load-input-row';
    const inputLabel = document.createElement('span');
    inputLabel.className = 'setting-label';
    inputLabel.textContent = 'Save name';
    this.slotInput = document.createElement('input');
    this.slotInput.type = 'text';
    this.slotInput.maxLength = 48;
    this.slotInput.placeholder = 'New save name';
    this.slotInput.addEventListener('input', () => {
      this.selectedSlot = sanitizeSaveSlotName(this.slotInput.value) || null;
      this.updateActionState();
    });
    this.inputRow.append(inputLabel, this.slotInput);
    modal.appendChild(this.inputRow);

    this.listSection = document.createElement('div');
    this.listSection.className = 'save-load-list-section';
    const listLabel = document.createElement('div');
    listLabel.className = 'save-load-list-label';
    listLabel.textContent = 'Local saves';
    this.listEl = document.createElement('div');
    this.listEl.className = 'save-load-list';
    this.emptyEl = document.createElement('p');
    this.emptyEl.className = 'save-load-empty';
    this.listSection.append(listLabel, this.listEl, this.emptyEl);
    modal.appendChild(this.listSection);

    this.statusEl = document.createElement('p');
    this.statusEl.className = 'save-load-status';
    modal.appendChild(this.statusEl);

    const actions = document.createElement('div');
    actions.className = 'settings-actions';
    this.cancelBtn = document.createElement('button');
    this.cancelBtn.className = 'btn';
    this.cancelBtn.textContent = 'Close';
    this.cancelBtn.addEventListener('click', () => this.close());

    this.deleteBtn = document.createElement('button');
    this.deleteBtn.className = 'btn';
    this.deleteBtn.textContent = 'Delete';
    this.deleteBtn.addEventListener('click', () => {
      void this.handleDelete();
    });

    this.confirmBtn = document.createElement('button');
    this.confirmBtn.className = 'btn btn-primary';
    this.confirmBtn.addEventListener('click', () => {
      void this.handleConfirm();
    });
    actions.append(this.cancelBtn, this.deleteBtn, this.confirmBtn);
    modal.appendChild(actions);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      this.fileInput.value = '';
      if (file) {
        void this.handleImport(file);
      }
    });
    modal.appendChild(this.fileInput);

    this.el.appendChild(modal);
    parent.appendChild(this.el);

    this.handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);
  }

  open(mode: SaveLoadMode): void {
    this.mode = mode;
    this.selectedSlot = null;
    this.slotInput.value = createDefaultSaveSlot();
    this.statusEl.textContent = '';
    this.statusEl.dataset.state = '';
    this.syncModeUI();
    this.el.style.display = '';
    if (this.controller.platform === 'desktop') {
      void this.refreshDesktopSaves();
    }
    if (mode === 'save') {
      this.slotInput.focus();
      this.slotInput.select();
    }
  }

  close(): void {
    this.el.style.display = 'none';
  }

  isOpen(): boolean {
    return this.el.style.display !== 'none';
  }

  update(): void {
    // Modal panel does not require per-frame work.
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.el.remove();
  }

  private syncModeUI(): void {
    const isDesktop = this.controller.platform === 'desktop';
    const isSaveMode = this.mode === 'save';

    this.titleEl.textContent = isSaveMode ? '💾 Save Game' : '📂 Load Game';
    this.subtitleEl.textContent = isDesktop
      ? (isSaveMode
        ? 'Create a new local save or overwrite an existing one.'
        : 'Choose a local save to load into the current session.')
      : (isSaveMode
        ? 'Download the current game state as a JSON save file.'
        : 'Import a previously downloaded JSON save file.');

    this.inputRow.style.display = isSaveMode ? '' : 'none';
    this.listSection.style.display = isDesktop ? '' : 'none';
    this.deleteBtn.style.display = isDesktop ? '' : 'none';
    this.confirmBtn.textContent = isDesktop
      ? (isSaveMode ? 'Save' : 'Load')
      : (isSaveMode ? 'Download' : 'Choose File');
    this.updateActionState();
  }

  private updateActionState(): void {
    const isDesktop = this.controller.platform === 'desktop';
    const normalizedSlot = sanitizeSaveSlotName(this.slotInput.value);

    this.cancelBtn.disabled = this.busy;
    this.slotInput.disabled = this.busy;
    this.deleteBtn.disabled = this.busy || !isDesktop || !this.selectedSlot;
    this.confirmBtn.disabled = this.busy || (this.mode === 'save'
      ? normalizedSlot.length === 0
      : (isDesktop ? !this.selectedSlot : false));
  }

  private async refreshDesktopSaves(): Promise<void> {
    this.setBusy(true);
    this.setStatus('Loading saves...');

    try {
      const saves = await this.controller.listSaves();
      const sorted = [...saves].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (!this.selectedSlot && this.mode === 'load' && sorted.length > 0) {
        this.selectedSlot = sorted[0].slot;
      }
      this.renderDesktopList(sorted);
      this.setStatus(sorted.length === 0 ? 'No local saves yet.' : '');
    } catch (error: unknown) {
      this.renderDesktopList([]);
      this.setStatus(error instanceof Error ? error.message : 'Failed to list saves.', 'error');
    } finally {
      this.setBusy(false);
    }
  }

  private renderDesktopList(saves: SaveData[]): void {
    this.listEl.replaceChildren();
    this.emptyEl.style.display = saves.length === 0 ? '' : 'none';
    this.emptyEl.textContent = 'No local saves found.';

    for (const save of saves) {
      const slot = save.slot;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'save-load-list-item';
      row.classList.toggle('selected', this.selectedSlot === slot);
      row.addEventListener('click', () => {
        this.selectedSlot = slot;
        if (this.mode === 'save') {
          this.slotInput.value = slot;
        }
        this.renderDesktopList(saves);
        this.updateActionState();
      });

      const nameEl = document.createElement('span');
      nameEl.className = 'save-load-name';
      nameEl.textContent = slot;
      const metaEl = document.createElement('span');
      metaEl.className = 'save-load-meta';
      metaEl.textContent = formatSaveTimestamp(save.timestamp);
      row.append(nameEl, metaEl);
      this.listEl.appendChild(row);
    }

    this.updateActionState();
  }

  private async handleConfirm(): Promise<void> {
    this.setBusy(true);
    this.setStatus('');

    try {
      if (this.controller.platform === 'desktop') {
        if (this.mode === 'save') {
          const slot = sanitizeSaveSlotName(this.slotInput.value);
          if (!slot) {
            throw new Error('Please enter a save name.');
          }
          await this.controller.saveToSlot(slot);
          this.close();
          return;
        }

        if (!this.selectedSlot) {
          throw new Error('Please select a save to load.');
        }

        const loaded = await this.controller.loadFromSlot(this.selectedSlot);
        if (!loaded) {
          throw new Error('Selected save could not be loaded.');
        }
        this.close();
        return;
      }

      if (this.mode === 'save') {
        const slot = sanitizeSaveSlotName(this.slotInput.value) || createDefaultSaveSlot();
        await this.controller.downloadSave(slot);
        this.close();
        return;
      }

      this.fileInput.click();
    } catch (error: unknown) {
      this.setStatus(error instanceof Error ? error.message : 'Save/load failed.', 'error');
    } finally {
      this.setBusy(false);
    }
  }

  private async handleDelete(): Promise<void> {
    if (!this.selectedSlot) {
      return;
    }

    this.setBusy(true);
    this.setStatus('Deleting save...');
    try {
      await this.controller.deleteSave(this.selectedSlot);
      this.selectedSlot = null;
      await this.refreshDesktopSaves();
    } catch (error: unknown) {
      this.setStatus(error instanceof Error ? error.message : 'Failed to delete save.', 'error');
      this.setBusy(false);
    }
  }

  private async handleImport(file: File): Promise<void> {
    this.setBusy(true);
    this.setStatus('Importing save...');

    try {
      const loaded = await this.controller.importSaveFile(file);
      if (!loaded) {
        throw new Error('Selected file could not be loaded.');
      }
      this.close();
    } catch (error: unknown) {
      this.setStatus(error instanceof Error ? error.message : 'Failed to import save.', 'error');
    } finally {
      this.setBusy(false);
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.updateActionState();
  }

  private setStatus(message: string, state: '' | 'error' = ''): void {
    this.statusEl.textContent = message;
    this.statusEl.dataset.state = state;
  }
}