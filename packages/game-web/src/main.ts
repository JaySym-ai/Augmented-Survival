/**
 * Augmented Survival - Medieval City Builder
 * Web entry point (placeholder)
 */

import { GAME_VERSION } from '@augmented-survival/game-core';

const app = document.getElementById('app')!;
app.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e0e0e0;font-family:sans-serif;">
    <div style="text-align:center;">
      <h1>Augmented Survival</h1>
      <p>Medieval City Builder — v${GAME_VERSION}</p>
      <p style="margin-top:1rem;color:#888;">Three.js game loading...</p>
    </div>
  </div>
`;

console.log(`[Augmented Survival] v${GAME_VERSION} — placeholder loaded`);

