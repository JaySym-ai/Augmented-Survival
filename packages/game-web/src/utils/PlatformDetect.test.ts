import { beforeEach, describe, it, expect, vi } from 'vitest';
import { detectPlatform, getDefaultPreset, type PlatformInfo } from './PlatformDetect';

describe('PlatformDetect', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.resetModules();
    globalThis.window = originalWindow as typeof window;
    globalThis.navigator = originalNavigator as Navigator;
  });

  describe('detectPlatform', () => {
    it('should detect web platform when not desktop or mobile', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.isWeb).toBe(true);
      expect(result.isDesktop).toBe(false);
      expect(result.isMobile).toBe(false);
      expect(result.platform).toBe('web');
    });

    it('should detect desktop platform when platform bridge is present', () => {
      vi.stubGlobal('window', {
        platform: { isDesktop: true, platform: 'desktop' },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.isDesktop).toBe(true);
      expect(result.isMobile).toBe(false);
      expect(result.isWeb).toBe(false);
      expect(result.platform).toBe('desktop');
    });

    it('should detect mobile platform when Capacitor is present', () => {
      vi.stubGlobal('window', {
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => 'ios',
        },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.isMobile).toBe(true);
      expect(result.isDesktop).toBe(false);
      expect(result.isWeb).toBe(false);
      expect(result.platform).toBe('ios');
    });

    it('should detect touch device when ontouchstart is present', () => {
      vi.stubGlobal('window', {
        ontouchstart: {},
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.isTouchDevice).toBe(true);
    });

    it('should detect touch device when maxTouchPoints > 0', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', { maxTouchPoints: 5 });

      const result = detectPlatform();

      expect(result.isTouchDevice).toBe(true);
    });

    it('should not be touch device when no touch support', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.isTouchDevice).toBe(false);
    });

    it('should use custom platform name from bridge', () => {
      vi.stubGlobal('window', {
        platform: { isDesktop: true, platform: 'linux' },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.platform).toBe('linux');
    });

    it('should default to mobile platform string when Capacitor present but getPlatform returns undefined', () => {
      vi.stubGlobal('window', {
        Capacitor: {
          isNativePlatform: () => true,
        },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const result = detectPlatform();

      expect(result.platform).toBe('mobile');
    });
  });

  describe('getDefaultPreset', () => {
    it('should return high preset for desktop', () => {
      vi.stubGlobal('window', {
        platform: { isDesktop: true, platform: 'desktop' },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      expect(getDefaultPreset()).toBe('high');
    });

    it('should return mobileBalanced preset for mobile', () => {
      vi.stubGlobal('window', {
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => 'ios',
        },
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      expect(getDefaultPreset()).toBe('mobileBalanced');
    });

    it('should return medium preset for web', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      expect(getDefaultPreset()).toBe('medium');
    });
  });
});
