import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDesktopStorageProvider,
  DESKTOP_MENU_SLOT,
  getDesktopMenuEvents,
  loadDesktopSaveData,
} from './DesktopBridge';

describe('DesktopBridge', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow as typeof window;
  });

  it('returns null storage provider when the desktop bridge is unavailable', () => {
    vi.stubGlobal('window', {});

    expect(createDesktopStorageProvider()).toBeNull();
    expect(getDesktopMenuEvents()).toBeUndefined();
  });

  it('adapts desktop file APIs to the storage provider interface', async () => {
    const saveToDisk = vi.fn(async () => undefined);
    const loadFromDisk = vi.fn(async () => '{"slot":"menu-save"}');
    const listSaves = vi.fn(async () => ['menu-save.json']);
    const deleteSave = vi.fn(async () => undefined);
    const onMenuSave = vi.fn();
    const onMenuLoad = vi.fn();

    vi.stubGlobal('window', {
      platform: { isDesktop: true, platform: 'win32' },
      desktopFS: { saveToDisk, loadFromDisk, listSaves, deleteSave },
      desktopEvents: { onMenuSave, onMenuLoad },
    });

    const provider = createDesktopStorageProvider();

    expect(provider).not.toBeNull();
    await provider!.save(DESKTOP_MENU_SLOT, 'payload');
    await provider!.load(DESKTOP_MENU_SLOT);
    await provider!.list();
    await provider!.delete(DESKTOP_MENU_SLOT);

    expect(saveToDisk).toHaveBeenCalledWith('menu-save.json', 'payload');
    expect(loadFromDisk).toHaveBeenCalledWith('menu-save.json');
    expect(listSaves).toHaveBeenCalledOnce();
    expect(deleteSave).toHaveBeenCalledWith('menu-save.json');
    expect(getDesktopMenuEvents()).toEqual({ onMenuSave, onMenuLoad });
  });

  it('parses save data loaded from desktop storage', async () => {
    vi.stubGlobal('window', {
      platform: { isDesktop: true, platform: 'win32' },
      desktopFS: {
        saveToDisk: vi.fn(async () => undefined),
        loadFromDisk: vi.fn(async () => '{"version":1,"timestamp":"2024-01-01T00:00:00.000Z","slot":"menu-save","entities":[],"globalResources":{},"elapsedTime":0,"timeScale":1}'),
        listSaves: vi.fn(async () => []),
        deleteSave: vi.fn(async () => undefined),
      },
    });

    const provider = createDesktopStorageProvider();
    const saveData = await loadDesktopSaveData(DESKTOP_MENU_SLOT, provider!);

    expect(saveData?.slot).toBe(DESKTOP_MENU_SLOT);
    expect(saveData?.version).toBe(1);
  });
});