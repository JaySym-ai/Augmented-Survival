/**
 * Platform detection utility.
 * Detects whether the app is running on desktop (Electron), mobile (Capacitor), or web browser.
 */

export interface PlatformInfo {
  isDesktop: boolean;
  isMobile: boolean;
  isWeb: boolean;
  isTouchDevice: boolean;
  platform: string;
}

/**
 * Detect the current platform environment.
 */
export function detectPlatform(): PlatformInfo {
  // Check for Electron desktop environment
  const platformBridge = (window as Record<string, unknown>).platform as
    | { isDesktop?: boolean; platform?: string }
    | undefined;
  const isDesktop = !!platformBridge?.isDesktop;

  // Check for Capacitor mobile environment
  const capacitor = (window as Record<string, unknown>).Capacitor as
    | { isNativePlatform?: () => boolean; getPlatform?: () => string }
    | undefined;
  const isMobile =
    typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform();

  // Web is the fallback when not desktop or mobile native
  const isWeb = !isDesktop && !isMobile;

  // Touch device detection
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;

  // Determine platform string
  let platform = 'web';
  if (isDesktop) {
    platform = platformBridge?.platform ?? 'desktop';
  } else if (isMobile) {
    platform = capacitor?.getPlatform?.() ?? 'mobile';
  }

  return {
    isDesktop,
    isMobile,
    isWeb,
    isTouchDevice,
    platform,
  };
}

/**
 * Returns the recommended default graphics preset based on the current platform.
 * - Desktop (Electron): 'high' — full GPU access, larger screen
 * - Mobile (Capacitor): 'mobileBalanced' — optimized for battery and thermal
 * - Web browser: 'medium' — safe default for unknown hardware
 */
export function getDefaultPreset(): string {
  const { isDesktop, isMobile } = detectPlatform();

  if (isDesktop) {
    return 'high';
  }
  if (isMobile) {
    return 'mobileBalanced';
  }
  return 'medium';
}

