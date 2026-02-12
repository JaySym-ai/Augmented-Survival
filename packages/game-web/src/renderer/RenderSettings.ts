/**
 * Render Settings — quality presets and settings interface
 */

export interface RenderSettings {
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  ssaoEnabled: boolean;
  bloomEnabled: boolean;
  fxaaEnabled: boolean;
  fogEnabled: boolean;
  resolutionScale: number; // 0.5 to 1.0
  drawDistance: number;
  vegetationDensity: number; // 0 to 1
}

export function getShadowMapSize(quality: RenderSettings['shadowQuality']): number {
  switch (quality) {
    case 'off': return 0;
    case 'low': return 512;
    case 'medium': return 1024;
    case 'high': return 2048;
    case 'ultra': return 4096;
  }
}

// Desktop presets
export const PRESET_LOW: RenderSettings = {
  shadowQuality: 'low',
  ssaoEnabled: false,
  bloomEnabled: false,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 0.75,
  drawDistance: 150,
  vegetationDensity: 0.3,
};

export const PRESET_MEDIUM: RenderSettings = {
  shadowQuality: 'medium',
  ssaoEnabled: true,
  bloomEnabled: true,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 1.0,
  drawDistance: 250,
  vegetationDensity: 0.6,
};

export const PRESET_HIGH: RenderSettings = {
  shadowQuality: 'high',
  ssaoEnabled: true,
  bloomEnabled: true,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 1.0,
  drawDistance: 400,
  vegetationDensity: 0.85,
};

export const PRESET_ULTRA: RenderSettings = {
  shadowQuality: 'ultra',
  ssaoEnabled: true,
  bloomEnabled: true,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 1.0,
  drawDistance: 600,
  vegetationDensity: 1.0,
};

// Mobile presets
export const PRESET_MOBILE_LOW: RenderSettings = {
  shadowQuality: 'off',
  ssaoEnabled: false,
  bloomEnabled: false,
  fxaaEnabled: false,
  fogEnabled: true,
  resolutionScale: 0.5,
  drawDistance: 80,
  vegetationDensity: 0.1,
};

export const PRESET_MOBILE_BALANCED: RenderSettings = {
  shadowQuality: 'low',
  ssaoEnabled: false,
  bloomEnabled: false,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 0.75,
  drawDistance: 120,
  vegetationDensity: 0.3,
};

export const PRESET_MOBILE_HIGH: RenderSettings = {
  shadowQuality: 'medium',
  ssaoEnabled: false,
  bloomEnabled: true,
  fxaaEnabled: true,
  fogEnabled: true,
  resolutionScale: 0.85,
  drawDistance: 180,
  vegetationDensity: 0.5,
};

export const RENDER_PRESETS = {
  low: PRESET_LOW,
  medium: PRESET_MEDIUM,
  high: PRESET_HIGH,
  ultra: PRESET_ULTRA,
  mobileLow: PRESET_MOBILE_LOW,
  mobileBalanced: PRESET_MOBILE_BALANCED,
  mobileHigh: PRESET_MOBILE_HIGH,
} as const;

export type RenderPresetName = keyof typeof RENDER_PRESETS;

