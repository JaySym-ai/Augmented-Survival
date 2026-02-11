/**
 * TerrainMesh — Continuous terrain mesh with vertex-color blending based on height and slope.
 * Uses MeshStandardMaterial with vertexColors for PBR-compatible rendering.
 */
import * as THREE from 'three';
import type { TerrainData } from '@augmented-survival/game-core';

// Color palette for terrain blending
const COLOR_VALLEY = new THREE.Color(0x2d5a1e);   // dark green — valley bottoms
const COLOR_GRASS = new THREE.Color(0x4a7c3f);    // grass green — flat, low-mid height
const COLOR_DIRT = new THREE.Color(0x8b6914);      // dirt brown — steep slopes
const COLOR_STONE = new THREE.Color(0x7a7a7a);     // stone gray — high elevation / very steep

export class TerrainMesh {
  public readonly mesh: THREE.Mesh;
  private terrainData: TerrainData;

  constructor(terrainData: TerrainData) {
    this.terrainData = terrainData;
    const { width, depth, resolution, heightMap } = terrainData;

    // Create plane geometry in XZ plane
    const geometry = new THREE.PlaneGeometry(width, depth, resolution - 1, resolution - 1);

    // Rotate from XY to XZ (PlaneGeometry is XY by default)
    geometry.rotateX(-Math.PI / 2);

    // Apply heightmap to vertex Y positions
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, heightMap[i]);
    }
    positions.needsUpdate = true;

    // Recompute normals after height displacement
    geometry.computeVertexNormals();

    // Compute vertex colors based on height and slope
    const colors = new Float32Array(positions.count * 3);
    const normals = geometry.attributes.normal;
    const tempColor = new THREE.Color();

    // Find height range for normalization
    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < heightMap.length; i++) {
      if (heightMap[i] < minH) minH = heightMap[i];
      if (heightMap[i] > maxH) maxH = heightMap[i];
    }
    const heightRange = maxH - minH || 1;

    for (let i = 0; i < positions.count; i++) {
      const height = positions.getY(i);
      const normalY = normals.getY(i);

      // Normalized height [0, 1]
      const hNorm = (height - minH) / heightRange;

      // Slope: 0 = flat, 1 = vertical (1 - normalY)
      const slope = 1 - Math.abs(normalY);

      // Blend weights
      const slopeThreshold = 0.15;
      const highThreshold = 0.7;
      const valleyThreshold = 0.15;

      // Start with grass
      tempColor.copy(COLOR_GRASS);

      // Blend to valley color for low flat areas
      if (hNorm < valleyThreshold) {
        const t = 1 - hNorm / valleyThreshold;
        tempColor.lerp(COLOR_VALLEY, t * 0.7);
      }

      // Blend to dirt on slopes
      if (slope > slopeThreshold) {
        const t = Math.min((slope - slopeThreshold) / 0.3, 1);
        tempColor.lerp(COLOR_DIRT, t);
      }

      // Blend to stone at high elevation or very steep
      if (hNorm > highThreshold) {
        const t = Math.min((hNorm - highThreshold) / 0.3, 1);
        tempColor.lerp(COLOR_STONE, t * 0.8);
      }
      if (slope > 0.4) {
        const t = Math.min((slope - 0.4) / 0.3, 1);
        tempColor.lerp(COLOR_STONE, t * 0.6);
      }

      // Add subtle variation to break uniformity
      // Use position-based pseudo-noise
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const variation = (Math.sin(px * 2.3 + pz * 1.7) * 0.5 + 0.5) * 0.06 - 0.03;
      tempColor.r = Math.max(0, Math.min(1, tempColor.r + variation));
      tempColor.g = Math.max(0, Math.min(1, tempColor.g + variation * 0.8));
      tempColor.b = Math.max(0, Math.min(1, tempColor.b + variation * 0.5));

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // PBR material with vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'terrain';
  }

  /** Get interpolated height at world XZ position */
  getHeightAt(x: number, z: number): number {
    const { width, depth, resolution, heightMap } = this.terrainData;
    const gx = ((x + width / 2) / width) * (resolution - 1);
    const gz = ((z + depth / 2) / depth) * (resolution - 1);

    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;

    const ix0 = Math.max(0, Math.min(ix, resolution - 1));
    const ix1 = Math.max(0, Math.min(ix + 1, resolution - 1));
    const iz0 = Math.max(0, Math.min(iz, resolution - 1));
    const iz1 = Math.max(0, Math.min(iz + 1, resolution - 1));

    const h00 = heightMap[iz0 * resolution + ix0];
    const h10 = heightMap[iz0 * resolution + ix1];
    const h01 = heightMap[iz1 * resolution + ix0];
    const h11 = heightMap[iz1 * resolution + ix1];

    const h0 = h00 + fx * (h10 - h00);
    const h1 = h01 + fx * (h11 - h01);
    return h0 + fz * (h1 - h0);
  }

  /** Dispose of geometry and material */
  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.MeshStandardMaterial).dispose();
  }
}

