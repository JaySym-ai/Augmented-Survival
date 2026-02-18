# 🏰 Augmented Survival — A Community-Made Medieval World

<p align="center">
  <strong>Built by the Intent by Augment Code Community</strong><br>
  <a href="https://www.augmentcode.com/product/intent">Intent by Augment Code</a> • 
  <a href="https://www.reddit.com/r/AugmentCodeAI/">Reddit Community</a> • 
  <a href="https://augmented.r02.ovh">Play Online Demo</a>
</p>

---

**Augmented Survival** is a medieval city-builder where the world is entirely code-driven. No assets allowed — every tree, building, character, and visual effect is created through code. This is a living project built by developers like you.

> **Play the game right now:** https://augmented.r02.ovh

---

## The Rules

1. **No assets** — Everything must be 100% code-generated. No .png, .jpg, .gltf, or .mp3 uploads.
2. **Medieval/Fantasy only** — Keep contributions in the medieval fantasy universe. No sci-fi, no superheroes, no anachronisms.
3. **Respect the vision** — This is a collaborative world. PRs should fit the aesthetic and gameplay.

---

## Features

- 🏘️ **City Building** — Place buildings, manage resources, grow your settlement
- 👷 **Citizen AI** — Workers autonomously gather wood, food, and stone
- 🌲 **Procedural Terrain** — Infinite terrain generated through code
- ✨ **Code-Driven Graphics** — All visuals built with Three.js (procedural meshes, shaders, materials)
- 📱 **Cross-Platform** — Runs on Web, Desktop (Electron), and Mobile (Capacitor)
- 🏗️ **ECS Architecture** — Clean Entity-Component-System design for easy contributions

---

## Tech Stack

- **TypeScript** — Full type safety across the codebase
- **Three.js** — All graphics (meshes, materials, shaders, post-processing)
- **ECS** — Entity-Component-System for game logic
- **Vite** — Fast development and builds
- **Electron** — Desktop wrapper
- **Capacitor** — Mobile wrapper

---

## Quick Start

```bash
git clone https://github.com/jaysym-ai/augmented-survival.git
cd augmented-survival
npm install
npm run dev:web
```

Open **http://localhost:5173** to play.

---

## Project Structure

```
augmented-survival/
├── packages/
│   ├── game-core/        # ECS systems, game logic, data definitions
│   └── game-web/        # Three.js renderer, UI, input handling
├── apps/
│   ├── desktop/          # Electron wrapper
│   └── mobile/          # Capacitor wrapper
├── assets/              # (empty — no assets allowed!)
└── package.json         # Workspace scripts
```

---

## Contributing

We welcome contributions! To add new content:

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b add-blacksmith`)
3. **Add your code** — buildings, resources, meshes, systems
4. **Test locally** with `npm run dev:web`
5. **Submit a PR**

### Adding New Buildings

1. Define the type in `packages/game-core/src/types/buildings.ts`
2. Add the definition in `packages/game-core/src/content/BuildingDefs.ts`
3. Create the mesh in `packages/game-web/src/assets/MeshFactory.ts`

### Adding New Resources

1. Add to `ResourceType` enum in `packages/game-core/src/types/resources.ts`
2. Define in `packages/game-core/src/content/ResourceDefs.ts`

### Creating Visual Effects

All visuals live in `packages/game-web/src/`:
- **Meshes** — `assets/MeshFactory.ts`
- **Materials** — Three.js materials and shaders
- **Post-processing** — `renderer/PostProcessing.ts`

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Start development server |
| `npm run build:web` | Production build |
| `npm run dev:desktop` | Run desktop app |
| `npm run mobile:sync` | Sync to mobile projects |
| `npm run test` | Run all tests |

---

## Community

- **Reddit:** https://www.reddit.com/r/AugmentCodeAI/
- **Intent:** https://www.augmentcode.com/product/intent
- **Demo:** https://augmented.r02.ovh

Join us in building this medieval world — one commit at a time.

---

## License

MIT
