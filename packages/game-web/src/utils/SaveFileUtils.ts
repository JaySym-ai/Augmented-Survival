import type { SaveData } from '@augmented-survival/game-core';

const INVALID_SAVE_SLOT_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
const MAX_SAVE_SLOT_LENGTH = 48;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function sanitizeSaveSlotName(name: string): string {
  return name
    .trim()
    .replace(INVALID_SAVE_SLOT_CHARS, '-')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SAVE_SLOT_LENGTH)
    .trim();
}

export function createDefaultSaveSlot(now = new Date()): string {
  return `save-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
}

export function formatSaveTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleString();
}

export function getDownloadFilename(slot: string): string {
  const normalized = sanitizeSaveSlotName(slot) || createDefaultSaveSlot();
  return normalized.endsWith('.json') ? normalized : `${normalized}.json`;
}

export function parseSaveDataJson(json: string): SaveData {
  const parsed = JSON.parse(json) as Partial<SaveData>;

  if (
    !parsed
    || typeof parsed !== 'object'
    || typeof parsed.version !== 'number'
    || typeof parsed.timestamp !== 'string'
    || !Array.isArray(parsed.entities)
    || typeof parsed.globalResources !== 'object'
    || parsed.globalResources == null
    || typeof parsed.elapsedTime !== 'number'
    || typeof parsed.timeScale !== 'number'
  ) {
    throw new Error('Invalid save data file.');
  }

  return {
    ...parsed,
    slot: typeof parsed.slot === 'string' ? parsed.slot : '',
  } as SaveData;
}

export function downloadJsonFile(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}