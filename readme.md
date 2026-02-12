# 🏰 Augmented Survival — Medieval City Builder

[![Built with Three.js](https://img.shields.io/badge/Built%20with-Three.js-black?logo=threedotjs)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A medieval city-builder with an **ECS architecture**, real-time resource gathering, building construction, citizen AI, and AAA-quality rendering — running on **Web**, **Desktop (Electron)**, and **Mobile (Capacitor)** from a single TypeScript codebase.

---

## Screenshots

> _TODO: Add screenshots of the game in action._

---

## Features

- **Entity Component System (ECS)** — Clean separation of data and logic; systems run every frame in deterministic order.
- **Resource Gathering Loop** — Citizens autonomously gather wood, food, and stone from the environment and deliver to storage buildings.
- **Building Construction** — Place buildings via a ghost preview, deliver materials, watch construction progress in real-time.
- **AAA Rendering** — Physically-based lighting, dynamic sky, SSAO, bloom, FXAA, fog, shadow mapping via Three.js + postprocessing.
- **RTS Camera** — Smooth pan, zoom, and tilt with edge-scrolling and keyboard/mouse controls.
- **Full UI Overlay** — Resource bar, build menu, selection panel, time controls, settings panel — all HTML-over-canvas.
- **Cross-Platform** — Single codebase targets Web, Electron (Windows/macOS/Linux), and Capacitor (Android/iOS).
- **Data-Driven Content** — Buildings, resources, and jobs are defined in plain TypeScript objects — easy to extend.

---

## Architecture Overview

Monorepo powered by npm workspaces:

```
augmented-survival/
├── packages/
│   ├── game-core/        # ECS framework, systems, types, events (platform-agnostic)
│   └── game-web/         # Three.js renderer, camera, UI, world visuals
├── apps/
│   ├── desktop/          # Electron shell
│   └── mobile/           # Capacitor shell
├── assets/               # Shared asset definitions (buildings, characters, terrain, textures)
├── package.json          # Root workspace config + orchestration scripts
└── tsconfig.base.json    # Shared TypeScript configuration
```

**`game-core`** contains zero rendering code — pure simulation logic that could run on a server or in a worker. **`game-web`** imports `game-core` and adds Three.js rendering, camera controls, HTML UI, and asset loading.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | `node -v` to check |
| npm | 9+ | Comes with Node.js 18+ |
| Android Studio | Latest | Only for mobile development |
| Xcode | 15+ | Only for iOS development (macOS only) |

---

## Quick Start

```bash
git clone https://github.com/jaysym-ai/augmented-survival.git
cd augmented-survival
npm install
npm run dev:web
```

Open **http://localhost:5173** — you should see terrain, a town center, citizens gathering resources, and the full HUD overlay.

---

## Development

### Web (primary)

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Vite dev server with HMR |
| `npm run build:web` | Production build (output in `packages/game-web/dist/`) |
| `npm run preview:web` | Preview the production build locally |

### Mobile (Capacitor)

Requires a web build first — the sync script handles this automatically.

| Command | Description |
|---------|-------------|
| `npm run mobile:sync` | Build web + sync to native projects |
| `npm run mobile:android` | Run on connected Android device/emulator |
| `npm run mobile:ios` | Run on iOS Simulator / connected device |
| `npm run mobile:build:android` | Build + sync, then open Android Studio for release |
| `npm run mobile:build:ios` | Build + sync, then open Xcode for archive |

**Android setup:**
1. Install Android Studio and accept SDK licenses
2. `npm run mobile:sync` to generate the `android/` project
3. `npm run mobile:android` to launch

**iOS setup (macOS only):**
1. Install Xcode 15+ from the App Store
2. `npm run mobile:sync` to generate the `ios/` project
3. `npm run mobile:ios` to launch in Simulator

### Desktop (Electron)

| Command | Description |
|---------|-------------|
| `npm run dev:desktop` | Build web + launch Electron in dev mode |
| `npm run build:desktop` | Build web + compile Electron |
| `npm run package:desktop` | Build + package for distribution (DMG/EXE/AppImage) |

---

## Steam Onboarding Checklist

For publishing to Steam via Electron:

1. **Steamworks Account** — Create a partner account at [partner.steamgames.com](https://partner.steamgames.com) and register your app to get an **App ID**.
2. **Depot Configuration** — Configure depots for each platform (Windows, macOS, Linux) in the Steamworks dashboard.
3. **SteamCMD Upload** — After `npm run package:desktop`, upload the output folder:
   ```bash
   steamcmd +login <username> +run_app_build app_build.vdf +quit
   ```
4. **Steamworks SDK Integration** — For overlay, achievements, and cloud saves, integrate [`greenworks`](https://github.com/niclasberg/greenworks) or [`steamworks.js`](https://github.com/niclasberg/steamworks.js) into the Electron main process:
   - Initialize SDK with your App ID on app launch
   - Call `activateGameOverlay()` to enable the Steam overlay
   - Use `setAchievement()` / `getAchievement()` for achievements
   - Use `enableCloudSync()` for save-game cloud storage
5. **Launch Options** — Set the Electron executable as the launch target in Steamworks app settings.

---

## Performance Tuning

### Web
- Enable texture compression (KTX2/Basis) for smaller GPU memory footprint
- Vite's tree-shaking and code-splitting keep bundle size lean
- Consider a service worker for offline caching of static assets

### Mobile
- Use `mobileLow` or `mobileBalanced` render presets
- Reduce shadow resolution or disable shadows entirely
- Lower draw distance to 80–120 units
- Disable SSAO (too expensive for most mobile GPUs)
- Limit vegetation density to 0.1–0.3

### Desktop
- Use `high` or `ultra` render presets
- Enable GPU acceleration flags: `--enable-gpu-rasterization`
- Higher shadow cascades and draw distances are affordable on desktop GPUs

---

## Graphics Settings

Available presets (configured in `packages/game-web/src/renderer/RenderSettings.ts`):

| Preset | Shadows | SSAO | Bloom | FXAA | Resolution | Draw Distance | Vegetation |
|--------|---------|------|-------|------|------------|---------------|------------|
| `low` | Low (512) | ✗ | ✗ | ✓ | 0.75× | 150 | 30% |
| `medium` | Medium (1024) | ✓ | ✓ | ✓ | 1.0× | 250 | 60% |
| `high` | High (2048) | ✓ | ✓ | ✓ | 1.0× | 400 | 85% |
| `ultra` | Ultra (4096) | ✓ | ✓ | ✓ | 1.0× | 600 | 100% |
| `mobileLow` | Off | ✗ | ✗ | ✗ | 0.5× | 80 | 10% |
| `mobileBalanced` | Low (512) | ✗ | ✗ | ✓ | 0.75× | 120 | 30% |
| `mobileHigh` | Medium (1024) | ✗ | ✓ | ✓ | 0.85× | 180 | 50% |

Settings can be changed at runtime via the in-game settings panel (⚙ button).

---

## Troubleshooting

### WebGL Context Lost
- Reduce resolution scale and shadow quality
- Close other GPU-intensive tabs/applications
- Update your graphics drivers

### Shadow Artifacts (Peter-Panning / Acne)
- Adjust shadow bias in `GameRenderer.ts` (`sunLight.shadow.bias`)
- Increase shadow map resolution (use a higher preset)

### iOS Memory Limits
- Use `mobileLow` or `mobileBalanced` presets
- iOS Safari limits WebGL memory — keep texture budgets under 256 MB
- Avoid `ultra` shadow maps (4096×4096) on mobile

### Android WebView Quirks
- Ensure `android:hardwareAccelerated="true"` in `AndroidManifest.xml`
- Some older WebViews lack `OffscreenCanvas` — the game uses standard canvas fallback
- Test on Chrome-based WebView 90+

### Electron GPU Issues
- If the window is blank, try launching with `--disable-gpu-sandbox`
- For NVIDIA Optimus laptops, force the discrete GPU in driver settings
- Add `app.commandLine.appendSwitch('enable-gpu-rasterization')` in Electron main process

---

## Project Structure

```
augmented-survival/
├── packages/
│   ├── game-core/                    # Platform-agnostic game logic
│   │   └── src/
│   │       ├── ecs/                  # Entity-Component-System framework
│   │       │   ├── Entity.ts         #   Entity ID allocation
│   │       │   ├── Component.ts      #   Component type registry
│   │       │   ├── World.ts          #   ECS world (entities + systems)
│   │       │   ├── System.ts         #   Base System interface
│   │       │   ├── Query.ts          #   Component queries
│   │       │   └── components/       #   Component definitions (Transform, Citizen, Building, etc.)
│   │       ├── systems/              # Game systems
│   │       │   ├── TimeSystem.ts     #   Game clock + time scaling
│   │       │   ├── MovementSystem.ts #   Velocity → position
│   │       │   ├── PathFollowSystem.ts #  Waypoint pathfinding
│   │       │   ├── JobAssignmentSystem.ts # Citizen job AI
│   │       │   ├── GatherSystem.ts   #   Resource gathering
│   │       │   ├── CarrySystem.ts    #   Inventory management
│   │       │   ├── DeliverySystem.ts #   Deliver resources to buildings
│   │       │   ├── ConstructionSystem.ts # Building construction progress
│   │       │   ├── ResourceStoreSystem.ts # Global resource tracking
│   │       │   └── BuildingPlacementSystem.ts # Place new buildings
│   │       ├── events/               # Typed event bus + game events
│   │       ├── types/                # Shared types (buildings, resources, citizens, jobs)
│   │       ├── content/              # Data definitions (BUILDING_DEFS, RESOURCE_DEFS, etc.)
│   │       ├── terrain/              # Procedural terrain generation
│   │       ├── save/                 # Save/load system with pluggable storage
│   │       └── index.ts             # Public API barrel export
│   │
│   └── game-web/                     # Three.js rendering + browser UI
│       └── src/
│           ├── main.ts              # App entry — wires everything together
│           ├── renderer/            # Three.js renderer, lights, sky, postprocessing
│           │   ├── GameRenderer.ts  #   Scene setup, shadow config, fog
│           │   ├── PostProcessing.ts #  SSAO, bloom, FXAA pipeline
│           │   ├── SkySystem.ts     #   Dynamic sky dome
│           │   └── RenderSettings.ts #  Quality presets
│           ├── camera/              # RTS camera with pan/zoom/tilt
│           ├── game/                # Game orchestration
│           │   ├── GameWorld.ts     #   Creates ECS world, terrain, entities, systems
│           │   ├── SelectionManager.ts # Click-to-select with ring highlight
│           │   └── BuildingGhostPreview.ts # Transparent ghost during placement
│           ├── ui/                  # HTML overlay panels
│           │   ├── GameUI.ts        #   Main UI manager
│           │   ├── ResourceBar.ts   #   Top resource display
│           │   ├── BuildMenu.ts     #   Building placement menu
│           │   ├── SelectionPanel.ts #  Entity info panel
│           │   ├── TimeControls.ts  #   Play/pause/speed controls
│           │   ├── SettingsPanel.ts #   Graphics settings
│           │   └── UIStyles.ts      #   Injected CSS styles
│           ├── world/               # Terrain mesh + environment objects
│           └── assets/              # Mesh factory + asset loader
│
├── apps/
│   ├── desktop/                     # Electron wrapper
│   │   ├── electron/                #   Main process entry
│   │   └── package.json
│   └── mobile/                      # Capacitor wrapper
│       ├── capacitor.config.ts      #   Capacitor configuration
│       └── package.json
│
├── assets/                          # Shared asset definitions
│   ├── buildings/                   #   Building model references
│   ├── characters/                  #   Character model references
│   ├── terrain/                     #   Terrain textures
│   ├── textures/                    #   Shared textures
│   └── props/                       #   Environment props
│
├── package.json                     # Root workspace + orchestration scripts
└── tsconfig.base.json              # Shared TypeScript settings
```

---

## Adding New Buildings / Resources

The game is **data-driven** — adding new content requires no system changes.

### Adding a New Building

1. **Add the type** to `BuildingType` enum in `packages/game-core/src/types/buildings.ts`:
   ```typescript
   export enum BuildingType {
     // ... existing types
     Blacksmith = 'blacksmith',
   }
   ```

2. **Define the building** in `packages/game-core/src/content/BuildingDefs.ts`:
   ```typescript
   [BuildingType.Blacksmith]: {
     type: BuildingType.Blacksmith,
     displayName: 'Blacksmith',
     cost: { [ResourceType.Wood]: 20, [ResourceType.Stone]: 30 },
     workerSlots: 2,
     buildTime: 45,
     size: { width: 2, depth: 2 },
     meshId: 'blacksmith',
     storageCapacity: 50,
     providesPopulation: 0,
     jobType: JobType.Builder,
   },
   ```

3. **Create a mesh** in `packages/game-web/src/assets/MeshFactory.ts` — add a case to `createBuildingMesh()`.

4. The **build menu**, **resource checks**, and **construction pipeline** all pick up the new definition automatically.

### Adding a New Resource

1. Add to `ResourceType` enum in `packages/game-core/src/types/resources.ts`
2. Add to `RESOURCE_DEFS` in `packages/game-core/src/content/ResourceDefs.ts`
3. The resource bar, carry system, and delivery system handle it automatically

---

## Contributing

### Code Style
- TypeScript strict mode
- 2-space indentation
- Explicit types on public APIs; inferred types for locals
- Barrel exports from each module's `index.ts`

### ECS Patterns
- **Components** are plain data objects — no methods
- **Systems** iterate over component queries each frame — no entity references stored
- **Events** decouple systems — prefer `eventBus.emit()` over direct system calls
- Entity IDs are opaque numbers — never rely on their ordering

### Pull Request Guidelines
1. One feature / fix per PR
2. Run `npm run build:web` to verify zero type errors
3. Update this README if your change affects commands, folder structure, or settings
4. Keep commits atomic and descriptive

---

## License

MIT — see [LICENSE](LICENSE) for details.