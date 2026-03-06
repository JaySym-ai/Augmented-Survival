import { describe, expect, it } from 'vitest';
import {
  createDefaultSaveSlot,
  formatSaveTimestamp,
  getDownloadFilename,
  parseSaveDataJson,
  sanitizeSaveSlotName,
} from './SaveFileUtils.js';

describe('SaveFileUtils', () => {
  it('sanitizes invalid slot characters and trims whitespace', () => {
    expect(sanitizeSaveSlotName('  my:bad/save*name  ')).toBe('my-bad-save-name');
  });

  it('creates deterministic default save slot names', () => {
    const date = new Date(2026, 2, 6, 14, 15, 16);
    expect(createDefaultSaveSlot(date)).toBe('save-2026-03-06-141516');
  });

  it('builds download filenames with a json extension', () => {
    expect(getDownloadFilename('village one')).toBe('village one.json');
  });

  it('formats valid timestamps for display and preserves invalid ones', () => {
    expect(formatSaveTimestamp('not-a-date')).toBe('not-a-date');
    expect(formatSaveTimestamp('2026-03-06T14:15:16.000Z').length).toBeGreaterThan(0);
  });

  it('parses valid save json and rejects invalid payloads', () => {
    const parsed = parseSaveDataJson('{"version":1,"timestamp":"2026-03-06T14:15:16.000Z","slot":"slot-a","entities":[],"globalResources":{},"elapsedTime":0,"timeScale":1}');
    expect(parsed.slot).toBe('slot-a');
    const missingSlot = parseSaveDataJson('{"version":1,"timestamp":"2026-03-06T14:15:16.000Z","entities":[],"globalResources":{},"elapsedTime":0,"timeScale":1}');
    expect(missingSlot.slot).toBe('');
    expect(() => parseSaveDataJson('{"slot":"broken"}')).toThrow('Invalid save data file.');
  });
});