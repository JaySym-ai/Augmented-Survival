import type { IStorageProvider, SaveData } from '@augmented-survival/game-core';

export const DESKTOP_MENU_SLOT = 'menu-save';

export interface DesktopFileSystemBridge {
  saveToDisk(filename: string, data: string): Promise<void>;
  loadFromDisk(filename: string): Promise<string | null>;
  listSaves(): Promise<string[]>;
  deleteSave(filename: string): Promise<void>;
}

export interface DesktopMenuEventsBridge {
  onMenuSave(callback: () => void): void;
  onMenuLoad(callback: () => void): void;
}

declare global {
  interface Window {
    platform?: { isDesktop?: boolean; platform?: string };
    desktopFS?: DesktopFileSystemBridge;
    desktopEvents?: DesktopMenuEventsBridge;
    __gameApp?: unknown;
  }
}

function toSaveFilename(slot: string): string {
  return slot.endsWith('.json') ? slot : `${slot}.json`;
}

export function createDesktopStorageProvider(): IStorageProvider | null {
  if (!window.platform?.isDesktop || !window.desktopFS) {
    return null;
  }

  return {
    save: async (slot, data) => window.desktopFS!.saveToDisk(toSaveFilename(slot), data),
    load: async (slot) => window.desktopFS!.loadFromDisk(toSaveFilename(slot)),
    list: async () => window.desktopFS!.listSaves(),
    delete: async (slot) => window.desktopFS!.deleteSave(toSaveFilename(slot)),
  };
}

export function getDesktopMenuEvents(): DesktopMenuEventsBridge | undefined {
  return window.platform?.isDesktop ? window.desktopEvents : undefined;
}

export async function loadDesktopSaveData(
  slot: string,
  storageProvider: IStorageProvider,
): Promise<SaveData | null> {
  const json = await storageProvider.load(slot);
  return json ? JSON.parse(json) as SaveData : null;
}