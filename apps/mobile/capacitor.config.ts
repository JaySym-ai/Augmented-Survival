import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.augmentedsurvival.app',
  appName: 'Augmented Survival',
  webDir: '../../packages/game-web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

