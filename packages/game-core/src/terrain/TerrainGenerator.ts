/**
 * TerrainGenerator — Heightmap generation using seeded simplex-like noise.
 * Produces rolling hills with a flat center area for town placement.
 */
import type { Vector3 } from '../ecs/components/TransformComponent';

// ---- Terrain Data Interface ----

export interface TerrainData {
  width: number;
  depth: number;
  resolution: number; // vertices per side
  heightMap: Float32Array; // resolution * resolution heights
  walkableGrid: boolean[][]; // for pathfinding, true = walkable
  gridCellSize: number; // world units per grid cell
}

// ---- Standalone Height Sampling ----

/** Get interpolated terrain height at a world position using bilinear interpolation. */
export function sampleTerrainHeight(data: TerrainData, worldX: number, worldZ: number): number {
  const { width, depth, resolution, heightMap } = data;
  // Convert world coords to grid coords
  const gx = ((worldX + width / 2) / width) * (resolution - 1);
  const gz = ((worldZ + depth / 2) / depth) * (resolution - 1);

  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;

  // Clamp indices
  const ix0 = Math.max(0, Math.min(ix, resolution - 1));
  const ix1 = Math.max(0, Math.min(ix + 1, resolution - 1));
  const iz0 = Math.max(0, Math.min(iz, resolution - 1));
  const iz1 = Math.max(0, Math.min(iz + 1, resolution - 1));

  // Bilinear interpolation
  const h00 = heightMap[iz0 * resolution + ix0];
  const h10 = heightMap[iz0 * resolution + ix1];
  const h01 = heightMap[iz1 * resolution + ix0];
  const h11 = heightMap[iz1 * resolution + ix1];

  const h0 = h00 + fx * (h10 - h00);
  const h1 = h01 + fx * (h11 - h01);
  return h0 + fz * (h1 - h0);
}

// ---- Seeded Noise Implementation ----

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a permutation table from seed */
function buildPermutation(seed: number): Uint8Array {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  return perm;
}

// 2D gradient vectors (8 directions)
const GRAD2 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

/** 2D value/gradient noise using permutation table */
function noise2D(perm: Uint8Array, x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  // Fade curves
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

  // Hash corners
  const aa = perm[perm[xi] + yi];
  const ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];

  // Gradient dot products
  const g = (hash: number, dx: number, dy: number): number => {
    const grad = GRAD2[hash & 7];
    return grad[0] * dx + grad[1] * dy;
  };

  const n00 = g(aa, xf, yf);
  const n10 = g(ba, xf - 1, yf);
  const n01 = g(ab, xf, yf - 1);
  const n11 = g(bb, xf - 1, yf - 1);

  // Bilinear interpolation
  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return nx0 + v * (nx1 - nx0);
}

/** Fractal Brownian Motion — multiple octaves of noise */
function fbm(
  perm: Uint8Array,
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  persistence: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(perm, x * frequency, y * frequency) * amplitude;
    maxAmp += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxAmp; // Normalize to roughly [-1, 1]
}

// ---- Terrain Generator ----

const SLOPE_THRESHOLD = 0.6; // max slope for walkable terrain
const CENTER_FLAT_RADIUS = 15; // radius of flat center area
const HEIGHT_SCALE = 8; // max height in world units
const NOISE_SCALE = 0.02; // base frequency of noise
const OCTAVES = 5;
const LACUNARITY = 2.0;
const PERSISTENCE = 0.5;
const WALKABLE_GRID_RESOLUTION = 128; // cells per side for pathfinding

export class TerrainGenerator {
  private perm: Uint8Array;

  constructor(private seed: number) {
    this.perm = buildPermutation(seed);
  }

  /** Generate full terrain data */
  generate(width: number, depth: number, resolution: number): TerrainData {
    const heightMap = new Float32Array(resolution * resolution);
    const halfW = width / 2;
    const halfD = depth / 2;

    // Generate heightmap
    for (let iz = 0; iz < resolution; iz++) {
      for (let ix = 0; ix < resolution; ix++) {
        const worldX = (ix / (resolution - 1)) * width - halfW;
        const worldZ = (iz / (resolution - 1)) * depth - halfD;

        // Base noise height
        let h = fbm(
          this.perm,
          worldX * NOISE_SCALE,
          worldZ * NOISE_SCALE,
          OCTAVES,
          LACUNARITY,
          PERSISTENCE,
        );

        // Remap from [-1,1] to [0,1]
        h = (h + 1) * 0.5;

        // Flatten center area for town placement
        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
        if (distFromCenter < CENTER_FLAT_RADIUS) {
          const t = distFromCenter / CENTER_FLAT_RADIUS;
          // Smooth hermite blend: fully flat at center, blends to natural at edge
          const blend = t * t * (3 - 2 * t);
          h = h * blend;
        }

        heightMap[iz * resolution + ix] = h * HEIGHT_SCALE;
      }
    }

    // Generate walkable grid
    const gridSize = WALKABLE_GRID_RESOLUTION;
    const gridCellSize = width / gridSize;
    const walkableGrid: boolean[][] = [];

    for (let gz = 0; gz < gridSize; gz++) {
      walkableGrid[gz] = [];
      for (let gx = 0; gx < gridSize; gx++) {
        const worldX = (gx / gridSize) * width - halfW + gridCellSize * 0.5;
        const worldZ = (gz / gridSize) * depth - halfD + gridCellSize * 0.5;
        const slope = this.getSlopeAt({ width, depth, resolution, heightMap, walkableGrid: [], gridCellSize }, worldX, worldZ);
        walkableGrid[gz][gx] = slope < SLOPE_THRESHOLD;
      }
    }

    return { width, depth, resolution, heightMap, walkableGrid, gridCellSize };
  }

  /** Get interpolated height at world position */
  getHeightAt(data: TerrainData, worldX: number, worldZ: number): number {
    return sampleTerrainHeight(data, worldX, worldZ);
  }

  /** Get surface normal at world position */
  getNormalAt(data: TerrainData, worldX: number, worldZ: number): Vector3 {
    const eps = 0.5;
    const hL = this.getHeightAt(data, worldX - eps, worldZ);
    const hR = this.getHeightAt(data, worldX + eps, worldZ);
    const hD = this.getHeightAt(data, worldX, worldZ - eps);
    const hU = this.getHeightAt(data, worldX, worldZ + eps);

    // Cross product of tangent vectors
    const nx = hL - hR;
    const ny = 2 * eps;
    const nz = hD - hU;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  /** Check if a world position is walkable */
  isWalkable(data: TerrainData, worldX: number, worldZ: number): boolean {
    const { width, depth, walkableGrid, gridCellSize } = data;
    const gridSize = walkableGrid.length;
    if (gridSize === 0) return true;

    const gx = Math.floor((worldX + width / 2) / gridCellSize);
    const gz = Math.floor((worldZ + depth / 2) / gridCellSize);

    if (gx < 0 || gx >= gridSize || gz < 0 || gz >= gridSize) return false;
    return walkableGrid[gz][gx];
  }

  /** Calculate slope magnitude at a world position */
  private getSlopeAt(data: TerrainData, worldX: number, worldZ: number): number {
    const normal = this.getNormalAt(data, worldX, worldZ);
    // Slope = 1 - dot(normal, up). Flat = 0, vertical = 1
    return 1 - normal.y;
  }
}

